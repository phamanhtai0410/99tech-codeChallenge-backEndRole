/**
 * Problem 4: Three ways to sum to n
 * 
 * This file demonstrates three different implementations of the sum_to_n function.
 * Each implementation has different time and space complexity characteristics.
 */

import { sumToNIterative } from './implementations/iterative';
import { sumToNFormula } from './implementations/formula';
import { sumToNRecursive, sumToNRecursiveDivideConquer } from './implementations/recursive';

// Main function signatures as required
export function sum_to_n_a(n: number): number {
  return sumToNIterative(n);
}

export function sum_to_n_b(n: number): number {
  return sumToNFormula(n);
}

export function sum_to_n_c(n: number): number {
  return sumToNRecursive(n);
}

export function sum_to_n_d(n: number): number {
  return sumToNRecursiveDivideConquer(n);
}

// Demo function to show all implementations
export function demonstrateImplementations(n: number = 5): void {
  console.log(`\n=== Sum to ${n} Demo ===`);
  console.log(`Iterative (sum_to_n_a): ${sum_to_n_a(n)}`);
  console.log(`Formula (sum_to_n_b): ${sum_to_n_b(n)}`);
  console.log(`Recursive (sum_to_n_c): ${sum_to_n_c(n)}`);
  console.log(`[For very large input] Divide and Conquer Recursive (sum_to_n_d): ${sum_to_n_d(n)}`);
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateImplementations(5);
}