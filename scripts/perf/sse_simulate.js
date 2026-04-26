// Simple Node simulation that emulates processing of SSE messages to benchmark batch handling
const N = parseInt(process.argv[2] || '50000', 10);
console.log(`Simulating ${N} messages`);
const start = Date.now();
let processed = 0;
// simple CPU-bound scoring emulation
function score(msg) {
  // trivial work
  let s = 0;
  for (let i = 0; i < 20; i++) s += (msg.charCodeAt(0) || 1) * i;
  return s;
}

for (let i = 0; i < N; i++) {
  const msg = `MSG-${i}`;
  score(msg);
  processed++;
}
const ms = Date.now() - start;
console.log(`Processed ${processed} messages in ${ms}ms (${(processed / ms).toFixed(2)} msg/ms)`);
process.exit(0);
