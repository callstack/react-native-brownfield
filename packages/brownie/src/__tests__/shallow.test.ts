import { shallow } from '../shallow';

describe('shallow', () => {
  it('returns true for identical primitives', () => {
    expect(shallow(1, 1)).toBe(true);
    expect(shallow('a', 'a')).toBe(true);
    expect(shallow(true, true)).toBe(true);
    expect(shallow(null, null)).toBe(true);
    expect(shallow(undefined, undefined)).toBe(true);
  });

  it('returns false for different primitives', () => {
    expect(shallow(1, 2)).toBe(false);
    expect(shallow('a', 'b')).toBe(false);
    expect(shallow(true, false)).toBe(false);
  });

  it('returns true for same object reference', () => {
    const obj = { a: 1 };
    expect(shallow(obj, obj)).toBe(true);
  });

  it('returns true for objects with same top-level values', () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false for objects with different top-level values', () => {
    expect(shallow({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallow({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('does not deeply compare nested objects', () => {
    const nested1 = { a: { b: 1 } };
    const nested2 = { a: { b: 1 } };
    expect(shallow(nested1, nested2)).toBe(false);
  });

  it('returns true for same nested object reference', () => {
    const inner = { b: 1 };
    expect(shallow({ a: inner }, { a: inner })).toBe(true);
  });

  it('returns true for equal arrays', () => {
    expect(shallow([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('returns false for arrays with different values', () => {
    expect(shallow([1, 2], [1, 3])).toBe(false);
    expect(shallow([1, 2], [1, 2, 3])).toBe(false);
  });

  it('returns true for equal Maps', () => {
    const mapA = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    const mapB = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    expect(shallow(mapA, mapB)).toBe(true);
  });

  it('returns false for Maps with different values', () => {
    const mapA = new Map([['a', 1]]);
    const mapB = new Map([['a', 2]]);
    expect(shallow(mapA, mapB)).toBe(false);
  });

  it('returns true for equal Sets', () => {
    const setA = new Set([1, 2, 3]);
    const setB = new Set([1, 2, 3]);
    expect(shallow(setA, setB)).toBe(true);
  });

  it('returns false for Sets with different values', () => {
    const setA = new Set([1, 2]);
    const setB = new Set([1, 3]);
    expect(shallow(setA, setB)).toBe(false);
  });

  it('returns false for different prototypes', () => {
    class A {
      x = 1;
    }
    class B {
      x = 1;
    }
    expect(shallow(new A(), new B())).toBe(false);
  });

  it('returns false when comparing object to null', () => {
    expect(shallow({ a: 1 }, null)).toBe(false);
    expect(shallow(null, { a: 1 })).toBe(false);
  });
});
