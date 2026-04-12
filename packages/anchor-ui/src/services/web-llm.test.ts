import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebLLMService } from './web-llm';
import { CreateMLCEngine } from '@mlc-ai/web-llm';

vi.mock('@mlc-ai/web-llm', () => ({
    CreateMLCEngine: vi.fn(),
}));

vi.mock('../config/web-llm-models', () => ({
    webLLMConfig: {
        modelBasePath: 'https://huggingface.co/',
        model_list: [
            { model_id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC', model_lib: 'some-lib' },
            { model_id: 'custom-model', model_lib: 'custom-lib' }
        ]
    }
}));

describe('WebLLMService', () => {
    let service: WebLLMService;
    let mockEngine: any;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new WebLLMService();
        mockEngine = {
            chat: {
                completions: {
                    create: vi.fn()
                }
            }
        };
        (CreateMLCEngine as any).mockResolvedValue(mockEngine);
    });

    it('should be created in uninitialized state', () => {
        expect(service.isInitialized()).toBe(false);
        expect(service.isLoadingModel()).toBe(false);
        expect(service.getInitError()).toBeNull();
        expect(service.getEngine()).toBeNull();
    });

    describe('Progress callback', () => {
        it('should allow setting and getting progress callback', () => {
            const callback = vi.fn();
            service.setProgressCallback(callback);
            expect(service.getProgressCallback()).toBe(callback);

            // Should be callable
            service.getProgressCallback()({ text: 'test', progress: 0.5 });
            expect(callback).toHaveBeenCalledWith({ text: 'test', progress: 0.5 });
        });
    });

    describe('initialize', () => {
        it('should initialize successfully with default model', async () => {
            await service.initialize();

            expect(CreateMLCEngine).toHaveBeenCalledWith(
                'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
                expect.any(Object)
            );
            expect(service.isInitialized()).toBe(true);
            expect(service.isLoadingModel()).toBe(false);
            expect(service.getEngine()).toBe(mockEngine);
        });

        it('should initialize successfully with custom model', async () => {
            await service.initialize('custom-model');

            expect(CreateMLCEngine).toHaveBeenCalledWith(
                'custom-model',
                expect.any(Object)
            );
            expect(service.isInitialized()).toBe(true);
        });

        it('should skip initialization if already initialized', async () => {
            await service.initialize();
            (CreateMLCEngine as any).mockClear();

            await service.initialize();
            expect(CreateMLCEngine).not.toHaveBeenCalled();
        });

        it('should wait if already loading', async () => {
            let resolveEngine: any;
            (CreateMLCEngine as any).mockImplementation(() => {
                return new Promise(resolve => {
                    resolveEngine = resolve;
                });
            });

            // Start first init
            const init1 = service.initialize();
            expect(service.isLoadingModel()).toBe(true);

            // Start second init
            const init2 = service.initialize();

            // Resolve engine
            resolveEngine(mockEngine);

            await Promise.all([init1, init2]);
            expect(CreateMLCEngine).toHaveBeenCalledTimes(1);
        });

        it('should throw and set initError on initialization failure', async () => {
            const error = new Error('Init failed');
            (CreateMLCEngine as any).mockRejectedValue(error);

            await expect(service.initialize()).rejects.toThrow('Init failed');
            expect(service.isInitialized()).toBe(false);
            expect(service.isLoadingModel()).toBe(false);
            expect(service.getInitError()).toBe(error);
        });

        it('should trigger progress callback during initialization', async () => {
            const callback = vi.fn();
            service.setProgressCallback(callback);

            (CreateMLCEngine as any).mockImplementation((_modelId: string, options: any) => {
                options.initProgressCallback({ text: 'Loading...', progress: 0.1 });
                return Promise.resolve(mockEngine);
            });

            await service.initialize();
            expect(callback).toHaveBeenCalledWith({ text: 'Loading...', progress: 0.1 });
        });

        it('should handle initialization timeout with vi.useFakeTimers', async () => {
            const callback = vi.fn();
            service.setProgressCallback(callback);
            
            // Use fake timers for deterministic timing behavior
            vi.useFakeTimers();
            
            let progressStep = 0;
            (CreateMLCEngine as any).mockImplementation((_modelId: string, options?: any) => {
                if (options?.initProgressCallback) {
                    // Simulate multiple progress updates
                    const steps = [0.1, 0.5, 0.9];
                    for (const step of steps) {
                        setTimeout(() => {
                            options.initProgressCallback({ text: 'Loading...', progress: step });
                        }, step * 100); // Simulated time units
                    }
                }
                
                return new Promise((resolve) => {
                    setTimeout(() => resolve(mockEngine), 500);
                });
            });

            await service.initialize();
            
            // Advance all timers to completion
            vi.advanceTimersByTime(600);
            
            expect(callback).toHaveBeenCalledTimes(3);
            expect(callback).toHaveBeenCalledWith({ text: 'Loading...', progress: 0.1 });
            expect(callback).toHaveBeenCalledWith({ text: 'Loading...', progress: 0.5 });
            expect(callback).toHaveBeenCalledWith({ text: 'Loading...', progress: 0.9 });
            
            vi.useRealTimers();
        });

        it('should handle progressive loading verification', async () => {
            const callback = vi.fn();
            service.setProgressCallback(callback);
            
            let resolveEngine: any;
            const mockPromise = new Promise<any>((resolve) => {
                resolveEngine = resolve;
            });

            (CreateMLCEngine as any).mockImplementation((_modelId: string, options?: any) => {
                if (options?.initProgressCallback) {
                    // Simulate progressive loading with multiple callbacks
                    options.initProgressCallback({ text: 'Downloading model...', progress: 0.25 });
                    setTimeout(() => {
                        options.initProgressCallback({ text: 'Loading weights...', progress: 0.75 });
                    }, 10);
                }
                return mockPromise;
            });

            // Start initialization
            const init = service.initialize();
            
            // Trigger progress callbacks manually during loading
            if ((CreateMLCEngine as any).mock.calls.length > 0) {
                const options = (CreateMLCEngine as any).mock.calls[0][1];
                if (options?.initProgressCallback) {
                    options.initProgressCallback({ text: 'Loading...', progress: 0.5 });
                }
            }

            // Resolve the promise
            resolveEngine(mockEngine);
            
            await init;
            
            expect(callback).toHaveBeenCalledWith({ text: 'Downloading model...', progress: 0.25 });
            expect(service.isInitialized()).toBe(true);
        });
    });

    describe('generate', () => {
        it('should throw if engine is not initialized', async () => {
            await expect(service.generate([{ role: 'user', content: 'hello' }], vi.fn()))
                .rejects.toThrow('Engine not initialized');
        });

        it('should generate text and call onUpdate stream', async () => {
            await service.initialize();

            // Mock async iterable for stream
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield { choices: [{ delta: { content: 'Hello' } }] };
                    yield { choices: [{ delta: { content: ' world' } }] };
                    yield { choices: [{ delta: { content: '!' } }] };
                }
            };

            mockEngine.chat.completions.create.mockResolvedValue(mockStream);

            const onUpdate = vi.fn();
            const messages = [{ role: 'user', content: 'Say hello' }];
            const result = await service.generate(messages, onUpdate);

            expect(mockEngine.chat.completions.create).toHaveBeenCalledWith({
                messages,
                stream: true,
            });

            expect(onUpdate).toHaveBeenCalledTimes(3);
            expect(onUpdate).toHaveBeenNthCalledWith(1, 'Hello');
            expect(onUpdate).toHaveBeenNthCalledWith(2, 'Hello world');
            expect(onUpdate).toHaveBeenNthCalledWith(3, 'Hello world!');

            expect(result).toBe('Hello world!');
        });
    });
});
