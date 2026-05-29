const fs = require('fs/promises');
const path = require('path');

const contentRoot = path.resolve(__dirname, '../../content');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .trim() || 'untitled';
}

function buildMarkdownDocument(searchItem) {
  const code = searchItem.content.code || '';
  const explanation = searchItem.content.explanation || 'No explanation available.';
  const complexity = searchItem.content.complexity || 'Not specified.';
  const uml = searchItem.content.uml || '';

  const sections = [
    `# ${searchItem.title}`,
    '',
    '## Explanation',
    '',
    explanation,
    '',
    '## Complexity',
    '',
    complexity,
    '',
  ];

  if (uml) {
    sections.push('## UML', '', '```mermaid', uml, '```', '');
  }

  sections.push('## Code', '```java', code, '```', '');

  return sections.join('\n');
}

function buildCodebaseMarkdownDocument(importedContent) {
  const code = importedContent.code || '';
  const explanation =
    importedContent.explanation || 'No explanation available.';
  const complexity = importedContent.complexity || 'Not specified.';
  const uml = importedContent.uml || '';

  const sections = [
    `# ${importedContent.title}`,
    '',
    '## Path',
    importedContent.relativePath,
    '',
    '## Explanation',
    '',
    explanation,
    '',
    '## Complexity',
    '',
    complexity,
    '',
  ];

  if (uml) {
    sections.push('## UML', '', '```mermaid', uml, '```', '');
  }

  sections.push('## Code', '```java', code, '```', '');

  return sections.join('\n');
}

async function writeContentToFile(searchItem) {
  if (searchItem?.type === 'documentation') {
    return;
  }

  if (searchItem?.source_type || searchItem?.sourceType) {
    return;
  }

  if (!searchItem || !searchItem.title || !searchItem.category?.slug) {
    return;
  }

  const categoryDirectory = path.join(contentRoot, searchItem.category.slug);
  const topicFilename = `${slugify(searchItem.title)}.md`;
  const filePath = path.join(categoryDirectory, topicFilename);

  await fs.mkdir(categoryDirectory, { recursive: true });
  await fs.writeFile(filePath, buildMarkdownDocument(searchItem), 'utf8');
}

async function writeSearchResultsToFiles(result) {
  if (!result || !result.found) {
    return;
  }

  const items = Array.isArray(result.results)
    ? result.results
    : result.data
      ? [result.data]
      : [];

  const seen = new Set();

  for (const item of items) {
    const uniqueKey = `${item.category?.slug || 'unknown'}:${slugify(item.title)}`;

    if (seen.has(uniqueKey)) {
      continue;
    }

    seen.add(uniqueKey);
    await writeContentToFile(item);
  }
}

async function writeCodebaseContentToFile(importedContent) {
  if (!importedContent || !importedContent.title || !importedContent.codebaseSlug) {
    return;
  }

  const directorySegments = Array.isArray(importedContent.directorySegments)
    ? importedContent.directorySegments
    : [];
  const safeSegments = directorySegments.map(slugify).filter(Boolean);
  const fileDirectory = path.join(
    contentRoot,
    'code-bases',
    slugify(importedContent.codebaseSlug),
    ...safeSegments
  );
  const filePath = path.join(fileDirectory, `${slugify(importedContent.title)}.md`);

  await fs.mkdir(fileDirectory, { recursive: true });
  await fs.writeFile(
    filePath,
    buildCodebaseMarkdownDocument(importedContent),
    'utf8'
  );
}

module.exports = {
  writeContentToFile,
  writeCodebaseContentToFile,
  writeSearchResultsToFiles,
};
