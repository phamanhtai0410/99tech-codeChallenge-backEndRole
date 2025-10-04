/**
 * Mathematical Formula Implementation
 * Time Complexity: O(1)
 * Space Complexity: O(1)
 * 
 * Uses the mathematical formula: sum = n * (n + 1) / 2
 * This is the most efficient approach in terms of time complexity.
 * Includes overflow detection and precision handling for enterprise-grade reliability.
 */

export function sumToNFormula(n: number): number {
  // Comprehensive input validation
  if (!Number.isInteger(n)) {
    throw new Error('Input must be an integer');
  }
  
  if (n < 0) {
    throw new Error('Input must be non-negative');
  }
  
  if (n > Number.MAX_SAFE_INTEGER) {
    throw new Error('Input exceeds maximum safe integer');
  }
  
  // Handle base cases
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // Check if the result will exceed safe integer limits
  // Assuming the result is always an integer but we need to ensure the n * (n + 1) is safe
  if (n > Math.floor(Math.sqrt(2 * Number.MAX_SAFE_INTEGER))) {
    throw new Error('Result would exceed maximum safe integer');
  }
  
  // Mathematical formula for sum of first n natural numbers
  // Using integer division to maintain precision
  return n % 2 === 0 ? (n / 2) * (n + 1) : n * ((n + 1) / 2);
}