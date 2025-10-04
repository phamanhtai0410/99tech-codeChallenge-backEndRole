/**
 * Mathematical Formula Implementation
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 * 
 * Uses the mathematical formula: sum = n * (n + 1) / 2
 * This is the most efficient approach in terms of time complexity.
 */

export function sumToNFormula(n: number): number {
  // Input validation
  if (n < 0) return 0;
  if (n === 0) return 0;
  
  // Mathematical formula for sum of first n natural numbers
  return (n * (n + 1)) / 2;
}