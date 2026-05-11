import { renderHook, act } from '@testing-library/react';
import { useSettings } from './useSettings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-fontsize');
    document.documentElement.removeAttribute('data-density');
  });

  it('defaults: fontSize=m, density=comfortable, stage4Threshold=8', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.fontSize).toBe('m');
    expect(result.current.density).toBe('comfortable');
    expect(result.current.stage4Threshold).toBe(8);
  });

  it('setFontSize writes localStorage and applies data-fontsize attr', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setFontSize('l');
    });

    expect(result.current.fontSize).toBe('l');
    expect(localStorage.getItem('fontSize')).toBe('l');
    expect(document.documentElement.getAttribute('data-fontsize')).toBe('l');
  });

  it('setDensity writes localStorage and applies data-density attr', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setDensity('compact');
    });

    expect(result.current.density).toBe('compact');
    expect(localStorage.getItem('density')).toBe('compact');
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('setStage4Threshold writes localStorage (as string)', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setStage4Threshold(6);
    });

    expect(result.current.stage4Threshold).toBe(6);
    expect(localStorage.getItem('stage4Threshold')).toBe('6');
  });

  it('reads valid persisted fontSize from localStorage on mount', () => {
    localStorage.setItem('fontSize', 'l');
    const { result } = renderHook(() => useSettings());
    expect(result.current.fontSize).toBe('l');
  });

  it('corrupt fontSize in localStorage falls back to default', () => {
    localStorage.setItem('fontSize', 'xyz');
    const { result } = renderHook(() => useSettings());
    expect(result.current.fontSize).toBe('m');
  });

  it('corrupt density in localStorage falls back to default', () => {
    localStorage.setItem('density', 'not-a-density');
    const { result } = renderHook(() => useSettings());
    expect(result.current.density).toBe('comfortable');
  });

  it('out-of-range stage4Threshold in localStorage falls back to default', () => {
    localStorage.setItem('stage4Threshold', '15');
    const { result } = renderHook(() => useSettings());
    expect(result.current.stage4Threshold).toBe(8);
  });

  it('non-integer stage4Threshold in localStorage falls back to default', () => {
    localStorage.setItem('stage4Threshold', 'abc');
    const { result } = renderHook(() => useSettings());
    expect(result.current.stage4Threshold).toBe(8);
  });

  it('setStage4Threshold accepts out-of-range without rejection (setter has no guard)', () => {
    // Behavioural lock: validation lives in the reader, not the setter.
    // The setter writes whatever it receives; a fresh mount with the
    // out-of-range value would then snap back to the default.
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.setStage4Threshold(99);
    });

    expect(result.current.stage4Threshold).toBe(99);
    expect(localStorage.getItem('stage4Threshold')).toBe('99');
  });
});
