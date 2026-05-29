const { query } = require('../db');

function getOwnerSelect(prefix = 'owner') {
  return `
    ${prefix}.username AS owner_username,
    ${prefix}.display_name AS owner_display_name,
    ${prefix}.email AS owner_email,
    ${prefix}.role AS owner_role,
    ${prefix}.status AS owner_status,
    COALESCE(${prefix}.accent_color, ${prefix}.avatar_color, '#64748B') AS owner_avatar_color
  `;
}

async function getSpaces({ includeArchived = false, ownerUserId = null } = {}) {
  const values = [Boolean(includeArchived)];
  const ownerClause = ownerUserId ? 'AND s.owner_user_id = $2' : '';

  if (ownerUserId) {
    values.push(ownerUserId);
  }

  const result = await query(
    `
      SELECT
        s.id,
        s.name,
        s.description,
        s.owner_user_id,
        s.visibility,
        s.marker_color,
        s.archived,
        s.created_at,
        s.updated_at,
        ${getOwnerSelect('owner')},
        COUNT(p.id) FILTER (WHERE p.archived = false)::int AS page_count
      FROM documentation_spaces s
      INNER JOIN app_users owner ON owner.id = s.owner_user_id
      LEFT JOIN documentation_pages p ON p.space_id = s.id
      WHERE ($1::boolean = true OR s.archived = false)
        ${ownerClause}
      GROUP BY s.id, owner.id
      ORDER BY s.archived ASC, s.updated_at DESC, lower(s.name) ASC
    `,
    values
  );

  return result.rows;
}

async function getSpaceById(id) {
  const result = await query(
    `
      SELECT
        s.id,
        s.name,
        s.description,
        s.owner_user_id,
        s.visibility,
        s.marker_color,
        s.archived,
        s.created_at,
        s.updated_at,
        ${getOwnerSelect('owner')},
        COUNT(p.id) FILTER (WHERE p.archived = false)::int AS page_count
      FROM documentation_spaces s
      INNER JOIN app_users owner ON owner.id = s.owner_user_id
      LEFT JOIN documentation_pages p ON p.space_id = s.id
      WHERE s.id = $1
      GROUP BY s.id, owner.id
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createSpace(space) {
  const result = await query(
    `
      INSERT INTO documentation_spaces (
        name,
        description,
        owner_user_id,
        visibility,
        marker_color
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      space.name,
      space.description || '',
      space.ownerUserId,
      space.visibility || 'private',
      space.markerColor || '#64748B',
    ]
  );

  return result.rows[0];
}

async function updateSpace(id, space) {
  const result = await query(
    `
      UPDATE documentation_spaces
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          owner_user_id = COALESCE($4, owner_user_id),
          visibility = COALESCE($5, visibility),
          marker_color = COALESCE($6, marker_color),
          archived = COALESCE($7, archived),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      space.name ?? null,
      space.description ?? null,
      space.ownerUserId ?? null,
      space.visibility ?? null,
      space.markerColor ?? null,
      space.archived ?? null,
    ]
  );

  return result.rows[0] || null;
}

async function deleteSpace(id) {
  const result = await query(
    `
      DELETE FROM documentation_spaces
      WHERE id = $1
      RETURNING id, name
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function getPages({
  includeArchived = false,
  ownerUserId = null,
  spaceId = null,
  q = '',
  instructionType = '',
} = {}) {
  const values = [Boolean(includeArchived)];
  const clauses = ['($1::boolean = true OR p.archived = false)'];

  if (ownerUserId) {
    values.push(ownerUserId);
    clauses.push(`p.owner_user_id = $${values.length}`);
  }

  if (spaceId) {
    values.push(spaceId);
    clauses.push(`p.space_id = $${values.length}`);
  }

  if (instructionType) {
    values.push(instructionType);
    clauses.push(`p.instruction_type = $${values.length}`);
  }

  if (q) {
    const tokens = q
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 8);

    tokens.forEach((token) => {
      values.push(token);
      const index = values.length;
      clauses.push(
        `(p.title ILIKE '%' || $${index} || '%' OR p.content ILIKE '%' || $${index} || '%' OR s.name ILIKE '%' || $${index} || '%')`
      );
    });
  }

  const result = await query(
    `
      SELECT
        p.id,
        p.space_id,
        p.title,
        p.content,
        p.instruction_type,
        p.owner_user_id,
        p.visibility,
        p.archived,
        p.created_at,
        p.updated_at,
        s.name AS space_name,
        s.marker_color AS space_marker_color,
        ${getOwnerSelect('owner')}
      FROM documentation_pages p
      INNER JOIN documentation_spaces s ON s.id = p.space_id
      INNER JOIN app_users owner ON owner.id = p.owner_user_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY p.archived ASC, p.updated_at DESC, lower(p.title) ASC
    `,
    values
  );

  return result.rows;
}

async function getPageById(id) {
  const result = await query(
    `
      SELECT
        p.id,
        p.space_id,
        p.title,
        p.content,
        p.instruction_type,
        p.owner_user_id,
        p.visibility,
        p.archived,
        p.created_at,
        p.updated_at,
        s.name AS space_name,
        s.marker_color AS space_marker_color,
        ${getOwnerSelect('owner')}
      FROM documentation_pages p
      INNER JOIN documentation_spaces s ON s.id = p.space_id
      INNER JOIN app_users owner ON owner.id = p.owner_user_id
      WHERE p.id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async function createPage(page) {
  const result = await query(
    `
      INSERT INTO documentation_pages (
        space_id,
        title,
        content,
        instruction_type,
        owner_user_id,
        visibility
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      page.spaceId,
      page.title,
      page.content || '',
      page.instructionType || 'general',
      page.ownerUserId,
      page.visibility || 'private',
    ]
  );

  return result.rows[0];
}

async function updatePage(id, page) {
  const result = await query(
    `
      UPDATE documentation_pages
      SET space_id = COALESCE($2, space_id),
          title = COALESCE($3, title),
          content = COALESCE($4, content),
          instruction_type = COALESCE($5, instruction_type),
          owner_user_id = COALESCE($6, owner_user_id),
          visibility = COALESCE($7, visibility),
          archived = COALESCE($8, archived),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      page.spaceId ?? null,
      page.title ?? null,
      page.content ?? null,
      page.instructionType ?? null,
      page.ownerUserId ?? null,
      page.visibility ?? null,
      page.archived ?? null,
    ]
  );

  return result.rows[0] || null;
}

async function deletePage(id) {
  const result = await query(
    `
      DELETE FROM documentation_pages
      WHERE id = $1
      RETURNING id, title
    `,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  createPage,
  createSpace,
  deletePage,
  deleteSpace,
  getPageById,
  getPages,
  getSpaceById,
  getSpaces,
  updatePage,
  updateSpace,
};
