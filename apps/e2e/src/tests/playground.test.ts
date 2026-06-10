import { z } from 'zod';
import { createStagehand, PLAYGROUND_URL } from '../stagehand.js';
import type { Stagehand } from '@browserbasehq/stagehand';

let stagehand: Stagehand;

beforeAll(async () => {
  stagehand = createStagehand();
  await stagehand.init();
  await stagehand.page.goto(PLAYGROUND_URL, { waitUntil: 'networkidle' });
});

afterAll(async () => {
  await stagehand.close();
});

describe('Playground smoke tests', () => {
  test('page loads and shows online status', async () => {
    const { status } = await stagehand.extract({
      instruction: 'Find the online/offline status indicator in the header.',
      schema: z.object({ status: z.string() }),
    });
    expect(status.toLowerCase()).toMatch(/online/);
  });

  test('header shows eidos version badge', async () => {
    const { version } = await stagehand.extract({
      instruction: 'Find the version badge in the header (e.g. v1.0.x).',
      schema: z.object({ version: z.string() }),
    });
    expect(version).toMatch(/^v\d+\.\d+\.\d+/);
  });

  test('offline simulation toggle switches status to Offline', async () => {
    await stagehand.act({ action: 'Click the offline simulation toggle in the header.' });
    await stagehand.page.waitForTimeout(1500);

    const { status } = await stagehand.extract({
      instruction: 'Find the online/offline status indicator in the header.',
      schema: z.object({ status: z.string() }),
    });
    expect(status.toLowerCase()).toMatch(/offline|simulating/);

    // Restore online
    await stagehand.act({ action: 'Click the offline simulation toggle to go back online.' });
    await stagehand.page.waitForTimeout(1000);
  });

  test('Resources page shows /api/products entry', async () => {
    await stagehand.act({ action: 'Navigate to the Resources page using the navigation menu.' });
    await stagehand.page.waitForTimeout(1000);

    const { urls } = await stagehand.extract({
      instruction: 'List all resource URLs visible on the page.',
      schema: z.object({ urls: z.array(z.string()) }),
    });
    expect(urls.some((u) => u.includes('/api/products'))).toBe(true);
  });

  test('Resources page shows strategy for /api/products', async () => {
    const { strategy } = await stagehand.extract({
      instruction:
        'Find the caching strategy name for the /api/products resource (e.g. StaleWhileRevalidate, CacheFirst, NetworkFirst).',
      schema: z.object({ strategy: z.string() }),
    });
    expect(strategy).toMatch(/stalewhilerevalidate|cache.first|network.first/i);
  });

  test('Actions page loads with Replay Queue button', async () => {
    await stagehand.act({ action: 'Navigate to the Actions page using the navigation menu.' });
    await stagehand.page.waitForTimeout(1000);

    const { hasReplayButton } = await stagehand.extract({
      instruction: 'Check whether a "Replay Queue" button exists on the page.',
      schema: z.object({ hasReplayButton: z.boolean() }),
    });
    expect(hasReplayButton).toBe(true);
  });

  test('Demo page fetches products successfully', async () => {
    await stagehand.act({ action: 'Navigate to the Demo page using the navigation menu.' });
    await stagehand.page.waitForTimeout(1000);

    await stagehand.act({ action: 'Click the Fetch Products button.' });
    await stagehand.page.waitForTimeout(2000);

    const { result } = await stagehand.extract({
      instruction:
        'Find the result badge or status shown after fetching products (e.g. "cache hit", "fetched & cached", "error").',
      schema: z.object({ result: z.string() }),
    });
    expect(result.toLowerCase()).toMatch(/cache|fetch/);
  });

  test('offline order queues to IndexedDB', async () => {
    // Switch to offline
    await stagehand.act({ action: 'Click the offline simulation toggle in the header.' });
    await stagehand.page.waitForTimeout(1000);

    await stagehand.act({
      action: 'Click the Place Order button in the Orders section of the Demo page.',
    });
    await stagehand.page.waitForTimeout(1500);

    const { queued } = await stagehand.extract({
      instruction:
        'Check whether an order was queued for later (look for text like "queued", "will replay", or a queue count greater than 0).',
      schema: z.object({ queued: z.boolean() }),
    });
    expect(queued).toBe(true);

    // Restore online
    await stagehand.act({ action: 'Click the offline simulation toggle to go back online.' });
    await stagehand.page.waitForTimeout(1000);
  });
});
