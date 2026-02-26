// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { navigate } from './routing';

describe('Routing Utility', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on pushState and mock implementation to prevent actual navigation
    pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    // Spy on dispatchEvent
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    // Restore all mocks
    vi.restoreAllMocks();
  });

  it('navigates to the correct path', () => {
    navigate('/search');

    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/search');
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(Event));
  });

  it('dispatches pushstate event', () => {
    navigate('/chat');

    const event = dispatchEventSpy.mock.calls[0][0];
    expect(event.type).toBe('pushstate');
  });

  it('works with dashboard path', () => {
    navigate('/dashboard');

    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/dashboard');
    expect(dispatchEventSpy).toHaveBeenCalled();
  });

  it('works with quarantine path', () => {
    navigate('/quarantine');

    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/quarantine');
  });

  it('works with taxonomy path', () => {
    navigate('/taxonomy');

    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/taxonomy');
  });

  it('preserves query parameters', () => {
    navigate('/search?query=test&buckets=inbox');

    expect(pushStateSpy).toHaveBeenCalledWith(
      {},
      '',
      '/search?query=test&buckets=inbox'
    );
  });

  it('handles complex paths', () => {
    const complexPath = '/search?query=hello%20world&max_chars=8192&strategy=max-recall';
    navigate(complexPath);

    expect(pushStateSpy).toHaveBeenCalledWith(
      {},
      '',
      complexPath
    );
  });
});
