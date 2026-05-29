const VISIBILITY_PATTERN = '(public|private|protected)';
const IDENTIFIER_PATTERN = '[A-Za-z_$][\\w$]*';
const MODIFIER_PATTERN =
  '(?:static|final|abstract|synchronized|native|strictfp|default|transient|volatile|sealed|non-sealed)\\s+';

function normalizeLine(line) {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSnippet(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function cleanSignature(snippet) {
  return snippet
    .replace(/\s*\{\s*$/, '')
    .replace(/\s*;\s*$/, '')
    .replace(/\s*=\s*.+$/, '')
    .trim();
}

function getVisibility(matchValue) {
  return matchValue || 'package';
}

function uniqueSymbolKey(symbol) {
  return [
    symbol.visibility,
    symbol.kind,
    symbol.name,
    symbol.signature,
    symbol.lineNumber,
  ].join('|');
}

function getClassNames(symbols) {
  return new Set(
    symbols
      .filter((symbol) =>
        ['class', 'interface', 'enum', 'record'].includes(symbol.kind)
      )
      .map((symbol) => symbol.name)
  );
}

function extractJavaSymbols(source) {
  const symbols = [];
  const seen = new Set();
  const lines = String(source || '').split(/\r?\n/);
  const packageMatch = String(source || '').match(
    /^\s*package\s+([A-Za-z_$][\w$.]*)\s*;/m
  );

  if (packageMatch) {
    const lineNumber =
      lines.findIndex((line) => line.includes(packageMatch[0].trim())) + 1;
    const symbol = {
      visibility: 'package',
      kind: 'package',
      name: packageMatch[1],
      signature: `package ${packageMatch[1]}`,
      lineNumber: lineNumber || null,
      snippet: packageMatch[0].trim(),
    };

    symbols.push(symbol);
    seen.add(uniqueSymbolKey(symbol));
  }

  const typeRegex = new RegExp(
    `^\\s*(?:(?:${VISIBILITY_PATTERN})\\s+)?(?:${MODIFIER_PATTERN})*(class|interface|enum|record)\\s+(${IDENTIFIER_PATTERN})([^;{]*)?[{;]?`
  );

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = normalizeLine(rawLine);

    if (!line || line.startsWith('@') || line.startsWith('*')) {
      continue;
    }

    const typeMatch = line.match(typeRegex);

    if (!typeMatch) {
      continue;
    }

    const visibilityMatch = line.match(
      new RegExp(`^\\s*(${VISIBILITY_PATTERN})\\s+`)
    );
    const snippet = cleanSnippet(rawLine);
    const symbol = {
      visibility: getVisibility(visibilityMatch?.[1]),
      kind: typeMatch[2],
      name: typeMatch[3],
      signature: cleanSignature(snippet),
      lineNumber: index + 1,
      snippet,
    };
    const key = uniqueSymbolKey(symbol);

    if (!seen.has(key)) {
      symbols.push(symbol);
      seen.add(key);
    }
  }

  const classNames = getClassNames(symbols);
  const methodRegex = new RegExp(
    `^\\s*(?:(?:${VISIBILITY_PATTERN})\\s+)?(?:${MODIFIER_PATTERN})*(?:<[^>]+>\\s+)?([A-Za-z_$][\\w$<>\\[\\].?,\\s&]*?)\\s+(${IDENTIFIER_PATTERN})\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[^;{]+)?[;{]?`
  );
  const constructorRegex = new RegExp(
    `^\\s*(?:(?:${VISIBILITY_PATTERN})\\s+)?(?:${MODIFIER_PATTERN})*(${IDENTIFIER_PATTERN})\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[^;{]+)?[;{]?`
  );
  const fieldRegex = new RegExp(
    `^\\s*(?:(?:${VISIBILITY_PATTERN})\\s+)?(?:${MODIFIER_PATTERN})*([A-Za-z_$][\\w$<>\\[\\].?,\\s&]*?)\\s+(${IDENTIFIER_PATTERN})\\s*(?:=[^;]*)?;\\s*$`
  );

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = normalizeLine(rawLine);

    if (
      !line ||
      line.startsWith('@') ||
      line.startsWith('*') ||
      line.startsWith('package ') ||
      line.startsWith('import ') ||
      line.startsWith('return ') ||
      line.startsWith('throw ') ||
      line.includes(' class ') ||
      line.includes(' interface ') ||
      line.includes(' enum ') ||
      line.includes(' record ')
    ) {
      continue;
    }

    const visibilityMatch = line.match(
      new RegExp(`^\\s*(${VISIBILITY_PATTERN})\\s+`)
    );
    const visibility = getVisibility(visibilityMatch?.[1]);
    const snippet = cleanSnippet(rawLine);
    let symbol = null;

    const constructorMatch = line.match(constructorRegex);

    if (constructorMatch && classNames.has(constructorMatch[2])) {
      symbol = {
        visibility,
        kind: 'constructor',
        name: constructorMatch[2],
        signature: cleanSignature(snippet),
        lineNumber: index + 1,
        snippet,
      };
    } else {
      const methodMatch = line.match(methodRegex);

      if (methodMatch && !line.includes('=')) {
        symbol = {
          visibility,
          kind: 'method',
          name: methodMatch[3],
          signature: cleanSignature(snippet),
          lineNumber: index + 1,
          snippet,
        };
      }
    }

    if (!symbol && !line.includes('(')) {
      const fieldMatch = line.match(fieldRegex);

      if (fieldMatch) {
        symbol = {
          visibility,
          kind: 'field',
          name: fieldMatch[3],
          signature: cleanSignature(snippet),
          lineNumber: index + 1,
          snippet,
        };
      }
    }

    if (symbol) {
      const key = uniqueSymbolKey(symbol);

      if (!seen.has(key)) {
        symbols.push(symbol);
        seen.add(key);
      }
    }
  }

  return symbols;
}

module.exports = {
  extractJavaSymbols,
};
