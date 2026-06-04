# Verification environment

Reproducible checks for every measurable claim in the article
**"Processing a 2GB CSV in Node Without Running Out of Memory."**

Nothing here is mocked. It generates a real CSV, runs both the naive
load-everything approach and the generator pipeline in **separate processes**,
measures peak memory, and asserts the totals are correct against an
independently computed expected sum.

## Requirements

- Node.js 18 or newer (tested on Node 22). No npm install, zero dependencies.

## Quick start

```bash
# 1. Run the full check at the article's size (2,000,000 rows / ~45 MB)
node verify.js

# 2. Prove the headline claim: naive dies, pipeline survives the same heap cap
./stress.sh
```

That's it. `verify.js` exits 0 if all checks pass. `stress.sh` exits 0 if the
naive approach crashes while the pipeline succeeds.

## What each claim maps to

| Claim in the article | How it's verified | File |
|---|---|---|
| Both approaches produce the same total | Both totals asserted equal to a closed-form expected sum computed separately | `verify.js` |
| Naive holds ~5x the file size in RAM | Peak RSS measured in an isolated process | `src/naive.js` |
| Pipeline stays around 89-90 MB | Peak RSS measured in an isolated process | `src/pipeline.js` |
| Pipeline memory stays flat as the file grows | Same RSS at 45 MB and 390 MB file sizes | `./stress.sh` |
| "You can process a file bigger than your RAM" | Pipeline succeeds under a heap cap smaller than the file; naive OOMs | `./stress.sh` |

## Why separate processes

If you ran the naive and pipeline approaches in one process, the naive run's
allocations would still be sitting in memory (or mid-collection) when the
pipeline ran, polluting its RSS reading. `verify.js` spawns each as its own
`node` process so each peak-memory number reflects only that approach.

## Why RSS and not heapUsed

RSS (Resident Set Size) is the total physical RAM the process holds: the V8
heap **plus** the file read buffers, which live in C++ "external" memory, not
the JS heap. Reporting only `heapUsed` would hide the read-buffer cost and
flatter the streaming approach unfairly. RSS is the honest "what does this cost
the box" number, and it's the one that determines whether you OOM.

## Tuning the stress test

The default stress test uses a 128 MB heap cap against a ~390 MB file. If your
machine happens to give Node enough room that the naive version doesn't crash,
lower the cap or raise the row count:

```bash
./stress.sh 16000000 96     # smaller heap cap
./stress.sh 30000000 128    # bigger file (~730 MB)
```

## Expected output (representative)

```
naive       total=   999000000  peakRSS= 246 MB
pipeline    total=   999000000  peakRSS=  90 MB
...
[PASS]  naive total == expected sum
[PASS]  pipeline total == expected sum
[PASS]  naive total == pipeline total
[PASS]  pipeline peak RSS < naive peak RSS
        90 MB vs 246 MB (2.7x less)
ALL CHECKS PASSED
```

RSS values wobble a few MB run to run (GC timing, OS), which is normal. The
ratio and the pass/fail outcomes are stable.

## Cleanup

Generated CSVs land in `data/` and can get large. Delete them anytime:

```bash
rm -rf data/
```

## Get the Free Ebook
[Get it here](https://codedparts.gumroad.com/l/generators-in-js)

<p align="center">
<img width="600" height="600" alt="thumbnail" src="https://github.com/user-attachments/assets/6e41bef2-5d4f-4b59-b828-6a1d5dcd1cb6" />
</p>



