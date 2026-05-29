#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { tasks } = require('./generateMockHackathonCodebase');

const ROOT = path.join(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'imports', 'app', 'src');
const ORIGINAL_PREFIXES = [
  'dao',
  'dao.model',
  'persistentdata',
  'persistentdata.formatted',
  'persistentdata.io',
  'persistentdata.serialization',
  'sorteddata',
  'sorteddata.avltree',
  'sorteddata.bstree',
  'sorteddata.sortedarraylist',
  'userstate',
  'censor',
];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function importLines(source) {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('import ') && line.endsWith(';'));
}

function importedName(line) {
  return line.replace(/^import\s+/, '').replace(/;$/, '').trim();
}

function simpleName(qualified) {
  return qualified.split('.').pop();
}

function bodyWithoutImports(source) {
  return source
    .split('\n')
    .filter((line) => !line.trim().startsWith('import ') && !line.trim().startsWith('package '))
    .join('\n');
}

function originalModuleFor(qualified) {
  const matches = ORIGINAL_PREFIXES
    .filter((prefix) => qualified === prefix || qualified.startsWith(`${prefix}.`))
    .sort((a, b) => b.length - a.length);
  return matches[0] || null;
}

function importExists(qualified) {
  if (qualified.startsWith('java.') || qualified.startsWith('javax.') || qualified.startsWith('org.junit.')) {
    return true;
  }
  if (qualified.startsWith('static ')) {
    return true;
  }
  const filePath = path.join(SRC_ROOT, `${qualified.replace(/\./g, '/')}.java`);
  return fs.existsSync(filePath);
}

function validateFile(task, filePath, implementation) {
  const source = read(filePath);
  const body = bodyWithoutImports(source);
  const failures = [];

  if (!/^\s*package\s+hackathon\s*;/m.test(source)) {
    failures.push('missing package hackathon');
  }
  if (/^\s*package\s+Mock_hackathon\./m.test(source)) {
    failures.push('uses old Mock_hackathon package');
  }
  if (/^\s*import\s+Mock_hackathon\./m.test(source)) {
    failures.push('imports another Mock_hackathon task');
  }

  const imports = importLines(source).map(importedName);
  for (const name of imports) {
    if (!importExists(name)) {
      failures.push(`missing imported class: ${name}`);
      continue;
    }

    if (!name.startsWith('static ') && !name.endsWith('.*')) {
      const needle = simpleName(name).replace(/\$/g, '\\$');
      const used = new RegExp(`\\b${needle}\\b`).test(body);
      if (!used) {
        failures.push(`unused import: ${name}`);
      }
    }
  }

  const originalImports = implementation
    ? imports.filter((name) => Boolean(originalModuleFor(name)))
    : [];

  return {
    taskId: task.id,
    className: task.className,
    filePath,
    imports,
    originalImports,
    failures,
  };
}

function main() {
  const implementationResults = tasks.map((task) => validateFile(task, task.sourcePath, true));
  const testResults = tasks.map((task) => validateFile(task, task.testPath, false));
  const failures = [...implementationResults, ...testResults]
    .flatMap((result) => result.failures.map((failure) => `${path.relative(ROOT, result.filePath)}: ${failure}`));

  const noOriginalImport = implementationResults
    .filter((result) => result.originalImports.length === 0)
    .map((result) => ({
      taskId: result.taskId,
      className: result.className,
      reason: 'No exception allowed for current generated library; each implementation should expose at least one original MiniLab integration import.',
    }));

  const moduleCounts = Object.fromEntries(ORIGINAL_PREFIXES.map((prefix) => [prefix, 0]));
  for (const result of implementationResults) {
    for (const imported of result.originalImports) {
      const module = originalModuleFor(imported);
      moduleCounts[module] += 1;
    }
  }

  if (noOriginalImport.length) {
    for (const item of noOriginalImport) {
      failures.push(`${item.taskId} ${item.className}: ${item.reason}`);
    }
  }

  const report = {
    implementationFiles: implementationResults.length,
    testFiles: testResults.length,
    packageHackathonFiles: [...implementationResults, ...testResults]
      .filter((result) => !result.failures.includes('missing package hackathon')).length,
    oldMockHackathonPackageFiles: [...implementationResults, ...testResults]
      .filter((result) => result.failures.includes('uses old Mock_hackathon package')).length,
    implementationFilesWithOriginalImports: implementationResults
      .filter((result) => result.originalImports.length > 0).length,
    moduleCounts,
    exceptionsWithoutOriginalImports: noOriginalImport,
    failures,
  };

  fs.writeFileSync(
    path.join(ROOT, 'imports', 'app', 'src', 'Mock_hackathon', 'MockHackathonImportValidationReport.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  if (failures.length) {
    console.error(`Mock_hackathon import validation failed: ${failures.length} issue(s)`);
    for (const failure of failures.slice(0, 200)) {
      console.error(`- ${failure}`);
    }
    if (failures.length > 200) {
      console.error(`...and ${failures.length - 200} more issue(s).`);
    }
    process.exit(1);
  }

  console.log('Mock_hackathon import validation passed.');
  console.log(`Implementation files with original imports: ${report.implementationFilesWithOriginalImports}/128`);
  console.log(JSON.stringify(moduleCounts, null, 2));
}

if (require.main === module) {
  main();
}
