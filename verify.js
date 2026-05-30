// verify.js
// Orchestrates the whole check:
//   1. generate a deterministic CSV
//   2. run the naive approach in its own process, capture peak RSS
//   3. run the generator pipeline in its own process, capture peak RSS
//   4. assert both produce the same total, equal to the closed-form expected sum
//   5. print a table and the article's claimed ratio
//
// Each approach runs in a SEPARATE process. That matters: if you ran both in
// one process, the naive run's allocations would pollute the pipeline's memory
// reading. Isolation is the only honest way to measure peak RSS per approach.
//
// Usage: node verify.js [rows]   (default 2,000,000)

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rows = Number(process.argv[2] || 2_000_000);
const csvPath = path.join(__dirname, 'data', 'export.csv');

function run(label, file, args) {
  // --expose-gc lets the child force collection before reading RSS,
  // so the number reflects live memory, not uncollected garbage.
  const res = spawnSync(
    process.execPath,
    ['--expose-gc', path.join(__dirname, 'src', file), ...args],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 }
  );
  if (res.status !== 0) {
    return { label, crashed: true, stderr: (res.stderr || '').trim().split('\n').slice(-3).join('\n') };
  }
  const line = res.stdout.trim().split('\n').filter(Boolean).pop();
  return { label, ...JSON.parse(line) };
}

console.log(`\nGenerating CSV with ${rows.toLocaleString()} rows...`);
const gen = run('generate', 'generate.js', [String(rows), csvPath]);
console.log(`  file: ${gen.fileSizeMB} MB, expected sum: ${gen.expectedSum.toLocaleString()}\n`);

console.log('Running naive (load everything into an array)...');
const naive = run('naive', 'naive.js', [csvPath]);

console.log('Running generator pipeline (stream one row at a time)...');
const pipe = run('pipeline', 'pipeline.js', [csvPath]);

console.log('\n=== Results ===\n');

function reportRow(r) {
  if (r.crashed) {
    console.log(`  ${r.label.padEnd(10)}  CRASHED`);
    console.log(`    ${r.stderr.replace(/\n/g, '\n    ')}`);
    return;
  }
  console.log(
    `  ${r.label.padEnd(10)}  total=${String(r.total).padStart(12)}  peakRSS=${String(r.peakRssMB).padStart(4)} MB`
  );
}
reportRow(naive);
reportRow(pipe);

console.log('\n=== Claim checks ===\n');

const checks = [];

// Check 1: both totals match the independent closed-form expected sum.
const naiveTotal = naive.crashed ? null : naive.total;
const pipeTotal = pipe.crashed ? null : pipe.total;

checks.push([
  'naive total == expected sum',
  naiveTotal === gen.expectedSum,
  `${naiveTotal} vs ${gen.expectedSum}`,
]);
checks.push([
  'pipeline total == expected sum',
  pipeTotal === gen.expectedSum,
  `${pipeTotal} vs ${gen.expectedSum}`,
]);
checks.push([
  'naive total == pipeline total',
  naiveTotal === pipeTotal,
  `${naiveTotal} vs ${pipeTotal}`,
]);

// Check 2: pipeline uses meaningfully less peak memory than naive.
if (!naive.crashed && !pipe.crashed) {
  const ratio = naive.peakRssMB / pipe.peakRssMB;
  checks.push([
    'pipeline peak RSS < naive peak RSS',
    pipe.peakRssMB < naive.peakRssMB,
    `${pipe.peakRssMB} MB vs ${naive.peakRssMB} MB (${ratio.toFixed(1)}x less)`,
  ]);
}

let allPass = true;
for (const [name, pass, detail] of checks) {
  allPass = allPass && pass;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}]  ${name}`);
  console.log(`          ${detail}`);
}

console.log('');
if (!naive.crashed && !pipe.crashed) {
  console.log(`  File was ${gen.fileSizeMB} MB. Naive held ${(naive.peakRssMB / gen.fileSizeMB).toFixed(1)}x the file size in RAM;`);
  console.log(`  pipeline held ${(pipe.peakRssMB / gen.fileSizeMB).toFixed(1)}x. The pipeline number stays roughly flat as the file grows.`);
}

console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}\n`);
process.exit(allPass ? 0 : 1);
