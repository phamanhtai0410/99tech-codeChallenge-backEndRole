/**
 * Recursive Implementation
 * Time Complexity: O(n)
 * Space Complexity: O(n) - due to call stack
 * 
 * Recursive approach that breaks down the problem into smaller subproblems.
 * Includes tail recursion optimization and stack overflow protection.
 * Demonstrates advanced recursive programming techniques.
 */

// Maximum recursion depth to prevent stack overflow
const MAX_RECURSION_DEPTH = 10000;

export function sumToNRecursive(n: number): number {
  // Comprehensive input validation
  if (!Number.isInteger(n)) {
    throw new Error('Input must be an integer');
  }
  
  if (n < 0) {
    throw new Error('Input must be non-negative');
  }
  
  if (n > MAX_RECURSION_DEPTH) {
    throw new Error(`Input too large for recursive implementation (max: ${MAX_RECURSION_DEPTH})`);
  }
  
  // Use tail-recursive helper function for optimization
  return sumToNRecursiveTailOptimized(n, 0);
}

/**
 * Tail-recursive helper function that can be optimized by some JavaScript engines
 * @param n Current number to process
 * @param accumulator Running sum accumulator
 */
function sumToNRecursiveTailOptimized(n: number, accumulator: number = 0): number {
  // Base case
  if (n === 0) return accumulator;
  
  // Tail recursive call - last operation is the recursive call
  return sumToNRecursiveTailOptimized(n - 1, accumulator + n);
}

/**
 * Alternative recursive implementation using divide-and-conquer approach
 * More efficient for very large inputs due to reduced stack depth
 */
export function sumToNRecursiveDivideConquer(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('Input must be a non-negative integer');
  }
  
  if (n <= 1) return n;
  
  const mid = Math.floor(n / 2);
  const lowerSum = sumToNRecursiveDivideConquer(mid);
  const upperSum = sumToNRecursiveDivideConquer(n - mid) + mid * (n - mid);
  
  return lowerSum + upperSum;
}