import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { getBrowser, closeBrowser, createPage } from './utils/puppeteer.js';
import { renderButterchurn } from './utils/renderButterchurn.js';
import TestServer from './utils/testServer.js';
import { toMatchImageSnapshot, imageSnapshotConfig } from './setup.js';

const FRAMES_TO_RENDER = 120;
const SEED1 = 12345;
const SEED2 = 54321;

describe('Butterchurn Visual Regression Tests', () => {
  let testServer;
  let serverUrl;

  const width = 800;
  const height = 600;

  before(async () => {
    testServer = new TestServer();
    await testServer.start();
    serverUrl = testServer.getUrl();
    await getBrowser();
  });

  after(async () => {
    await closeBrowser();
    await testServer.stop();
  });

  const presetsSeedIndependent = [
    '_Mig_085',
    'Aderrasi - Potion of Spirits',
    'Flexi - mindblob mix',
    'Unchained - Rewop',
  ];

  const presetsSeedDependent = [
    'flexi + geiss - pogo cubes vs. tokamak vs. game of life [stahls jelly 4.5 finish]',
    'Flexi, martin + geiss - dedicated to the sherwin maxawow',
    'Geiss - Spiral Artifact',
    'martin - castle in the air',
    'martin - witchcraft reloaded',
    'yin - 191 - Temporal singularities',
  ];

  const testCases = [
    ...presetsSeedIndependent.map(preset => ({
      name: preset,
      seedIndependent: true
    })),
    ...presetsSeedDependent.map(preset => ({
      name: preset,
      seedIndependent: false
    }))
  ].sort(() => 0.5 - Math.random());

  let testAudioData;
  before(() => {
    const audioFilePath = path.join(process.cwd(), 'test/fixtures/audioAnalysisData.json');
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio analysis file not found: ${audioFilePath}\nPlease ensure audioAnalysisData.json is in the test/fixtures directory`);
    }
    testAudioData = JSON.parse(fs.readFileSync(audioFilePath, 'utf8'));
  });

  testCases.forEach(({ name, seedIndependent }) => {
    // JS preset tests (default, matches existing snapshots)
    test(`${name} - comprehensive regression test (JS)`, async () => {
      const page = await createPage();

      try {
        const audioData = testAudioData.slice(0, FRAMES_TO_RENDER);
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        const screenshot1 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED1, 'js');

        // Use custom image snapshot matcher
        assert.ok(toMatchImageSnapshot(screenshot1, {
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED1}`
        }), 'First screenshot should match snapshot');

        const screenshot2 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED2, 'js');

        // Use custom image snapshot matcher  
        assert.ok(toMatchImageSnapshot(screenshot2, {
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED2}`
        }), 'Second screenshot should match snapshot');

        // Compare image hashes instead of raw buffers to avoid slow diff generation
        const hash1 = crypto.createHash('sha256').update(screenshot1).digest('hex');
        const hash2 = crypto.createHash('sha256').update(screenshot2).digest('hex');

        if (seedIndependent) {
          assert.strictEqual(hash2, hash1, 'Hashes should be equal for seed-independent presets');
        } else {
          assert.notStrictEqual(hash2, hash1, 'Hashes should be different for seed-dependent presets');
        }
      } finally {
        await page.close();
      }
    });

    // WASM preset tests (new, with _wasm suffix)
    test(`${name} - comprehensive regression test (WASM)`, async () => {
      const page = await createPage();

      try {
        const audioData = testAudioData.slice(0, FRAMES_TO_RENDER);
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        const screenshot1 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED1, 'wasm');

        // Use custom image snapshot matcher
        assert.ok(toMatchImageSnapshot(screenshot1, {
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED1}_wasm`
        }), 'First WASM screenshot should match snapshot');

        const screenshot2 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED2, 'wasm');

        // Use custom image snapshot matcher
        assert.ok(toMatchImageSnapshot(screenshot2, {
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED2}_wasm`
        }), 'Second WASM screenshot should match snapshot');

        // Compare image hashes instead of raw buffers to avoid slow diff generation
        const hash1 = crypto.createHash('sha256').update(screenshot1).digest('hex');
        const hash2 = crypto.createHash('sha256').update(screenshot2).digest('hex');

        if (seedIndependent) {
          assert.strictEqual(hash2, hash1, 'WASM hashes should be equal for seed-independent presets');
        } else {
          assert.notStrictEqual(hash2, hash1, 'WASM hashes should be different for seed-dependent presets');
        }
      } finally {
        await page.close();
      }
    });
  });
});
