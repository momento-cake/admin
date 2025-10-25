import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 300));

    expect(result.current).toBe('test');
  });

  it('should delay updating debounced value', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    expect(result.current).toBe('initial');

    // Change the value
    rerender({ value: 'updated', delay: 300 });

    // Value should not be updated immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      {
        initialProps: { value: 'initial' },
      }
    );

    rerender({ value: 'updated' });

    // Fast-forward by 299ms (less than default 300ms)
    act(() => {
      vi.advanceTimersByTime(299);
    });

    // Should still be initial
    expect(result.current).toBe('initial');

    // Fast-forward by 1ms more (total 300ms)
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Should now be updated
    expect(result.current).toBe('updated');
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    rerender({ value: 'updated', delay: 500 });

    // Fast-forward by 300ms (less than 500ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should still be initial
    expect(result.current).toBe('initial');

    // Fast-forward by 200ms more (total 500ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should now be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel timeout when value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    // Change value to 'first'
    rerender({ value: 'first', delay: 300 });

    // Fast-forward by 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Change value again to 'second' before 300ms passes
    rerender({ value: 'second', delay: 300 });

    // Fast-forward by 150ms more (total 300ms from start, but only 150ms since last change)
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Should still be initial (timeout from first change was cancelled)
    expect(result.current).toBe('initial');

    // Fast-forward by 150ms more (total 300ms since second change)
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Should now be 'second'
    expect(result.current).toBe('second');
  });

  it('should handle string debouncing', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'search', delay: 500 },
      }
    );

    // Simulate typing
    rerender({ value: 'search q', delay: 500 });
    rerender({ value: 'search qu', delay: 500 });
    rerender({ value: 'search que', delay: 500 });

    expect(result.current).toBe('search');

    // Fast-forward 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should be the last typed value
    expect(result.current).toBe('search que');
  });

  it('should handle number debouncing', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 100, delay: 300 },
      }
    );

    rerender({ value: 150, delay: 300 });

    expect(result.current).toBe(100);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(150);
  });

  it('should handle object debouncing', () => {
    const obj1 = { search: 'test' };
    const obj2 = { search: 'updated' };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: obj1, delay: 300 },
      }
    );

    rerender({ value: obj2, delay: 300 });

    expect(result.current).toBe(obj1);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(obj2);
  });

  it('should handle null/undefined debouncing', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: null as any, delay: 300 },
      }
    );

    rerender({ value: 'updated', delay: 300 });

    expect(result.current).toBeNull();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');

    rerender({ value: null, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBeNull();
  });

  it('should change delay dynamically', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    rerender({ value: 'updated', delay: 300 });

    // Fast-forward by 250ms
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Change delay to 500ms while waiting
    rerender({ value: 'updated', delay: 500 });

    // Value should still be initial
    expect(result.current).toBe('initial');

    // Fast-forward by 250ms more (total 500ms from first change, but new delay is 500ms from second render)
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Value should still be initial because delay was changed
    expect(result.current).toBe('initial');

    // Fast-forward by 250ms more
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Now it should be updated (500ms since the rerender with new delay)
    expect(result.current).toBe('updated');
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    rerender({ value: 'updated', delay: 300 });

    // Unmount should call clearTimeout
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
