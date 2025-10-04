/**
 * Test suite for Problem 4: Three ways to sum to n
 */

import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from '../index';

describe('Sum to N Implementations', () => {
  const testCases = [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
    { input: 5, expected: 15 },
    { input: 10, expected: 55 },
    { input: 100, expected: 5050 },
  ];

  describe('sum_to_n_a (Iterative)', () => {
    testCases.forEach(({ input, expected }) => {
      test(`sum_to_n_a(${input}) should return ${expected}`, () => {
        expect(sum_to_n_a(input)).toBe(expected);
      });
    });
  });

  describe('sum_to_n_b (Formula)', () => {
    testCases.forEach(({ input, expected }) => {
      test(`sum_to_n_b(${input}) should return ${expected}`, () => {
        expect(sum_to_n_b(input)).toBe(expected);
      });
    });
  });

  describe('sum_to_n_c (Recursive)', () => {
    testCases.forEach(({ input, expected }) => {
      test(`sum_to_n_c(${input}) should return ${expected}`, () => {
        expect(sum_to_n_c(input)).toBe(expected);
      });
    });
  });

  describe('All implementations should return the same result', () => {
    testCases.forEach(({ input, expected }) => {
      test(`All functions should return ${expected} for input ${input}`, () => {
        const resultA = sum_to_n_a(input);
        const resultB = sum_to_n_b(input);
        const resultC = sum_to_n_c(input);
        
        expect(resultA).toBe(expected);
        expect(resultB).toBe(expected);
        expect(resultC).toBe(expected);
        expect(resultA).toBe(resultB);
        expect(resultB).toBe(resultC);
      });
    });
  });

  describe('Edge cases', () => {
    test('Negative numbers should return 0', () => {
      expect(sum_to_n_a(-1)).toBe(0);
      expect(sum_to_n_b(-1)).toBe(0);
      expect(sum_to_n_c(-1)).toBe(0);
    });
  });
});