CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS search_documents (
  id BIGSERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  topic_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT,
  path TEXT,
  language TEXT,
  symbol_name TEXT,
  symbol_type TEXT,
  content_text TEXT NOT NULL DEFAULT '',
  content_preview TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_vector TSVECTOR,
  embedding VECTOR(1536),
  embedding_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT search_documents_source_unique UNIQUE (source_type, source_id)
);

CREATE OR REPLACE FUNCTION refresh_search_document_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.slug, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.path, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.symbol_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content_text, '')), 'B');
  NEW.updated_at := NOW();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_search_document_vector ON search_documents;
CREATE TRIGGER trg_refresh_search_document_vector
BEFORE INSERT OR UPDATE OF title, slug, path, symbol_name, content_text
ON search_documents
FOR EACH ROW
EXECUTE FUNCTION refresh_search_document_vector();

CREATE INDEX IF NOT EXISTS idx_search_documents_search_vector
  ON search_documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_search_documents_title_trgm
  ON search_documents USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_documents_slug_trgm
  ON search_documents USING GIN (slug gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_documents_path_trgm
  ON search_documents USING GIN (path gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_documents_symbol_name_trgm
  ON search_documents USING GIN (symbol_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_documents_content_text_trgm
  ON search_documents USING GIN (content_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_search_documents_source_type
  ON search_documents(source_type);

CREATE INDEX IF NOT EXISTS idx_search_documents_source_id
  ON search_documents(source_id);

CREATE INDEX IF NOT EXISTS idx_search_documents_category_id
  ON search_documents(category_id);

CREATE INDEX IF NOT EXISTS idx_search_documents_topic_id
  ON search_documents(topic_id);

CREATE INDEX IF NOT EXISTS idx_search_documents_language
  ON search_documents(language);

DO $$
BEGIN
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_search_documents_embedding_hnsw
      ON search_documents
      USING hnsw (embedding vector_cosine_ops)
      WHERE embedding IS NOT NULL;
  EXCEPTION
    WHEN undefined_object OR feature_not_supported THEN
      CREATE INDEX IF NOT EXISTS idx_search_documents_embedding_ivfflat
        ON search_documents
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        WHERE embedding IS NOT NULL;
  END;
END $$;
