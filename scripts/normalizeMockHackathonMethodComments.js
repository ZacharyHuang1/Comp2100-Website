const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_ROOTS = [
  path.join(ROOT, 'imports/app/src/Mock_hackathon'),
  path.join(ROOT, 'imports/app/test/Mock_hackathon'),
];

const METHOD_MODIFIERS = new Set([
  'public',
  'private',
  'protected',
  'static',
  'final',
  'synchronized',
  'abstract',
  'default',
  'native',
  'strictfp',
]);

const CONTROL_KEYWORDS =
  /^\}?\s*(if|for|while|switch|catch|return|throw|new|else|do|try|case|assert)\b/;

function walkJavaFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkJavaFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.java')) {
      files.push(fullPath);
    }
  }

  return files;
}

function splitCamel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFromClassName(className) {
  return splitCamel(className.replace(/Test$/, '').replace(/^[A-Z]{2}\d{2}_/, ''));
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function actionText(methodName) {
  const rawName = methodName.replace(/^test/, '');
  const readable = splitCamel(rawName).toLowerCase();

  if (!readable) {
    return 'this behavior';
  }

  return readable;
}

function objectAfterPrefix(methodName, prefixPattern, fallback) {
  const stripped = methodName.replace(prefixPattern, '');
  const readable = splitCamel(stripped).toLowerCase();
  return readable || fallback;
}

function methodComment({ methodName, className, isConstructor, isTestFile }) {
  if (isConstructor) {
    return `// Creates a ${titleFromClassName(className).toLowerCase()} helper.`;
  }

  const readable = actionText(methodName);

  if (isTestFile || methodName.startsWith('test')) {
    return `// Verifies ${readable}.`;
  }

  if (methodName === 'tokenize') {
    return '// Splits text into normalized tokens.';
  }

  if (methodName === 'normalize') {
    return '// Normalizes text for lookup.';
  }

  if (methodName === 'instance') {
    return '// Returns the shared singleton instance.';
  }

  if (methodName === 'manager') {
    return '// Returns the manager for the requested type.';
  }

  if (methodName === 'searchAll') {
    return '// Returns items that match every keyword.';
  }

  if (/^(get|find|lookup|search|query|read|load|parse)/.test(methodName)) {
    return `// Returns ${objectAfterPrefix(methodName, /^(get|find|lookup|search|query|read|load|parse)/, 'matching results')}.`;
  }

  if (/^(is|has|can|contains|matches|supports|allows)/.test(methodName)) {
    return `// Checks whether ${objectAfterPrefix(methodName, /^(is|has|can|contains|matches|supports|allows)/, readable)}.`;
  }

  if (/^(compare|sort|rank|count|size|frequency|itemCount|registeredCount|cacheSize)/.test(methodName)) {
    return `// Computes ${readable}.`;
  }

  if (/^(add|insert|append|attach|register(?=[A-Z])|save|put|record|push|enqueue)/.test(methodName)) {
    return `// Adds ${objectAfterPrefix(methodName, /^(add|insert|append|attach|register(?=[A-Z])|save|put|record|push|enqueue)/, 'data')}.`;
  }

  if (/^(remove|delete|clear|detach|pop|dequeue|evict|unsave)/.test(methodName)) {
    return `// Removes ${objectAfterPrefix(methodName, /^(remove|delete|clear|detach|pop|dequeue|evict|unsave)/, 'data')}.`;
  }

  if (/^(set|update|replace|rename|mark|toggle|advance|merge|apply|resolve)/.test(methodName)) {
    return `// Updates ${objectAfterPrefix(methodName, /^(set|update|replace|rename|mark|toggle|advance|merge|apply|resolve)/, 'state')}.`;
  }

  if (/^(create|build|new|clone|copy)/.test(methodName)) {
    return `// Creates ${objectAfterPrefix(methodName, /^(create|build|new|clone|copy)/, 'data')}.`;
  }

  if (/^(write|export|serialize|format|persist|flush)/.test(methodName)) {
    return `// Writes ${objectAfterPrefix(methodName, /^(write|export|serialize|format|persist|flush)/, 'data')}.`;
  }

  return `// Handles ${readable}.`;
}

function collectClassNames(source) {
  const names = new Set();
  const classPattern = /\b(?:class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/g;
  let match;

  while ((match = classPattern.exec(source)) !== null) {
    names.add(match[1]);
  }

  return names;
}

function parseMethodDeclaration(line, classNames) {
  const trimmed = line.trim();

  if (
    !trimmed.includes('(') ||
    CONTROL_KEYWORDS.test(trimmed) ||
    /\b(class|interface|enum|record)\b/.test(trimmed)
  ) {
    return null;
  }

  const closeParenIndex = trimmed.lastIndexOf(')');

  if (closeParenIndex === -1) {
    return null;
  }

  const afterParen = trimmed.slice(closeParenIndex + 1);

  if (!/^\s*(?:throws\s+[^{;]+)?\s*(?:\{|;)/.test(afterParen)) {
    return null;
  }

  const beforeParen = trimmed.slice(0, trimmed.indexOf('(')).trim();

  if (!beforeParen || beforeParen.includes('=') || beforeParen.includes('.')) {
    return null;
  }

  const tokens = beforeParen
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return null;
  }

  const methodName = tokens[tokens.length - 1];

  if (!/^[A-Za-z_$][\w$]*$/.test(methodName)) {
    return null;
  }

  const nonModifierTokens = tokens.filter((token) => !METHOD_MODIFIERS.has(token));
  const isConstructor = classNames.has(methodName);
  const hasReturnType = nonModifierTokens.length >= 2;

  if (!isConstructor && !hasReturnType) {
    return null;
  }

  return { methodName, isConstructor };
}

function isExistingMethodComment(lines, index, classNames) {
  if (!lines[index].trim().startsWith('//')) {
    return false;
  }

  let nextIndex = index + 1;

  while (
    nextIndex < lines.length &&
    (!lines[nextIndex].trim() ||
      lines[nextIndex].trim().startsWith('@') ||
      lines[nextIndex].trim().startsWith('//'))
  ) {
    nextIndex++;
  }

  return Boolean(parseMethodDeclaration(lines[nextIndex] || '', classNames));
}

function hasPriorLineComment(output) {
  for (let index = output.length - 1; index >= 0; index--) {
    const trimmed = output[index].trim();

    if (!trimmed) {
      continue;
    }

    return trimmed.startsWith('//');
  }

  return false;
}

function conciseClassJavadoc(className, isTestFile) {
  const taskId = className.match(/^([A-Z]{2}\d{2})_/)?.[1] || className;
  const title = titleFromClassName(className);

  if (isTestFile) {
    return [
      '/**',
      ` * Tests ${taskId}: ${title}.`,
      ' *',
      ' * Practice test coverage kept separate from the original MiniLab tests.',
      ' */',
    ].join('\n');
  }

  return [
    '/**',
    ` * ${taskId}: ${title}.`,
    ' *',
    ' * Practice implementation kept under Mock_hackathon so it can be studied',
    ' * without changing the original MiniLab packages.',
    ' */',
  ].join('\n');
}

function replaceTopLevelClassComment(source, className, isTestFile) {
  const declaration = new RegExp(
    `(^|\\n)(?:\\s*/\\*\\*[\\s\\S]*?\\*/\\s*\\n)?(public\\s+(?:abstract\\s+|final\\s+)?class\\s+${className}\\b)`,
    'm'
  );

  return source.replace(declaration, (match, prefix, classStart) => {
    return `${prefix}${conciseClassJavadoc(className, isTestFile)}\n${classStart}`;
  });
}

function normalizeFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const className = path.basename(filePath, '.java');
  const isTestFile = filePath.includes('/imports/app/test/');
  let source = original.replace(/\n?[ \t]*\/\*\*[\s\S]*?\*\/[ \t]*\n/g, '\n');
  source = replaceTopLevelClassComment(source, className, isTestFile);

  const classNames = collectClassNames(source);
  const lines = source.split('\n');
  const output = [];
  const documentedMethodLines = new Set();

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const indent = line.match(/^\s*/)?.[0] || '';

    if (isExistingMethodComment(lines, index, classNames)) {
      continue;
    }

    if (trimmed.startsWith('@')) {
      let declarationIndex = index + 1;

      while (
        declarationIndex < lines.length &&
        (lines[declarationIndex].trim().startsWith('@') ||
          lines[declarationIndex].trim().startsWith('//') ||
          !lines[declarationIndex].trim())
      ) {
        declarationIndex++;
      }

      const declaration = parseMethodDeclaration(
        lines[declarationIndex] || '',
        classNames
      );

      if (declaration && !hasPriorLineComment(output)) {
        output.push(
          `${indent}${methodComment({
            methodName: declaration.methodName,
            className,
            isConstructor: declaration.isConstructor,
            isTestFile,
          })}`
        );
        documentedMethodLines.add(declarationIndex);
      }
    } else {
      const declaration = parseMethodDeclaration(line, classNames);

      if (declaration && !documentedMethodLines.has(index) && !hasPriorLineComment(output)) {
        output.push(
          `${indent}${methodComment({
            methodName: declaration.methodName,
            className,
            isConstructor: declaration.isConstructor,
            isTestFile,
          })}`
        );
      }
    }

    output.push(line);
  }

  const next = output.join('\n').replace(/\n{3,}/g, '\n\n');

  if (next !== original) {
    fs.writeFileSync(filePath, next);
    return true;
  }

  return false;
}

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

module.exports = {
  normalizeFile,
  parseMethodDeclaration,
  walkJavaFiles,
};
