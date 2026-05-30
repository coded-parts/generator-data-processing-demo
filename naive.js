// naive.js
// The approach from the article that dies on big files:
// read the whole file into memory, split into an array of every line.
// Usage: node src/naive.js <csvPath>

const fs = require('fs');

const path = process.argv[2] || 'data/export.csv';

const rows = fs.readFileSync(path, 'utf8').split('\n');

let total = 0;
for (const row of rows) {
  if (!row || row.startsWith('id,')) continue; // skip header / trailing blank
  const amount = Number(row.split(',')[2]);
  if (!Number.isNaN(amount)) total += amount;
}

// rss = Resident Set Size: physical RAM used by the whole process.
const peakRssMB = +(process.memoryUsage().rss / 1024 / 1024).toFixed(0);
console.log(JSON.stringify({ approach: 'naive', total, peakRssMB }));
