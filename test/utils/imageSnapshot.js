import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Simple image snapshot utility for Node.js test runner
 * Replaces jest-image-snapshot functionality
 */

const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === 'true';

export function createImageSnapshotMatcher(config = {}) {
  const defaultConfig = {
    failureThreshold: 0,
    failureThresholdType: 'pixel',
    storeReceivedOnFailure: true,
    customDiffConfig: {
      threshold: 0,
      includeAA: false,
    },
    blur: 0,
    customSnapshotIdentifier: null
  };

  const finalConfig = { ...defaultConfig, ...config };

  return function toMatchImageSnapshot(received, options = {}) {
    const testConfig = { ...finalConfig, ...options };
    
    // Get test name from stack trace or use custom identifier
    let snapshotIdentifier;
    if (testConfig.customSnapshotIdentifier && typeof testConfig.customSnapshotIdentifier === 'function') {
      snapshotIdentifier = testConfig.customSnapshotIdentifier();
    } else {
      // Extract test name from stack trace
      const stack = new Error().stack;
      const testNameMatch = stack.match(/at Test\.<anonymous> \(.*?([^\\//]+)\.test\.js/);
      snapshotIdentifier = testNameMatch ? testNameMatch[1] : 'unknown-test';
    }

    // Ensure received is a Buffer
    if (!Buffer.isBuffer(received)) {
      throw new Error('Expected received value to be a Buffer');
    }

    // Create snapshots directory
    const snapshotsDir = path.join(process.cwd(), 'test/visual/__image_snapshots__');
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }

    const snapshotPath = path.join(snapshotsDir, `${snapshotIdentifier}-snap.png`);

    // If updating snapshots or snapshot doesn't exist, save the current image
    if (UPDATE_SNAPSHOTS || !fs.existsSync(snapshotPath)) {
      fs.writeFileSync(snapshotPath, received);
      return true; // Pass the test
    }

    // Load existing snapshot
    const existingSnapshot = fs.readFileSync(snapshotPath);

    // Compare images by hash (simple comparison)
    const receivedHash = crypto.createHash('sha256').update(received).digest('hex');
    const expectedHash = crypto.createHash('sha256').update(existingSnapshot).digest('hex');

    if (receivedHash === expectedHash) {
      return true; // Images match
    }

    // Images don't match
    if (testConfig.storeReceivedOnFailure) {
      const diffDir = path.join(snapshotsDir, '__diff_output__');
      if (!fs.existsSync(diffDir)) {
        fs.mkdirSync(diffDir, { recursive: true });
      }
      
      const receivedPath = path.join(diffDir, `${snapshotIdentifier}-received.png`);
      fs.writeFileSync(receivedPath, received);
      
      // eslint-disable-next-line no-console
      console.log(`Image snapshot failed: ${snapshotIdentifier}`);
      // eslint-disable-next-line no-console
      console.log(`Expected: ${snapshotPath}`);
      // eslint-disable-next-line no-console
      console.log(`Received: ${receivedPath}`);
    }

    throw new Error(`Image snapshot mismatch for ${snapshotIdentifier}`);
  };
}

export const imageSnapshotConfig = {
  failureThreshold: 0,
  failureThresholdType: 'pixel',
  customDiffConfig: {
    threshold: 0,
    includeAA: false,
  },
  blur: 0,
  storeReceivedOnFailure: true,
  customSnapshotIdentifier: ({ currentTestName, counter }) => {
    const testName = currentTestName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${testName}-${counter}`;
  }
};
