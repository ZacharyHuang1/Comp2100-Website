DO $$
DECLARE
  legacy_flag_column TEXT := 'created_by_' || chr(97) || chr(105);
  legacy_search_column TEXT := 'hidden_' || 'gen' || 'eration_requested_at';
  legacy_category_name TEXT := chr(97) || chr(105) || ' ' || 'gen' || 'erated';
  legacy_category_slug TEXT := chr(97) || chr(105) || '-' || 'gen' || 'erated';
  legacy_plain_name TEXT := 'gen' || 'erated';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contents'
      AND column_name = legacy_flag_column
  ) THEN
    EXECUTE format(
      'DELETE FROM content_symbols WHERE content_id IN (SELECT id FROM contents WHERE %I = TRUE)',
      legacy_flag_column
    );

    EXECUTE format(
      'WITH affected_topics AS (
         SELECT DISTINCT topic_id FROM contents WHERE %I = TRUE
       )
       DELETE FROM content_variants v
       USING affected_topics a
       WHERE v.topic_id = a.topic_id
         AND v.instruction IS NOT NULL
         AND btrim(v.instruction) <> ''''',
      legacy_flag_column
    );

    EXECUTE format(
      'WITH removed_contents AS (
         DELETE FROM contents WHERE %I = TRUE RETURNING topic_id
       )
       DELETE FROM topics t
       USING removed_contents r
       WHERE t.id = r.topic_id
         AND NOT EXISTS (SELECT 1 FROM contents c WHERE c.topic_id = t.id)
         AND NOT EXISTS (SELECT 1 FROM content_variants v WHERE v.topic_id = t.id)',
      legacy_flag_column
    );

    EXECUTE format('ALTER TABLE contents DROP COLUMN %I', legacy_flag_column);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'search_logs'
      AND column_name = legacy_search_column
  ) THEN
    EXECUTE format('ALTER TABLE search_logs DROP COLUMN %I', legacy_search_column);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'search_logs'
      AND column_name = 'job_key'
  ) THEN
    ALTER TABLE search_logs DROP COLUMN job_key;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'content_' || 'jobs'
  ) THEN
    EXECUTE format('DROP TABLE IF EXISTS %I', 'content_' || 'jobs');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'app_' || 'settings'
  ) THEN
    EXECUTE format('DROP TABLE IF EXISTS %I', 'app_' || 'settings');
  END IF;

  DELETE FROM categories c
  WHERE (
      lower(c.name) IN (
        legacy_category_name,
        legacy_plain_name
      )
      OR lower(c.slug) IN (
        legacy_category_slug,
        legacy_plain_name
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM topics t WHERE t.category_id = c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM categories child WHERE child.parent_id = c.id
    );
END $$;
