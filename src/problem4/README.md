# Problem 4: Three Ways to Sum to n

## Task
Provide 3 unique implementations of the following function in TypeScript:
```typescript
function sum_to_n(n: number): number
```

## Implementations

### 1. Iterative Approach (`sum_to_n_a`)
- **File**: `implementations/iterative.ts`
- **Time Complexity**: O(n)
- **Space Complexity**: O(1)
- **Description**: Uses a simple for loop to accumulate the sum from 1 to n.
- **Pros**: Easy to understand, constant space usage
- **Cons**: Linear time complexity

### 2. Mathematical Formula (`sum_to_n_b`)
- **File**: `implementations/formula.ts`
- **Time Complexity**: O(1)
- **Space Complexity**: O(1)
- **Description**: Uses the mathematical formula `n * (n + 1) / 2`
- **Pros**: Fastest execution, constant time and space
- **Cons**: May have floating-point precision issues for very large numbers

### 3. Recursive Approach (`sum_to_n_c`)
- **File**: `implementations/recursive.ts`
- **Time Complexity**: O(n)
- **Space Complexity**: O(n)
- **Description**: Recursively calculates `n + sum(n-1)`
- **Pros**: Demonstrates recursive thinking
- **Cons**: Function call overhead, stack space usage, potential stack overflow for large n

## Complexity Analysis

| Implementation | Time | Space | Notes |
|---------------|------|-------|--------|
| Iterative | O(n) | O(1) | Simple loop, best for readability |
| Formula | O(1) | O(1) | Most efficient, mathematical approach |
| Recursive | O(n) | O(n) | Educational, but least efficient |

## Usage

```typescript
import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from './index';

console.log(sum_to_n_a(5)); // 15
console.log(sum_to_n_b(5)); // 15
console.log(sum_to_n_c(5)); // 15
```

## Running the Code

```bash
npm run problem4
```

## Test Results
All implementations return the same result: `sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15`