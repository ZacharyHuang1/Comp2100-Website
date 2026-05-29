const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/db');

const SPACE_NAME = 'Mock_hackathon Guides';
const SPACE_DESCRIPTION =
  'Read-only guides for the Mock_hackathon practice task folders.';
const MANIFEST_PATH = path.join(
  __dirname,
  '..',
  'imports',
  'app',
  'src',
  'Mock_hackathon',
  'mock_hackathon_manifest.json'
);

const PAGES = [
  {
    title: 'Mock_hackathon-Data Structures',
    category: 'DataStructures',
    folderName: 'DataStructures',
    instructionType: 'coding',
    introduction:
      'This article describes the Data Structures practice folder. These classes focus on indexes, ranking structures, queues, stacks, trees, tries, graph helpers, caches, and range-search utilities built as MiniLab extension exercises.',
    studyInstructions: [
      'Start with the public methods and tests for each class before reading private helpers.',
      'Check which original MiniLab model or sorted-data classes are imported, then decide whether the relationship is a dependency, aggregation, or composition.',
      'For index tasks, verify add, remove, duplicate, empty, and lookup behavior.',
      'For graph, cache, queue, and range tasks, trace the internal collection choice and confirm it matches the operation being optimized.',
      'Keep each task independent. Do not rely on another Mock_hackathon class when writing or modifying an answer.',
    ],
  },
  {
    title: 'Mock_hackathon-Design Patterns',
    category: 'DesignPatterns',
    folderName: 'DesignPatterns',
    instructionType: 'architecture',
    introduction:
      'This article describes the Design Patterns practice folder. These classes demonstrate DAO, repository, factory, strategy, observer, state, iterator, command, adapter, proxy, visitor, facade, and related patterns around the original MiniLab modules.',
    studyInstructions: [
      'Identify the named pattern first, then map each role in the pattern to the class, nested interface, helper object, or original MiniLab dependency.',
      'Check whether the implementation uses DAO, model, sorteddata, persistentdata, userstate, or censor abstractions from the original codebase.',
      'For UML, show implementation with realization arrows, inheritance with generalization arrows, owned helpers with composition, and external MiniLab usage with dependency arrows.',
      'Use the tests to see the behavior expected from the pattern rather than only naming the pattern.',
      'Keep the pattern example independent and avoid linking it to another Mock_hackathon task.',
    ],
  },
  {
    title: 'Mock_hackathon-Persitent Data',
    oldTitles: ['Mock_hackathon-Persistent Data'],
    category: 'PersistentData_Mock',
    folderName: 'PersistentData_Mock',
    instructionType: 'workflow',
    introduction:
      'This article describes the Persistent Data practice folder. The title keeps the requested spelling, while the content refers to Persistent Data. These classes focus on saving, loading, formatting, validation, migration, snapshots, policies, archives, and persistence workflow helpers.',
    studyInstructions: [
      'Inspect how each class uses persistentdata, formatted persistence, CSV IO, serializers, file paths, and MiniLab model or DAO concepts.',
      'For save/load tasks, test empty files, malformed rows, duplicates, missing files, and round-trip behavior.',
      'For format adapters and factories, check how the class separates parsing/writing from model or DAO logic.',
      'For validation and migration tasks, confirm the class reports clear errors without corrupting existing data.',
      'Keep persistence helpers deterministic and avoid depending on another Mock_hackathon class.',
    ],
  },
];

function lines(items) {
  return items.join('\n');
}

function loadManifestTasks() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (!Array.isArray(manifest.tasks)) {
    throw new Error('Mock_hackathon manifest is missing tasks array.');
  }
  return manifest.tasks;
}

function displayTitle(task) {
  return `${task.id}: ${task.title}`;
}

function classFileName(task) {
  return `${task.className}.java`;
}

function sourcePath(task) {
  return task.sourcePath.replace(/^imports\/app\//, '');
}

function testPath(task) {
  return task.testPath.replace(/^imports\/app\//, '');
}

function absoluteSourcePath(task) {
  return path.join(__dirname, '..', task.sourcePath);
}

function getPreviousComment(sourceLines, methodIndex) {
  for (let index = methodIndex - 1; index >= 0; index -= 1) {
    const line = sourceLines[index].trim();

    if (!line || line.startsWith('@')) {
      continue;
    }

    return line.startsWith('//') ? line.replace(/^\/\/\s*/, '').trim() : '';
  }

  return '';
}

function normalizeMethodSignature(line) {
  return line
    .trim()
    .replace(/\s*\{\s*$/, '')
    .replace(/\s*;\s*$/, '')
    .replace(/\s+/g, ' ');
}

function isPublicMethodLine(line) {
  const trimmed = line.trim();

  if (!trimmed.startsWith('public ')) {
    return false;
  }

  if (/^public\s+(class|interface|enum|record)\b/.test(trimmed)) {
    return false;
  }

  return trimmed.includes('(') && trimmed.includes(')');
}

function extractMethodBody(sourceLines, methodIndex) {
  const bodyLines = [];
  let braceDepth = 0;
  let started = false;

  for (let index = methodIndex; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];

    if (!started && line.includes(';')) {
      return line;
    }

    if (line.includes('{')) {
      started = true;
    }

    if (started) {
      bodyLines.push(line);
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      if (braceDepth === 0) {
        break;
      }
    }
  }

  return bodyLines.join('\n');
}

function methodName(signature, className) {
  const constructorPattern = new RegExp(`\\b${className}\\s*\\(`);
  if (constructorPattern.test(signature)) {
    return className;
  }

  const match = signature.match(/\s([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
  return match ? match[1] : '';
}

function addUnique(items, value) {
  if (value && !items.includes(value)) {
    items.push(value);
  }
}

function methodLogicSummary({ signature, body, className }) {
  const name = methodName(signature, className);
  const lowerName = name.toLowerCase();
  const compactBody = body.replace(/\s+/g, ' ').trim();
  const clauses = [];

  if (name === className) {
    if (/(hasNext\(|for\s*\(|while\s*\()/.test(body)) {
      addUnique(
        clauses,
        'seeds the new instance by iterating supplied data and delegating to the normal add/load path'
      );
    } else {
      addUnique(
        clauses,
        'creates an empty instance and relies on field initializers for owned state'
      );
    }
  } else if (/^(add|insert|save|register|pin|follow|block|mute|record|enqueue|push|offer|put|index)/.test(lowerName)) {
    addUnique(
      clauses,
      'validates the incoming value and writes it into the owned index or collection'
    );
  } else if (/^(remove|delete|clear|unpin|unfollow|unblock|unmute|poll|pop)/.test(lowerName)) {
    addUnique(
      clauses,
      'locates the existing entry and removes it from every affected internal structure'
    );
  } else if (/^(update|set|mark|change|restore|archive|unarchive|complete|reopen)/.test(lowerName)) {
    addUnique(
      clauses,
      'checks the target entry, updates the stored state, and keeps related indexes consistent'
    );
  } else if (/^(search|find|get|contains|is|can|has|frequency|count|size|top|list|keys|range|newest|oldest|peek)/.test(lowerName)) {
    addUnique(
      clauses,
      'queries existing state without exposing mutable internals to callers'
    );
  } else if (/^(load|parse|import|read)/.test(lowerName)) {
    addUnique(
      clauses,
      'parses incoming data, skips or rejects invalid rows, and rebuilds internal state through normal helpers'
    );
  } else if (/^(serialize|export|write|snapshot)/.test(lowerName)) {
    addUnique(
      clauses,
      'walks the stored records and converts them into a stable output format'
    );
  } else if (/^(undo|redo)/.test(lowerName)) {
    addUnique(
      clauses,
      'uses saved history entries to reverse or replay the latest mutation'
    );
  }

  if (/(==\s*null|!=\s*null|isBlank\(|Objects\.requireNonNull|IllegalArgumentException)/.test(body)) {
    addUnique(
      clauses,
      'guards null or blank input before doing work'
    );
  }

  if (/(tokenize|normalize|toLowerCase|split\(|trim\()/.test(body)) {
    addUnique(
      clauses,
      'normalises text so lookups and comparisons are consistent'
    );
  }

  if (/(Map<|HashMap|LinkedHashMap|TreeMap|\.put\(|computeIfAbsent|compute\(|putIfAbsent)/.test(body)) {
    addUnique(
      clauses,
      'uses map lookups so updates and retrieval stay direct by key'
    );
  }

  if (/(Set<|HashSet|LinkedHashSet|\.add\(|\.remove\(|retainAll|contains\()/.test(body)) {
    addUnique(
      clauses,
      'uses sets to avoid duplicates and support membership checks'
    );
  }

  if (/(PriorityQueue|Deque|ArrayDeque|Queue|Stack|\.push\(|\.poll\(|\.peek\(|\.offer\()/.test(body)) {
    addUnique(
      clauses,
      'uses queue, stack, or heap behavior to preserve the required processing order'
    );
  }

  if (/(Collections\.sort|\.sort\(|Comparator|TreeMap|SortedData|AVLTree|BSTree|SortedArrayList|subList|range)/.test(body)) {
    addUnique(
      clauses,
      'keeps results ordered through sorting or MiniLab sorted-data abstractions'
    );
  }

  if (/(new ArrayList|new LinkedHashSet|new LinkedHashMap|Collections\.unmodifiable|Optional\.ofNullable|Collections\.empty)/.test(body)) {
    addUnique(
      clauses,
      'returns defensive or empty-safe results instead of leaking mutable state'
    );
  }

  if (/(CSV|escape|unescape|StringBuilder|serialize|splitCsv)/.test(body)) {
    addUnique(
      clauses,
      'applies escaping or formatting rules while converting data'
    );
  }

  if (/(Files\.|\bPath\b|StandardCopyOption|createTempFile|readString|writeString|\bmove\(|\bcopy\()/.test(body)) {
    addUnique(
      clauses,
      'uses file-system operations carefully for persistence-style workflows'
    );
  }

  if (/(PostDAO|UserDAO|DAO<|DAO<|\.getAll\(|\.getByUUID|dao\.\w+\()/i.test(body)) {
    addUnique(
      clauses,
      'integrates with the original DAO access style when a DAO is supplied'
    );
  }

  if (/\b(Post|Message|User|HasUUID)\b/.test(signature + body)) {
    addUnique(
      clauses,
      'works with MiniLab model objects as external inputs rather than owning their lifecycle'
    );
  }

  if (/(listener|listeners|emit\(|onEvent|notify)/i.test(body)) {
    addUnique(
      clauses,
      'notifies observers after meaningful state changes'
    );
  }

  if (/(history|Command|undo)/.test(body)) {
    addUnique(
      clauses,
      'records enough previous state to support undo-style behavior'
    );
  }

  if (/(rule\.allows|UserState|isLoggedIn|ICensor|censor)/.test(body)) {
    addUnique(
      clauses,
      'applies permission, state, or moderation checks around the operation'
    );
  }

  if (!clauses.length && compactBody && compactBody !== '{}') {
    addUnique(
      clauses,
      'delegates to helper methods so the public API stays small and readable'
    );
  }

  if (!clauses.length) {
    addUnique(clauses, 'keeps the public API available while state is prepared elsewhere');
  }

  return `Logic: It ${clauses.slice(0, 4).join('; ')}.`;
}

function implementationMethods(task) {
  const filePath = absoluteSourcePath(task);

  if (!fs.existsSync(filePath)) {
    return ['- Source file not found while building this documentation page.'];
  }

  const sourceLines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const methods = [];

  sourceLines.forEach((line, index) => {
    if (!isPublicMethodLine(line)) {
      return;
    }

    const signature = normalizeMethodSignature(line);
    const comment = getPreviousComment(sourceLines, index);
    const body = extractMethodBody(sourceLines, index);
    const logic = methodLogicSummary({
      signature,
      body,
      className: task.className,
    });
    methods.push(comment
      ? `- ${signature} — ${comment} ${logic}`
      : `- ${signature} — ${logic}`);
  });

  return methods.length
    ? methods
    : ['- This class exposes its behavior through package-private helpers.'];
}

function introductionForTask(task, page) {
  if (page.category === 'DataStructures') {
    return `${task.className} is the ${displayTitle(
      task
    )} practice class. It introduces a data-structure answer for this feature and gives students a focused place to inspect indexing, ordering, caching, graph, queue, stack, tree, trie, or range-query behavior depending on the task.`;
  }

  if (page.category === 'DesignPatterns') {
    return `${task.className} is the ${displayTitle(
      task
    )} practice class. It introduces the pattern through concrete MiniLab-style service behavior so students can identify roles, dependencies, extension points, and UML relationships from actual code.`;
  }

  return `${task.className} is the ${displayTitle(
    task
  )} practice class. It introduces a persistence-focused answer that can be studied for file workflow, formatted data handling, serializers, validation, migration, or save/load policy design.`;
}

async function getTopicMap() {
  const result = await query(
    `
      SELECT t.id, t.title
      FROM topics t
      INNER JOIN categories c ON c.id = t.category_id
      INNER JOIN categories parent ON parent.id = c.parent_id
      WHERE parent.name = 'Mock_hackathon'
    `
  );

  return new Map(result.rows.map((row) => [row.title, String(row.id)]));
}

function buildTaskSection(task, page, topicMap) {
  const topicId = topicMap.get(classFileName(task));
  const topicPath = topicId ? `/topic/${topicId}` : 'Open from Code Bases explorer';
  const methods = implementationMethods(task);

  return lines([
    `### ${task.className}`,
    '',
    `Class: ${classFileName(task)}`,
    `Task name: ${task.title}`,
    `Source path: ${sourcePath(task)}`,
    `Test path: ${testPath(task)}`,
    `Website topic: ${topicPath}`,
    '',
    `Feature: ${task.feature}`,
    '',
    `Task: ${task.likelyHackathonTask}`,
    '',
    `Introduction: ${introductionForTask(task, page)}`,
    '',
    'Implementation methods:',
    ...methods,
    '',
  ]);
}

function buildPageContent(page, tasks, topicMap) {
  const pageTasks = tasks
    .filter((task) => task.category === page.category)
    .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

  const catalogue = pageTasks.map((task) => buildTaskSection(task, page, topicMap));

  return {
    content: lines([
      `# ${page.title}`,
      '',
      page.introduction,
      '',
      '## Folder Scope',
      '',
      `Folder: src/Mock_hackathon/${page.folderName}`,
      '',
      `Total classes introduced here: ${pageTasks.length}`,
      '',
      'These are practice and extension files. They are stored separately from the original MiniLab packages, but each task should be read as a possible hackathon-style extension that uses the original MiniLab codebase where meaningful.',
      '',
      '## How to Use This Guide',
      '',
      ...page.studyInstructions.map((instruction) => `- ${instruction}`),
      '',
      '## Class Catalogue',
      '',
      ...catalogue,
    ]),
    count: pageTasks.length,
  };
}

async function ensureRootUser() {
  const result = await query(
    `
      INSERT INTO app_users (
        username,
        display_name,
        role,
        status,
        avatar_color,
        default_todo_color
      )
      VALUES ('zach', 'Zach', 'root_manager', 'active', '#d97706', '#F59E0B')
      ON CONFLICT (username)
      DO UPDATE SET
        role = 'root_manager',
        status = 'active',
        display_name = COALESCE(NULLIF(app_users.display_name, ''), 'Zach'),
        updated_at = NOW()
      RETURNING id
    `
  );

  return result.rows[0].id;
}

async function ensureSpace(ownerUserId) {
  const existing = await query(
    `
      SELECT id
      FROM documentation_spaces
      WHERE lower(name) = lower($1)
      ORDER BY id
      LIMIT 1
    `,
    [SPACE_NAME]
  );

  if (existing.rows[0]) {
    const updated = await query(
      `
        UPDATE documentation_spaces
        SET description = $2,
            owner_user_id = COALESCE(owner_user_id, $3),
            visibility = 'public_to_users',
            marker_color = '#0F766E',
            archived = false,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [existing.rows[0].id, SPACE_DESCRIPTION, ownerUserId]
    );

    return updated.rows[0].id;
  }

  const created = await query(
    `
      INSERT INTO documentation_spaces (
        name,
        description,
        owner_user_id,
        visibility,
        marker_color
      )
      VALUES ($1, $2, $3, 'public_to_users', '#0F766E')
      RETURNING id
    `,
    [SPACE_NAME, SPACE_DESCRIPTION, ownerUserId]
  );

  return created.rows[0].id;
}

async function upsertPage({ spaceId, ownerUserId, page, content }) {
  const titles = [page.title, ...(page.oldTitles || [])].map((title) =>
    title.toLowerCase()
  );
  const existing = await query(
    `
      SELECT id
      FROM documentation_pages
      WHERE lower(title) = ANY($1::text[])
      ORDER BY id
      LIMIT 1
    `,
    [titles]
  );

  if (existing.rows[0]) {
    const updated = await query(
      `
        UPDATE documentation_pages
        SET space_id = $2,
            title = $3,
            content = $4,
            instruction_type = $5,
            owner_user_id = $6,
            visibility = 'public_to_users',
            archived = false,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [
        existing.rows[0].id,
        spaceId,
        page.title,
        content,
        page.instructionType,
        ownerUserId,
      ]
    );

    return updated.rows[0].id;
  }

  const created = await query(
    `
      INSERT INTO documentation_pages (
        space_id,
        title,
        content,
        instruction_type,
        owner_user_id,
        visibility
      )
      VALUES ($1, $2, $3, $4, $5, 'public_to_users')
      RETURNING id
    `,
    [spaceId, page.title, content, page.instructionType, ownerUserId]
  );

  return created.rows[0].id;
}

async function main() {
  const tasks = loadManifestTasks();
  const topicMap = await getTopicMap();
  const ownerUserId = await ensureRootUser();
  const spaceId = await ensureSpace(ownerUserId);
  const results = [];

  for (const page of PAGES) {
    const { content, count } = buildPageContent(page, tasks, topicMap);
    const pageId = await upsertPage({ spaceId, ownerUserId, page, content });
    results.push({ title: page.title, pageId, count });
  }

  const total = results.reduce((sum, result) => sum + result.count, 0);
  for (const result of results) {
    console.log(
      `Seeded ${result.title} (page ${result.pageId}) with ${result.count} class introductions.`
    );
  }
  console.log(`Total Mock_hackathon class introductions seeded: ${total}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
