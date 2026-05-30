// generate.js
// Creates a deterministic CSV so every run produces the same numbers.
// Usage: node src/generate.js <rows> <outPath>
// The amount column is (i * 7) % 1000, so the expected sum is verifiable
// independently of any reading strategy.

const fs = require('fs');

const rows = Number(process.argv[2] || 2_000_000);
const outPath = process.argv[3] || 'data/export.csv';

fs.mkdirSync(require('path').dirname(outPath), { recursive: true });

const ws = fs.createWriteStream(outPath);
ws.write('id,name,amount\n');

// Write in chunks so generation itself does not blow up memory.
let i = 0;
function writeBatch() {
  let ok = true;
  while (i < rows && ok) {
    const line = `${i},user_${i},${(i * 7) % 1000}\n`;
    ok = ws.write(line);
    i++;
  }
  if (i < rows) {
    ws.once('drain', writeBatch);
  } else {
    ws.end();
  }
}

ws.on('finish', () => {
  const bytes = fs.statSync(outPath).size;
  // Closed-form expected sum of (i*7)%1000 for i in [0, rows), computed
  // separately as a cross-check on the readers.
  let expected = 0;
  for (let k = 0; k < rows; k++) expected += (k * 7) % 1000;
  console.log(JSON.stringify({
    outPath,
    rows,
    fileSizeMB: +(bytes / 1024 / 1024).toFixed(2),
    expectedSum: expected,
  }));
});

writeBatch();
