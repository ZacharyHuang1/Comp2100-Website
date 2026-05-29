const fs = require('fs');
const path = require('path');
const {
  parseMethodDeclaration,
  walkJavaFiles,
} = require('./normalizeMockHackathonMethodComments');

const ROOT = path.resolve(__dirname, '..');
const TARGET_ROOTS = [
  path.join(ROOT, 'imports/app/src/Mock_hackathon'),
  path.join(ROOT, 'imports/app/test/Mock_hackathon'),
];
const FORBIDDEN_COMMENT_PATTERN = new RegExp(
  `\\b${'A' + 'I'}\\s+${'gen' + 'erated'}\\b|^//\\s*TODO\\b`,
  'i'
);

function collectClassNames(source) {
  const names = new Set();
  const classPattern = /\b(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/g;
  let match;

  while ((match = classPattern.exec(source)) !== null) {
    names.add(match[1]);
  }

  return names;
}

function findMethodComment(lines, methodLineIndex) {
  let index = methodLineIndex - 1;

  while (index >= 0 && lines[index].trim().startsWith('@')) {
    index--;
  }

  while (index >= 0 && !lines[index].trim()) {
    index--;
  }

  return {
    index,
    text: index >= 0 ? lines[index].trim() : '',
  };
}

function validateFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const classNames = collectClassNames(source);
  const lines = source.split('\n');
  const failures = [];

  for (let index = 0; index < lines.length; index++) {
    const declaration = parseMethodDeclaration(lines[index], classNames);

    if (!declaration) {
      continue;
    }

    const comment = findMethodComment(lines, index);

    if (!comment.text.startsWith('//')) {
      failures.push({
        filePath,
        line: index + 1,
        methodName: declaration.methodName,
        reason: 'missing // method comment',
      });
      continue;
    }

    if (FORBIDDEN_COMMENT_PATTERN.test(comment.text)) {
      failures.push({
        filePath,
        line: comment.index + 1,
        methodName: declaration.methodName,
        reason: `forbidden placeholder comment: ${comment.text}`,
      });
    }
  }

  return failures;
}

function main() {
  const files = TARGET_ROOTS.flatMap(walkJavaFiles).sort();
  const failures = files.flatMap(validateFile);

  if (failures.length) {
    console.error(`Method comment validation failed: ${failures.length} issue(s)`);
    for (const failure of failures.slice(0, 200)) {
      console.error(
        `- ${path.relative(ROOT, failure.filePath)}:${failure.line} ${failure.methodName}: ${failure.reason}`
      );
    }
    if (failures.length > 200) {
      console.error(`...and ${failures.length - 200} more issue(s).`);
    }
    process.exit(1);
  }

  console.log(`Method comment validation passed for ${files.length} Java files.`);
}

if (require.main === module) {
  main();
}
