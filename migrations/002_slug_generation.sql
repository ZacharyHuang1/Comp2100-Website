CREATE OR REPLACE FUNCTION generate_slug(value TEXT)
RETURNS TEXT AS $$
DECLARE
  slug_value TEXT;
BEGIN
  slug_value := lower(trim(value));
  slug_value := regexp_replace(slug_value, '[^a-z0-9]+', '-', 'g');
  slug_value := regexp_replace(slug_value, '(^-+|-+$)', '', 'g');

  IF slug_value IS NULL OR slug_value = '' THEN
    slug_value := 'item';
  END IF;

  RETURN slug_value;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_topic_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE categories
SET slug = generate_slug(name)
WHERE slug IS NULL OR btrim(slug) = '';

UPDATE topics
SET slug = generate_slug(title)
WHERE slug IS NULL OR btrim(slug) = '';

ALTER TABLE categories
  ALTER COLUMN slug DROP NOT NULL;

ALTER TABLE topics
  ALTER COLUMN slug DROP NOT NULL;

DROP TRIGGER IF EXISTS categories_set_slug ON categories;
CREATE TRIGGER categories_set_slug
BEFORE INSERT OR UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_category_slug();

DROP TRIGGER IF EXISTS topics_set_slug ON topics;
CREATE TRIGGER topics_set_slug
BEFORE INSERT OR UPDATE ON topics
FOR EACH ROW
EXECUTE FUNCTION set_topic_slug();
