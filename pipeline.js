// pipeline.js
// The streaming generator pipeline from the article.
// Reads one line at a time, parses, filters, sums. Holds one row at a time.
// Usage: node src/pipeline.js <csvPath>

const fs = require('fs');
const readline = require('readline');

async function* readLines(path) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    yield line;
  }
}

async function* parse(lines) {
  for await (const line of lines) {
    const [id, name, amount] = line.split(',');
    if (id === 'id') continue; // skip header
    if (amount === undefined) continue; // skip trailing blank
    yield { id, name, amount: Number(amount) };
  }
}

async function* onlyAbove(rows, min) {
  for await (const row of rows) {
    if (row.amount >= min) {
      yield row;
    }
  }
}

(async () => {
  const filtered = onlyAbove(parse(readLines(path())), 0);

  let total = 0;
  let count = 0;
  for await (const row of filtered) {
    total += row.amount;
    count++;
  }

  const peakRssMB = +(process.memoryUsage().rss / 1024 / 1024).toFixed(0);
  console.log(JSON.stringify({ approach: 'pipeline', total, count, peakRssMB }));
})();

function path() {
  return process.argv[2] || 'data/export.csv';
}
