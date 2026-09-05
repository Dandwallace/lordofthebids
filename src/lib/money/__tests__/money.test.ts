import { describe, expect, it } from 'vitest';
import {
  applyRate,
  formatMoney,
  formatPercent,
  parsePence,
  ratio,
  roundHalfAwayFromZero,
  toPence,
  toPounds,
} from '../money';

describe('pence conversion', () => {
  it('converts pounds to whole pence', () => {
    expect(toPence(12.34)).toBe(1234);
    expect(toPence(0.1)).toBe(10);
    expect(toPence(1999.99)).toBe(199999);
  });

  it('survives the classic floating point cases', () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004
    expect(toPence(0.1) + toPence(0.2)).toBe(30);
    expect(toPounds(toPence(0.1) + toPence(0.2))).toBe(0.3);
    // 1.005 * 100 is 100.49999999999999 in binary floating point
    expect(toPence(1.005)).toBe(101);
  });

  it('rounds half away from zero so losses do not shrink', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1);
  });
});

describe('parsePence', () => {
  it('accepts the shapes a person or an API produces', () => {
    expect(parsePence('12.34')).toBe(1234);
    expect(parsePence('£12.34')).toBe(1234);
    expect(parsePence('1,299.00')).toBe(129900);
    expect(parsePence(45)).toBe(4500);
  });

  it('returns null for unknowns rather than pretending they are zero', () => {
    expect(parsePence(null)).toBeNull();
    expect(parsePence(undefined)).toBeNull();
    expect(parsePence('')).toBeNull();
    expect(parsePence('n/a')).toBeNull();
  });
});

describe('applyRate', () => {
  it('rounds to whole pence', () => {
    expect(applyRate(1000, 0.129)).toBe(129);
    expect(applyRate(999, 0.129)).toBe(129); // 128.871 -> 129
    expect(applyRate(1234, 0.0035)).toBe(4); // 4.319 -> 4
  });
});

describe('ratio and formatting', () => {
  it('refuses to divide by a useless denominator', () => {
    expect(ratio(100, 0)).toBeNull();
    expect(ratio(100, -50)).toBeNull();
    expect(ratio(50, 200)).toBe(0.25);
  });

  it('renders unknowns as a dash, never as zero', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatPercent(null)).toBe('—');
    expect(formatMoney(1234)).toBe('£12.34');
    expect(formatPercent(0.2534, 1)).toBe('25.3%');
  });
});
