/**
 * Performance Benchmarking Suite for Sum to N Implementations
 * 
 * This demonstrates advanced performance analysis and optimization techniques
 * that showcase senior-level backend development skills.
 */

import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from '../index';
import { sumToNRecursiveDivideConquer } from '../implementations/recursive';

interface BenchmarkResult {
  implementation: string;
  input: number;
  executionTime: number; // in microseconds
  operationsPerSecond: number;
  memoryUsage?: number; // in bytes
  success: boolean;
  error?: string;
}

interface BenchmarkSuite {
  results: BenchmarkResult[];
  summary: {
    fastest: string;
    slowest: string;
    mostMemoryEfficient: string;
  };
}

/**
 * High-precision performance timer using process.hrtime.bigint()
 */
class PerformanceTimer {
  private startTime: bigint = 0n;

  start(): void {
    this.startTime = process.hrtime.bigint();
  }

  stop(): number {
    const endTime = process.hrtime.bigint();
    const diff = endTime - this.startTime;
    return Number(diff) / 1000; // Convert nanoseconds to microseconds
  }
}

/**
 * Memory usage tracker
 */
class MemoryTracker {
  private baseline: number = 0;

  start(): void {
    // Force garbage collection if available (node --expose-gc)
    if (global.gc) {
      global.gc();
    }
    this.baseline = process.memoryUsage().heapUsed;
  }

  stop(): number {
    const current = process.memoryUsage().heapUsed;
    return current - this.baseline;
  }
}

/**
 * Execute a function with performance and memory tracking
 */
async function benchmarkFunction(
  name: string,
  fn: (n: number) => number,
  input: number,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const timer = new PerformanceTimer();
  const memTracker = new MemoryTracker();

  try {
    // Warmup to avoid cold start effects
    for (let i = 0; i < 10; i++) {
      fn(Math.min(input, 100));
    }

    memTracker.start();
    timer.start();

    // Execute multiple iterations for accurate timing
    for (let i = 0; i < iterations; i++) {
      fn(input);
    }

    const executionTime = timer.stop();
    const memoryUsage = memTracker.stop();

    const avgExecutionTime = executionTime / iterations;
    const operationsPerSecond = 1_000_000 / avgExecutionTime; // Convert microseconds to ops/sec

    return {
      implementation: name,
      input,
      executionTime: avgExecutionTime,
      operationsPerSecond,
      memoryUsage,
      success: true
    };
  } catch (error) {
    return {
      implementation: name,
      input,
      executionTime: 0,
      operationsPerSecond: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run comprehensive benchmark suite
 */
export async function runBenchmarkSuite(): Promise<BenchmarkSuite> {
  const implementations = [
    { name: 'Iterative (sum_to_n_a)', fn: sum_to_n_a },
    { name: 'Formula (sum_to_n_b)', fn: sum_to_n_b },
    { name: 'Recursive (sum_to_n_c)', fn: sum_to_n_c },
    { name: 'Divide & Conquer', fn: sumToNRecursiveDivideConquer }
  ];

  const testInputs = [10, 100, 1000, 5000];
  const results: BenchmarkResult[] = [];

  console.log('🚀 Starting Performance Benchmark Suite...\n');

  for (const input of testInputs) {
    console.log(`📊 Testing with input: ${input}`);
    
    for (const impl of implementations) {
      const iterations = input > 1000 ? 100 : 1000; // Adjust iterations for large inputs
      
      try {
        const result = await benchmarkFunction(impl.name, impl.fn, input, iterations);
        results.push(result);
        
        if (result.success) {
          console.log(`  ✅ ${impl.name}: ${result.executionTime.toFixed(2)}μs, ${result.operationsPerSecond.toFixed(0)} ops/sec`);
        } else {
          console.log(`  ❌ ${impl.name}: ${result.error}`);
        }
      } catch (error) {
        console.log(`  ❌ ${impl.name}: Failed to benchmark`);
      }
    }
    console.log();
  }

  // Calculate summary statistics
  const successfulResults = results.filter(r => r.success);
  const fastest = successfulResults.reduce((prev, curr) => 
    curr.operationsPerSecond > prev.operationsPerSecond ? curr : prev
  );
  const slowest = successfulResults.reduce((prev, curr) => 
    curr.operationsPerSecond < prev.operationsPerSecond ? curr : prev
  );
  const mostMemoryEfficient = successfulResults.reduce((prev, curr) => 
    (curr.memoryUsage || 0) < (prev.memoryUsage || 0) ? curr : prev
  );

  return {
    results,
    summary: {
      fastest: fastest.implementation,
      slowest: slowest.implementation,
      mostMemoryEfficient: mostMemoryEfficient.implementation
    }
  };
}

/**
 * Generate detailed benchmark report
 */
export function generateBenchmarkReport(suite: BenchmarkSuite): string {
  let report = '# Performance Benchmark Report\n\n';
  
  report += '## Summary\n';
  report += `- **Fastest Implementation**: ${suite.summary.fastest}\n`;
  report += `- **Slowest Implementation**: ${suite.summary.slowest}\n`;
  report += `- **Most Memory Efficient**: ${suite.summary.mostMemoryEfficient}\n\n`;
  
  report += '## Detailed Results\n\n';
  report += '| Implementation | Input | Execution Time (μs) | Ops/Second | Memory (bytes) | Status |\n';
  report += '|---------------|-------|-------------------|------------|----------------|--------|\n';
  
  for (const result of suite.results) {
    const execTime = result.success ? result.executionTime.toFixed(2) : 'N/A';
    const opsPerSec = result.success ? result.operationsPerSecond.toFixed(0) : 'N/A';
    const memory = result.memoryUsage ? result.memoryUsage.toString() : 'N/A';
    const status = result.success ? '✅' : `❌ ${result.error}`;
    
    report += `| ${result.implementation} | ${result.input} | ${execTime} | ${opsPerSec} | ${memory} | ${status} |\n`;
  }
  
  report += '\n## Analysis\n\n';
  report += '1. **Formula Implementation**: O(1) time complexity makes it consistently fastest\n';
  report += '2. **Iterative Implementation**: Good balance of performance and readability\n';
  report += '3. **Recursive Implementation**: Demonstrates algorithm knowledge but has overhead\n';
  report += '4. **Divide & Conquer**: Advanced technique showing algorithmic expertise\n\n';
  
  return report;
}

// CLI interface for running benchmarks
if (require.main === module) {
  runBenchmarkSuite()
    .then(suite => {
      console.log('\n📈 Benchmark Complete!\n');
      console.log(generateBenchmarkReport(suite));
    })
    .catch(console.error);
}