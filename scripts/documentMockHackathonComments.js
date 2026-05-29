#!/usr/bin/env node

const { normalizeFile, walkJavaFiles } = require('./normalizeMockHackathonMethodComments');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_ROOTS = [
  path.join(ROOT, 'imports/app/src/Mock_hackathon'),
  path.join(ROOT, 'imports/app/test/Mock_hackathon'),
];

function main() {
  const files = TARGET_ROOTS.flatMap(walkJavaFiles).sort();
  let updated = 0;

  for (const file of files) {
    if (normalizeFile(file)) {
      updated++;
    }
  }

  console.log(`Mock_hackathon Java files scanned: ${files.length}`);
  console.log(`Mock_hackathon Java files updated: ${updated}`);
}

if (require.main === module) {
  main();
}
