import {describe, it, expect} from 'vitest';
import {
  isNum,
  isArr,
  isStr,
  isBool,
  isObj,
  isFunc,
  isUndef,
  isNull,
  isNil,
  isNone,
  isNaN,
  isEmpty,
  isDateString,
  isDate,
  count,
  min,
  max,
  minBy,
  maxBy,
  sum,
  mean,
  extent,
  extentBy,
  range,
  uniqueArray,
  ascending,
  descending,
  quantile,
  median,
  arrayFromThresholds,
  arrayFromRange,
  r2d,
  d2r,
  normalizeRadian,
  normalizeDegree,
  calcCenter,
  convertP2C,
  isNumEq,
  inRange,
  clamper,
  tickIncrement,
  tickStep,
  nice,
  ticks,
  toNum,
  financial,
  financialFormat,
  lowercase,
  uppercase,
  hashFnv32a,
  startsWith,
  subAttrs,
  defaultsDeep,
  groupBy,
  flatGroupBy,
  uid,
  uid8,
  identity,
  compose,
  quickSort,
  Bisector,
  Bin,
} from '../src/main';

// ── 类型守卫 ──

describe('guards', () => {
  describe('isNum', () => {
    it('returns true for numbers', () => {
      expect(isNum(42)).toBe(true);
      expect(isNum(0)).toBe(true);
      expect(isNum(-3.14)).toBe(true);
    });
    it('returns false for NaN', () => {
      expect(isNum(NaN)).toBe(false);
    });
    it('returns false for non-numbers', () => {
      expect(isNum('42')).toBe(false);
      expect(isNum(null)).toBe(false);
    });
  });

  describe('isArr', () => {
    it('identifies arrays', () => {
      expect(isArr([])).toBe(true);
      expect(isArr([1, 2])).toBe(true);
      expect(isArr('abc')).toBe(false);
    });
  });

  describe('isStr', () => {
    it('identifies strings', () => {
      expect(isStr('')).toBe(true);
      expect(isStr('hello')).toBe(true);
      expect(isStr(42)).toBe(false);
    });
  });

  describe('isBool', () => {
    it('identifies booleans', () => {
      expect(isBool(true)).toBe(true);
      expect(isBool(false)).toBe(true);
      expect(isBool(0)).toBe(false);
    });
  });

  describe('isObj', () => {
    it('identifies objects', () => {
      expect(isObj({})).toBe(true);
      expect(isObj([])).toBe(true);
      expect(isObj(null)).toBe(false);
      expect(isObj(42)).toBe(false);
    });
  });

  describe('isFunc', () => {
    it('identifies functions', () => {
      expect(isFunc(() => {})).toBe(true);
      expect(isFunc(42)).toBe(false);
    });
  });

  describe('isUndef / isNull / isNil', () => {
    it('isUndef', () => {
      expect(isUndef(undefined)).toBe(true);
      expect(isUndef(null)).toBe(false);
    });
    it('isNull', () => {
      expect(isNull(null)).toBe(true);
      expect(isNull(undefined)).toBe(false);
    });
    it('isNil', () => {
      expect(isNil(null)).toBe(true);
      expect(isNil(undefined)).toBe(true);
      expect(isNil(0)).toBe(false);
    });
  });

  describe('isNone', () => {
    it('returns true only for "none" string', () => {
      expect(isNone('none')).toBe(true);
      expect(isNone('None')).toBe(false);
      expect(isNone(null)).toBe(false);
    });
  });

  describe('isNaN', () => {
    it('detects NaN', () => {
      expect(isNaN(NaN)).toBe(true);
      expect(isNaN(0)).toBe(false);
      expect(isNaN('abc')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('nil is empty', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });
    it('empty string is empty', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('a')).toBe(false);
    });
    it('empty array is empty', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty([1])).toBe(false);
    });
    it('empty object is empty', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty({a: 1})).toBe(false);
    });
  });

  describe('isDateString / isDate', () => {
    it('detects valid date strings', () => {
      expect(isDateString('2024-01-01')).toBe(true);
      expect(isDateString('not-a-date')).toBe(false);
      expect(isDateString(42)).toBe(false);
    });
    it('detects Date instances and strings', () => {
      expect(isDate(new Date())).toBe(true);
      expect(isDate('2024-01-01')).toBe(true);
    });
  });
});

// ── 数组工具 ──

describe('array helpers', () => {
  describe('min / max', () => {
    it('finds min and max', () => {
      expect(min([3, 1, 4, 1, 5])).toBe(1);
      expect(max([3, 1, 4, 1, 5])).toBe(5);
    });
    it('skips NaN values', () => {
      expect(min([NaN, 3, 1])).toBe(1);
      expect(max([NaN, 3, 1])).toBe(3);
    });
  });

  describe('minBy / maxBy', () => {
    const data = [{v: 3}, {v: 1}, {v: 4}];
    it('finds element with min/max accessor value', () => {
      expect(minBy(data, d => d.v)).toEqual({v: 1});
      expect(maxBy(data, d => d.v)).toEqual({v: 4});
    });
  });

  describe('sum / mean', () => {
    it('calculates sum', () => {
      expect(sum([1, 2, 3, 4])).toBe(10);
    });
    it('calculates mean', () => {
      expect(mean([2, 4, 6])).toBe(4);
    });
  });

  describe('extent / extentBy', () => {
    it('returns [min, max]', () => {
      expect(extent([5, 2, 8, 1])).toEqual([1, 8]);
    });
    it('extentBy works with accessor', () => {
      const data = [{v: 5}, {v: 2}, {v: 8}];
      const [lo, hi] = extentBy(data, d => d.v);
      expect(lo).toEqual({v: 2});
      expect(hi).toEqual({v: 8});
    });
  });

  describe('range', () => {
    it('generates a range', () => {
      expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
    });
    it('generates a range with step', () => {
      expect(range(0, 10, 3)).toEqual([0, 3, 6, 9]);
    });
  });

  describe('uniqueArray', () => {
    it('removes duplicates', () => {
      expect(uniqueArray([1, 2, 2, 3, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('ascending / descending', () => {
    it('sorts numbers', () => {
      expect([3, 1, 2].sort(ascending)).toEqual([1, 2, 3]);
      expect([3, 1, 2].sort(descending)).toEqual([3, 2, 1]);
    });
    it('sorts strings', () => {
      expect(['c', 'a', 'b'].sort(ascending)).toEqual(['a', 'b', 'c']);
    });
    it('returns NaN for null/undefined', () => {
      expect(ascending(null, 1)).toBeNaN();
    });
  });

  describe('quantile / median', () => {
    it('returns median', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
    });
    it('returns quantile 0.25', () => {
      expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0)).toBe(1);
      expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1)).toBe(10);
    });
    it('returns NaN for empty array', () => {
      expect(quantile([], 0.5)).toBeNaN();
    });
  });

  describe('arrayFromThresholds', () => {
    it('splits domain by thresholds', () => {
      const result = arrayFromThresholds([30, 60], [0, 100]);
      expect(result).toEqual([
        [0, 30],
        [30, 60],
        [60, 100],
      ]);
    });
    it('returns full domain for empty thresholds', () => {
      expect(arrayFromThresholds([], [0, 100])).toEqual([[0, 100]]);
    });
  });

  describe('arrayFromRange', () => {
    it('pairs adjacent elements', () => {
      expect(arrayFromRange([0, 10, 20, 30])).toEqual([
        [0, 10],
        [10, 20],
        [20, 30],
      ]);
    });
    it('handles empty', () => {
      expect(arrayFromRange([])).toEqual([]);
    });
  });
});

// ── 数学工具 ──

describe('math helpers', () => {
  it('r2d and d2r are inverses', () => {
    expect(r2d * d2r).toBeCloseTo(1);
  });

  it('normalizeRadian wraps angles', () => {
    expect(normalizeRadian(3 * Math.PI)).toBeCloseTo(Math.PI);
  });

  it('normalizeDegree wraps angles', () => {
    expect(normalizeDegree(450)).toBe(90);
  });

  it('calcCenter returns midpoint', () => {
    expect(calcCenter(0, 10, 0, 20)).toEqual([5, 10]);
  });

  it('convertP2C converts polar to cartesian', () => {
    const [x, y] = convertP2C(0, 1);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
  });

  it('isNumEq checks approximate equality', () => {
    expect(isNumEq(1.0001, 1.0002, 0.001)).toBe(true);
    expect(isNumEq(1.0, 2.0, 0.1)).toBe(false);
  });

  it('inRange checks closed interval', () => {
    expect(inRange(5, 0, 10)).toBe(true);
    expect(inRange(0, 0, 10)).toBe(true);
    expect(inRange(-1, 0, 10)).toBe(false);
  });

  it('clamper creates clamping function', () => {
    const clamp = clamper(0, 100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(200)).toBe(100);
  });

  it('clamper swaps min/max if reversed', () => {
    const clamp = clamper(100, 0);
    expect(clamp(50)).toBe(50);
    expect(clamp(-10)).toBe(0);
  });
});

// ── 刻度计算 ──

describe('ticks', () => {
  it('generates tick values', () => {
    const t = ticks(0, 100, 5);
    expect(t.length).toBeGreaterThan(0);
    expect(t[0]).toBeGreaterThanOrEqual(0);
    expect(t[t.length - 1]).toBeLessThanOrEqual(100);
  });

  it('returns empty for count < 1', () => {
    expect(ticks(0, 10, 0)).toEqual([]);
  });

  it('returns single value when start equals end', () => {
    expect(ticks(5, 5, 10)).toEqual([5]);
  });

  it('tickStep returns positive step', () => {
    const step = tickStep(0, 100, 10);
    expect(step).toBeGreaterThan(0);
  });

  it('nice expands domain to nice values', () => {
    const [s, e] = nice(0.123, 9.876, 5);
    expect(s).toBeLessThanOrEqual(0.123);
    expect(e).toBeGreaterThanOrEqual(9.876);
  });
});

// ── 数值工具 ──

describe('number helpers', () => {
  it('toNum converts to number', () => {
    expect(toNum('42')).toBe(42);
    expect(toNum(true)).toBe(1);
  });

  it('financial rounds to precision', () => {
    expect(financial(3.14159, 2)).toBe(3.14);
    expect(financial(Infinity)).toBe(Infinity);
    expect(financial(42)).toBe(42);
  });

  it('financialFormat returns formatted string', () => {
    expect(financialFormat(3.14159, 2)).toBe('3.14');
    expect(financialFormat(Infinity)).toBe('Infinity');
  });
});

// ── 字符串工具 ──

describe('string helpers', () => {
  it('lowercase full string', () => {
    expect(lowercase('HELLO')).toBe('hello');
  });

  it('lowercase at position', () => {
    expect(lowercase('HELLO', 0)).toBe('hELLO');
  });

  it('lowercase range', () => {
    expect(lowercase('HELLO', 1, 3)).toBe('HelLO');
  });

  it('uppercase full string', () => {
    expect(uppercase('hello')).toBe('HELLO');
  });

  it('uppercase at position', () => {
    expect(uppercase('hello', 0)).toBe('Hello');
  });

  it('hashFnv32a returns number by default', () => {
    expect(typeof hashFnv32a('test', false)).toBe('number');
  });

  it('hashFnv32a returns hex string when requested', () => {
    const hash = hashFnv32a('test', true);
    expect(typeof hash).toBe('string');
    expect((hash as string).length).toBe(8);
  });

  it('hashFnv32a is consistent', () => {
    expect(hashFnv32a('abc', false)).toBe(hashFnv32a('abc', false));
  });
});

// ── 对象工具 ──

describe('object helpers', () => {
  it('startsWith filters keys by prefix', () => {
    const result = startsWith({fooBar: 1, fooBaz: 2, qux: 3}, 'foo');
    expect(result).toEqual({fooBar: 1, fooBaz: 2});
  });

  it('subAttrs extracts and strips prefix', () => {
    const result = subAttrs({labelText: 'hello', labelSize: 12, fill: 'red'}, 'label');
    expect(result).toHaveProperty('text', 'hello');
    expect(result).toHaveProperty('size', 12);
    expect(result).not.toHaveProperty('fill');
  });

  it('defaultsDeep fills missing values', () => {
    const target = {a: 1, b: {c: 2}};
    const result = defaultsDeep(target, [{a: 99, b: {c: 99, d: 3}, e: 4}]);
    expect(result.a).toBe(1); // existing value not overwritten
    expect(result.b.c).toBe(2); // existing nested not overwritten
    expect(result.b.d).toBe(3); // missing nested filled
    expect(result.e).toBe(4); // missing top-level filled
  });

  it('groupBy groups by key', () => {
    const data = [
      {type: 'a', v: 1},
      {type: 'b', v: 2},
      {type: 'a', v: 3},
    ];
    const grouped = groupBy(data, 'type');
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });

  it('flatGroupBy creates flat groups', () => {
    const data = [
      {x: 1, y: 'a', v: 10},
      {x: 1, y: 'b', v: 20},
      {x: 2, y: 'a', v: 30},
    ];
    const grouped = flatGroupBy(data, 'x', 'y');
    expect(grouped['1-a']).toHaveLength(1);
    expect(grouped['1-b']).toHaveLength(1);
    expect(grouped['2-a']).toHaveLength(1);
  });
});

// ── 函数工具 ──

describe('function helpers', () => {
  it('uid generates UUID-like string', () => {
    const id = uid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('uid8 generates 8-char string', () => {
    expect(uid8().length).toBe(8);
  });

  it('identity returns input', () => {
    expect(identity(42)).toBe(42);
    expect(identity('hello')).toBe('hello');
  });

  it('compose chains functions left-to-right', () => {
    const add1 = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const fn = compose(add1, double);
    expect(fn(3)).toBe(8); // (3+1)*2
  });
});

// ── 排序 ──

describe('quickSort', () => {
  it('sorts numbers in ascending order', () => {
    expect(quickSort([5, 3, 8, 1, 9, 2])).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('handles empty array', () => {
    expect(quickSort([])).toEqual([]);
  });

  it('handles single element', () => {
    expect(quickSort([42])).toEqual([42]);
  });

  it('handles already sorted', () => {
    expect(quickSort([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

// ── 二分查找 ──

describe('Bisector', () => {
  it('left finds insertion point', () => {
    const b = new Bisector();
    expect(b.left([1, 2, 3, 4, 5], 3)).toBe(2);
  });

  it('right finds insertion point after equal elements', () => {
    const b = new Bisector();
    expect(b.right([1, 2, 3, 3, 5], 3)).toBe(4);
  });

  it('fromField creates bisector with accessor', () => {
    const data = [{v: 1}, {v: 3}, {v: 5}];
    const b = Bisector.fromField((d: {v: number}) => d.v);
    expect(b.left(data, 3)).toBe(1);
  });
});

// ── 分箱器 ──

describe('Bin', () => {
  it('bins data into groups', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const bin = new Bin();
    const result = bin.bin(data);
    expect(result.length).toBeGreaterThan(0);
    // All items accounted for
    const totalItems = result.reduce((s, b) => s + b.length, 0);
    expect(totalItems).toBe(data.length);
  });

  it('respects custom thresholds', () => {
    const data = [1, 2, 3, 4, 5];
    const bin = new Bin();
    bin.setThresholds([3]);
    bin.setDomain([0, 6]);
    const result = bin.bin(data);
    expect(result.length).toBe(2);
  });

  it('returns empty for empty data', () => {
    expect(new Bin().bin([])).toEqual([]);
  });
});
