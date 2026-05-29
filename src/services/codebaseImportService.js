const fs = require('fs/promises');
const path = require('path');
const categoryService = require('./categoryService');
const javaAnalysisService = require('./javaAnalysisService');
const markdownService = require('./markdownService');
const symbolIndexService = require('./symbolIndexService');
const contentRepository = require('../repositories/contentRepository');
const topicRepository = require('../repositories/topicRepository');

const DEFAULT_IMPORT_PATH = 'imports/app';
const DEFAULT_CODEBASE_NAME = 'COMP2100 MiniLab';
const SOURCE_DIRECTORIES = ['src', 'test'];
const IGNORED_DIRECTORIES = new Set([
  '__MACOSX',
  '.git',
  'bin',
  'build',
  'dist',
  'out',
  'target',
]);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const IMPORTS_ROOT = path.join(PROJECT_ROOT, 'imports');
const DEPENDENCY_TOPIC_TITLE = 'MiniLab Test Dependencies';
const DEPENDENCY_CONTENT = {
  query:
    'MiniLab Test Dependencies junit-4.13.jar hamcrest-core-1.3.jar JUnit Hamcrest external binary dependencies',
  code: [
    'imports/app/lib/junit-4.13.jar',
    'imports/app/lib/hamcrest-core-1.3.jar',
  ].join('\n'),
  explanation:
    'The COMP2100 MiniLab project stores its test dependencies under imports/app/lib. It uses junit-4.13.jar for JUnit 4.13 unit testing. It uses hamcrest-core-1.3.jar because Hamcrest Core 1.3 provides matcher and assertion support used by JUnit. These files are external binary dependencies, so the importer documents them but does not parse them as Java source code.',
  complexity: 'Not applicable.',
  uml: 'Not applicable.',
};

function normalizePathForQuery(value) {
  return String(value || '').replace(/\\/g, '/');
}

function resolveImportPath(importPath = DEFAULT_IMPORT_PATH) {
  const requestedPath = path.resolve(PROJECT_ROOT, importPath);

  if (
    requestedPath !== IMPORTS_ROOT &&
    !requestedPath.startsWith(`${IMPORTS_ROOT}${path.sep}`)
  ) {
    throw categoryService.createHttpError(
      400,
      'Import path must be inside the imports directory'
    );
  }

  return requestedPath;
}

function shouldIgnoreDirectory(directoryName) {
  const lowerDirectoryName = directoryName.toLowerCase();

  return (
    IGNORED_DIRECTORIES.has(lowerDirectoryName) ||
    directoryName.startsWith('._')
  );
}

function shouldIgnoreFile(fileName) {
  const lowerFileName = fileName.toLowerCase();

  return (
    fileName === '.DS_Store' ||
    fileName.startsWith('._') ||
    lowerFileName.endsWith('.jar') ||
    lowerFileName.endsWith('.class') ||
    !lowerFileName.endsWith('.java')
  );
}

async function scanJavaFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const javaFiles = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(entry.name)) {
        javaFiles.push(...(await scanJavaFiles(entryPath)));
      }

      continue;
    }

    if (entry.isFile() && !shouldIgnoreFile(entry.name)) {
      javaFiles.push(entryPath);
    }
  }

  return javaFiles.sort((left, right) => left.localeCompare(right));
}

async function scanSourceJavaFiles(importRoot) {
  const javaFiles = [];

  for (const sourceDirectory of SOURCE_DIRECTORIES) {
    const sourcePath = path.join(importRoot, sourceDirectory);

    try {
      const sourceStats = await fs.stat(sourcePath);

      if (sourceStats.isDirectory()) {
        javaFiles.push(...(await scanJavaFiles(sourcePath)));
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return javaFiles.sort((left, right) => left.localeCompare(right));
}

async function readJavaSource(filePath) {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('utf8');
}

async function ensureCategoryPath(directorySegments, codebaseName) {
  const rootCategory = await categoryService.ensureCategoryExistsByParent(
    'Code Bases'
  );
  const codebaseCategory = await categoryService.ensureCategoryExistsByParent(
    codebaseName,
    rootCategory.id
  );
  let currentCategory = codebaseCategory;

  for (const segment of directorySegments) {
    currentCategory = await categoryService.ensureCategoryExistsByParent(
      segment,
      currentCategory.id
    );
  }

  return {
    rootCategory,
    codebaseCategory,
    leafCategory: currentCategory,
  };
}

async function ensureDependencyDocumentation({ codebaseName, dryRun }) {
  if (dryRun) {
    return {
      title: DEPENDENCY_TOPIC_TITLE,
      dryRun: true,
      action: 'would_document_dependencies',
    };
  }

  const { codebaseCategory, leafCategory } = await ensureCategoryPath(
    ['Dependencies'],
    codebaseName
  );
  const topicResult = await upsertTopic({
    title: DEPENDENCY_TOPIC_TITLE,
    categoryId: leafCategory.id,
  });
  const contentResult = await upsertContent({
    topicId: topicResult.topic.id,
    query: DEPENDENCY_CONTENT.query,
    code: DEPENDENCY_CONTENT.code,
    explanation: DEPENDENCY_CONTENT.explanation,
    complexity: DEPENDENCY_CONTENT.complexity,
    uml: DEPENDENCY_CONTENT.uml,
  });

  await markdownService.writeCodebaseContentToFile({
    codebaseSlug: codebaseCategory.slug || categoryService.generateSlug(codebaseName),
    directorySegments: ['Dependencies'],
    title: DEPENDENCY_TOPIC_TITLE,
    relativePath: 'lib',
    code: DEPENDENCY_CONTENT.code,
    explanation: DEPENDENCY_CONTENT.explanation,
    complexity: DEPENDENCY_CONTENT.complexity,
    uml: DEPENDENCY_CONTENT.uml,
  });

  return {
    title: DEPENDENCY_TOPIC_TITLE,
    categoryId: leafCategory.id,
    topicId: topicResult.topic.id,
    contentId: contentResult.content.id,
    topicCreated: topicResult.created,
    contentCreated: contentResult.created,
  };
}

async function upsertTopic({ title, categoryId }) {
  const existingTopic = await topicRepository.getTopicByTitleAndCategory(
    title,
    categoryId
  );

  if (existingTopic) {
    return {
      topic: existingTopic,
      created: false,
    };
  }

  const topic = await topicRepository.createTopic({
    title,
    slug: categoryService.generateSlug(title),
    categoryId,
  });

  return {
    topic,
    created: true,
  };
}

async function upsertContent(content) {
  const existingContent = await contentRepository.getPrimaryContentByTopicId(
    content.topicId
  );

  if (existingContent) {
    const updatedContent = await contentRepository.updateContent(
      existingContent.id,
      content
    );

    await symbolIndexService.indexContent(updatedContent);

    return {
      content: updatedContent,
      created: false,
    };
  }

  const createdContent = await contentRepository.createContent(content);
  await symbolIndexService.indexContent(createdContent);

  return {
    content: createdContent,
    created: true,
  };
}

async function importJavaFile({ filePath, importRoot, codebaseName, dryRun }) {
  const relativePath = normalizePathForQuery(path.relative(importRoot, filePath));
  const source = await readJavaSource(filePath);
  const analysis = javaAnalysisService.analyzeJavaContent({
    codebaseName,
    source,
    relativePath,
  });
  const { metadata, query, explanation, complexity, uml } = analysis;
  const directorySegments = metadata.directorySegments;

  if (dryRun) {
    return {
      file: relativePath,
      title: metadata.fileName,
      dryRun: true,
      action: 'would_import',
    };
  }

  const { codebaseCategory, leafCategory } = await ensureCategoryPath(
    directorySegments,
    codebaseName
  );
  const topicResult = await upsertTopic({
    title: metadata.fileName,
    categoryId: leafCategory.id,
  });
  const contentResult = await upsertContent({
    topicId: topicResult.topic.id,
    query,
    code: source,
    explanation,
    complexity,
    uml,
  });

  await markdownService.writeCodebaseContentToFile({
    codebaseSlug: codebaseCategory.slug || categoryService.generateSlug(codebaseName),
    directorySegments,
    title: metadata.fileName,
    relativePath,
    code: source,
    explanation,
    complexity,
    uml,
  });

  return {
    file: relativePath,
    title: metadata.fileName,
    categoryId: leafCategory.id,
    topicId: topicResult.topic.id,
    contentId: contentResult.content.id,
    topicCreated: topicResult.created,
    contentCreated: contentResult.created,
  };
}

async function enrichImportedJavaDocs(options = {}) {
  const importRoot = resolveImportPath(options.path || DEFAULT_IMPORT_PATH);
  const codebaseName =
    typeof options.name === 'string' && options.name.trim()
      ? options.name.trim()
      : DEFAULT_CODEBASE_NAME;
  const dryRun = Boolean(options.dryRun);
  const javaFiles = await scanSourceJavaFiles(importRoot);
  const enrichedFiles = [];
  let contentsUpdated = 0;

  for (const filePath of javaFiles) {
    const enrichedFile = await importJavaFile({
      filePath,
      importRoot,
      codebaseName,
      dryRun,
    });

    enrichedFiles.push(enrichedFile);

    if (!dryRun) {
      contentsUpdated += 1;
    }
  }

  return {
    dryRun,
    codebaseName,
    importPath: path.relative(PROJECT_ROOT, importRoot),
    filesFound: javaFiles.length,
    filesEnriched: dryRun ? 0 : enrichedFiles.length,
    contentsUpdated,
    files: enrichedFiles,
  };
}

async function importJavaCodebase(options = {}) {
  const importRoot = resolveImportPath(options.path || DEFAULT_IMPORT_PATH);
  const codebaseName =
    typeof options.name === 'string' && options.name.trim()
      ? options.name.trim()
      : DEFAULT_CODEBASE_NAME;
  const dryRun = Boolean(options.dryRun);
  const javaFiles = await scanSourceJavaFiles(importRoot);
  const importedFiles = [];
  const dependencyDocumentation = await ensureDependencyDocumentation({
    codebaseName,
    dryRun,
  });
  let topicsCreated = 0;
  let topicsUpdated = 0;
  let contentsCreated = 0;
  let contentsUpdated = 0;

  for (const filePath of javaFiles) {
    const importedFile = await importJavaFile({
      filePath,
      importRoot,
      codebaseName,
      dryRun,
    });

    importedFiles.push(importedFile);

    if (!dryRun) {
      topicsCreated += importedFile.topicCreated ? 1 : 0;
      topicsUpdated += importedFile.topicCreated ? 0 : 1;
      contentsCreated += importedFile.contentCreated ? 1 : 0;
      contentsUpdated += importedFile.contentCreated ? 0 : 1;
    }
  }

  if (!dryRun) {
    topicsCreated += dependencyDocumentation.topicCreated ? 1 : 0;
    topicsUpdated += dependencyDocumentation.topicCreated ? 0 : 1;
    contentsCreated += dependencyDocumentation.contentCreated ? 1 : 0;
    contentsUpdated += dependencyDocumentation.contentCreated ? 0 : 1;
  }

  return {
    dryRun,
    codebaseName,
    importPath: path.relative(PROJECT_ROOT, importRoot),
    filesFound: javaFiles.length,
    filesImported: dryRun ? 0 : importedFiles.length,
    topicsCreated,
    topicsUpdated,
    contentsCreated,
    contentsUpdated,
    dependencyDocumentation,
    files: importedFiles,
  };
}

module.exports = {
  DEFAULT_CODEBASE_NAME,
  DEFAULT_IMPORT_PATH,
  enrichImportedJavaDocs,
  importJavaCodebase,
};
