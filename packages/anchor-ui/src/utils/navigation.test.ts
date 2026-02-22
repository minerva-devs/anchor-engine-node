import { describe, it, expect, beforeEach, vi } from 'vitest';
import { navigate } from './navigation';

describe('Navigation Utility', () => {
  // Mock window.history
  const originalHistory = window.history;
  const originalDispatchEvent = window.dispatchEvent;

  beforeEach(() => {
    // Mock pushState
    window.history.pushState = vi.fn();
    // Mock dispatchEvent
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    // Restore originals
    window.history = originalHistory;
    window.dispatchEvent = originalDispatchEvent;
  });

  it('navigates to the correct path', () => {
    navigate('/search');

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/search');
    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
  });

  it('dispatches popstate event', () => {
    navigate('/chat');

    const event = (window.dispatchEvent as any).mock.calls[0][0];
    expect(event.type).toBe('popstate');
  });

  it('works with dashboard path', () => {
    navigate('/dashboard');

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/dashboard');
    expect(window.dispatchEvent).toHaveBeenCalled();
  });

  it('works with quarantine path', () => {
    navigate('/quarantine');

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/quarantine');
  });

  it('works with taxonomy path', () => {
    navigate('/taxonomy');

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/taxonomy');
  });

  it('works with paths management', () => {
    navigate('/paths');

    expect(window.history.pushState).toHaveBeenCalledWith({}, '', '/paths');
  });

  it('preserves query parameters', () => {
    navigate('/search?query=test&buckets=inbox');

    expect(window.history.pushState).toHaveBeenCalledWith(
      {},
      '',
      '/search?query=test&buckets=inbox'
    );
  });

  it('handles complex paths', () => {
    const complexPath = '/search?query=hello%20world&max_chars=8192&strategy=max-recall';
    navigate(complexPath);

    expect(window.history.pushState).toHaveBeenCalledWith(
      {},
      '',
      complexPath
    );
  });
});
