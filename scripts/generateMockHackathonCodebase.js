#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_ROOT = path.join(ROOT, 'imports', 'app', 'src', 'Mock_hackathon');
const TEST_ROOT = path.join(ROOT, 'imports', 'app', 'test', 'Mock_hackathon');
const CATALOGUE = require('../src/data/mockHackathonTaskDescriptions.json');

const CATEGORIES = {
  DS: { folder: 'DataStructures', label: 'Data Structures', count: 48 },
  PD: { folder: 'PersistentData_Mock', label: 'Persistent Data', count: 40 },
  DP: { folder: 'DesignPatterns', label: 'Design Patterns', count: 40 },
};

function entriesById() {
  return CATALOGUE.entries || {};
}

function idsInOrder() {
  return Object.keys(entriesById()).sort((a, b) => {
    const leftPrefix = a.slice(0, 2);
    const rightPrefix = b.slice(0, 2);
    const order = { DS: 0, PD: 1, DP: 2 };
    if (leftPrefix !== rightPrefix) {
      return order[leftPrefix] - order[rightPrefix];
    }
    return Number(a.slice(2)) - Number(b.slice(2));
  });
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function existingClassName(taskId, folder, title) {
  const directory = path.join(SRC_ROOT, folder);
  if (fs.existsSync(directory)) {
    const match = fs.readdirSync(directory)
      .filter((name) => name.startsWith(`${taskId}_`) && name.endsWith('.java'))
      .sort()[0];
    if (match) {
      return match.replace(/\.java$/, '');
    }
  }
  return `${taskId}_${toPascalCase(title)}`;
}

function toPascalCase(value) {
  const words = String(value || 'PracticeTask')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const result = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return result || 'PracticeTask';
}

function taskDescription(entry) {
  return `Feature: ${entry.feature}\n\nTask: ${entry.likelyHackathonTask}`;
}

function readExistingTaskFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function escapeText(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function lowerTitle(task) {
  return task.title.charAt(0).toLowerCase() + task.title.slice(1);
}

function javaDoc(task) {
  return [
    '/**',
    ` * ${task.id} practice implementation for ${lowerTitle(task)}.`,
    ' */',
  ].join('\n');
}

function testJavaDoc(task) {
  return [
    '/**',
    ` * Tests ${task.id}: ${task.title}.`,
    ' */',
  ].join('\n');
}

function dsKind(task) {
  const text = `${task.title} ${task.feature} ${task.likelyHackathonTask}`.toLowerCase();
  if (/graph|follow|co.?occurrence|reachability|shortest path|related|mutual/.test(text)) return 'graph';
  if (/trie|autocomplete/.test(text)) return 'trie';
  if (/queue|heap|priority|notification|unread|expiring/.test(text)) return 'queue';
  if (/stack|history|undo/.test(text)) return 'stack';
  if (/timestamp|range|avl|b.?tree|sorted|window|slice/.test(text)) return 'range';
  if (/leaderboard|score|counter|top.?k|karma|reaction|vote|frequency/.test(text)) return 'counter';
  if (/cache|draft|session/.test(text)) return 'cache';
  if (/tree|comment/.test(text)) return 'tree';
  return 'index';
}

function classSource(task) {
  if (task.id === 'DS01') return postKeywordSource(task);
  if (task.id === 'DS02') return messageKeywordSource(task);
  if (task.prefix === 'PD') return persistentSource(task);
  if (task.prefix === 'DP') return designPatternSource(task);
  const kind = dsKind(task);
  if (kind === 'graph') return graphSource(task);
  if (kind === 'trie') return trieSource(task);
  if (kind === 'queue') return queueSource(task);
  if (kind === 'stack') return stackSource(task);
  if (kind === 'range') return rangeSource(task);
  if (kind === 'counter') return counterSource(task);
  if (kind === 'cache') return cacheSource(task);
  if (kind === 'tree') return treeSource(task);
  return indexSource(task);
}

function packageLine() {
  return 'package hackathon;\n\n';
}

function formatImport(value) {
  return `import ${value};`;
}

function withHackathonPackage(source, imports) {
  const body = source
    .replace(/^\s*package\s+[\w.]+\s*;\s*/m, '')
    .replace(/^\s*import\s+(static\s+)?[^;]+;\s*/gm, '')
    .replace(/^\s+/, '');
  const importLines = imports.map(formatImport).join('\n');
  return `${packageLine()}${importLines}\n\n${body}`;
}

function implementationImports(task) {
  if (task.id === 'DS01') {
    return [
      'dao.model.Message',
      'dao.model.Post',
      'java.util.ArrayList',
      'java.util.Collections',
      'java.util.HashMap',
      'java.util.Iterator',
      'java.util.LinkedHashSet',
      'java.util.List',
      'java.util.Locale',
      'java.util.Map',
      'java.util.Set',
    ];
  }
  if (task.id === 'DS02') {
    return [
      'dao.model.Message',
      'java.util.ArrayList',
      'java.util.Collections',
      'java.util.HashMap',
      'java.util.Iterator',
      'java.util.LinkedHashSet',
      'java.util.List',
      'java.util.Locale',
      'java.util.Map',
      'java.util.Set',
    ];
  }
  if (task.prefix === 'PD') {
    return [
      'java.io.IOException',
      'java.nio.charset.StandardCharsets',
      'java.nio.file.Files',
      'java.nio.file.Path',
      'java.util.ArrayList',
      'java.util.Arrays',
      'java.util.LinkedHashMap',
      'java.util.List',
      'java.util.Map',
      'java.util.Optional',
    ];
  }
  if (task.prefix === 'DP') {
    return [
      'java.util.ArrayDeque',
      'java.util.ArrayList',
      'java.util.Deque',
      'java.util.LinkedHashMap',
      'java.util.List',
      'java.util.Map',
      'java.util.Objects',
      'java.util.Optional',
    ];
  }

  const importsByKind = {
    graph: [
      'java.util.ArrayDeque',
      'java.util.Collections',
      'java.util.HashMap',
      'java.util.LinkedHashMap',
      'java.util.LinkedHashSet',
      'java.util.Map',
      'java.util.Objects',
      'java.util.Queue',
      'java.util.Set',
      'java.util.UUID',
    ],
    trie: [
      'java.util.ArrayList',
      'java.util.Collections',
      'java.util.List',
      'java.util.Locale',
      'java.util.Map',
      'java.util.TreeMap',
    ],
    queue: [
      'java.util.HashMap',
      'java.util.Map',
      'java.util.Objects',
      'java.util.Optional',
      'java.util.PriorityQueue',
      'java.util.UUID',
    ],
    stack: [
      'java.util.ArrayDeque',
      'java.util.ArrayList',
      'java.util.Deque',
      'java.util.List',
      'java.util.Optional',
    ],
    range: [
      'java.util.ArrayList',
      'java.util.Collections',
      'java.util.LinkedHashSet',
      'java.util.List',
      'java.util.Objects',
      'java.util.Set',
      'java.util.TreeMap',
      'java.util.UUID',
    ],
    counter: [
      'java.util.HashMap',
      'java.util.List',
      'java.util.Map',
      'java.util.Objects',
      'java.util.UUID',
    ],
    cache: [
      'java.util.ArrayList',
      'java.util.Iterator',
      'java.util.LinkedHashMap',
      'java.util.List',
      'java.util.Objects',
      'java.util.Optional',
      'java.util.UUID',
    ],
    tree: [
      'java.util.ArrayDeque',
      'java.util.ArrayList',
      'java.util.Collections',
      'java.util.HashMap',
      'java.util.LinkedHashMap',
      'java.util.List',
      'java.util.Map',
      'java.util.Objects',
      'java.util.Optional',
      'java.util.Queue',
      'java.util.UUID',
    ],
    index: [
      'java.util.Collection',
      'java.util.Collections',
      'java.util.HashMap',
      'java.util.Iterator',
      'java.util.LinkedHashSet',
      'java.util.Locale',
      'java.util.Map',
      'java.util.Objects',
      'java.util.Set',
      'java.util.UUID',
    ],
  };
  return importsByKind[dsKind(task)];
}

function testImports(task) {
  const common = ['org.junit.Test', 'static org.junit.Assert.*'];
  if (task.id === 'DS01') {
    return [
      'dao.model.Message',
      'dao.model.Post',
      'java.util.Arrays',
      'java.util.Collections',
      'java.util.UUID',
      ...common,
    ];
  }
  if (task.id === 'DS02') {
    return [
      'dao.model.Message',
      'java.util.Arrays',
      'java.util.Collections',
      'java.util.UUID',
      ...common,
    ];
  }
  if (task.prefix === 'PD') {
    return [
      'java.nio.file.Files',
      'java.nio.file.Path',
      'java.util.Arrays',
      ...common,
    ];
  }
  if (task.prefix === 'DP') {
    return [
      'java.util.ArrayList',
      'java.util.Collections',
      'java.util.List',
      ...common,
    ];
  }

  const importsByKind = {
    graph: ['java.util.UUID', ...common],
    trie: ['java.util.Arrays', ...common],
    queue: ['java.util.UUID', ...common],
    stack: ['java.util.Arrays', ...common],
    range: ['java.util.Arrays', 'java.util.Collections', 'java.util.UUID', ...common],
    counter: ['java.util.UUID', ...common],
    cache: ['java.util.UUID', ...common],
    tree: ['java.util.Arrays', 'java.util.Collections', 'java.util.UUID', ...common],
    index: ['java.util.Arrays', 'java.util.Collections', 'java.util.UUID', ...common],
  };
  return importsByKind[dsKind(task)];
}

function unique(values) {
  return [...new Set(values)].filter(Boolean).sort((left, right) => {
    const leftStatic = left.startsWith('static ');
    const rightStatic = right.startsWith('static ');
    if (leftStatic !== rightStatic) return leftStatic ? 1 : -1;
    return left.localeCompare(right);
  });
}

function integrationImports(task) {
  if (task.id === 'DS01' || task.id === 'DS02') return [];

  if (task.prefix === 'DS') {
    const imports = [
      'dao.model.Message',
      'dao.model.Post',
      'dao.model.User',
    ];

    if (dsKind(task) === 'range') {
      imports.push(
        'sorteddata.SortedData',
        'sorteddata.SortedDataFactory',
        'sorteddata.avltree.AVLTree',
        'sorteddata.bstree.BSTree',
        'sorteddata.sortedarraylist.SortedArrayList'
      );
    }

    if (dsKind(task) === 'trie') {
      imports.push('java.util.Iterator');
    }

    return imports;
  }

  if (task.prefix === 'PD') {
    return [
      'java.io.StringReader',
      'java.io.StringWriter',
      'persistentdata.DataManager',
      'persistentdata.DataPipeline',
      'persistentdata.formatted.CSVFormat',
      'persistentdata.formatted.CSVFormattedFactory',
      'persistentdata.formatted.CSVReader',
      'persistentdata.formatted.CSVWriter',
      'persistentdata.formatted.FormattedFactory',
      'persistentdata.formatted.FormattedReader',
      'persistentdata.formatted.FormattedWriter',
      'persistentdata.io.ComputerIOFactory',
      'persistentdata.io.IOFactory',
      'persistentdata.serialization.Serializer',
    ];
  }

  if (task.prefix === 'DP') {
    return [
      'censor.ICensor',
      'dao.DAO',
      'dao.PostDAO',
      'dao.UserDAO',
      'dao.model.HasUUID',
      'dao.model.Post',
      'dao.model.User',
      'java.util.Iterator',
      'java.util.UUID',
      'persistentdata.DataManager',
      'sorteddata.SortedData',
      'sorteddata.SortedDataFactory',
      'userstate.UserState',
    ];
  }

  return [];
}

function integrationTestImports(task) {
  if (task.id === 'DS01' || task.id === 'DS02') return [];

  if (task.prefix === 'DS') {
    return [
      'dao.model.Message',
      'dao.model.Post',
      'dao.model.User',
      'java.util.UUID',
    ];
  }

  if (task.prefix === 'PD') {
    return [
      'java.util.Collections',
      'java.util.List',
    ];
  }

  if (task.prefix === 'DP') {
    return [
      'dao.model.User',
      'java.util.UUID',
      'userstate.GuestState',
    ];
  }

  return [];
}

function sourceImports(task) {
  return unique([...implementationImports(task), ...integrationImports(task)]);
}

function generatedTestImports(task) {
  return unique([...testImports(task), ...integrationTestImports(task)]);
}

function insertBeforeLastClassBrace(source, addition) {
  const index = source.lastIndexOf('\n}');
  if (index < 0 || !addition.trim()) return source;
  return `${source.slice(0, index)}\n${addition}\n${source.slice(index)}`;
}

function postKeywordSource(task) {
  const c = task.className;
  return `${javaDoc(task)}\npublic class ${c} {\n    private final Map<String, Set<Post>> index = new HashMap<>();\n    private final Map<Post, Set<String>> reverseIndex = new HashMap<>();\n    private final Map<String, Integer> frequencies = new HashMap<>();\n    private final Set<Post> indexedPosts = new LinkedHashSet<>();\n\n    // Creates an empty post keyword index.\n    public ${c}() {\n    }\n\n    // Adds all posts from an iterator to the index.\n    public ${c}(Iterator<Post> posts) {\n        if (posts == null) {\n            return;\n        }\n        while (posts.hasNext()) {\n            add(posts.next());\n        }\n    }\n\n    // Adds a post topic and message text to the keyword index.\n    public void add(Post post) {\n        if (post == null) {\n            return;\n        }\n        remove(post);\n        Set<String> tokens = tokenize(searchableText(post));\n        reverseIndex.put(post, tokens);\n        indexedPosts.add(post);\n        for (String token : tokens) {\n            index.computeIfAbsent(token, key -> new LinkedHashSet<>()).add(post);\n            frequencies.put(token, frequency(token) + 1);\n        }\n    }\n\n    // Removes a post from every keyword bucket.\n    public boolean remove(Post post) {\n        Set<String> tokens = reverseIndex.remove(post);\n        if (tokens == null) {\n            return false;\n        }\n        indexedPosts.remove(post);\n        for (String token : tokens) {\n            Set<Post> bucket = index.get(token);\n            if (bucket != null) {\n                bucket.remove(post);\n                if (bucket.isEmpty()) {\n                    index.remove(token);\n                }\n            }\n            int next = frequencies.getOrDefault(token, 1) - 1;\n            if (next <= 0) {\n                frequencies.remove(token);\n            } else {\n                frequencies.put(token, next);\n            }\n        }\n        return true;\n    }\n\n    // Searches for posts containing all valid tokens in the query.\n    public List<Post> search(String query) {\n        Set<String> tokens = tokenize(query);\n        if (tokens.isEmpty()) {\n            return Collections.emptyList();\n        }\n        Iterator<String> iterator = tokens.iterator();\n        Set<Post> result = new LinkedHashSet<>(index.getOrDefault(iterator.next(), Collections.emptySet()));\n        while (iterator.hasNext()) {\n            result.retainAll(index.getOrDefault(iterator.next(), Collections.emptySet()));\n        }\n        return new ArrayList<>(result);\n    }\n\n    // Returns how many indexed posts contain a token.\n    public int frequency(String token) {\n        return frequencies.getOrDefault(normalize(token), 0);\n    }\n\n    // Returns keywords ordered by frequency then alphabetically.\n    public List<String> topKeywords(int limit) {\n        List<String> keywords = new ArrayList<>(frequencies.keySet());\n        keywords.sort((left, right) -> {\n            int byFrequency = Integer.compare(frequencies.get(right), frequencies.get(left));\n            return byFrequency != 0 ? byFrequency : left.compareTo(right);\n        });\n        return keywords.subList(0, Math.min(Math.max(0, limit), keywords.size()));\n    }\n\n    // Returns the number of indexed posts.\n    public int size() {\n        return indexedPosts.size();\n    }\n\n    // Builds searchable text from Post.topic and all Message records.\n    private String searchableText(Post post) {\n        StringBuilder text = new StringBuilder();\n        if (post.topic != null) {\n            text.append(post.topic).append(' ');\n        }\n        Iterator<Message> messages = post.messages.getAll();\n        while (messages.hasNext()) {\n            Message message = messages.next();\n            if (message.message() != null) {\n                text.append(message.message()).append(' ');\n            }\n        }\n        return text.toString();\n    }\n\n    // Converts text into normalized unique tokens.\n    private Set<String> tokenize(String text) {\n        Set<String> tokens = new LinkedHashSet<>();\n        if (text == null) {\n            return tokens;\n        }\n        for (String raw : text.split(\"[^A-Za-z0-9]+\")) {\n            String token = normalize(raw);\n            if (!token.isEmpty()) {\n                tokens.add(token);\n            }\n        }\n        return tokens;\n    }\n\n    // Normalizes a token for case-insensitive lookup.\n    private String normalize(String token) {\n        return token == null ? \"\" : token.toLowerCase(Locale.ROOT).trim();\n    }\n}\n`;
}

function postKeywordTest(task) {
  const c = task.className;
  return `${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that searching an empty post index returns no posts.\n    @Test\n    public void emptyIndexReturnsNoPosts() {\n        ${c} index = new ${c}();\n        assertTrue(index.search(\"dao\").isEmpty());\n        assertEquals(0, index.size());\n    }\n\n    // Verifies that topic words are indexed case-insensitively.\n    @Test\n    public void topicWordsAreIndexed() {\n        ${c} index = new ${c}();\n        Post post = post(\"DAO Pattern Review\");\n        index.add(post);\n        assertEquals(Collections.singletonList(post), index.search(\"dao\"));\n        assertEquals(Collections.singletonList(post), index.search(\"PATTERN\"));\n    }\n\n    // Verifies that message text contributes to search results.\n    @Test\n    public void messageTextIsIndexed() {\n        ${c} index = new ${c}();\n        Post post = post(\"Project\", \"Review persistence helpers\", \"Check CSV escaping\");\n        index.add(post);\n        assertEquals(Collections.singletonList(post), index.search(\"csv\"));\n    }\n\n    // Verifies that duplicate words do not duplicate posts.\n    @Test\n    public void duplicateWordsDoNotDuplicatePosts() {\n        ${c} index = new ${c}();\n        Post post = post(\"DAO DAO DAO\");\n        index.add(post);\n        assertEquals(1, index.search(\"dao\").size());\n        assertEquals(1, index.frequency(\"dao\"));\n    }\n\n    // Verifies that multi-token queries return intersections.\n    @Test\n    public void multiTokenSearchReturnsIntersection() {\n        ${c} index = new ${c}();\n        Post daoPost = post(\"DAO persistence\");\n        Post graphPost = post(\"Graph persistence\");\n        index.add(daoPost);\n        index.add(graphPost);\n        assertEquals(Collections.singletonList(daoPost), index.search(\"dao persistence\"));\n    }\n\n    // Verifies that removing a post clears every indexed token.\n    @Test\n    public void removeClearsPostTokens() {\n        ${c} index = new ${c}();\n        Post post = post(\"Search tokens\", \"body token\");\n        index.add(post);\n        assertTrue(index.remove(post));\n        assertTrue(index.search(\"token\").isEmpty());\n        assertFalse(index.remove(post));\n    }\n\n    // Verifies that the iterator constructor indexes all posts.\n    @Test\n    public void constructorIndexesIteratorPosts() {\n        Post first = post(\"alpha beta\");\n        Post second = post(\"beta gamma\");\n        ${c} index = new ${c}(Arrays.asList(first, second).iterator());\n        assertEquals(2, index.frequency(\"beta\"));\n    }\n\n    // Creates a MiniLab Post with optional Message records.\n    private Post post(String topic, String... messages) {\n        UUID poster = UUID.randomUUID();\n        Post post = new Post(UUID.randomUUID(), poster, topic);\n        for (String text : messages) {\n            post.messages.insert(new Message(UUID.randomUUID(), poster, post.id, System.currentTimeMillis(), text));\n        }\n        return post;\n    }\n}\n`;
}

function messageKeywordSource(task) {
  const c = task.className;
  return `${javaDoc(task)}\npublic class ${c} {\n    private final Map<String, Set<Message>> index = new HashMap<>();\n    private final Map<Message, Set<String>> reverseIndex = new HashMap<>();\n\n    // Creates an empty message keyword index.\n    public ${c}() {\n    }\n\n    // Adds all messages from an iterator to the index.\n    public ${c}(Iterator<Message> messages) {\n        addAll(messages);\n    }\n\n    // Adds every message from an iterator.\n    public void addAll(Iterator<Message> messages) {\n        if (messages == null) {\n            return;\n        }\n        while (messages.hasNext()) {\n            add(messages.next());\n        }\n    }\n\n    // Adds one message to every token bucket found in its text.\n    public void add(Message message) {\n        if (message == null) {\n            return;\n        }\n        remove(message);\n        Set<String> tokens = tokenize(message.message());\n        reverseIndex.put(message, tokens);\n        for (String token : tokens) {\n            index.computeIfAbsent(token, key -> new LinkedHashSet<>()).add(message);\n        }\n    }\n\n    // Removes a message from every token bucket.\n    public boolean remove(Message message) {\n        Set<String> tokens = reverseIndex.remove(message);\n        if (tokens == null) {\n            return false;\n        }\n        for (String token : tokens) {\n            Set<Message> bucket = index.get(token);\n            if (bucket != null) {\n                bucket.remove(message);\n                if (bucket.isEmpty()) {\n                    index.remove(token);\n                }\n            }\n        }\n        return true;\n    }\n\n    // Searches for messages containing all valid query tokens.\n    public List<Message> search(String query) {\n        Set<String> tokens = tokenize(query);\n        if (tokens.isEmpty()) {\n            return Collections.emptyList();\n        }\n        Iterator<String> iterator = tokens.iterator();\n        Set<Message> result = new LinkedHashSet<>(index.getOrDefault(iterator.next(), Collections.emptySet()));\n        while (iterator.hasNext()) {\n            result.retainAll(index.getOrDefault(iterator.next(), Collections.emptySet()));\n        }\n        return new ArrayList<>(result);\n    }\n\n    // Returns how many messages contain a token.\n    public int frequency(String token) {\n        return index.getOrDefault(normalize(token), Collections.emptySet()).size();\n    }\n\n    // Returns the number of indexed messages.\n    public int size() {\n        return reverseIndex.size();\n    }\n\n    // Converts text into normalized unique tokens.\n    private Set<String> tokenize(String text) {\n        Set<String> tokens = new LinkedHashSet<>();\n        if (text == null) {\n            return tokens;\n        }\n        for (String raw : text.split(\"[^A-Za-z0-9]+\")) {\n            String token = normalize(raw);\n            if (!token.isEmpty()) {\n                tokens.add(token);\n            }\n        }\n        return tokens;\n    }\n\n    // Normalizes a token for case-insensitive lookup.\n    private String normalize(String token) {\n        return token == null ? \"\" : token.toLowerCase(Locale.ROOT).trim();\n    }\n}\n`;
}

function messageKeywordTest(task) {
  const c = task.className;
  return `${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that an empty message index returns no messages.\n    @Test\n    public void emptyIndexReturnsNoMessages() {\n        ${c} index = new ${c}();\n        assertTrue(index.search(\"dao\").isEmpty());\n        assertEquals(0, index.size());\n    }\n\n    // Verifies that message text is indexed case-insensitively.\n    @Test\n    public void messageTextIsIndexed() {\n        ${c} index = new ${c}();\n        Message message = message(\"Review DAO methods\");\n        index.add(message);\n        assertEquals(Collections.singletonList(message), index.search(\"dao\"));\n    }\n\n    // Verifies that punctuation does not block search.\n    @Test\n    public void punctuationIsIgnored() {\n        ${c} index = new ${c}();\n        Message message = message(\"CSV, escaping works!\");\n        index.add(message);\n        assertEquals(Collections.singletonList(message), index.search(\"escaping\"));\n    }\n\n    // Verifies that repeated words do not duplicate messages.\n    @Test\n    public void repeatedWordsDoNotDuplicateMessages() {\n        ${c} index = new ${c}();\n        Message message = message(\"test test test\");\n        index.add(message);\n        assertEquals(1, index.search(\"test\").size());\n        assertEquals(1, index.frequency(\"test\"));\n    }\n\n    // Verifies that multi-token search returns intersections.\n    @Test\n    public void multiTokenSearchReturnsIntersection() {\n        ${c} index = new ${c}();\n        Message first = message(\"dao persistence review\");\n        Message second = message(\"dao graph review\");\n        index.add(first);\n        index.add(second);\n        assertEquals(Collections.singletonList(first), index.search(\"dao persistence\"));\n    }\n\n    // Verifies that removing a message clears token buckets.\n    @Test\n    public void removeClearsMessageTokens() {\n        ${c} index = new ${c}();\n        Message message = message(\"delete this token\");\n        index.add(message);\n        assertTrue(index.remove(message));\n        assertTrue(index.search(\"token\").isEmpty());\n    }\n\n    // Verifies that the iterator constructor loads messages.\n    @Test\n    public void constructorIndexesIteratorMessages() {\n        Message first = message(\"alpha beta\");\n        Message second = message(\"beta gamma\");\n        ${c} index = new ${c}(Arrays.asList(first, second).iterator());\n        assertEquals(2, index.frequency(\"beta\"));\n    }\n\n    // Creates a MiniLab Message record for tests.\n    private Message message(String text) {\n        return new Message(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), System.currentTimeMillis(), text);\n    }\n}\n`;
}

function testSource(task) {
  if (task.id === 'DS01') return postKeywordTest(task);
  if (task.id === 'DS02') return messageKeywordTest(task);
  if (task.prefix === 'PD') return persistentTest(task);
  if (task.prefix === 'DP') return designPatternTest(task);
  const kind = dsKind(task);
  if (kind === 'graph') return graphTest(task);
  if (kind === 'trie') return trieTest(task);
  if (kind === 'queue') return queueTest(task);
  if (kind === 'stack') return stackTest(task);
  if (kind === 'range') return rangeTest(task);
  if (kind === 'counter') return counterTest(task);
  if (kind === 'cache') return cacheTest(task);
  if (kind === 'tree') return treeTest(task);
  return indexTest(task);
}

function indexSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final Map<String, Set<UUID>> index = new HashMap<>();\n    private final Map<UUID, Set<String>> reverseIndex = new HashMap<>();\n\n    // Creates an empty keyword-style index.\n    public ${c}() {\n    }\n\n    // Adds an item to every token bucket found in the text.\n    public void add(UUID itemId, String text) {\n        Objects.requireNonNull(itemId, \"itemId\");\n        remove(itemId);\n        Set<String> tokens = tokenize(text);\n        reverseIndex.put(itemId, tokens);\n        for (String token : tokens) {\n            index.computeIfAbsent(token, key -> new LinkedHashSet<>()).add(itemId);\n        }\n    }\n\n    // Removes an item from all token buckets.\n    public boolean remove(UUID itemId) {\n        Set<String> tokens = reverseIndex.remove(itemId);\n        if (tokens == null) {\n            return false;\n        }\n        for (String token : tokens) {\n            Set<UUID> bucket = index.get(token);\n            if (bucket != null) {\n                bucket.remove(itemId);\n                if (bucket.isEmpty()) {\n                    index.remove(token);\n                }\n            }\n        }\n        return true;\n    }\n\n    // Returns matching item ids for one normalized keyword.\n    public Set<UUID> search(String keyword) {\n        String token = normalize(keyword);\n        if (token.isEmpty()) {\n            return Collections.emptySet();\n        }\n        return new LinkedHashSet<>(index.getOrDefault(token, Collections.emptySet()));\n    }\n\n    // Returns item ids that match every keyword.\n    public Set<UUID> searchAll(Collection<String> keywords) {\n        if (keywords == null || keywords.isEmpty()) {\n            return Collections.emptySet();\n        }\n        Iterator<String> iterator = keywords.iterator();\n        Set<UUID> result = search(iterator.next());\n        while (iterator.hasNext()) {\n            result.retainAll(search(iterator.next()));\n        }\n        return result;\n    }\n\n    // Returns how many items contain the keyword.\n    public int frequency(String keyword) {\n        return search(keyword).size();\n    }\n\n    // Returns the number of indexed items.\n    public int itemCount() {\n        return reverseIndex.size();\n    }\n\n    // Splits text into normalized unique tokens.\n    private Set<String> tokenize(String text) {\n        Set<String> tokens = new LinkedHashSet<>();\n        for (String raw : String.valueOf(text).split(\"[^A-Za-z0-9]+\")) {\n            String token = normalize(raw);\n            if (!token.isEmpty()) {\n                tokens.add(token);\n            }\n        }\n        return tokens;\n    }\n\n    // Normalizes a token for lookup.\n    private String normalize(String token) {\n        return String.valueOf(token).toLowerCase(Locale.ROOT).trim();\n    }\n}\n`;
}

function indexTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that an empty index returns no ids.\n    @Test\n    public void emptyIndexReturnsNoResults() {\n        ${c} index = new ${c}();\n        assertTrue(index.search(\"missing\").isEmpty());\n        assertEquals(0, index.itemCount());\n    }\n\n    // Verifies that lookup is case-insensitive and punctuation-safe.\n    @Test\n    public void searchNormalizesCaseAndPunctuation() {\n        ${c} index = new ${c}();\n        UUID id = UUID.randomUUID();\n        index.add(id, \"Hello, MiniLab!\");\n        assertEquals(Collections.singleton(id), index.search(\"hello\"));\n        assertEquals(Collections.singleton(id), index.search(\"MINILAB\"));\n    }\n\n    // Verifies that repeated words do not duplicate ids.\n    @Test\n    public void duplicateWordsDoNotDuplicateResults() {\n        ${c} index = new ${c}();\n        UUID id = UUID.randomUUID();\n        index.add(id, \"dao dao dao\");\n        assertEquals(1, index.search(\"dao\").size());\n    }\n\n    // Verifies that intersection search keeps only common matches.\n    @Test\n    public void searchAllReturnsIntersection() {\n        ${c} index = new ${c}();\n        UUID first = UUID.randomUUID();\n        UUID second = UUID.randomUUID();\n        index.add(first, \"post dao test\");\n        index.add(second, \"post graph\");\n        assertEquals(Collections.singleton(first), index.searchAll(Arrays.asList(\"post\", \"dao\")));\n    }\n\n    // Verifies that removing an item updates every token bucket.\n    @Test\n    public void removeDeletesAllTokenReferences() {\n        ${c} index = new ${c}();\n        UUID id = UUID.randomUUID();\n        index.add(id, \"alpha beta\");\n        assertTrue(index.remove(id));\n        assertTrue(index.search(\"alpha\").isEmpty());\n        assertFalse(index.remove(id));\n    }\n}\n`;
}

function graphSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final Map<UUID, Set<UUID>> adjacency = new LinkedHashMap<>();\n\n    // Creates an empty directed graph.\n    public ${c}() {\n    }\n\n    // Adds a directed connection between two ids.\n    public void addConnection(UUID from, UUID to) {\n        Objects.requireNonNull(from, \"from\");\n        Objects.requireNonNull(to, \"to\");\n        adjacency.computeIfAbsent(from, key -> new LinkedHashSet<>()).add(to);\n        adjacency.computeIfAbsent(to, key -> new LinkedHashSet<>());\n    }\n\n    // Removes a directed connection if it exists.\n    public boolean removeConnection(UUID from, UUID to) {\n        Set<UUID> targets = adjacency.get(from);\n        return targets != null && targets.remove(to);\n    }\n\n    // Returns neighbors reachable in one step.\n    public Set<UUID> neighbors(UUID node) {\n        return new LinkedHashSet<>(adjacency.getOrDefault(node, Collections.emptySet()));\n    }\n\n    // Checks whether a target can be reached from a start node.\n    public boolean isReachable(UUID start, UUID target) {\n        return shortestDistance(start, target) >= 0;\n    }\n\n    // Returns the shortest unweighted distance or -1 when unreachable.\n    public int shortestDistance(UUID start, UUID target) {\n        if (Objects.equals(start, target) && adjacency.containsKey(start)) {\n            return 0;\n        }\n        Queue<UUID> queue = new ArrayDeque<>();\n        Map<UUID, Integer> distance = new HashMap<>();\n        queue.add(start);\n        distance.put(start, 0);\n        while (!queue.isEmpty()) {\n            UUID current = queue.remove();\n            for (UUID next : adjacency.getOrDefault(current, Collections.emptySet())) {\n                if (distance.containsKey(next)) {\n                    continue;\n                }\n                int nextDistance = distance.get(current) + 1;\n                if (next.equals(target)) {\n                    return nextDistance;\n                }\n                distance.put(next, nextDistance);\n                queue.add(next);\n            }\n        }\n        return -1;\n    }\n\n    // Counts directed edges in the graph.\n    public int edgeCount() {\n        int count = 0;\n        for (Set<UUID> targets : adjacency.values()) {\n            count += targets.size();\n        }\n        return count;\n    }\n\n    // Counts known nodes in the graph.\n    public int nodeCount() {\n        return adjacency.size();\n    }\n}\n`;
}

function graphTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that a new graph has no nodes or edges.\n    @Test\n    public void emptyGraphHasNoEdges() {\n        ${c} graph = new ${c}();\n        assertEquals(0, graph.nodeCount());\n        assertEquals(0, graph.edgeCount());\n    }\n\n    // Verifies that adding a connection records both endpoints.\n    @Test\n    public void addConnectionCreatesNeighbor() {\n        ${c} graph = new ${c}();\n        UUID a = UUID.randomUUID();\n        UUID b = UUID.randomUUID();\n        graph.addConnection(a, b);\n        assertTrue(graph.neighbors(a).contains(b));\n        assertEquals(2, graph.nodeCount());\n    }\n\n    // Verifies that duplicate connections count once.\n    @Test\n    public void duplicateConnectionIsIgnored() {\n        ${c} graph = new ${c}();\n        UUID a = UUID.randomUUID();\n        UUID b = UUID.randomUUID();\n        graph.addConnection(a, b);\n        graph.addConnection(a, b);\n        assertEquals(1, graph.edgeCount());\n    }\n\n    // Verifies reachability across multiple hops.\n    @Test\n    public void reachabilityUsesBreadthFirstSearch() {\n        ${c} graph = new ${c}();\n        UUID a = UUID.randomUUID();\n        UUID b = UUID.randomUUID();\n        UUID cNode = UUID.randomUUID();\n        graph.addConnection(a, b);\n        graph.addConnection(b, cNode);\n        assertTrue(graph.isReachable(a, cNode));\n        assertEquals(2, graph.shortestDistance(a, cNode));\n    }\n\n    // Verifies that removing a connection breaks reachability.\n    @Test\n    public void removeConnectionUpdatesGraph() {\n        ${c} graph = new ${c}();\n        UUID a = UUID.randomUUID();\n        UUID b = UUID.randomUUID();\n        graph.addConnection(a, b);\n        assertTrue(graph.removeConnection(a, b));\n        assertFalse(graph.isReachable(a, b));\n    }\n}\n`;
}

function trieSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final Node root = new Node();\n    private int wordCount;\n\n    // Creates an empty trie.\n    public ${c}() {\n    }\n\n    // Adds one normalized word to the trie.\n    public void add(String word) {\n        String normalized = normalize(word);\n        if (normalized.isEmpty()) {\n            return;\n        }\n        Node current = root;\n        for (char ch : normalized.toCharArray()) {\n            current = current.children.computeIfAbsent(ch, key -> new Node());\n        }\n        if (current.frequency == 0) {\n            wordCount++;\n        }\n        current.frequency++;\n    }\n\n    // Checks whether a full word exists in the trie.\n    public boolean contains(String word) {\n        Node node = nodeFor(normalize(word));\n        return node != null && node.frequency > 0;\n    }\n\n    // Returns how many times a word has been added.\n    public int frequency(String word) {\n        Node node = nodeFor(normalize(word));\n        return node == null ? 0 : node.frequency;\n    }\n\n    // Returns sorted suggestions for a prefix.\n    public List<String> suggest(String prefix, int limit) {\n        String normalized = normalize(prefix);\n        Node node = nodeFor(normalized);\n        if (node == null || limit <= 0) {\n            return Collections.emptyList();\n        }\n        List<String> results = new ArrayList<>();\n        collect(node, normalized, results, limit);\n        return results;\n    }\n\n    // Returns the number of unique words stored.\n    public int wordCount() {\n        return wordCount;\n    }\n\n    // Returns the trie node for a prefix.\n    private Node nodeFor(String value) {\n        Node current = root;\n        for (char ch : value.toCharArray()) {\n            current = current.children.get(ch);\n            if (current == null) {\n                return null;\n            }\n        }\n        return current;\n    }\n\n    // Collects words below a node in lexical order.\n    private void collect(Node node, String prefix, List<String> results, int limit) {\n        if (results.size() >= limit) {\n            return;\n        }\n        if (node.frequency > 0) {\n            results.add(prefix);\n        }\n        for (Map.Entry<Character, Node> entry : node.children.entrySet()) {\n            collect(entry.getValue(), prefix + entry.getKey(), results, limit);\n        }\n    }\n\n    // Normalizes a word for trie storage.\n    private String normalize(String word) {\n        return String.valueOf(word).toLowerCase(Locale.ROOT).replaceAll(\"[^a-z0-9]\", \"\");\n    }\n\n    private static class Node {\n        private final Map<Character, Node> children = new TreeMap<>();\n        private int frequency;\n\n        // Creates an empty trie node.\n        private Node() {\n        }\n    }\n}\n`;
}

function trieTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that an empty trie has no words.\n    @Test\n    public void emptyTrieHasNoWords() {\n        ${c} trie = new ${c}();\n        assertEquals(0, trie.wordCount());\n        assertFalse(trie.contains(\"post\"));\n    }\n\n    // Verifies that inserted words can be found.\n    @Test\n    public void insertedWordCanBeFound() {\n        ${c} trie = new ${c}();\n        trie.add(\"Post\");\n        assertTrue(trie.contains(\"post\"));\n    }\n\n    // Verifies that repeated words update frequency only.\n    @Test\n    public void repeatedWordTracksFrequency() {\n        ${c} trie = new ${c}();\n        trie.add(\"tag\");\n        trie.add(\"tag\");\n        assertEquals(1, trie.wordCount());\n        assertEquals(2, trie.frequency(\"tag\"));\n    }\n\n    // Verifies prefix suggestions are sorted.\n    @Test\n    public void suggestionsUsePrefix() {\n        ${c} trie = new ${c}();\n        trie.add(\"hash\");\n        trie.add(\"hashtag\");\n        trie.add(\"post\");\n        assertEquals(Arrays.asList(\"hash\", \"hashtag\"), trie.suggest(\"has\", 5));\n    }\n\n    // Verifies that suggestion limits are respected.\n    @Test\n    public void suggestionLimitIsRespected() {\n        ${c} trie = new ${c}();\n        trie.add(\"alpha\");\n        trie.add(\"alpine\");\n        assertEquals(1, trie.suggest(\"al\", 1).size());\n    }\n}\n`;
}

function queueSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final PriorityQueue<Entry> queue = new PriorityQueue<>();\n    private final Map<UUID, Entry> entries = new HashMap<>();\n    private long sequence;\n\n    // Creates an empty priority queue.\n    public ${c}() {\n    }\n\n    // Adds or replaces an item with a priority.\n    public void enqueue(UUID id, String text, int priority) {\n        Objects.requireNonNull(id, \"id\");\n        remove(id);\n        Entry entry = new Entry(id, String.valueOf(text), priority, sequence++);\n        entries.put(id, entry);\n        queue.add(entry);\n    }\n\n    // Removes and returns the highest-priority item.\n    public Optional<Entry> dequeue() {\n        Entry entry = queue.poll();\n        if (entry == null) {\n            return Optional.empty();\n        }\n        entries.remove(entry.id);\n        return Optional.of(entry);\n    }\n\n    // Returns the next item without removing it.\n    public Optional<Entry> peek() {\n        return Optional.ofNullable(queue.peek());\n    }\n\n    // Removes a queued item by id.\n    public boolean remove(UUID id) {\n        Entry entry = entries.remove(id);\n        return entry != null && queue.remove(entry);\n    }\n\n    // Checks whether an id is currently queued.\n    public boolean contains(UUID id) {\n        return entries.containsKey(id);\n    }\n\n    // Returns the number of queued items.\n    public int size() {\n        return entries.size();\n    }\n\n    public static class Entry implements Comparable<Entry> {\n        private final UUID id;\n        private final String text;\n        private final int priority;\n        private final long sequence;\n\n        // Creates an immutable queue entry.\n        private Entry(UUID id, String text, int priority, long sequence) {\n            this.id = id;\n            this.text = text;\n            this.priority = priority;\n            this.sequence = sequence;\n        }\n\n        // Returns the queued item id.\n        public UUID getId() {\n            return id;\n        }\n\n        // Returns the queued item text.\n        public String getText() {\n            return text;\n        }\n\n        // Returns the queued item priority.\n        public int getPriority() {\n            return priority;\n        }\n\n        // Orders entries by priority and insertion sequence.\n        @Override\n        public int compareTo(Entry other) {\n            int byPriority = Integer.compare(other.priority, priority);\n            return byPriority != 0 ? byPriority : Long.compare(sequence, other.sequence);\n        }\n    }\n}\n`;
}

function queueTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that a new queue is empty.\n    @Test\n    public void emptyQueueHasNoNextItem() {\n        ${c} queue = new ${c}();\n        assertFalse(queue.peek().isPresent());\n        assertEquals(0, queue.size());\n    }\n\n    // Verifies that higher priority items are returned first.\n    @Test\n    public void higherPriorityDequeuesFirst() {\n        ${c} queue = new ${c}();\n        UUID low = UUID.randomUUID();\n        UUID high = UUID.randomUUID();\n        queue.enqueue(low, \"low\", 1);\n        queue.enqueue(high, \"high\", 10);\n        assertEquals(high, queue.dequeue().get().getId());\n    }\n\n    // Verifies FIFO behavior for equal priorities.\n    @Test\n    public void equalPriorityUsesInsertionOrder() {\n        ${c} queue = new ${c}();\n        UUID first = UUID.randomUUID();\n        UUID second = UUID.randomUUID();\n        queue.enqueue(first, \"first\", 5);\n        queue.enqueue(second, \"second\", 5);\n        assertEquals(first, queue.dequeue().get().getId());\n    }\n\n    // Verifies that removing an item prevents dequeue.\n    @Test\n    public void removeDeletesQueuedItem() {\n        ${c} queue = new ${c}();\n        UUID id = UUID.randomUUID();\n        queue.enqueue(id, \"item\", 3);\n        assertTrue(queue.remove(id));\n        assertFalse(queue.contains(id));\n    }\n\n    // Verifies that replacing an item keeps one entry.\n    @Test\n    public void enqueueSameIdReplacesEntry() {\n        ${c} queue = new ${c}();\n        UUID id = UUID.randomUUID();\n        queue.enqueue(id, \"old\", 1);\n        queue.enqueue(id, \"new\", 9);\n        assertEquals(1, queue.size());\n        assertEquals(\"new\", queue.peek().get().getText());\n    }\n}\n`;
}

function stackSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final Deque<String> history = new ArrayDeque<>();\n\n    // Creates an empty history stack.\n    public ${c}() {\n    }\n\n    // Pushes a new action onto the stack.\n    public void push(String action) {\n        history.push(String.valueOf(action));\n    }\n\n    // Removes and returns the most recent action.\n    public Optional<String> undo() {\n        return history.isEmpty() ? Optional.empty() : Optional.of(history.pop());\n    }\n\n    // Returns the most recent action without removing it.\n    public Optional<String> peek() {\n        return history.isEmpty() ? Optional.empty() : Optional.of(history.peek());\n    }\n\n    // Clears all saved history.\n    public void clear() {\n        history.clear();\n    }\n\n    // Returns actions from newest to oldest.\n    public List<String> history() {\n        return new ArrayList<>(history);\n    }\n\n    // Returns the number of saved actions.\n    public int size() {\n        return history.size();\n    }\n}\n`;
}

function stackTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that an empty stack has no undo action.\n    @Test\n    public void emptyStackHasNoUndo() {\n        ${c} stack = new ${c}();\n        assertFalse(stack.undo().isPresent());\n    }\n\n    // Verifies that the newest action is undone first.\n    @Test\n    public void undoReturnsNewestAction() {\n        ${c} stack = new ${c}();\n        stack.push(\"first\");\n        stack.push(\"second\");\n        assertEquals(\"second\", stack.undo().get());\n    }\n\n    // Verifies peek does not remove data.\n    @Test\n    public void peekKeepsActionOnStack() {\n        ${c} stack = new ${c}();\n        stack.push(\"edit\");\n        assertEquals(\"edit\", stack.peek().get());\n        assertEquals(1, stack.size());\n    }\n\n    // Verifies history order is newest first.\n    @Test\n    public void historyIsNewestFirst() {\n        ${c} stack = new ${c}();\n        stack.push(\"old\");\n        stack.push(\"new\");\n        assertEquals(Arrays.asList(\"new\", \"old\"), stack.history());\n    }\n\n    // Verifies clear removes all actions.\n    @Test\n    public void clearRemovesHistory() {\n        ${c} stack = new ${c}();\n        stack.push(\"edit\");\n        stack.clear();\n        assertEquals(0, stack.size());\n    }\n}\n`;
}

function rangeSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final TreeMap<Long, Set<UUID>> values = new TreeMap<>();\n\n    // Creates an empty range index.\n    public ${c}() {\n    }\n\n    // Adds an id under a sortable key.\n    public void add(long key, UUID id) {\n        Objects.requireNonNull(id, \"id\");\n        values.computeIfAbsent(key, ignored -> new LinkedHashSet<>()).add(id);\n    }\n\n    // Removes an id from a sortable key.\n    public boolean remove(long key, UUID id) {\n        Set<UUID> bucket = values.get(key);\n        if (bucket == null || !bucket.remove(id)) {\n            return false;\n        }\n        if (bucket.isEmpty()) {\n            values.remove(key);\n        }\n        return true;\n    }\n\n    // Returns ids whose keys are inside the inclusive range.\n    public List<UUID> between(long startInclusive, long endInclusive) {\n        List<UUID> result = new ArrayList<>();\n        for (Set<UUID> bucket : values.subMap(startInclusive, true, endInclusive, true).values()) {\n            result.addAll(bucket);\n        }\n        return result;\n    }\n\n    // Returns ids at the smallest key.\n    public Set<UUID> first() {\n        return values.isEmpty() ? Collections.emptySet() : new LinkedHashSet<>(values.firstEntry().getValue());\n    }\n\n    // Returns ids at the largest key.\n    public Set<UUID> last() {\n        return values.isEmpty() ? Collections.emptySet() : new LinkedHashSet<>(values.lastEntry().getValue());\n    }\n\n    // Counts all ids in the range index.\n    public int count() {\n        int count = 0;\n        for (Set<UUID> bucket : values.values()) {\n            count += bucket.size();\n        }\n        return count;\n    }\n}\n`;
}

function rangeTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that an empty range has no first value.\n    @Test\n    public void emptyRangeHasNoFirstValue() {\n        ${c} range = new ${c}();\n        assertTrue(range.first().isEmpty());\n        assertEquals(0, range.count());\n    }\n\n    // Verifies that range lookup includes both boundaries.\n    @Test\n    public void betweenIncludesBoundaries() {\n        ${c} range = new ${c}();\n        UUID low = UUID.randomUUID();\n        UUID high = UUID.randomUUID();\n        range.add(10, low);\n        range.add(20, high);\n        assertEquals(Arrays.asList(low, high), range.between(10, 20));\n    }\n\n    // Verifies that values outside the range are excluded.\n    @Test\n    public void betweenExcludesOutsideValues() {\n        ${c} range = new ${c}();\n        UUID inside = UUID.randomUUID();\n        UUID outside = UUID.randomUUID();\n        range.add(5, outside);\n        range.add(15, inside);\n        assertEquals(Collections.singletonList(inside), range.between(10, 20));\n    }\n\n    // Verifies first and last buckets.\n    @Test\n    public void firstAndLastUseSortedKeys() {\n        ${c} range = new ${c}();\n        UUID first = UUID.randomUUID();\n        UUID last = UUID.randomUUID();\n        range.add(2, last);\n        range.add(1, first);\n        assertTrue(range.first().contains(first));\n        assertTrue(range.last().contains(last));\n    }\n\n    // Verifies that removing an id updates the count.\n    @Test\n    public void removeUpdatesCount() {\n        ${c} range = new ${c}();\n        UUID id = UUID.randomUUID();\n        range.add(1, id);\n        assertTrue(range.remove(1, id));\n        assertEquals(0, range.count());\n    }\n}\n`;
}

function counterSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final Map<UUID, Integer> scores = new HashMap<>();\n\n    // Creates an empty counter index.\n    public ${c}() {\n    }\n\n    // Adds a score delta to an id.\n    public int addScore(UUID id, int delta) {\n        Objects.requireNonNull(id, \"id\");\n        int next = scoreOf(id) + delta;\n        scores.put(id, next);\n        return next;\n    }\n\n    // Sets an absolute score for an id.\n    public void setScore(UUID id, int score) {\n        Objects.requireNonNull(id, \"id\");\n        scores.put(id, score);\n    }\n\n    // Returns the score for an id.\n    public int scoreOf(UUID id) {\n        return scores.getOrDefault(id, 0);\n    }\n\n    // Returns ids ordered by score descending.\n    public List<UUID> top(int limit) {\n        return scores.entrySet().stream()\n            .sorted((left, right) -> Integer.compare(right.getValue(), left.getValue()))\n            .limit(Math.max(0, limit))\n            .map(Map.Entry::getKey)\n            .toList();\n    }\n\n    // Removes an id from the counter.\n    public boolean remove(UUID id) {\n        return scores.remove(id) != null;\n    }\n\n    // Returns how many ids have scores.\n    public int size() {\n        return scores.size();\n    }\n}\n`;
}

function counterTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that unknown ids have zero score.\n    @Test\n    public void unknownIdHasZeroScore() {\n        ${c} counter = new ${c}();\n        assertEquals(0, counter.scoreOf(UUID.randomUUID()));\n    }\n\n    // Verifies that score deltas accumulate.\n    @Test\n    public void addScoreAccumulatesDeltas() {\n        ${c} counter = new ${c}();\n        UUID id = UUID.randomUUID();\n        counter.addScore(id, 3);\n        assertEquals(5, counter.addScore(id, 2));\n    }\n\n    // Verifies that setScore replaces the old value.\n    @Test\n    public void setScoreReplacesValue() {\n        ${c} counter = new ${c}();\n        UUID id = UUID.randomUUID();\n        counter.addScore(id, 3);\n        counter.setScore(id, 10);\n        assertEquals(10, counter.scoreOf(id));\n    }\n\n    // Verifies that top returns highest scores first.\n    @Test\n    public void topReturnsHighestScoresFirst() {\n        ${c} counter = new ${c}();\n        UUID low = UUID.randomUUID();\n        UUID high = UUID.randomUUID();\n        counter.setScore(low, 1);\n        counter.setScore(high, 9);\n        assertEquals(high, counter.top(1).get(0));\n    }\n\n    // Verifies that removing an id clears its score.\n    @Test\n    public void removeClearsScore() {\n        ${c} counter = new ${c}();\n        UUID id = UUID.randomUUID();\n        counter.setScore(id, 4);\n        assertTrue(counter.remove(id));\n        assertEquals(0, counter.scoreOf(id));\n    }\n}\n`;
}

function cacheSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final int capacity;\n    private final LinkedHashMap<UUID, String> cache;\n\n    // Creates a cache with default capacity.\n    public ${c}() {\n        this(3);\n    }\n\n    // Creates a cache with a fixed positive capacity.\n    public ${c}(int capacity) {\n        if (capacity <= 0) {\n            throw new IllegalArgumentException(\"capacity must be positive\");\n        }\n        this.capacity = capacity;\n        this.cache = new LinkedHashMap<>(16, 0.75f, true);\n    }\n\n    // Saves a value and evicts the oldest entry when full.\n    public void put(UUID id, String value) {\n        cache.put(Objects.requireNonNull(id, \"id\"), String.valueOf(value));\n        while (cache.size() > capacity) {\n            Iterator<UUID> iterator = cache.keySet().iterator();\n            iterator.next();\n            iterator.remove();\n        }\n    }\n\n    // Returns a cached value and refreshes recency.\n    public Optional<String> get(UUID id) {\n        return Optional.ofNullable(cache.get(id));\n    }\n\n    // Checks whether the cache contains an id.\n    public boolean contains(UUID id) {\n        return cache.containsKey(id);\n    }\n\n    // Removes a cached id.\n    public boolean remove(UUID id) {\n        return cache.remove(id) != null;\n    }\n\n    // Returns ids from least to most recently used.\n    public List<UUID> keys() {\n        return new ArrayList<>(cache.keySet());\n    }\n\n    // Returns the number of cached values.\n    public int size() {\n        return cache.size();\n    }\n}\n`;
}

function cacheTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that cache capacity must be positive.\n    @Test(expected = IllegalArgumentException.class)\n    public void rejectsNonPositiveCapacity() {\n        new ${c}(0);\n    }\n\n    // Verifies that saved values can be read.\n    @Test\n    public void putAndGetValue() {\n        ${c} cache = new ${c}(2);\n        UUID id = UUID.randomUUID();\n        cache.put(id, \"draft\");\n        assertEquals(\"draft\", cache.get(id).get());\n    }\n\n    // Verifies that old entries are evicted when full.\n    @Test\n    public void capacityEvictsLeastRecentEntry() {\n        ${c} cache = new ${c}(1);\n        UUID oldId = UUID.randomUUID();\n        UUID newId = UUID.randomUUID();\n        cache.put(oldId, \"old\");\n        cache.put(newId, \"new\");\n        assertFalse(cache.contains(oldId));\n        assertTrue(cache.contains(newId));\n    }\n\n    // Verifies that reading updates recency.\n    @Test\n    public void getRefreshesRecency() {\n        ${c} cache = new ${c}(2);\n        UUID first = UUID.randomUUID();\n        UUID second = UUID.randomUUID();\n        UUID third = UUID.randomUUID();\n        cache.put(first, \"first\");\n        cache.put(second, \"second\");\n        cache.get(first);\n        cache.put(third, \"third\");\n        assertTrue(cache.contains(first));\n        assertFalse(cache.contains(second));\n    }\n\n    // Verifies that removing a value updates size.\n    @Test\n    public void removeClearsValue() {\n        ${c} cache = new ${c}(2);\n        UUID id = UUID.randomUUID();\n        cache.put(id, \"value\");\n        assertTrue(cache.remove(id));\n        assertEquals(0, cache.size());\n    }\n}\n`;
}

function treeSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final Map<UUID, List<UUID>> children = new LinkedHashMap<>();\n    private final Map<UUID, UUID> parent = new HashMap<>();\n\n    // Creates an empty tree index.\n    public ${c}() {\n    }\n\n    // Adds a root node if it is not already present.\n    public void addRoot(UUID id) {\n        children.computeIfAbsent(Objects.requireNonNull(id, \"id\"), key -> new ArrayList<>());\n    }\n\n    // Adds a child below a parent node.\n    public void addChild(UUID parentId, UUID childId) {\n        addRoot(parentId);\n        addRoot(childId);\n        children.get(parentId).add(childId);\n        parent.put(childId, parentId);\n    }\n\n    // Returns direct children of a node.\n    public List<UUID> childrenOf(UUID id) {\n        return new ArrayList<>(children.getOrDefault(id, Collections.emptyList()));\n    }\n\n    // Returns nodes in depth-first order from a root.\n    public List<UUID> depthFirst(UUID root) {\n        List<UUID> result = new ArrayList<>();\n        walkDepth(root, result);\n        return result;\n    }\n\n    // Returns nodes in breadth-first order from a root.\n    public List<UUID> breadthFirst(UUID root) {\n        List<UUID> result = new ArrayList<>();\n        Queue<UUID> queue = new ArrayDeque<>();\n        queue.add(root);\n        while (!queue.isEmpty()) {\n            UUID current = queue.remove();\n            if (!children.containsKey(current)) {\n                continue;\n            }\n            result.add(current);\n            queue.addAll(children.get(current));\n        }\n        return result;\n    }\n\n    // Returns the parent of a node when known.\n    public Optional<UUID> parentOf(UUID id) {\n        return Optional.ofNullable(parent.get(id));\n    }\n\n    // Counts nodes known to the tree.\n    public int nodeCount() {\n        return children.size();\n    }\n\n    // Walks a tree recursively in depth-first order.\n    private void walkDepth(UUID node, List<UUID> result) {\n        if (!children.containsKey(node)) {\n            return;\n        }\n        result.add(node);\n        for (UUID child : children.get(node)) {\n            walkDepth(child, result);\n        }\n    }\n}\n`;
}

function treeTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that adding a root creates one node.\n    @Test\n    public void addRootCreatesNode() {\n        ${c} tree = new ${c}();\n        UUID root = UUID.randomUUID();\n        tree.addRoot(root);\n        assertEquals(1, tree.nodeCount());\n    }\n\n    // Verifies direct children are recorded.\n    @Test\n    public void addChildStoresRelationship() {\n        ${c} tree = new ${c}();\n        UUID root = UUID.randomUUID();\n        UUID child = UUID.randomUUID();\n        tree.addChild(root, child);\n        assertEquals(Collections.singletonList(child), tree.childrenOf(root));\n    }\n\n    // Verifies parent lookup after adding a child.\n    @Test\n    public void parentLookupFindsParent() {\n        ${c} tree = new ${c}();\n        UUID root = UUID.randomUUID();\n        UUID child = UUID.randomUUID();\n        tree.addChild(root, child);\n        assertEquals(root, tree.parentOf(child).get());\n    }\n\n    // Verifies depth-first traversal order.\n    @Test\n    public void depthFirstVisitsBranchBeforeSibling() {\n        ${c} tree = new ${c}();\n        UUID root = UUID.randomUUID();\n        UUID child = UUID.randomUUID();\n        UUID grandchild = UUID.randomUUID();\n        tree.addChild(root, child);\n        tree.addChild(child, grandchild);\n        assertEquals(Arrays.asList(root, child, grandchild), tree.depthFirst(root));\n    }\n\n    // Verifies breadth-first traversal order.\n    @Test\n    public void breadthFirstVisitsLevelOrder() {\n        ${c} tree = new ${c}();\n        UUID root = UUID.randomUUID();\n        UUID left = UUID.randomUUID();\n        UUID right = UUID.randomUUID();\n        tree.addChild(root, left);\n        tree.addChild(root, right);\n        assertEquals(Arrays.asList(root, left, right), tree.breadthFirst(root));\n    }\n}\n`;
}

function persistentSource(task) {
  const c = task.className;
  return `import java.io.IOException;\nimport java.nio.charset.StandardCharsets;\nimport java.nio.file.*;\nimport java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private final Map<String, String> records = new LinkedHashMap<>();\n\n    // Creates an empty persistence helper.\n    public ${c}() {\n    }\n\n    // Saves one key-value record.\n    public void saveRecord(String key, String value) {\n        validateKey(key);\n        records.put(key, value == null ? \"\" : value);\n    }\n\n    // Returns a saved record by key.\n    public Optional<String> findRecord(String key) {\n        return Optional.ofNullable(records.get(key));\n    }\n\n    // Deletes a saved record by key.\n    public boolean deleteRecord(String key) {\n        return records.remove(key) != null;\n    }\n\n    // Returns how many records are stored.\n    public int size() {\n        return records.size();\n    }\n\n    // Serializes records to escaped CSV text.\n    public String serialize() {\n        List<String> rows = new ArrayList<>();\n        for (Map.Entry<String, String> entry : records.entrySet()) {\n            rows.add(encodeRow(Arrays.asList(entry.getKey(), entry.getValue())));\n        }\n        return String.join(\"\\n\", rows);\n    }\n\n    // Loads records from escaped CSV text.\n    public void load(String data) {\n        records.clear();\n        for (String row : splitRows(String.valueOf(data))) {\n            if (row.isBlank()) {\n                continue;\n            }\n            List<String> fields = decodeRow(row);\n            if (fields.size() != 2) {\n                throw new IllegalArgumentException(\"Each row must contain key and value\");\n            }\n            saveRecord(fields.get(0), fields.get(1));\n        }\n    }\n\n    // Writes serialized records to a file.\n    public void saveTo(Path path) throws IOException {\n        Files.writeString(path, serialize(), StandardCharsets.UTF_8);\n    }\n\n    // Reads serialized records from a file.\n    public void loadFrom(Path path) throws IOException {\n        load(Files.readString(path, StandardCharsets.UTF_8));\n    }\n\n    // Encodes one CSV row with robust escaping.\n    public String encodeRow(List<String> fields) {\n        List<String> encoded = new ArrayList<>();\n        for (String field : fields) {\n            encoded.add(escape(field));\n        }\n        return String.join(\",\", encoded);\n    }\n\n    // Decodes one escaped CSV row.\n    public List<String> decodeRow(String row) {\n        List<String> fields = new ArrayList<>();\n        StringBuilder current = new StringBuilder();\n        boolean quoted = false;\n        for (int index = 0; index < row.length(); index++) {\n            char ch = row.charAt(index);\n            if (quoted) {\n                if (ch == '\"' && index + 1 < row.length() && row.charAt(index + 1) == '\"') {\n                    current.append('\"');\n                    index++;\n                } else if (ch == '\"') {\n                    quoted = false;\n                } else {\n                    current.append(ch);\n                }\n            } else if (ch == ',') {\n                fields.add(current.toString());\n                current.setLength(0);\n            } else if (ch == '\"') {\n                quoted = true;\n            } else {\n                current.append(ch);\n            }\n        }\n        if (quoted) {\n            throw new IllegalArgumentException(\"Unterminated quoted field\");\n        }\n        fields.add(current.toString());\n        return fields;\n    }\n\n    // Splits serialized CSV into rows while respecting quoted newlines.\n    private List<String> splitRows(String data) {\n        List<String> rows = new ArrayList<>();\n        StringBuilder current = new StringBuilder();\n        boolean quoted = false;\n        for (int index = 0; index < data.length(); index++) {\n            char ch = data.charAt(index);\n            if (ch == '\"') {\n                quoted = !quoted || (index + 1 < data.length() && data.charAt(index + 1) == '\"');\n                current.append(ch);\n                if (index + 1 < data.length() && data.charAt(index + 1) == '\"') {\n                    current.append(data.charAt(++index));\n                }\n            } else if (ch == '\\n' && !quoted) {\n                rows.add(current.toString());\n                current.setLength(0);\n            } else {\n                current.append(ch);\n            }\n        }\n        rows.add(current.toString());\n        return rows;\n    }\n\n    // Escapes one CSV field when needed.\n    private String escape(String value) {\n        String text = value == null ? \"\" : value;\n        if (text.contains(\",\") || text.contains(\"\\\"\") || text.contains(\"\\n\")) {\n            return \"\\\"\" + text.replace(\"\\\"\", \"\\\"\\\"\") + \"\\\"\";\n        }\n        return text;\n    }\n\n    // Rejects blank record keys.\n    private void validateKey(String key) {\n        if (key == null || key.isBlank()) {\n            throw new IllegalArgumentException(\"key is required\");\n        }\n    }\n}\n`;
}

function persistentTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.nio.file.*;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that saved records can be read back.\n    @Test\n    public void saveAndFindRecord() {\n        ${c} store = new ${c}();\n        store.saveRecord(\"post-1\", \"hello\");\n        assertEquals(\"hello\", store.findRecord(\"post-1\").get());\n    }\n\n    // Verifies that deleting records updates size.\n    @Test\n    public void deleteRecordRemovesValue() {\n        ${c} store = new ${c}();\n        store.saveRecord(\"post-1\", \"hello\");\n        assertTrue(store.deleteRecord(\"post-1\"));\n        assertEquals(0, store.size());\n    }\n\n    // Verifies that serialization round-trips comma and quote data.\n    @Test\n    public void serializeAndLoadRoundTripsEscapedData() {\n        ${c} store = new ${c}();\n        store.saveRecord(\"post-1\", \"hello, \\\"MiniLab\\\"\");\n        ${c} loaded = new ${c}();\n        loaded.load(store.serialize());\n        assertEquals(\"hello, \\\"MiniLab\\\"\", loaded.findRecord(\"post-1\").get());\n    }\n\n    // Verifies that blank keys are rejected.\n    @Test(expected = IllegalArgumentException.class)\n    public void blankKeyIsRejected() {\n        ${c} store = new ${c}();\n        store.saveRecord(\" \", \"value\");\n    }\n\n    // Verifies robust CSV escaping for commas quotes and newlines.\n    @Test\n    public void csvEscapingHandlesSpecialCharacters() {\n        ${c} store = new ${c}();\n        String row = store.encodeRow(Arrays.asList(\"a,b\", \"quote \\\"x\\\"\", \"line\\nbreak\"));\n        assertEquals(Arrays.asList(\"a,b\", \"quote \\\"x\\\"\", \"line\\nbreak\"), store.decodeRow(row));\n    }\n\n    // Verifies that file save and load use UTF-8 text.\n    @Test\n    public void saveToAndLoadFromFile() throws Exception {\n        Path path = Files.createTempFile(\"mock-hackathon\", \".csv\");\n        ${c} store = new ${c}();\n        store.saveRecord(\"key\", \"value\");\n        store.saveTo(path);\n        ${c} loaded = new ${c}();\n        loaded.loadFrom(path);\n        assertEquals(\"value\", loaded.findRecord(\"key\").get());\n        Files.deleteIfExists(path);\n    }\n}\n`;
}

function designPatternSource(task) {
  const c = task.className;
  return `import java.util.*;\n\n${javaDoc(task)}\npublic class ${c} {\n    private Rule rule = (actorRole, action) -> true;\n    private final Map<String, String> records = new LinkedHashMap<>();\n    private final List<Listener> listeners = new ArrayList<>();\n    private final Deque<Command> history = new ArrayDeque<>();\n\n    // Creates an empty pattern practice service.\n    public ${c}() {\n    }\n\n    // Replaces the permission or strategy rule.\n    public void setRule(Rule rule) {\n        this.rule = Objects.requireNonNull(rule, \"rule\");\n    }\n\n    // Saves a value when the current rule allows it.\n    public boolean save(String actorRole, String key, String value) {\n        requireKey(key);\n        if (!rule.allows(actorRole, \"save\")) {\n            emit(\"save denied:\" + key);\n            return false;\n        }\n        String oldValue = records.put(key, value == null ? \"\" : value);\n        history.push(new Command(key, oldValue));\n        emit(\"saved:\" + key);\n        return true;\n    }\n\n    // Returns a stored value by key.\n    public Optional<String> find(String key) {\n        return Optional.ofNullable(records.get(key));\n    }\n\n    // Deletes a value when the current rule allows it.\n    public boolean delete(String actorRole, String key) {\n        requireKey(key);\n        if (!rule.allows(actorRole, \"delete\") || !records.containsKey(key)) {\n            emit(\"delete denied:\" + key);\n            return false;\n        }\n        String oldValue = records.remove(key);\n        history.push(new Command(key, oldValue));\n        emit(\"deleted:\" + key);\n        return true;\n    }\n\n    // Registers a listener for service events.\n    public void addListener(Listener listener) {\n        listeners.add(Objects.requireNonNull(listener, \"listener\"));\n    }\n\n    // Undoes the latest saved command.\n    public boolean undoLast() {\n        if (history.isEmpty()) {\n            return false;\n        }\n        history.pop().undo(records);\n        emit(\"undo\");\n        return true;\n    }\n\n    // Returns stored keys in insertion order.\n    public List<String> keys() {\n        return new ArrayList<>(records.keySet());\n    }\n\n    // Returns the number of stored records.\n    public int size() {\n        return records.size();\n    }\n\n    // Sends an event to registered listeners.\n    private void emit(String event) {\n        for (Listener listener : listeners) {\n            listener.onEvent(event);\n        }\n    }\n\n    // Rejects blank keys before service work.\n    private void requireKey(String key) {\n        if (key == null || key.isBlank()) {\n            throw new IllegalArgumentException(\"key is required\");\n        }\n    }\n\n    public interface Rule {\n        // Checks whether an actor can perform an action.\n        boolean allows(String actorRole, String action);\n    }\n\n    public interface Listener {\n        // Receives a service event message.\n        void onEvent(String event);\n    }\n\n    private static class Command {\n        private final String key;\n        private final String oldValue;\n\n        // Captures enough state to undo one mutation.\n        private Command(String key, String oldValue) {\n            this.key = key;\n            this.oldValue = oldValue;\n        }\n\n        // Restores the map state before the mutation.\n        private void undo(Map<String, String> records) {\n            if (oldValue == null) {\n                records.remove(key);\n            } else {\n                records.put(key, oldValue);\n            }\n        }\n    }\n}\n`;
}

function designPatternTest(task) {
  const c = task.className;
  return `import org.junit.Test;\nimport java.util.*;\nimport static org.junit.Assert.*;\n\n${testJavaDoc(task)}\npublic class ${c}Test {\n    // Verifies that saving stores values by key.\n    @Test\n    public void saveStoresValue() {\n        ${c} service = new ${c}();\n        assertTrue(service.save(\"member\", \"post-1\", \"hello\"));\n        assertEquals(\"hello\", service.find(\"post-1\").get());\n    }\n\n    // Verifies that strategy rules can deny work.\n    @Test\n    public void ruleCanDenyAction() {\n        ${c} service = new ${c}();\n        service.setRule((role, action) -> false);\n        assertFalse(service.save(\"guest\", \"post-1\", \"hello\"));\n        assertFalse(service.find(\"post-1\").isPresent());\n    }\n\n    // Verifies that listeners observe service events.\n    @Test\n    public void listenerReceivesEvents() {\n        ${c} service = new ${c}();\n        List<String> events = new ArrayList<>();\n        service.addListener(events::add);\n        service.save(\"member\", \"post-1\", \"hello\");\n        assertEquals(Collections.singletonList(\"saved:post-1\"), events);\n    }\n\n    // Verifies that delete respects existing data.\n    @Test\n    public void deleteRemovesStoredValue() {\n        ${c} service = new ${c}();\n        service.save(\"member\", \"post-1\", \"hello\");\n        assertTrue(service.delete(\"admin\", \"post-1\"));\n        assertEquals(0, service.size());\n    }\n\n    // Verifies that undo restores the previous state.\n    @Test\n    public void undoRestoresPreviousState() {\n        ${c} service = new ${c}();\n        service.save(\"member\", \"post-1\", \"hello\");\n        assertTrue(service.undoLast());\n        assertFalse(service.find(\"post-1\").isPresent());\n    }\n\n    // Verifies that blank keys are rejected.\n    @Test(expected = IllegalArgumentException.class)\n    public void blankKeyIsRejected() {\n        ${c} service = new ${c}();\n        service.save(\"member\", \" \", \"value\");\n    }\n}\n`;
}

function dsIntegrationMethods(task) {
  const kind = dsKind(task);

  if (kind === 'index') {
    return `    // Adds a MiniLab Post by indexing its topic text.\n    public void addPost(Post post) {\n        if (post != null) {\n            add(post.id, post.topic);\n        }\n    }\n\n    // Adds a MiniLab Message by indexing its message text.\n    public void addMessage(Message message) {\n        if (message != null) {\n            add(message.id(), message.message());\n        }\n    }\n\n    // Adds a MiniLab User by indexing its username.\n    public void addUser(User user) {\n        if (user != null) {\n            add(user.id(), user.username());\n        }\n    }\n`;
  }

  if (kind === 'graph') {
    return `    // Adds a graph edge between two MiniLab posts.\n    public void addPostRelationship(Post from, Post to) {\n        if (from != null && to != null) {\n            addConnection(from.id, to.id);\n        }\n    }\n\n    // Adds a graph edge between two MiniLab users.\n    public void addUserRelationship(User from, User to) {\n        if (from != null && to != null) {\n            addConnection(from.id(), to.id());\n        }\n    }\n\n    // Adds a graph edge from a message thread to the message id.\n    public void addThreadMessage(Message message) {\n        if (message != null) {\n            addConnection(message.thread(), message.id());\n        }\n    }\n`;
  }

  if (kind === 'trie') {
    return `    // Adds words from a MiniLab Post topic and replies.\n    public void addPost(Post post) {\n        if (post == null) {\n            return;\n        }\n        addWords(post.topic);\n        Iterator<Message> messages = post.messages.getAll();\n        while (messages.hasNext()) {\n            addMessage(messages.next());\n        }\n    }\n\n    // Adds words from a MiniLab Message body.\n    public void addMessage(Message message) {\n        if (message != null) {\n            addWords(message.message());\n        }\n    }\n\n    // Adds words from a MiniLab username.\n    public void addUser(User user) {\n        if (user != null) {\n            addWords(user.username());\n        }\n    }\n\n    // Adds every normalized word from free text.\n    private void addWords(String text) {\n        for (String raw : String.valueOf(text).split(\"[^A-Za-z0-9]+\")) {\n            add(raw);\n        }\n    }\n`;
  }

  if (kind === 'queue') {
    return `    // Queues a MiniLab Post using its id and topic.\n    public void enqueuePost(Post post, int priority) {\n        if (post != null) {\n            enqueue(post.id, post.topic, priority);\n        }\n    }\n\n    // Queues a MiniLab Message using its id and body.\n    public void enqueueMessage(Message message, int priority) {\n        if (message != null) {\n            enqueue(message.id(), message.message(), priority);\n        }\n    }\n\n    // Queues a MiniLab User using its id and username.\n    public void enqueueUser(User user, int priority) {\n        if (user != null) {\n            enqueue(user.id(), user.username(), priority);\n        }\n    }\n`;
  }

  if (kind === 'stack') {
    return `    // Records an edit action for a MiniLab Post.\n    public void pushPostEdit(Post post, String action) {\n        if (post != null) {\n            push(\"post:\" + post.id + \":\" + String.valueOf(action));\n        }\n    }\n\n    // Records an edit action for a MiniLab Message.\n    public void pushMessageEdit(Message message, String action) {\n        if (message != null) {\n            push(\"message:\" + message.id() + \":\" + String.valueOf(action));\n        }\n    }\n\n    // Records an action performed by a MiniLab User.\n    public void pushUserAction(User user, String action) {\n        if (user != null) {\n            push(\"user:\" + user.id() + \":\" + String.valueOf(action));\n        }\n    }\n`;
  }

  if (kind === 'range') {
    return `    // Adds a MiniLab Post under a supplied sortable key.\n    public void addPost(Post post, long key) {\n        if (post != null) {\n            add(key, post.id);\n        }\n    }\n\n    // Adds a MiniLab Message using its timestamp as the key.\n    public void addMessage(Message message) {\n        if (message != null) {\n            add(message.timestamp(), message.id());\n        }\n    }\n\n    // Adds a MiniLab User under a supplied sortable key.\n    public void addUser(User user, long key) {\n        if (user != null) {\n            add(key, user.id());\n        }\n    }\n\n    // Builds a SortedData snapshot using the original MiniLab factory.\n    public SortedData<UUID> sortedSnapshot() {\n        SortedData<UUID> snapshot = SortedDataFactory.makeSortedData(UUID::compareTo);\n        for (UUID id : allIds()) {\n            snapshot.insert(id);\n        }\n        return snapshot;\n    }\n\n    // Builds an AVLTree snapshot for diagramming AVL-backed indexes.\n    public AVLTree<UUID> avlSnapshot() {\n        AVLTree<UUID> snapshot = new AVLTree<>(UUID::compareTo);\n        for (UUID id : allIds()) {\n            snapshot.insert(id);\n        }\n        return snapshot;\n    }\n\n    // Builds a BSTree snapshot for comparing tree-backed indexes.\n    public BSTree<UUID> bstSnapshot() {\n        BSTree<UUID> snapshot = new BSTree<>(UUID::compareTo);\n        for (UUID id : allIds()) {\n            snapshot.insert(id);\n        }\n        return snapshot;\n    }\n\n    // Builds a SortedArrayList snapshot for array-backed indexes.\n    public SortedArrayList<UUID> sortedArraySnapshot() {\n        SortedArrayList<UUID> snapshot = new SortedArrayList<>(UUID::compareTo);\n        for (UUID id : allIds()) {\n            snapshot.insert(id);\n        }\n        return snapshot;\n    }\n\n    // Collects all ids in key order.\n    private List<UUID> allIds() {\n        List<UUID> ids = new ArrayList<>();\n        for (Set<UUID> bucket : values.values()) {\n            ids.addAll(bucket);\n        }\n        return ids;\n    }\n`;
  }

  if (kind === 'counter') {
    return `    // Adds a score delta for a MiniLab Post.\n    public int addPostScore(Post post, int delta) {\n        return post == null ? 0 : addScore(post.id, delta);\n    }\n\n    // Adds a score delta for a MiniLab Message.\n    public int addMessageScore(Message message, int delta) {\n        return message == null ? 0 : addScore(message.id(), delta);\n    }\n\n    // Adds a score delta for a MiniLab User.\n    public int addUserScore(User user, int delta) {\n        return user == null ? 0 : addScore(user.id(), delta);\n    }\n`;
  }

  if (kind === 'cache') {
    return `    // Stores a MiniLab Post topic in the cache.\n    public void putPost(Post post) {\n        if (post != null) {\n            put(post.id, post.topic);\n        }\n    }\n\n    // Stores a MiniLab Message body in the cache.\n    public void putMessage(Message message) {\n        if (message != null) {\n            put(message.id(), message.message());\n        }\n    }\n\n    // Stores a MiniLab User username in the cache.\n    public void putUser(User user) {\n        if (user != null) {\n            put(user.id(), user.username());\n        }\n    }\n`;
  }

  if (kind === 'tree') {
    return `    // Adds a MiniLab Post as a root node.\n    public void addPostRoot(Post post) {\n        if (post != null) {\n            addRoot(post.id);\n        }\n    }\n\n    // Adds a MiniLab Message below its thread id.\n    public void addMessageUnderThread(Message message) {\n        if (message != null) {\n            addChild(message.thread(), message.id());\n        }\n    }\n\n    // Adds a MiniLab User as a root node.\n    public void addUserRoot(User user) {\n        if (user != null) {\n            addRoot(user.id());\n        }\n    }\n`;
  }

  return '';
}

function persistentIntegrationMethods() {
  return `    // Returns the original MiniLab DataManager singleton for integration points.\n    public DataManager miniLabDataManager() {\n        return DataManager.getInstance();\n    }\n\n    // Creates the original MiniLab CSV formatted factory for a column count.\n    public FormattedFactory<String[]> csvFactory(int columns) {\n        return new CSVFormattedFactory(new CSVFormat(columns));\n    }\n\n    // Creates a serializer for this helper's key-value records.\n    public Serializer<Map.Entry<String, String>, String[]> recordSerializer() {\n        return new KeyValueSerializer();\n    }\n\n    // Creates a DataPipeline using the original MiniLab persistence abstractions.\n    public DataPipeline<Map.Entry<String, String>, String[]> pipeline(String filename) {\n        IOFactory ioFactory = new ComputerIOFactory();\n        return new DataPipeline<>(ioFactory, csvFactory(2), recordSerializer(), filename);\n    }\n\n    // Reads CSV rows through the original MiniLab CSVReader.\n    public List<String[]> readCsvRows(String data, int columns) {\n        FormattedReader<String[]> reader = new CSVReader(new CSVFormat(columns), new StringReader(String.valueOf(data)));\n        List<String[]> rows = new ArrayList<>();\n        while (reader.hasNext()) {\n            rows.add(reader.getNext());\n        }\n        return rows;\n    }\n\n    // Writes CSV rows through the original MiniLab CSVWriter.\n    public String writeCsvRows(List<String[]> rows, int columns) {\n        StringWriter output = new StringWriter();\n        FormattedWriter<String[]> writer = new CSVWriter(new CSVFormat(columns), output);\n        for (String[] row : rows) {\n            writer.putNext(row);\n        }\n        writer.putFooter();\n        return output.toString();\n    }\n\n    private static class KeyValueSerializer implements Serializer<Map.Entry<String, String>, String[]> {\n        // Serializes one key-value record into a two-column row.\n        public String[] serialize(Map.Entry<String, String> object) {\n            return new String[] { object.getKey(), object.getValue() };\n        }\n\n        // Deserializes one two-column row into a key-value record.\n        public Map.Entry<String, String> deserialize(String[] data) {\n            return new java.util.AbstractMap.SimpleEntry<>(data[0], data[1]);\n        }\n    }\n`;
}

function designPatternIntegrationMethods() {
  return `    // Saves a MiniLab Post through the facade-style service API.\n    public boolean savePost(Post post) {\n        return post != null && save(\"member\", post.id.toString(), post.topic);\n    }\n\n    // Saves a MiniLab User through the facade-style service API.\n    public boolean saveUser(User user) {\n        return user != null && save(user.role().name(), user.id().toString(), user.username());\n    }\n\n    // Finds a MiniLab Post using the original PostDAO lookup style.\n    public Post findPost(PostDAO dao, UUID postId) {\n        return dao == null || postId == null ? null : dao.get(new Post(postId));\n    }\n\n    // Finds a MiniLab User using the original UserDAO UUID lookup.\n    public User findUser(UserDAO dao, UUID userId) {\n        return dao == null || userId == null ? null : dao.getByUUID(userId);\n    }\n\n    // Counts items exposed by the original DAO abstraction.\n    public int countDaoItems(DAO<? extends HasUUID> dao) {\n        if (dao == null) {\n            return 0;\n        }\n        int count = 0;\n        Iterator<? extends HasUUID> iterator = dao.getAll();\n        while (iterator.hasNext()) {\n            iterator.next();\n            count++;\n        }\n        return count;\n    }\n\n    // Builds a SortedData snapshot of stored keys using the original factory.\n    public SortedData<String> sortedKeys() {\n        SortedData<String> sorted = SortedDataFactory.makeSortedData(String::compareTo);\n        for (String key : records.keySet()) {\n            sorted.insert(key);\n        }\n        return sorted;\n    }\n\n    // Returns the original MiniLab DataManager singleton for facade integration.\n    public DataManager dataManager() {\n        return DataManager.getInstance();\n    }\n\n    // Checks login state through the original UserState abstraction.\n    public boolean isStateLoggedIn(UserState state) {\n        return state != null && state.isLoggedIn();\n    }\n\n    // Applies the original censor interface before storing or displaying text.\n    public String censorWith(ICensor censor, String message) {\n        return censor == null ? message : censor.censorMessage(message);\n    }\n`;
}

function integrateSource(task, source) {
  if (task.id === 'DS01' || task.id === 'DS02') return source;
  if (task.prefix === 'DS') return insertBeforeLastClassBrace(source, dsIntegrationMethods(task));
  if (task.prefix === 'PD') return insertBeforeLastClassBrace(source, persistentIntegrationMethods());
  if (task.prefix === 'DP') return insertBeforeLastClassBrace(source, designPatternIntegrationMethods());
  return source;
}

function dsIntegrationTest(task) {
  const c = task.className;
  const kind = dsKind(task);
  const helpers = `\n    // Creates a MiniLab Post for integration tests.\n    private Post post(String topic) {\n        return new Post(UUID.randomUUID(), UUID.randomUUID(), topic);\n    }\n\n    // Creates a MiniLab Message for integration tests.\n    private Message message(UUID thread, String text, long timestamp) {\n        return new Message(UUID.randomUUID(), UUID.randomUUID(), thread, timestamp, text);\n    }\n\n    // Creates a MiniLab User for integration tests.\n    private User user(String username) {\n        return new User(UUID.randomUUID(), User.Role.Member, username, \"password\");\n    }\n`;
  const bodies = {
    index: `    // Verifies MiniLab Post Message and User overloads update the index.\n    @Test\n    public void miniLabModelOverloadsUpdateIndex() {\n        ${c} index = new ${c}();\n        Post post = post(\"DAO hashtag search\");\n        Message message = message(post.id, \"reply content\", 10L);\n        User user = user(\"miniuser\");\n        index.addPost(post);\n        index.addMessage(message);\n        index.addUser(user);\n        assertTrue(index.search(\"dao\").contains(post.id));\n        assertTrue(index.search(\"reply\").contains(message.id()));\n        assertTrue(index.search(\"miniuser\").contains(user.id()));\n    }\n`,
    graph: `    // Verifies MiniLab model relationships create graph edges.\n    @Test\n    public void miniLabModelRelationshipsCreateEdges() {\n        ${c} graph = new ${c}();\n        Post first = post(\"first\");\n        Post second = post(\"second\");\n        User viewer = user(\"viewer\");\n        User author = user(\"author\");\n        Message reply = message(first.id, \"reply\", 5L);\n        graph.addPostRelationship(first, second);\n        graph.addUserRelationship(viewer, author);\n        graph.addThreadMessage(reply);\n        assertTrue(graph.neighbors(first.id).contains(second.id));\n        assertTrue(graph.neighbors(viewer.id()).contains(author.id()));\n        assertTrue(graph.neighbors(first.id).contains(reply.id()));\n    }\n`,
    trie: `    // Verifies MiniLab model text can be loaded into the trie.\n    @Test\n    public void miniLabModelTextLoadsIntoTrie() {\n        ${c} trie = new ${c}();\n        Post post = post(\"Search Strategy\");\n        post.messages.insert(message(post.id, \"reply helper\", 5L));\n        trie.addPost(post);\n        trie.addUser(user(\"MiniUser\"));\n        assertTrue(trie.contains(\"search\"));\n        assertTrue(trie.contains(\"reply\"));\n        assertTrue(trie.contains(\"miniuser\"));\n    }\n`,
    queue: `    // Verifies MiniLab model objects can be queued directly.\n    @Test\n    public void miniLabModelObjectsCanBeQueued() {\n        ${c} queue = new ${c}();\n        Post post = post(\"queued post\");\n        Message message = message(post.id, \"queued message\", 5L);\n        User user = user(\"queueduser\");\n        queue.enqueuePost(post, 3);\n        queue.enqueueMessage(message, 5);\n        queue.enqueueUser(user, 1);\n        assertEquals(3, queue.size());\n        assertEquals(message.id(), queue.dequeue().get().getId());\n    }\n`,
    stack: `    // Verifies MiniLab model actions can be recorded on the stack.\n    @Test\n    public void miniLabModelActionsCanBeRecorded() {\n        ${c} stack = new ${c}();\n        Post post = post(\"edit\");\n        stack.pushPostEdit(post, \"rename\");\n        stack.pushMessageEdit(message(post.id, \"reply\", 5L), \"moderate\");\n        stack.pushUserAction(user(\"actor\"), \"login\");\n        assertEquals(3, stack.size());\n        assertTrue(stack.peek().get().startsWith(\"user:\"));\n    }\n`,
    range: `    // Verifies MiniLab timestamps and sorteddata snapshots work together.\n    @Test\n    public void miniLabRangeSnapshotUsesSortedData() {\n        ${c} range = new ${c}();\n        Post post = post(\"timestamped\");\n        Message message = message(post.id, \"reply\", 20L);\n        range.addPost(post, 10L);\n        range.addMessage(message);\n        assertTrue(range.between(0L, 15L).contains(post.id));\n        assertNotNull(range.sortedSnapshot().getAll());\n        assertNotNull(range.avlSnapshot());\n        assertNotNull(range.bstSnapshot());\n        assertNotNull(range.sortedArraySnapshot());\n    }\n`,
    counter: `    // Verifies MiniLab model objects can receive scores.\n    @Test\n    public void miniLabModelScoresAreTracked() {\n        ${c} counter = new ${c}();\n        Post post = post(\"score\");\n        Message message = message(post.id, \"reply\", 5L);\n        User user = user(\"scoreduser\");\n        assertEquals(3, counter.addPostScore(post, 3));\n        assertEquals(2, counter.addMessageScore(message, 2));\n        assertEquals(1, counter.addUserScore(user, 1));\n    }\n`,
    cache: `    // Verifies MiniLab model values can be cached.\n    @Test\n    public void miniLabModelValuesCanBeCached() {\n        ${c} cache = new ${c}(3);\n        Post post = post(\"cached post\");\n        Message message = message(post.id, \"cached reply\", 5L);\n        User user = user(\"cacheduser\");\n        cache.putPost(post);\n        cache.putMessage(message);\n        cache.putUser(user);\n        assertTrue(cache.contains(post.id));\n        assertTrue(cache.contains(message.id()));\n        assertTrue(cache.contains(user.id()));\n    }\n`,
    tree: `    // Verifies MiniLab posts messages and users can be represented as tree nodes.\n    @Test\n    public void miniLabModelNodesCanBeStored() {\n        ${c} tree = new ${c}();\n        Post post = post(\"root\");\n        Message message = message(post.id, \"reply\", 5L);\n        User user = user(\"treeuser\");\n        tree.addPostRoot(post);\n        tree.addMessageUnderThread(message);\n        tree.addUserRoot(user);\n        assertTrue(tree.childrenOf(post.id).contains(message.id()));\n        assertEquals(3, tree.nodeCount());\n    }\n`,
  };
  return `${bodies[kind] || ''}${helpers}`;
}

function persistentIntegrationTest(task) {
  const c = task.className;
  return `    // Verifies the helper can use original MiniLab persistence abstractions.\n    @Test\n    public void miniLabPersistenceAbstractionsAreAvailable() {\n        ${c} store = new ${c}();\n        assertNotNull(store.miniLabDataManager());\n        assertNotNull(store.csvFactory(2));\n        assertNotNull(store.recordSerializer());\n        assertNotNull(store.pipeline(\"mock-hackathon-records\"));\n        String csv = store.writeCsvRows(Collections.singletonList(new String[] { \"key\", \"value\" }), 2);\n        List<String[]> rows = store.readCsvRows(csv, 2);\n        assertArrayEquals(new String[] { \"key\", \"value\" }, rows.get(0));\n    }\n`;
}

function designPatternIntegrationTest(task) {
  const c = task.className;
  return `    // Verifies the service integrates with MiniLab model and state abstractions.\n    @Test\n    public void miniLabModelAndStateAdaptersWork() {\n        ${c} service = new ${c}();\n        User user = new User(UUID.randomUUID(), User.Role.Member, \"patternuser\", \"password\");\n        assertTrue(service.saveUser(user));\n        assertEquals(\"patternuser\", service.find(user.id().toString()).get());\n        assertFalse(service.isStateLoggedIn(new GuestState()));\n        assertNotNull(service.sortedKeys());\n        assertNotNull(service.dataManager());\n        assertEquals(\"clean\", service.censorWith(text -> \"clean\", \"raw\"));\n    }\n`;
}

function integrateTest(task, source) {
  if (task.id === 'DS01' || task.id === 'DS02') return source;
  if (task.prefix === 'DS') return insertBeforeLastClassBrace(source, dsIntegrationTest(task));
  if (task.prefix === 'PD') return insertBeforeLastClassBrace(source, persistentIntegrationTest(task));
  if (task.prefix === 'DP') return insertBeforeLastClassBrace(source, designPatternIntegrationTest(task));
  return source;
}

function integrationSentence(task) {
  if (task.id === 'DS01') {
    return 'This implementation imports dao.model.Post and dao.model.Message from the original MiniLab model layer so it can index real post topics and message bodies using the same public fields and record accessors used elsewhere in MiniLab.';
  }
  if (task.id === 'DS02') {
    return 'This implementation imports dao.model.Message from the original MiniLab model layer so it can index real message text through message.message().';
  }
  if (task.id === 'DS45') {
    return 'This implementation imports dao.model.Message from the original MiniLab model layer and uses JDK reflection, Iterator, Iterable, Map, array, and field traversal APIs so it can search runtime object graphs without depending on one DAO or sorted-data implementation.';
  }
  if (task.prefix === 'DS') {
    const sortedSentence = dsKind(task) === 'range'
      ? ' It also imports SortedData, SortedDataFactory, AVLTree, BSTree, and SortedArrayList so range-style tasks can expose snapshots that align with the original sorteddata layer.'
      : '';
    return `This implementation imports dao.model.Post, dao.model.Message, and dao.model.User where relevant so the practice task can accept real MiniLab domain objects while still preserving a stable UUID/String API for isolated testing.${sortedSentence}`;
  }
  if (task.prefix === 'PD') {
    return 'This implementation imports the original persistentdata abstractions: DataManager, DataPipeline, FormattedFactory, CSVFormattedFactory, CSVReader, CSVWriter, IOFactory, ComputerIOFactory, and Serializer. The helper still keeps a local key-value API, but it exposes MiniLab-compatible factories, pipelines, readers, writers, and serializers for persistence practice.';
  }
  if (task.prefix === 'DP') {
    return 'This implementation imports original MiniLab DAO, model, sorteddata, persistentdata, userstate, and censor abstractions so the pattern can be practiced as a service/facade/repository-style extension over real Post, User, DAO, SortedDataFactory, DataManager, UserState, and ICensor types.';
  }
  return 'This implementation is kept independent and uses only stable APIs needed by the task.';
}

function explanation(task) {
  const importSentence = integrationSentence(task);
  return [
    `${task.className} is a Mock_hackathon practice implementation for ${task.id}: ${task.title}. It is stored separately from the original MiniLab packages so it can be studied as an extension-style hackathon task without changing the base codebase.`,
    `The feature is: ${task.feature} The task is: ${task.likelyHackathonTask}`,
    importSentence,
    `${implementationExplanation(task)}`,
    `Important edge cases are handled directly in code and tests: empty input, duplicate data, missing records, replacement or removal behavior, and invalid keys where relevant. This makes the class suitable for a mini project hackathon because it demonstrates the core behavior clearly while remaining small enough to modify under time pressure.`,
  ].join('\n\n');
}

function implementationExplanation(task) {
  if (task.id === 'DS01') {
    return 'The class stores a token-to-Post map, a reverse Post-to-token map, token frequencies, and a set of indexed posts. add(Post) reads post.topic and iterates post.messages.getAll() to collect Message text, search(String) intersects token buckets for multi-word queries, remove(Post) cleans every reverse mapping, and topKeywords(int) ranks indexed tokens by document frequency.';
  }
  if (task.id === 'DS02') {
    return 'The class stores a token-to-Message map and a reverse Message-to-token map. add(Message) indexes normalized words from message.message(), addAll(Iterator<Message>) supports MiniLab iterator-style data access, search(String) intersects token buckets for multi-word queries, and remove(Message) keeps the forward and reverse indexes consistent.';
  }
  if (task.prefix === 'PD') {
    return 'The class acts as a persistence helper. It stores records in insertion order, serializes them to robust escaped CSV text, reloads them from text or files, rejects blank keys, and exposes row-level encode/decode helpers for persistence-oriented tests.';
  }
  if (task.prefix === 'DP') {
    return 'The class acts as a compact pattern-oriented service. It combines a replaceable rule strategy, listener callbacks, command-style undo records, and a small facade-like public API so the design pattern idea is visible through behavior rather than comments alone.';
  }
  if (task.id === 'DS45') {
    return 'The class acts as a runtime traversal framework. MessageFinder owns configured roots, ObjectTraversalEngine creates one TraversalContext per search, RuntimeObjectWalker recursively handles Iterator, Iterable, Map, array, safe accessor, and inherited-field shapes, and TraversalContext uses identity-based cycle detection plus UUID-based message de-duplication.';
  }
  const kind = dsKind(task);
  const details = {
    graph: 'The class stores a directed adjacency map and supports adding/removing connections, neighbor lookup, reachability, shortest unweighted distance, and graph counts.',
    trie: 'The class stores normalized words in a trie with per-word frequency and lexicographic prefix suggestions.',
    queue: 'The class stores prioritized entries in a priority queue with a map for fast replacement and removal by id.',
    stack: 'The class stores actions in a stack so recent history can be inspected, undone, listed, and cleared.',
    range: 'The class stores ids inside a TreeMap keyed by long values so inclusive range queries and first/last bucket lookups are efficient.',
    counter: 'The class stores integer scores per id and can update, replace, rank, and remove scores for leaderboard-style tasks.',
    cache: 'The class stores a bounded access-order LinkedHashMap so the least-recently-used entry is evicted when capacity is exceeded.',
    tree: 'The class stores parent and child relationships for rooted traversal, direct child lookup, breadth-first order, and depth-first order.',
    index: 'The class stores a normalized token-to-id index plus a reverse id-to-token index so add, remove, single keyword search, and multi-keyword intersection remain consistent.',
  };
  return details[kind];
}

function architectureNotes(task) {
  const kind = task.prefix === 'PD' ? 'persistence' : task.prefix === 'DP' ? 'design-pattern service' : dsKind(task);
  if (task.id === 'DS45') {
    return [
      'Software Architecture and UML Description:',
      '',
      `${task.className} is a framework-style Mock_hackathon practice extension for runtime inspection. It sits beside the MiniLab DAO/model layer and depends on dao.model.Message because Message is the target object discovered during traversal.`,
      '',
      'In UML, draw composition from the public DS45 entry point to MessageFinder, from MessageFinder to ObjectTraversalEngine, and from ObjectTraversalEngine to TraversalContext and RuntimeObjectWalker. Draw dashed dependencies from RuntimeObjectWalker to Iterator, Iterable, Map, Field, Method, and Message because it uses those APIs to inspect runtime structures without owning them.',
      '',
      `PlantUML guidance:\n${task.className} *-- MessageFinder : owns finder\nMessageFinder *-- ObjectTraversalEngine : delegates traversal\nObjectTraversalEngine *-- TraversalContext : creates per traversal\nObjectTraversalEngine *-- RuntimeObjectWalker : creates walker\nRuntimeObjectWalker ..> Message : discovers records\nRuntimeObjectWalker ..> Iterator : traverses containers\nRuntimeObjectWalker ..> Map : traverses keys and values\nRuntimeObjectWalker ..> Field : reads project fields\nRuntimeObjectWalker ..> Method : invokes safe accessors`,
    ].join('\n');
  }
  if (task.id === 'DS01') {
    return [
      'Software Architecture and UML Description:',
      '',
      `${task.className} sits beside the DAO layer as a search helper for MiniLab posts. It depends on dao.model.Post because it reads post.topic and on dao.model.Message because it iterates post.messages.getAll() and reads message.message().`,
      '',
      'In UML, draw dashed dependency arrows from the index to Post and Message because it uses those model objects but does not own their lifecycle. The internal maps and token buckets are owned by the index, so helper storage can be represented with composition if it is modeled explicitly. If PostDAO or another caller uses this index, draw a dashed dependency arrow from that caller to the index.',
      '',
      `PlantUML guidance:\n${task.className} ..> Post : reads topic\n${task.className} ..> Message : reads message text\nPostDAO ..> ${task.className} : uses search helper`,
    ].join('\n');
  }
  if (task.id === 'DS02') {
    return [
      'Software Architecture and UML Description:',
      '',
      `${task.className} sits beside the DAO layer as a message search helper. It depends on dao.model.Message because it reads message.message() from real MiniLab message records, while its internal maps are owned by the index.`,
      '',
      'In UML, draw a dashed dependency arrow from the index to Message because the relationship is read/use rather than ownership. If PostDAO uses this helper after fetching messages, draw a dashed dependency arrow from PostDAO to the index. The token buckets are internal storage and can be shown as composition only if helper structures are expanded.',
      '',
      `PlantUML guidance:\n${task.className} ..> Message : reads message text\nPostDAO ..> ${task.className} : uses message search helper`,
    ].join('\n');
  }
  if (task.prefix === 'DS') {
    const sortedGuidance = dsKind(task) === 'range'
      ? `\n${task.className} ..> SortedData : returns snapshot\n${task.className} ..> SortedDataFactory : builds factory-backed snapshot\n${task.className} ..> AVLTree : exposes AVL snapshot\n${task.className} ..> BSTree : exposes BST snapshot\n${task.className} ..> SortedArrayList : exposes array snapshot`
      : '';
    return [
      'Software Architecture and UML Description:',
      '',
      `${task.className} is a Mock_hackathon practice extension that sits beside the DAO/model layer. It imports dao.model.Post, dao.model.Message, and dao.model.User so callers can pass real MiniLab domain objects, while the implementation stores independent ids, tokens, scores, queues, ranges, or graph links internally.`,
      '',
      'In UML, draw dashed dependency arrows from this class to Post, Message, and User because it reads their public fields or record accessors but does not own their lifecycle. Internal maps, queues, nodes, and helper entries are implementation details owned by this class; show them with composition only if the diagram expands the data structure internals.',
      '',
      `PlantUML guidance:\n${task.className} ..> Post : reads post id/topic\n${task.className} ..> Message : reads message id/text/timestamp\n${task.className} ..> User : reads user id/username${sortedGuidance}`,
    ].join('\n');
  }
  if (task.prefix === 'PD') {
    return [
      'Software Architecture and UML Description:',
      '',
      `${task.className} sits in a persistence-extension layer beside MiniLab persistentdata. It depends on DataManager and DataPipeline for application-level persistence coordination, FormattedFactory and CSVFormattedFactory for format-family construction, CSVReader and CSVWriter for concrete row IO, IOFactory and ComputerIOFactory for document access, and Serializer for conversion between model-level records and formatted rows.`,
      '',
      'In UML, show dashed dependency arrows from this class to DataManager, DataPipeline, FormattedFactory, CSVReader, CSVWriter, IOFactory, and Serializer. The nested key-value serializer is owned by the class and should be shown with composition if included. The class does not own MiniLab persistence infrastructure; it adapts to it.',
      '',
      `PlantUML guidance:\n${task.className} ..> DataManager : accesses singleton\n${task.className} ..> DataPipeline : creates pipeline\n${task.className} ..> FormattedFactory : creates CSV family\n${task.className} ..> CSVReader : reads rows\n${task.className} ..> CSVWriter : writes rows\n${task.className} ..> Serializer : converts records`,
    ].join('\n');
  }
  if (task.prefix === 'DP') {
    return [
      'Software Architecture and UML Description:',
      '',
      `${task.className} is a design-pattern practice service that sits above the DAO, userstate, sorteddata, persistentdata, and censor layers. It imports DAO, PostDAO, UserDAO, HasUUID, Post, User, SortedData, SortedDataFactory, DataManager, UserState, and ICensor so the pattern can be applied around real MiniLab abstractions rather than a disconnected example.`,
      '',
      'In UML, draw dashed dependency arrows to DAO, PostDAO, UserDAO, Post, User, SortedDataFactory, DataManager, UserState, and ICensor because this service uses those abstractions without owning their lifecycle. Draw composition from the service to its internal Command history if showing undo internals, aggregation to Listener when observers are registered, and realization arrows for the Rule and Listener interfaces.',
      '',
      `PlantUML guidance:\n${task.className} ..> DAO : counts DAO items\n${task.className} ..> PostDAO : finds posts\n${task.className} ..> UserDAO : finds users\n${task.className} ..> SortedDataFactory : builds sorted key view\n${task.className} ..> DataManager : facade access\n${task.className} ..> UserState : checks state\n${task.className} ..> ICensor : applies moderation interface`,
    ].join('\n');
  }
  return [
    'Software Architecture and UML Description:',
    '',
    `Architecturally, ${task.className} is a Mock_hackathon practice/extension class, not an original MiniLab source module. It can be drawn beside the relevant original layer as an optional helper used by a caller, DAO, service, or persistence adapter depending on the task scenario.`,
    '',
    `The class depends only on JDK types, so most external relationships should be drawn as dependencies rather than ownership of MiniLab domain objects. Use \`..>\` for a caller that temporarily uses this class, \`-->\` when a caller stores it as a field, \`*--\` when this class owns nested helper objects, \`o--\` when it aggregates ids or records that can exist independently, \`..|>\` when an implementation realizes an interface, and \`--|>\` for inheritance.`,
    '',
    `For this ${kind} implementation, the UML should show the main class, important private storage fields, public methods, and nested helper types if present. If integrating it into a larger project diagram, add a dashed dependency from the MiniLab-like caller or DAO to ${task.className}; do not place it inside the original MiniLab packages unless the extension is intentionally promoted into production code.`,
    '',
    'Data flow starts with public method calls, moves into the internal collections or helpers, and returns defensive copies or Optional values where appropriate. Show dependencies to callers with dashed arrows, stored helper objects with association or composition arrows, and implemented interfaces with realization arrows when a task introduces an interface.',
  ].join('\n');
}

function uml(task) {
  if (task.id === 'DS45') {
    return `classDiagram\nclass ${task.className} {\n  - MessageFinder finder\n  + ${task.className}()\n  + addRoot(Object root) void\n  + findMessage(UUID id) Message\n  + findMessages(Object root) List~Message~\n  + traverse(Object source) List~Message~\n  + shouldInspectObject(Class type) boolean\n}\nclass MessageFinder {\n  - List~Object~ roots\n  - ObjectTraversalEngine engine\n  + addRoot(Object root) void\n  + findMessage(UUID id) Optional~Message~\n  + findMessages(Object root) List~Message~\n  + traverse(Object source) List~Message~\n}\nclass ObjectTraversalEngine {\n  + traverse(Object source) List~Message~\n  + shouldInspectObject(Class type) boolean\n}\nclass TraversalContext {\n  - Set~Object~ visitedObjects\n  - Set~UUID~ seenMessageIds\n  - List~Message~ messages\n  + markVisited(Object value) boolean\n  + addMessage(Message message) void\n  + messages() List~Message~\n}\nclass RuntimeObjectWalker {\n  + traverse(Object source) void\n  + shouldInspectObject(Class type) boolean\n  + findMessageInIterable(Iterable iterable) void\n  + findMessageInMap(Map map) void\n  + findMessageFromAccessor(Object source) void\n  + findMessageFromFields(Object source) void\n}\nclass Message\nclass Iterator\nclass Map\nclass Field\nclass Method\n${task.className} *-- MessageFinder\nMessageFinder *-- ObjectTraversalEngine\nObjectTraversalEngine *-- TraversalContext\nObjectTraversalEngine *-- RuntimeObjectWalker\nRuntimeObjectWalker ..> Message : discovers records\nRuntimeObjectWalker ..> Iterator : walks containers\nRuntimeObjectWalker ..> Map : walks keys and values\nRuntimeObjectWalker ..> Field : reads fields\nRuntimeObjectWalker ..> Method : invokes accessors`;
  }
  if (task.id === 'DS01') {
    return `classDiagram\nclass ${task.className} {\n  - Map~String, Set~Post~~ index\n  - Map~Post, Set~String~~ reverseIndex\n  - Map~String, Integer~ frequencies\n  - Set~Post~ indexedPosts\n  + ${task.className}()\n  + ${task.className}(Iterator~Post~ posts)\n  + add(Post post) void\n  + remove(Post post) boolean\n  + search(String query) List~Post~\n  + frequency(String token) int\n  + topKeywords(int limit) List~String~\n  + size() int\n}\nclass Post\nclass Message\n${task.className} ..> Post : indexes topic\n${task.className} ..> Message : reads message text`;
  }
  if (task.id === 'DS02') {
    return `classDiagram\nclass ${task.className} {\n  - Map~String, Set~Message~~ index\n  - Map~Message, Set~String~~ reverseIndex\n  + ${task.className}()\n  + ${task.className}(Iterator~Message~ messages)\n  + addAll(Iterator~Message~ messages) void\n  + add(Message message) void\n  + remove(Message message) boolean\n  + search(String query) List~Message~\n  + frequency(String token) int\n  + size() int\n}\nclass Message\n${task.className} ..> Message : indexes text`;
  }
  if (task.prefix === 'PD') {
    return `classDiagram\nclass ${task.className} {\n  - Map~String, String~ records\n  + saveRecord(String key, String value) void\n  + findRecord(String key) Optional~String~\n  + deleteRecord(String key) boolean\n  + serialize() String\n  + load(String data) void\n  + saveTo(Path path) void\n  + loadFrom(Path path) void\n  + csvFactory(int columns) FormattedFactory~String[]~\n  + pipeline(String filename) DataPipeline~Entry, String[]~\n  + readCsvRows(String data, int columns) List~String[]~\n  + writeCsvRows(List~String[]~ rows, int columns) String\n}\nclass DataManager\nclass DataPipeline\nclass FormattedFactory\nclass CSVReader\nclass CSVWriter\nclass Serializer\n${task.className} ..> DataManager : accesses singleton\n${task.className} ..> DataPipeline : creates pipeline\n${task.className} ..> FormattedFactory : creates CSV family\n${task.className} ..> CSVReader : reads rows\n${task.className} ..> CSVWriter : writes rows\n${task.className} ..> Serializer : converts records`;
  }
  if (task.prefix === 'DP') {
    return `classDiagram\nclass ${task.className} {\n  - Rule rule\n  - Map~String, String~ records\n  - List~Listener~ listeners\n  - Deque~Command~ history\n  + setRule(Rule rule) void\n  + save(String actorRole, String key, String value) boolean\n  + savePost(Post post) boolean\n  + saveUser(User user) boolean\n  + findPost(PostDAO dao, UUID postId) Post\n  + findUser(UserDAO dao, UUID userId) User\n  + countDaoItems(DAO dao) int\n  + sortedKeys() SortedData~String~\n  + isStateLoggedIn(UserState state) boolean\n  + censorWith(ICensor censor, String message) String\n}\nclass Rule {\n  <<interface>>\n  + allows(String actorRole, String action) boolean\n}\nclass Listener {\n  <<interface>>\n  + onEvent(String event) void\n}\nclass Command\nclass DAO\nclass PostDAO\nclass UserDAO\nclass Post\nclass User\nclass SortedDataFactory\nclass DataManager\nclass UserState\nclass ICensor\n${task.className} ..> Rule\n${task.className} o-- Listener\n${task.className} *-- Command\n${task.className} ..> DAO : counts items\n${task.className} ..> PostDAO : finds posts\n${task.className} ..> UserDAO : finds users\n${task.className} ..> Post : saves model\n${task.className} ..> User : saves model\n${task.className} ..> SortedDataFactory : builds sorted view\n${task.className} ..> DataManager : facade access\n${task.className} ..> UserState : checks state\n${task.className} ..> ICensor : censors text`;
  }
  const kind = dsKind(task);
  const fields = {
    graph: ['- Map~UUID, Set~UUID~~ adjacency', '+ addConnection(UUID from, UUID to) void', '+ removeConnection(UUID from, UUID to) boolean', '+ neighbors(UUID node) Set~UUID~', '+ isReachable(UUID start, UUID target) boolean', '+ shortestDistance(UUID start, UUID target) int'],
    trie: ['- Node root', '- int wordCount', '+ add(String word) void', '+ contains(String word) boolean', '+ frequency(String word) int', '+ suggest(String prefix, int limit) List~String~', '+ wordCount() int'],
    queue: ['- PriorityQueue~Entry~ queue', '- Map~UUID, Entry~ entries', '+ enqueue(UUID id, String text, int priority) void', '+ dequeue() Optional~Entry~', '+ peek() Optional~Entry~', '+ remove(UUID id) boolean'],
    stack: ['- Deque~String~ history', '+ push(String action) void', '+ undo() Optional~String~', '+ peek() Optional~String~', '+ history() List~String~', '+ clear() void'],
    range: ['- TreeMap~Long, Set~UUID~~ values', '+ add(long key, UUID id) void', '+ remove(long key, UUID id) boolean', '+ between(long startInclusive, long endInclusive) List~UUID~', '+ first() Set~UUID~', '+ last() Set~UUID~'],
    counter: ['- Map~UUID, Integer~ scores', '+ addScore(UUID id, int delta) int', '+ setScore(UUID id, int score) void', '+ scoreOf(UUID id) int', '+ top(int limit) List~UUID~', '+ remove(UUID id) boolean'],
    cache: ['- int capacity', '- LinkedHashMap~UUID, String~ cache', '+ put(UUID id, String value) void', '+ get(UUID id) Optional~String~', '+ contains(UUID id) boolean', '+ remove(UUID id) boolean', '+ keys() List~UUID~'],
    tree: ['- Map~UUID, List~UUID~~ children', '- Map~UUID, UUID~ parent', '+ addRoot(UUID id) void', '+ addChild(UUID parentId, UUID childId) void', '+ childrenOf(UUID id) List~UUID~', '+ depthFirst(UUID root) List~UUID~', '+ breadthFirst(UUID root) List~UUID~'],
    index: ['- Map~String, Set~UUID~~ index', '- Map~UUID, Set~String~~ reverseIndex', '+ add(UUID itemId, String text) void', '+ remove(UUID itemId) boolean', '+ search(String keyword) Set~UUID~', '+ searchAll(Collection~String~ keywords) Set~UUID~', '+ frequency(String keyword) int'],
  };
  let diagram = `classDiagram\nclass ${task.className} {\n  ${fields[kind].join('\n  ')}\n}`;
  if (kind === 'trie') {
    diagram += `\nclass Node\n${task.className} *-- Node`;
  }
  if (kind === 'queue') {
    diagram += `\nclass Entry\n${task.className} *-- Entry`;
  }
  diagram += `\nclass Post\nclass Message\nclass User\n${task.className} ..> Post : accepts model object\n${task.className} ..> Message : accepts model object\n${task.className} ..> User : accepts model object`;
  if (kind === 'range') {
    diagram += `\nclass SortedData\nclass SortedDataFactory\nclass AVLTree\nclass BSTree\nclass SortedArrayList\n${task.className} ..> SortedData : returns snapshot\n${task.className} ..> SortedDataFactory : builds snapshot\n${task.className} ..> AVLTree : builds AVL snapshot\n${task.className} ..> BSTree : builds BST snapshot\n${task.className} ..> SortedArrayList : builds array snapshot`;
  }
  return diagram;
}

function taskRecord(entry) {
  const prefix = entry.id.slice(0, 2);
  const category = CATEGORIES[prefix];
  const className = existingClassName(entry.id, category.folder, entry.task);
  const task = {
    id: entry.id,
    taskId: entry.id,
    prefix,
    title: entry.task,
    feature: entry.feature,
    likelyHackathonTask: entry.likelyHackathonTask,
    category: category.folder,
    categoryLabel: category.label,
    className,
    sourcePath: path.join(SRC_ROOT, category.folder, `${className}.java`),
    testPath: path.join(TEST_ROOT, category.folder, `${className}Test.java`),
  };
  task.taskDescription = taskDescription(entry);
  if (task.id === 'DS45') {
    task.source = readExistingTaskFile(task.sourcePath) || integrateSource(task, withHackathonPackage(classSource(task), sourceImports(task)));
    task.test = readExistingTaskFile(task.testPath) || integrateTest(task, withHackathonPackage(testSource(task), generatedTestImports(task)));
  } else {
    task.source = integrateSource(task, withHackathonPackage(classSource(task), sourceImports(task)));
    task.test = integrateTest(task, withHackathonPackage(testSource(task), generatedTestImports(task)));
  }
  task.explanation = explanation(task);
  task.complexity = architectureNotes(task);
  task.uml = uml(task);
  return task;
}

const tasks = idsInOrder().map((id) => taskRecord(entriesById()[id]));

function writeManifest() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'mini_project_hackathon_task_catalog.pdf fields: Task ID, Task title, Feature, Likely hackathon task',
    packageDeclarations: 'package hackathon',
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      feature: task.feature,
      likelyHackathonTask: task.likelyHackathonTask,
      category: task.category,
      className: task.className,
      packageName: 'hackathon',
      sourcePath: path.relative(ROOT, task.sourcePath),
      testPath: path.relative(ROOT, task.testPath),
    })),
  };
  fs.writeFileSync(path.join(SRC_ROOT, 'mock_hackathon_manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    path.join(SRC_ROOT, 'MockHackathonManifest.md'),
    [
      '# Mock Hackathon Manifest',
      '',
      `Generated at: ${manifest.generatedAt}`,
      '',
      '- Package declarations: implementation and test files use `package hackathon;`.',
      '- Task descriptions: simplified to Feature and Task only.',
      '- Source: uploaded mini project hackathon task catalogue PDF.',
      '',
      ...tasks.map((task) => `- ${task.id}: ${task.title} (${task.category})`),
      '',
    ].join('\n')
  );
}

function generate() {
  for (const task of tasks) {
    ensureDirectory(path.dirname(task.sourcePath));
    ensureDirectory(path.dirname(task.testPath));
    fs.writeFileSync(task.sourcePath, task.source, 'utf8');
    fs.writeFileSync(task.testPath, task.test, 'utf8');
  }
  writeManifest();
  console.log(`Generated implementation files: ${tasks.length}`);
  console.log(`Generated test files: ${tasks.length}`);
}

if (require.main === module) {
  generate();
}

module.exports = {
  tasks,
  generate,
  CATEGORIES,
};
