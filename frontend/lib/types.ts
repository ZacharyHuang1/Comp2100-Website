export type Category = {
  id: string;
  name: string;
  slug: string | null;
  parent_id?: string | null;
  parentId?: string | null;
};

export type Content = {
  id: string;
  query: string;
  taskDescription?: string | null;
  code: string | null;
  explanation: string | null;
  complexity: string | null;
  uml?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ContentVariant = {
  id: string;
  topicId: string;
  parentContentId: string | null;
  label: string;
  code: string | null;
  explanation: string | null;
  complexity: string | null;
  uml?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TopicSummary = {
  id: string;
  title: string;
  slug: string | null;
  category: Category;
  content: Content[];
  breadcrumbs?: Category[];
  variants?: ContentVariant[];
};

export type CategoryTopicsResponse = {
  id: string;
  name: string;
  slug: string | null;
  parent_id?: string | null;
  breadcrumbs?: Category[];
  subcategories?: Category[];
  topics: TopicSummary[];
};

export type TopicSearchResult = {
  id: string;
  type?: 'topic' | 'code' | 'doc' | 'task' | 'category';
  title: string;
  preview?: string;
  href?: string;
  path?: string;
  source_type?: string;
  sourceType?: string;
  match_type?: 'exact' | 'keyword' | 'fuzzy' | 'semantic' | 'hybrid';
  matchType?: 'exact' | 'keyword' | 'fuzzy' | 'semantic' | 'hybrid';
  score?: number;
  metadata?: Record<string, unknown>;
  topic?: {
    id: string;
    title: string;
    slug: string | null;
  } | null;
  category: Category;
  content: Content;
  matches?: SearchMatch[];
};

export type DocumentationSearchResult = {
  id: string;
  type: 'documentation';
  documentId: string;
  title: string;
  matchedHeading: string;
  snippet: string;
  href: string;
  preview?: string;
  path?: string;
  source_type?: string;
  sourceType?: string;
  match_type?: 'exact' | 'keyword' | 'fuzzy' | 'semantic' | 'hybrid';
  matchType?: 'exact' | 'keyword' | 'fuzzy' | 'semantic' | 'hybrid';
  score?: number;
  metadata?: Record<string, unknown>;
  topic?: {
    id: string;
    title: string;
    slug: string | null;
  } | null;
  spaceName?: string;
  instructionType?: string;
  category: Category;
  content: Content;
  matches?: SearchMatch[];
};

export type SearchResult = TopicSearchResult | DocumentationSearchResult;

export type SearchMatch = {
  type: 'symbol' | 'code' | 'text' | 'documentation';
  heading?: string;
  kind?: string;
  visibility?: string;
  name?: string;
  signature?: string;
  lineNumber?: number;
  snippet?: string;
};

export type SearchFoundResponse = {
  found: true;
  data?: SearchResult;
  results?: SearchResult[];
};

export type SearchNotFoundResponse = {
  found: false;
  status?: 'not_found' | 'error';
  message: string;
};

export type SearchResponse = SearchFoundResponse | SearchNotFoundResponse;

export type ExplorerTopicNode = {
  id: string;
  type: 'topic';
  title: string;
  slug: string | null;
  categoryId: string;
  contentId?: string | null;
  path?: string;
  marked?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ExplorerCategoryNode = {
  id: string;
  type: 'category';
  name: string;
  slug: string | null;
  parentId: string | null;
  children: ExplorerNode[];
  marked?: boolean;
};

export type ExplorerNode = ExplorerCategoryNode | ExplorerTopicNode;
