/**
 * Comprehensive Test Suite for Problem 4
 * Demonstrates advanced testing patterns and edge case coverage
 */

import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from '../index';
import { sumToNRecursiveDivideConquer } from '../implementations/recursive';

describe('Sum to N - Advanced Test Suite', () => {
  // Standard test cases
  const standardTestCases = [
    { input: 0, expected: 0, description: 'zero returns zero' },
    { input: 1, expected: 1, description: 'one returns one' },
    { input: 5, expected: 15, description: 'basic positive integer' },
    { input: 10, expected: 55, description: 'double-digit number' },
    { input: 100, expected: 5050, description: 'larger number' },
    { input: 1000, expected: 500500, description: 'very large number' }
  ];

  // Edge cases that demonstrate robust error handling
  const edgeCases = [
    { input: -1, shouldThrow: true, description: 'negative number' },
    { input: 1.5, shouldThrow: true, description: 'non-integer number' },
    { input: Number.MAX_SAFE_INTEGER + 1, shouldThrow: true, description: 'unsafe large integer' },
    { input: NaN, shouldThrow: true, description: 'NaN input' },
    { input: Infinity, shouldThrow: true, description: 'Infinity input' }
  ];

  // Performance test cases
  const performanceTestCases = [
    { input: 10000, maxTime: 50, description: 'performance with 10k' },
    { input: 50000, maxTime: 100, description: 'performance with 50k' }
  ];

  describe('Standard Functionality Tests', () => {
    const implementations = [
      { name: 'sum_to_n_a (Iterative)', fn: sum_to_n_a },
      { name: 'sum_to_n_b (Formula)', fn: sum_to_n_b },
      { name: 'sum_to_n_c (Recursive)', fn: sum_to_n_c }
    ];

    implementations.forEach(({ name, fn }) => {
      describe(name, () => {
        standardTestCases.forEach(({ input, expected, description }) => {
          test(`should handle ${description}: ${input} → ${expected}`, () => {
            expect(fn(input)).toBe(expected);
          });
        });
      });
    });
  });

  describe('Cross-Implementation Consistency', () => {
    standardTestCases.forEach(({ input, expected, description }) => {
      test(`all implementations should return ${expected} for ${description}`, () => {
        const results = [
          sum_to_n_a(input),
          sum_to_n_b(input),
          sum_to_n_c(input)
        ];

        // All should be equal to expected
        results.forEach(result => expect(result).toBe(expected));

        // All should be equal to each other
        expect(results[0]).toBe(results[1]);
        expect(results[1]).toBe(results[2]);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const implementations = [
      { name: 'sum_to_n_a', fn: sum_to_n_a },
      { name: 'sum_to_n_b', fn: sum_to_n_b },
      { name: 'sum_to_n_c', fn: sum_to_n_c }
    ];

    implementations.forEach(({ name, fn }) => {
      describe(`${name} error handling`, () => {
        edgeCases.forEach(({ input, shouldThrow, description }) => {
          if (shouldThrow) {
            test(`should throw error for ${description}`, () => {
              expect(() => fn(input)).toThrow();
            });
          }
        });
      });
    });
  });

  describe('Performance Tests', () => {
    // Only test iterative and formula for performance (recursive is too slow for large inputs)
    const fastImplementations = [
      { name: 'sum_to_n_a (Iterative)', fn: sum_to_n_a },
      { name: 'sum_to_n_b (Formula)', fn: sum_to_n_b }
    ];

    fastImplementations.forEach(({ name, fn }) => {
      describe(`${name} performance`, () => {
        performanceTestCases.forEach(({ input, maxTime, description }) => {
          test(`should complete ${description} within ${maxTime}ms`, () => {
            const startTime = process.hrtime.bigint();
            
            const result = fn(input);
            
            const endTime = process.hrtime.bigint();
            const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
            
            expect(executionTime).toBeLessThan(maxTime);
            expect(result).toBe((input * (input + 1)) / 2); // Verify correctness
          });
        });
      });
    });
  });

  describe('Advanced Algorithm Tests', () => {
    describe('Divide and Conquer Implementation', () => {
      const testCases = [
        { input: 0, expected: 0 },
        { input: 1, expected: 1 },
        { input: 10, expected: 55 },
        { input: 100, expected: 5050 }
      ];

      testCases.forEach(({ input, expected }) => {
        test(`divide and conquer: ${input} → ${expected}`, () => {
          expect(sumToNRecursiveDivideConquer(input)).toBe(expected);
        });
      });

      test('should handle larger inputs better than simple recursion', () => {
        const input = 5000;
        const expected = (input * (input + 1)) / 2;
        
        expect(sumToNRecursiveDivideConquer(input)).toBe(expected);
        // This would cause stack overflow with simple recursion
        expect(() => sum_to_n_c(input)).toThrow();
      });
    });
  });

  describe('Mathematical Properties Verification', () => {
    test('should satisfy mathematical properties', () => {
      // Property: sum(n) = sum(n-1) + n
      for (let n = 1; n <= 100; n++) {
        const sumN = sum_to_n_b(n);
        const sumNMinus1 = sum_to_n_b(n - 1);
        expect(sumN).toBe(sumNMinus1 + n);
      }
    });

    test('should be monotonically increasing', () => {
      let previous = 0;
      for (let n = 0; n <= 100; n++) {
        const current = sum_to_n_b(n);
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    });

    test('should match triangular number formula', () => {
      // Triangular numbers: T(n) = n(n+1)/2
      for (let n = 0; n <= 100; n++) {
        const result = sum_to_n_b(n);
        const triangular = (n * (n + 1)) / 2;
        expect(result).toBe(triangular);
      }
    });
  });

  describe('Memory Usage Tests', () => {
    test('iterative implementation should have constant memory usage', () => {
      const baseline = process.memoryUsage().heapUsed;
      
      // Run multiple iterations to check for memory leaks
      for (let i = 0; i < 1000; i++) {
        sum_to_n_a(1000);
      }
      
      const afterUsage = process.memoryUsage().heapUsed;
      const memoryIncrease = afterUsage - baseline;
      
      // Should not increase significantly (allowing for some garbage collection variance)
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
    });

    test('formula implementation should have minimal memory usage', () => {
      const baseline = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 10000; i++) {
        sum_to_n_b(1000);
      }
      
      const afterUsage = process.memoryUsage().heapUsed;
      const memoryIncrease = afterUsage - baseline;
      
      // Formula should have virtually no memory increase
      expect(memoryIncrease).toBeLessThan(512 * 1024); // Less than 512KB increase
    });
  });

  describe('Boundary Value Tests', () => {
    test('should handle boundary values correctly', () => {
      // Test values around boundaries
      const boundaryTests = [
        { input: 0, expected: 0 },
        { input: 1, expected: 1 },
        { input: 2, expected: 3 },
        { input: Number.MAX_SAFE_INTEGER - 1, shouldNotThrow: false }, // Would overflow
      ];

      boundaryTests.forEach(({ input, expected, shouldNotThrow }) => {
        if (expected !== undefined) {
          expect(sum_to_n_b(input)).toBe(expected);
        } else if (shouldNotThrow === false) {
          expect(() => sum_to_n_b(input)).toThrow();
        }
      });
    });
  });

  describe('Input Type Validation', () => {
    const invalidInputs = [
      { input: '5' as any, description: 'string number' },
      { input: [5] as any, description: 'array' },
      { input: { value: 5 } as any, description: 'object' },
      { input: null as any, description: 'null' },
      { input: undefined as any, description: 'undefined' }
    ];

    invalidInputs.forEach(({ input, description }) => {
      test(`should reject ${description}`, () => {
        expect(() => sum_to_n_a(input)).toThrow();
        expect(() => sum_to_n_b(input)).toThrow();
        expect(() => sum_to_n_c(input)).toThrow();
      });
    });
  });
});