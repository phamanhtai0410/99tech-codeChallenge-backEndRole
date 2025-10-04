/**
 * Input Size Performance Demonstration
 * 
 * This script demonstrates which implementation to use for different input sizes
 * Run with: npm run problem4:demo-sizes
 */

import { sum_to_n_a, sum_to_n_b, sum_to_n_c } from '../index';

console.log('🎯 Input Size Performance Guide\n');

// Test different input sizes
const testSizes = [
  { size: 10, category: 'Tiny' },
  { size: 100, category: 'Small' },
  { size: 1000, category: 'Medium' },
  { size: 10000, category: 'Large' },
  { size: 100000, category: 'Very Large' },
  { size: 1000000, category: 'Huge' }
];

testSizes.forEach(({ size, category }) => {
  console.log(`\n=== ${category} Input (n = ${size.toLocaleString()}) ===`);
  
  // Formula (always works)
  const formulaStart = process.hrtime.bigint();
  const formulaResult = sum_to_n_b(size);
  const formulaEnd = process.hrtime.bigint();
  const formulaTime = Number(formulaEnd - formulaStart) / 1_000_000;
  
  console.log(`✅ Formula:    ${formulaTime.toFixed(3)}ms - Result: ${formulaResult.toLocaleString()}`);
  
  // Iterative (works but gets slower)
  if (size <= 100000) { // Don't test iterative on very large inputs
    const iterativeStart = process.hrtime.bigint();
    const iterativeResult = sum_to_n_a(size);
    const iterativeEnd = process.hrtime.bigint();
    const iterativeTime = Number(iterativeEnd - iterativeStart) / 1_000_000;
    
    const speedup = iterativeTime / formulaTime;
    console.log(`⚠️  Iterative: ${iterativeTime.toFixed(3)}ms - ${speedup.toFixed(1)}x slower than formula`);
  } else {
    console.log(`❌ Iterative: Too slow for this input size (would take ~${(size / 5000).toFixed(0)}ms)`);
  }
  
  // Recursive (only for small inputs)
  if (size <= 1000) {
    try {
      const recursiveStart = process.hrtime.bigint();
      const recursiveResult = sum_to_n_c(size);
      const recursiveEnd = process.hrtime.bigint();
      const recursiveTime = Number(recursiveEnd - recursiveStart) / 1_000_000;
      
      const speedup = recursiveTime / formulaTime;
      console.log(`⚠️  Recursive: ${recursiveTime.toFixed(3)}ms - ${speedup.toFixed(1)}x slower than formula`);
    } catch (error) {
      console.log(`❌ Recursive: ${(error as Error).message}`);
    }
  } else {
    console.log(`❌ Recursive: Stack overflow risk for n > 1000`);
  }
  
  // Recommendation
  if (size <= 100) {
    console.log(`💡 Recommendation: Any method works, but Formula is still best`);
  } else if (size <= 10000) {
    console.log(`💡 Recommendation: Formula preferred, Iterative acceptable`);
  } else {
    console.log(`💡 Recommendation: Formula ONLY - others too slow/risky`);
  }
});

console.log('\n📊 Summary of Recommendations:');
console.log('┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐');
console.log('│ Input Size      │ Formula O(1)    │ Iterative O(n)  │ Recursive O(n)  │');
console.log('├─────────────────┼─────────────────┼─────────────────┼─────────────────┤');
console.log('│ n ≤ 100         │ ✅ BEST         │ ✅ Good         │ ✅ Educational  │');
console.log('│ 100 < n ≤ 1K    │ ✅ BEST         │ ⚠️  Slower      │ ⚠️  Risk        │');
console.log('│ 1K < n ≤ 100K   │ ✅ BEST         │ ⚠️  Much Slower │ ❌ Overflow     │');
console.log('│ n > 100K        │ ✅ ONLY OPTION  │ ❌ Too Slow     │ ❌ Overflow     │');
console.log('└─────────────────┴─────────────────┴─────────────────┴─────────────────┘');

console.log('\n🎯 Key Takeaways:');
console.log('• Formula implementation scales to ANY input size');
console.log('• Iterative becomes noticeably slow after 10,000');
console.log('• Recursive risks stack overflow after 1,000');
console.log('• In production: ALWAYS use the formula approach');
console.log('• For learning: Show progression from recursive → iterative → formula');