/**
 * Recursive Implementation
 * Time Complexity: O(n)
 * Space Complexity: O(n) - due to call stack
 * 
 * Recursive approach that breaks down the problem into smaller subproblems.
 * Less efficient than iterative due to function call overhead and stack usage.
 */

export function sumToNRecursive(n: number): number {
  // Base cases
  if (n < 0) return 0;
  if (n === 0) return 0;
  if (n === 1) return 1;
  
  // Recursive case: n + sum(n-1)
  return n + sumToNRecursive(n - 1);
}