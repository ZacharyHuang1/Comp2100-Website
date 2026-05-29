const documentationService = require('./documentationService');

const STOPWORDS = new Set(['a', 'the', 'of', 'in', 'to', 'for', 'and']);
const GIT_SIMULATOR_PAGE = {
  id: 'git-simulator',
  title: 'Git Push Simulator',
  spaceName: 'Git Simulator',
  instructionType: 'tool',
  content: `
# Git Push Simulator

Practice commit, push, pull, branch, and merge flows with a visual Git graph.

## Commit

A commit saves a local snapshot of your work. It only exists locally until you push it.

## Push

Push sends local commits to a remote repository such as GitLab. In this simulator, origin/main or origin/feature moves to the latest pushed branch head.

## Pull

Pull fetches remote commits and integrates them into the current local branch. If local and remote histories diverge, a merge or rebase is needed.

## Branch and Checkout

A branch lets you work on a feature without changing main directly. Checkout switches HEAD to another branch.

## Merge

Merge combines changes from a feature branch into main. A merge commit can have two parents when histories diverge.

## GitLab Graph

The graph shows commit nodes, branch labels, HEAD, main, origin main, remote repository state, and feature branch history.
`,
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);
  const tokens = normalized
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));

  return tokens.length ? [...new Set(tokens)] : normalized ? [normalized] : [];
}

function slugifyDocumentationHeading(value) {
  return (
    String(value || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'section'
  );
}

function getSnippet(text, tokens, fallbackQuery) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();

  if (!source) {
    return '';
  }

  const lowerSource = source.toLowerCase();
  const directIndex = lowerSource.indexOf(String(fallbackQuery || '').toLowerCase());
  const tokenIndex = tokens.reduce((bestIndex, token) => {
    const index = lowerSource.indexOf(token);

    if (index === -1) {
      return bestIndex;
    }

    return bestIndex === -1 ? index : Math.min(bestIndex, index);
  }, -1);
  const matchIndex = directIndex >= 0 ? directIndex : tokenIndex;

  if (matchIndex === -1) {
    return source.slice(0, 220);
  }

  const start = Math.max(0, matchIndex - 90);
  const end = Math.min(source.length, matchIndex + 180);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < source.length ? '...' : '';

  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

function splitSections(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const sections = [];
  let current = {
    heading: '',
    slug: 'top',
    content: [],
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);

    if (headingMatch) {
      if (current.heading || current.content.some((item) => item.trim())) {
        sections.push({
          ...current,
          content: current.content.join('\n').trim(),
        });
      }

      current = {
        heading: headingMatch[2].trim(),
        slug: slugifyDocumentationHeading(headingMatch[2]),
        content: [],
      };
      continue;
    }

    current.content.push(line);
  }

  if (current.heading || current.content.some((item) => item.trim())) {
    sections.push({
      ...current,
      content: current.content.join('\n').trim(),
    });
  }

  return sections;
}

function hasEveryToken(value, tokens) {
  const normalized = normalizeText(value);
  return tokens.every((token) => normalized.includes(token));
}

function scoreSection(page, section, tokens, normalizedQuery) {
  const normalizedTitle = normalizeText(page.title);
  const normalizedHeading = normalizeText(section.heading);
  const normalizedContent = normalizeText(section.content);

  if (normalizedTitle === normalizedQuery) {
    return 120;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    return 100;
  }

  if (normalizedHeading.includes(normalizedQuery)) {
    return 90;
  }

  if (hasEveryToken(section.heading, tokens)) {
    return 80;
  }

  if (
    tokens.some((token) => normalizedHeading.includes(token)) &&
    hasEveryToken(`${section.heading}\n${section.content}`, tokens)
  ) {
    return 75;
  }

  if (normalizedContent.includes(normalizedQuery)) {
    return 70;
  }

  if (hasEveryToken(section.content, tokens)) {
    return 55;
  }

  return 0;
}

function mapDocumentationResult(page, section, queryText, tokens, score) {
  const matchedHeading = section.heading || page.title;
  const slug = section.slug || 'top';
  const snippet = getSnippet(section.content || page.content, tokens, queryText);
  const href = `/documentation/doc/${page.id}?highlight=${encodeURIComponent(
    queryText
  )}#${encodeURIComponent(slug)}`;

  return {
    type: 'documentation',
    id: `documentation:${page.id}`,
    documentId: page.id,
    title: page.title,
    matchedHeading,
    snippet,
    href,
    score,
    spaceName: page.spaceName,
    instructionType: page.instructionType,
    category: {
      id: 'documentation',
      name: 'Documentation',
      slug: 'documentation',
    },
    content: {
      id: page.id,
      query: matchedHeading,
      code: '',
      explanation: snippet,
      complexity: '',
      uml: '',
    },
    matches: [
      {
        type: 'documentation',
        heading: matchedHeading,
        snippet,
      },
    ],
  };
}

function mapGitSimulatorResult(section, queryText, tokens, score) {
  const matchedHeading = section.heading || GIT_SIMULATOR_PAGE.title;
  const slug = section.slug || 'top';
  const snippet = getSnippet(
    section.content || GIT_SIMULATOR_PAGE.content,
    tokens,
    queryText
  );
  const href = `/git-simulator?highlight=${encodeURIComponent(
    queryText
  )}#${encodeURIComponent(slug)}`;

  return {
    type: 'documentation',
    id: 'documentation:git-simulator',
    documentId: GIT_SIMULATOR_PAGE.id,
    title: GIT_SIMULATOR_PAGE.title,
    matchedHeading,
    snippet,
    href,
    score,
    spaceName: GIT_SIMULATOR_PAGE.spaceName,
    instructionType: GIT_SIMULATOR_PAGE.instructionType,
    category: {
      id: 'git-simulator',
      name: 'Git Simulator',
      slug: 'git-simulator',
    },
    content: {
      id: GIT_SIMULATOR_PAGE.id,
      query: matchedHeading,
      code: '',
      explanation: snippet,
      complexity: '',
      uml: '',
    },
    matches: [
      {
        type: 'documentation',
        heading: matchedHeading,
        snippet,
      },
    ],
  };
}

async function searchDocumentation(queryText, actor, { limit = 8 } = {}) {
  const normalizedQuery = normalizeText(queryText);
  const tokens = tokenize(queryText);

  if (!normalizedQuery || !tokens.length) {
    return [];
  }

  const pages = await documentationService.getPages(
    {
      includeArchived: false,
    },
    actor
  );
  const results = [];
  const simulatorSections = splitSections(GIT_SIMULATOR_PAGE.content || '');
  const bestSimulatorMatch = simulatorSections
    .map((section) => ({
      section,
      score: scoreSection(GIT_SIMULATOR_PAGE, section, tokens, normalizedQuery),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (bestSimulatorMatch && bestSimulatorMatch.score > 0) {
    results.push(
      mapGitSimulatorResult(
        bestSimulatorMatch.section,
        queryText,
        tokens,
        bestSimulatorMatch.score
      )
    );
  }

  for (const page of pages) {
    const sections = splitSections(page.content || '');
    const candidates = sections.length
      ? sections
      : [{ heading: page.title, slug: 'top', content: page.content || '' }];
    const best = candidates
      .map((section) => ({
        section,
        score: scoreSection(page, section, tokens, normalizedQuery),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score <= 0) {
      continue;
    }

    results.push(
      mapDocumentationResult(page, best.section, queryText, tokens, best.score)
    );
  }

  return results
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

module.exports = {
  searchDocumentation,
  slugifyDocumentationHeading,
  splitSections,
};
