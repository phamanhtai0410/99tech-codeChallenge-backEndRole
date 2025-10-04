/**
 * Iterative Implementation
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 * 
 * Simple loop-based approach that iterates from 1 to n and accumulates the sum.
 * Handles edge cases and provides input validation for production-ready code.
 */

export function sumToNIterative(n: number): number {
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
  
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    // Check for overflow
    if (sum + i > Number.MAX_SAFE_INTEGER) {
      throw new Error('Result exceeds maximum safe integer');
    }

    sum += i;
  }
  
  return sum;
}