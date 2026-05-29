const path = require('path');

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function splitIdentifier(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values) {
  return [
    ...new Set(
      values
        .flat()
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
}

function stripComments(source) {
  return String(source || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function cleanType(type) {
  return String(type || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function parseParameters(rawParameters) {
  return String(rawParameters || '')
    .split(',')
    .map((parameter) => parameter.trim())
    .filter(Boolean)
    .map((parameter) => {
      const cleanedParameter = parameter
        .replace(/\bfinal\s+/g, '')
        .replace(/@\w+(?:\([^)]*\))?\s*/g, '')
        .trim();
      const parts = cleanedParameter.split(/\s+/);
      const name = parts.at(-1)?.replace(/\[\]$/, '') || 'value';
      const type = parts.slice(0, -1).join(' ') || 'Object';

      return {
        name,
        type: cleanType(type),
      };
    });
}

function parseDeclaration(source, fallbackName) {
  const declarationMatch = source.match(
    /^\s*(?:(?:public|protected|private|abstract|final|sealed|non-sealed|static)\s+)*(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([A-Za-z_$][\w$<>,. ?&]*))?(?:\s+implements\s+([A-Za-z_$][\w$<>,. ?&]*))?/m
  );

  if (!declarationMatch) {
    return {
      declarationType: 'class',
      className: fallbackName,
      extendsName: '',
      implementsNames: [],
    };
  }

  return {
    declarationType: declarationMatch[1],
    className: declarationMatch[2],
    extendsName: cleanType(declarationMatch[3] || '').split(/[<\s]/)[0],
    implementsNames: String(declarationMatch[4] || '')
      .split(',')
      .map((item) => cleanType(item).split(/[<\s]/)[0])
      .filter(Boolean),
  };
}

function parseFields(source) {
  const fields = [];
  const fieldPattern =
    /^\s*(public|protected|private)?\s*(?:static\s+)?(?:final\s+)?([A-Za-z_$][\w$<>\[\], ?.&]*)\s+([A-Za-z_$][\w$]*)\s*(?:=[^;]*)?;/gm;
  let match;

  while ((match = fieldPattern.exec(source)) !== null) {
    const line = match[0];

    if (line.includes('(')) {
      continue;
    }

    if (['package', 'import', 'return', 'throw', 'new'].includes(match[2])) {
      continue;
    }

    fields.push({
      visibility: match[1] || 'package',
      type: cleanType(match[2]),
      name: match[3],
    });
  }

  return fields.slice(0, 12);
}

function parseMethods(source, className) {
  const methods = [];
  const methodPattern =
    /^\s*(public|protected|private)?\s*(?:static\s+)?(?:final\s+|abstract\s+|synchronized\s+|default\s+|native\s+)*([A-Za-z_$][\w$<>\[\], ?.&]*)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?:throws\s+[^{;]+)?[;{]/gm;
  const constructorPattern =
    new RegExp(`^\\s*(public|protected|private)?\\s*${className}\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[^\\{;]+)?[\\{;]`, 'gm');
  const ignoredNames = new Set(['if', 'for', 'while', 'switch', 'catch', 'return']);
  let match;

  while ((match = constructorPattern.exec(source)) !== null) {
    methods.push({
      visibility: match[1] || 'package',
      returnType: '',
      name: className,
      parameters: parseParameters(match[2]),
      constructor: true,
    });
  }

  while ((match = methodPattern.exec(source)) !== null) {
    if (/^\s*(return|throw|new)\b/.test(match[0])) {
      continue;
    }

    const methodName = match[3];

    if (ignoredNames.has(methodName) || methodName === className) {
      continue;
    }

    methods.push({
      visibility: match[1] || 'package',
      returnType: cleanType(match[2]),
      name: methodName,
      parameters: parseParameters(match[4]),
      constructor: false,
    });
  }

  return methods.slice(0, 16);
}

function extractJavaMetadata(source, relativePath) {
  const normalizedPath = normalizePath(relativePath);
  const fileName = path.posix.basename(normalizedPath);
  const fileBaseName = fileName.replace(/\.java$/i, '');
  const cleanSource = stripComments(source);
  const packageMatch = cleanSource.match(/^\s*package\s+([A-Za-z_$][\w$.]*)\s*;/m);
  const imports = [...cleanSource.matchAll(/^\s*import\s+(?:static\s+)?([^;]+);/gm)]
    .map((match) => match[1].trim())
    .sort((left, right) => left.localeCompare(right));
  const usesJunit = imports.some(
    (importName) =>
      importName === 'org.junit.Assert' ||
      importName.startsWith('org.junit.')
  );
  const declaration = parseDeclaration(cleanSource, fileBaseName);
  const fields = parseFields(cleanSource);
  const methods = parseMethods(cleanSource, declaration.className);
  const directoryName = path.posix.dirname(normalizedPath);
  const directorySegments = directoryName === '.' ? [] : directoryName.split('/');

  return {
    fileName,
    fileBaseName,
    identifierWords: splitIdentifier(fileBaseName),
    relativePath: normalizedPath,
    directoryName,
    directorySegments,
    packageName: packageMatch?.[1] || '',
    imports,
    fields,
    methods,
    ...declaration,
    isTest: directorySegments[0] === 'test' || /test/i.test(fileBaseName),
    usesJunit,
  };
}

function inferResponsibility(metadata) {
  const searchable = [
    metadata.relativePath,
    metadata.className,
    metadata.fileBaseName,
    metadata.packageName,
  ]
    .join(' ')
    .toLowerCase();

  if (metadata.isTest) {
    return `verifies behavior of the ${splitIdentifier(metadata.fileBaseName.replace(/tests?$/i, '')).toLowerCase() || 'module'} implementation`;
  }

  if (searchable.includes('censor')) {
    return 'handles message censorship, profanity detection, and text filtering behavior';
  }

  if (searchable.includes('avl')) {
    return 'implements AVL tree behavior for balanced sorted data operations';
  }

  if (searchable.includes('bstree') || searchable.includes('bst')) {
    return 'implements binary search tree behavior for sorted data operations';
  }

  if (searchable.includes('sortedarraylist')) {
    return 'implements sorted collection behavior backed by an array-list style structure';
  }

  if (searchable.includes('dao')) {
    return 'separates data access responsibilities from application logic';
  }

  if (searchable.includes('csv') || searchable.includes('reader') || searchable.includes('writer')) {
    return 'handles formatted file input or output for persistent data';
  }

  if (searchable.includes('serial')) {
    return 'converts domain objects to and from persistent representations';
  }

  if (searchable.includes('state')) {
    return 'models user state and state-transition behavior';
  }

  if (searchable.includes('model')) {
    return 'defines domain model data used by the application';
  }

  if (metadata.declarationType === 'interface') {
    return 'defines a contract that other classes implement';
  }

  return 'contains implementation logic for its codebase module';
}

function buildExplanation({ codebaseName, metadata }) {
  const packageText = metadata.packageName
    ? ` in the ${metadata.packageName} package`
    : '';
  const moduleText = metadata.directoryName === '.'
    ? 'the codebase root'
    : metadata.directoryName;
  const methodNames = metadata.methods
    .filter((method) => !method.constructor)
    .slice(0, 5)
    .map((method) => method.name);
  const uniqueMethodNames = unique(methodNames).slice(0, 5);
  const methodText = methodNames.length
    ? ` Key methods include ${uniqueMethodNames.join(', ')}.`
    : '';
  const testPrefix = metadata.isTest ? 'test ' : '';
  const junitText = metadata.usesJunit
    ? ' It uses JUnit 4 style testing through org.junit imports.'
    : '';

  return `This ${testPrefix}file defines the ${metadata.className} ${metadata.declarationType}${packageText}. It belongs to ${moduleText} in the ${codebaseName} codebase and ${inferResponsibility(metadata)}.${junitText}${methodText}`;
}

function buildComplexity(metadata) {
  const searchable = [
    metadata.relativePath,
    metadata.className,
    metadata.fileBaseName,
    metadata.packageName,
  ]
    .join(' ')
    .toLowerCase();

  if (metadata.isTest) {
    return 'Test complexity depends on the tested scenario and input size; most unit tests use small fixed-size inputs.';
  }

  if (searchable.includes('censor')) {
    return 'Censoring generally scans the message and configured word lists, so complexity is typically O(n * w * k), where n is message length, w is number of watched words, and k is matched word length.';
  }

  if (searchable.includes('avl')) {
    return 'Typical AVL tree operations such as search, insertion, and deletion are O(log n), assuming the tree remains height-balanced.';
  }

  if (searchable.includes('bstree') || searchable.includes('bst')) {
    return 'Typical binary search tree operations are O(h), where h is tree height. In a balanced tree this is O(log n), but in the worst case it may be O(n).';
  }

  if (searchable.includes('sortedarraylist')) {
    return 'Array-list access is O(1), while insertion and deletion may be O(n) because elements may need shifting. Search depends on implementation.';
  }

  if (searchable.includes('dao')) {
    return 'DAO operation complexity depends on the backing storage. In-memory lookups may be O(1) with maps or O(n) with lists; file-backed operations may require O(n) scanning or serialization.';
  }

  if (searchable.includes('csv') || searchable.includes('reader')) {
    return 'Reading is typically O(n) in the size of the input file.';
  }

  if (searchable.includes('writer')) {
    return 'Writing is typically O(n) in the number of records or total output size.';
  }

  if (searchable.includes('state')) {
    return 'State transition operations are typically O(1) unless they trigger persistence or collection traversal.';
  }

  return '';
}

function visibilitySymbol(visibility) {
  if (visibility === 'public') return '+';
  if (visibility === 'protected') return '#';
  if (visibility === 'private') return '-';
  return '~';
}

function formatMethodForUml(method) {
  const params = method.parameters
    .map((parameter) => `${parameter.name}: ${parameter.type}`)
    .join(', ');
  const suffix = method.returnType ? ` ${method.returnType}` : '';

  return `  ${visibilitySymbol(method.visibility)}${method.name}(${params})${suffix}`;
}

function formatFieldForUml(field) {
  return `  ${visibilitySymbol(field.visibility)}${field.name}: ${field.type}`;
}

function buildUml(metadata) {
  const lines = ['classDiagram'];
  const className = metadata.className || metadata.fileBaseName;

  lines.push(`class ${className} {`);

  if (metadata.declarationType === 'interface') {
    lines.push('  <<interface>>');
  } else if (metadata.declarationType === 'enum') {
    lines.push('  <<enumeration>>');
  } else if (metadata.isTest) {
    lines.push('  <<test>>');
  }

  for (const field of metadata.fields.slice(0, 8)) {
    lines.push(formatFieldForUml(field));
  }

  for (const method of metadata.methods.slice(0, 10)) {
    lines.push(formatMethodForUml(method));
  }

  lines.push('}');

  if (metadata.extendsName) {
    lines.push(`${metadata.extendsName} <|-- ${className}`);
  }

  for (const interfaceName of metadata.implementsNames) {
    lines.push(`${interfaceName} <|.. ${className}`);
  }

  return lines.join('\n');
}

function buildQuery({ codebaseName, metadata }) {
  const packageWords = metadata.packageName
    ? metadata.packageName.replace(/\./g, ' ')
    : '';
  const importKeywords = metadata.imports
    .map((importName) => importName.split('.').at(-1))
    .join(' ');

  return unique([
    metadata.fileName,
    metadata.fileBaseName,
    metadata.identifierWords,
    metadata.className,
    splitIdentifier(metadata.className),
    metadata.packageName,
    packageWords,
    metadata.declarationType,
    metadata.relativePath,
    ...metadata.directorySegments,
    codebaseName,
    importKeywords,
    metadata.methods.map((method) => method.name).join(' '),
  ]).join(' ');
}

function analyzeJavaContent({ source, relativePath, codebaseName }) {
  const metadata = extractJavaMetadata(source, relativePath);

  return {
    metadata,
    query: buildQuery({ codebaseName, metadata }),
    explanation: buildExplanation({ codebaseName, metadata }),
    complexity: buildComplexity(metadata),
    uml: buildUml(metadata),
  };
}

module.exports = {
  analyzeJavaContent,
  buildComplexity,
  buildExplanation,
  buildQuery,
  buildUml,
  extractJavaMetadata,
  normalizePath,
  splitIdentifier,
};
