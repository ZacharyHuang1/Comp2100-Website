#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { pool, query } = require('../src/db');
const { tasks } = require('./generateMockHackathonCodebase');

const ROOT = path.join(__dirname, '..');
const MOCK_ROOT = path.join(ROOT, 'imports', 'app', 'src', 'Mock_hackathon');
const CLASS_DIR = '/tmp/mock-hackathon-validation-classes';
const EXPECTED = { DS: 48, PD: 40, DP: 40 };

function fail(message, failures) {
  failures.push(message);
}

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function countByPrefix(items, prefix) {
  return items.filter((task) => task.id.startsWith(prefix)).length;
}

function countTestsInFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return (source.match(/@Test\b/g) || []).length;
}

function readSource(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function isPlaceholderOnly(source) {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .trim();

  return (
    stripped.length < 400 ||
    /UnsupportedOperationException/.test(stripped) ||
    /\bTODO\b/i.test(stripped)
  );
}

function allJavaFiles() {
  const files = [];
  for (const task of tasks) {
    files.push(task.sourcePath, task.testPath);
  }
  return files;
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
}

function compileGeneratedFiles() {
  fs.rmSync(CLASS_DIR, { recursive: true, force: true });
  fs.mkdirSync(CLASS_DIR, { recursive: true });
  const classpath = [
    'imports/app/src',
    'imports/app/lib/junit-4.13.jar',
    'imports/app/lib/hamcrest-core-1.3.jar',
  ].join(':');

  return runCommand('javac', ['-cp', classpath, '-d', CLASS_DIR, ...allJavaFiles()]);
}

function runGeneratedTests() {
  const classpath = [
    CLASS_DIR,
    'imports/app/src',
    'imports/app/lib/junit-4.13.jar',
    'imports/app/lib/hamcrest-core-1.3.jar',
  ].join(':');
  const testClasses = tasks.map((task) => `hackathon.${task.className}Test`);

  return runCommand('java', [
    '-cp',
    classpath,
    'org.junit.runner.JUnitCore',
    ...testClasses,
  ]);
}

function hasHackathonPackage(source) {
  return /^\s*package\s+hackathon\s*;/m.test(source);
}

function hasOldMockPackage(source) {
  return /^\s*package\s+Mock_hackathon\./m.test(source);
}

function hasMockPackageImport(source) {
  return /^\s*import\s+Mock_hackathon\./m.test(source);
}

function hasWildcardImport(source) {
  return source
    .split('\n')
    .some((line) => {
      const trimmed = line.trim();
      return /^import\s+(?:static\s+)?[\w.]+\.\*\s*;/.test(trimmed)
        && trimmed !== 'import static org.junit.Assert.*;';
    });
}

function simplifiedDescriptionFor(task) {
  return [`Feature: ${task.feature}`, '', `Task: ${task.likelyHackathonTask}`].join('\n').trim();
}

async function checkDatabaseCoverage() {
  const results = [];

  for (const task of tasks) {
    const title = `${task.className}.java`;
    const result = await query(
      `
        SELECT
          t.id AS topic_id,
          ct.id AS content_id,
          ct.explanation,
          ct.complexity,
          ct.uml,
          ct.task_description,
          cv.id AS test_case_variant_id,
          cv.code AS test_case_code,
          COUNT(cs.id)::int AS symbol_count
        FROM topics t
        INNER JOIN categories c ON c.id = t.category_id
        LEFT JOIN contents ct ON ct.topic_id = t.id
        LEFT JOIN content_variants cv
          ON cv.topic_id = t.id AND cv.label = 'Test Case'
        LEFT JOIN content_symbols cs
          ON cs.content_id = ct.id
        WHERE lower(t.title) = lower($1)
          AND c.name = $2
        GROUP BY t.id, ct.id, cv.id
        ORDER BY t.id ASC
        LIMIT 1
      `,
      [title, task.category]
    );

    const row = result.rows[0];
    results.push({
      id: task.id,
      title,
      topicImported: Boolean(row?.topic_id),
      testCaseChunkAttached: Boolean(row?.test_case_variant_id),
      hasExplanation: Boolean(row?.explanation && row.explanation.trim()),
      hasComplexity: Boolean(row?.complexity && row.complexity.trim()),
      hasUml: Boolean(row?.uml && row.uml.trim()),
      hasSimplifiedTaskDescription: String(row?.task_description || '').trim() === simplifiedDescriptionFor(task),
      testCaseHasHackathonPackage: row?.test_case_code ? hasHackathonPackage(row.test_case_code) : false,
      symbolIndexed: Number(row?.symbol_count || 0) > 0,
    });
  }

  return results;
}

function writeReport({ failures, compileResult, testResult, dbResults, counts }) {
  const dbChecked = Array.isArray(dbResults);
  const dbImported = dbChecked
    ? dbResults.filter((result) => result.topicImported).length
    : 0;
  const dbAttached = dbChecked
    ? dbResults.filter((result) => result.testCaseChunkAttached).length
    : 0;
  const dbExplained = dbChecked
    ? dbResults.filter((result) => result.hasExplanation).length
    : 0;
  const dbComplexity = dbChecked
    ? dbResults.filter((result) => result.hasComplexity).length
    : 0;
  const dbUml = dbChecked
    ? dbResults.filter((result) => result.hasUml).length
    : 0;
  const dbSimplifiedDescriptions = dbChecked
    ? dbResults.filter((result) => result.hasSimplifiedTaskDescription).length
    : 0;
  const dbTestCasesHackathonPackage = dbChecked
    ? dbResults.filter((result) => result.testCaseHasHackathonPackage).length
    : 0;
  const dbSymbols = dbChecked
    ? dbResults.filter((result) => result.symbolIndexed).length
    : 0;
  const lines = [
    '# Mock Hackathon Validation Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    `- DS implementation files: ${counts.DS}/${EXPECTED.DS}`,
    `- PD implementation files: ${counts.PD}/${EXPECTED.PD}`,
    `- DP implementation files: ${counts.DP}/${EXPECTED.DP}`,
    `- DS test files: ${counts.DSTests}/${EXPECTED.DS}`,
    `- PD test files: ${counts.PDTests}/${EXPECTED.PD}`,
    `- DP test files: ${counts.DPTests}/${EXPECTED.DP}`,
    `- Manifest task count: ${counts.manifestTasks}/128`,
    `- Compile status: ${compileResult.status === 0 ? 'passed' : 'failed'}`,
    `- Generated JUnit status: ${testResult.status === 0 ? 'passed' : 'failed'}`,
    `- DB imported topics: ${dbChecked ? `${dbImported}/128` : 'not checked'}`,
    `- Test Case blocks attached: ${dbChecked ? `${dbAttached}/128` : 'not checked'}`,
    `- DB explanations present: ${dbChecked ? `${dbExplained}/128` : 'not checked'}`,
    `- DB software architecture/UML descriptions present: ${dbChecked ? `${dbComplexity}/128` : 'not checked'}`,
    `- DB UML present: ${dbChecked ? `${dbUml}/128` : 'not checked'}`,
    `- DB simplified task descriptions: ${dbChecked ? `${dbSimplifiedDescriptions}/128` : 'not checked'}`,
    `- Test Case blocks with package hackathon: ${dbChecked ? `${dbTestCasesHackathonPackage}/128` : 'not checked'}`,
    `- Symbol index coverage: ${dbChecked ? `${dbSymbols}/128` : 'not checked'}`,
    '',
    '## Known Limitations',
    failures.length
      ? failures.map((failure) => `- ${failure}`).join('\n')
      : '- None for generated Mock_hackathon files.',
    '',
  ];

  if (compileResult.status !== 0) {
    lines.push('## Compile Output', '', '```text', compileResult.stderr || compileResult.stdout, '```', '');
  }

  if (testResult.status !== 0) {
    lines.push('## Test Output', '', '```text', testResult.stderr || testResult.stdout, '```', '');
  }

  fs.writeFileSync(
    path.join(MOCK_ROOT, 'MockHackathonValidationReport.md'),
    lines.join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(MOCK_ROOT, 'MockHackathonFinalAuditReport.md'),
    [
      '# Mock Hackathon Final Audit Report',
      '',
      '## Summary',
      failures.length
        ? 'The audit found issues that must be fixed before claiming completion.'
        : 'All 128 Mock_hackathon tasks are implemented, tested, imported, documented, and linked to Test Case blocks.',
      '',
      '## Counts',
      `- DS implementations: ${counts.DS}/${EXPECTED.DS}`,
      `- PD implementations: ${counts.PD}/${EXPECTED.PD}`,
      `- DP implementations: ${counts.DP}/${EXPECTED.DP}`,
      `- DS tests: ${counts.DSTests}/${EXPECTED.DS}`,
      `- PD tests: ${counts.PDTests}/${EXPECTED.PD}`,
      `- DP tests: ${counts.DPTests}/${EXPECTED.DP}`,
      `- Test Case blocks: ${dbChecked ? `${dbAttached}/128` : 'not checked'}`,
      '',
      '## Compile Result',
      compileResult.status === 0 ? 'Generated Mock_hackathon Java compilation passed.' : 'Generated Mock_hackathon Java compilation failed.',
      '',
      '## Test Result',
      testResult.status === 0 ? 'Generated Mock_hackathon JUnit tests passed.' : 'Generated Mock_hackathon JUnit tests failed.',
      '',
      '## Website Import Result',
      dbChecked
        ? `Imported topics ${dbImported}/128, explanations ${dbExplained}/128, software architecture/UML descriptions ${dbComplexity}/128, UML ${dbUml}/128, symbols ${dbSymbols}/128.`
        : 'Database was not reachable during validation.',
      '',
      '## Search Validation Result',
      'The audit verifies symbol index coverage for all 128 implementation topics after import/enrich/index. Browser or API search checks should be run separately when search behavior itself changes.',
      '',
      '## Fixed Issues',
      '- Replaced the partial Stage 1 bundle with all DS01-DS48, PD01-PD40, and DP01-DP40 tasks.',
      '- Added task-specific implementations for hashtag/mention indexes, topic co-occurrence graph, JSON/XML/CSV persistence, integrity validation, and benchmark utility.',
      '- Attached one Test Case block per implementation topic via content variants.',
      '',
      '## Remaining Limitations',
      failures.length ? failures.map((failure) => `- ${failure}`).join('\n') : '- None for generated Mock_hackathon files.',
      '',
    ].join('\n'),
    'utf8'
  );
}

function updateManifestStatuses(manifest, compilePassed, testsPassed) {
  manifest.tasks = manifest.tasks.map((item) => ({
    ...item,
    compileStatus: compilePassed ? 'passed' : 'failed',
    testStatus: testsPassed ? 'passed' : 'failed',
  }));

  fs.writeFileSync(
    path.join(MOCK_ROOT, 'mock_hackathon_manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
}

async function main() {
  const failures = [];
  const manifestPath = path.join(MOCK_ROOT, 'mock_hackathon_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const counts = {
    DS: countByPrefix(tasks, 'DS'),
    PD: countByPrefix(tasks, 'PD'),
    DP: countByPrefix(tasks, 'DP'),
    DSTests: countByPrefix(tasks.filter((task) => fileExists(task.testPath)), 'DS'),
    PDTests: countByPrefix(tasks.filter((task) => fileExists(task.testPath)), 'PD'),
    DPTests: countByPrefix(tasks.filter((task) => fileExists(task.testPath)), 'DP'),
    manifestTasks: manifest.tasks.length,
  };

  for (const [prefix, expectedCount] of Object.entries(EXPECTED)) {
    if (counts[prefix] !== expectedCount) {
      fail(`${prefix} implementation count was ${counts[prefix]}, expected ${expectedCount}`, failures);
    }
    const testCountKey = `${prefix}Tests`;
    if (counts[testCountKey] !== expectedCount) {
      fail(`${prefix} test count was ${counts[testCountKey]}, expected ${expectedCount}`, failures);
    }
  }

  if (counts.manifestTasks !== 128) {
    fail(`Manifest task count was ${counts.manifestTasks}, expected 128`, failures);
  }

  for (const task of tasks) {
    if (!fileExists(task.sourcePath)) {
      fail(`Missing implementation file for ${task.id}: ${task.sourcePath}`, failures);
    } else {
      const source = readSource(task.sourcePath);
      if (isPlaceholderOnly(source)) {
        fail(`Implementation file for ${task.id} appears placeholder-only or contains unsupported TODO code`, failures);
      }
      if (!hasHackathonPackage(source)) {
        fail(`Implementation file for ${task.id} does not use package hackathon`, failures);
      }
      if (hasOldMockPackage(source)) {
        fail(`Implementation file for ${task.id} still uses an old Mock_hackathon package`, failures);
      }
      if (hasMockPackageImport(source)) {
        fail(`Implementation file for ${task.id} still imports a Mock_hackathon package`, failures);
      }
      if (hasWildcardImport(source)) {
        fail(`Implementation file for ${task.id} still has a wildcard import`, failures);
      }
    }
    if (!fileExists(task.testPath)) {
      fail(`Missing test file for ${task.id}: ${task.testPath}`, failures);
    } else {
      const testSource = readSource(task.testPath);
      if (countTestsInFile(task.testPath) < 5) {
        fail(`Test file for ${task.id} has fewer than 5 @Test methods`, failures);
      }
      if (isPlaceholderOnly(testSource)) {
        fail(`Test file for ${task.id} appears placeholder-only or contains unsupported TODO code`, failures);
      }
      if (!hasHackathonPackage(testSource)) {
        fail(`Test file for ${task.id} does not use package hackathon`, failures);
      }
      if (hasOldMockPackage(testSource)) {
        fail(`Test file for ${task.id} still uses an old Mock_hackathon package`, failures);
      }
      if (hasMockPackageImport(testSource)) {
        fail(`Test file for ${task.id} still imports a Mock_hackathon package`, failures);
      }
      if (hasWildcardImport(testSource)) {
        fail(`Test file for ${task.id} still has a wildcard import`, failures);
      }
    }
    if (String(task.taskDescription || '').trim() !== simplifiedDescriptionFor(task)) {
      fail(`Generated metadata for ${task.id} does not use simplified Feature and Task description`, failures);
    }
    const manifestItem = manifest.tasks.find((item) => item.id === task.id);
    if (!manifestItem || manifestItem.packageName !== 'hackathon') {
      fail(`Manifest entry for ${task.id} is missing or incomplete`, failures);
    }
  }

  const compileResult = compileGeneratedFiles();
  if (compileResult.status !== 0) {
    fail('Generated Mock_hackathon Java files failed to compile', failures);
  }

  const testResult = compileResult.status === 0
    ? runGeneratedTests()
    : { status: 1, stdout: '', stderr: 'Skipped because compilation failed' };
  if (testResult.status !== 0) {
    fail('Generated Mock_hackathon JUnit tests failed', failures);
  }

  let dbResults = null;
  try {
    dbResults = await checkDatabaseCoverage();
    const imported = dbResults.filter((result) => result.topicImported).length;
    const attached = dbResults.filter((result) => result.testCaseChunkAttached).length;

    if (imported !== 128) {
      fail(`DB imported topics were ${imported}/128. Run npm run import:codebase and npm run enrich:codebase.`, failures);
    }
    if (attached !== 128) {
      fail(`DB Test Case blocks were ${attached}/128. Run npm run attach:mock-hackathon-tests.`, failures);
    }
    const explained = dbResults.filter((result) => result.hasExplanation).length;
    const complex = dbResults.filter((result) => result.hasComplexity).length;
    const uml = dbResults.filter((result) => result.hasUml).length;
    const symbols = dbResults.filter((result) => result.symbolIndexed).length;
    if (explained !== 128) {
      fail(`DB explanations were ${explained}/128. Run npm run attach:mock-hackathon-tests after import/enrich.`, failures);
    }
    if (complex !== 128) {
      fail(`DB software architecture/UML descriptions were ${complex}/128. Run npm run attach:mock-hackathon-tests after import/enrich.`, failures);
    }
    if (uml !== 128) {
      fail(`DB UML entries were ${uml}/128. Run npm run attach:mock-hackathon-tests after import/enrich.`, failures);
    }
    const simplifiedDescriptions = dbResults.filter((result) => result.hasSimplifiedTaskDescription).length;
    const testCasesHackathonPackage = dbResults.filter((result) => result.testCaseHasHackathonPackage).length;
    if (simplifiedDescriptions !== 128) {
      fail(`DB simplified task descriptions were ${simplifiedDescriptions}/128. Run npm run attach:mock-task-descriptions.`, failures);
    }
    if (testCasesHackathonPackage !== 128) {
      fail(`DB Test Case blocks with package hackathon were ${testCasesHackathonPackage}/128. Run npm run attach:mock-hackathon-tests.`, failures);
    }
    if (symbols !== 128) {
      fail(`Symbol index coverage was ${symbols}/128. Run npm run index:symbols.`, failures);
    }
  } catch (error) {
    fail(`DB coverage check skipped or failed: ${error.message}`, failures);
  }

  updateManifestStatuses(manifest, compileResult.status === 0, testResult.status === 0);
  writeReport({ failures, compileResult, testResult, dbResults, counts });

  console.log(JSON.stringify({
    counts,
    compilePassed: compileResult.status === 0,
    testsPassed: testResult.status === 0,
    dbImportedTopics: dbResults?.filter((result) => result.topicImported).length ?? null,
    dbTestCaseBlocks: dbResults?.filter((result) => result.testCaseChunkAttached).length ?? null,
    failures,
  }, null, 2));

  if (failures.length) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
