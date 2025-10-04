/**
 * Iterative Implementation
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 * 
 * Simple loop-based approach that iterates from 1 to n and accumulates the sum.
 */

export function sumToNIterative(n: number): number {
  // Input validation
  if (n < 0) return 0;
  if (n === 0) return 0;
  
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  
  return sum;
}