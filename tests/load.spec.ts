// tests/load/api-load.spec.ts
import { test, request } from '@playwright/test';

test('API load test with parallel requests', async () => {
  const concurrency = 50;
  const iterations = 10;
  const apiContext = await request.newContext();

  const start = Date.now();

  const tasks = [];
  for (let i = 0; i < concurrency * iterations; i++) {
    tasks.push(apiContext.get('https://conduit-api.bondaracademy.com/api/articles'));
  }


  const responses = await Promise.all(tasks);
  const okCount = responses.filter(r => r.ok()).length;
async function collectMetrics(fn: () => Promise<any>) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, duration: end - start };
}

// Usage
const { result, duration } = await collectMetrics(() =>
  apiContext.get('https://conduit-api.bondaracademy.com/api/articles')
);
console.log(`⏱ ${duration.toFixed(2)} ms`);

  console.log(`✅ ${okCount}/${responses.length} succeeded`);
  console.log(`⏱ Duration: ${(Date.now() - start) / 1000}s`);
});