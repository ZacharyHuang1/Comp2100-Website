const gitSimulatorRepository = require('../repositories/gitSimulatorRepository');
const { createHttpError } = require('./categoryService');

const INITIAL_MESSAGE = 'Simulation initialized.';
const BRANCH_NAME_PATTERN = /^[A-Za-z0-9._/-]+$/;

function mapUserFromRow(row, prefix = '') {
  const id = row[`${prefix}user_id`] || row[`${prefix}created_by_user_id`];

  if (!id) {
    return null;
  }

  return {
    id: String(id),
    username: row[`${prefix}username`] || '',
    displayName: row[`${prefix}display_name`] || row[`${prefix}username`] || '',
    avatarColor: row[`${prefix}avatar_color`] || '#F59E0B',
  };
}

function mapCommit(row) {
  return {
    id: String(row.id),
    commitKey: row.commit_key,
    message: row.message,
    branchName: row.branch_name,
    parentKeys: row.parent_keys || [],
    createdByUserId: row.created_by_user_id ? String(row.created_by_user_id) : null,
    createdBy: row.created_by_user_id
      ? {
          id: String(row.created_by_user_id),
          username: row.created_by_username || '',
          displayName: row.created_by_display_name || row.created_by_username || '',
          avatarColor: row.created_by_avatar_color || '#F59E0B',
        }
      : null,
    createdAt: row.created_at,
  };
}

function mapBranch(row) {
  return {
    id: String(row.id),
    name: row.name,
    commitKey: row.commit_key,
    isRemote: Boolean(row.is_remote),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvent(row) {
  return {
    id: String(row.id),
    action: row.action,
    message: row.message,
    undoneAt: row.undone_at,
    createdAt: row.created_at,
    user: mapUserFromRow(row),
  };
}

function normalizeMessage(value, fallback) {
  const message = typeof value === 'string' ? value.trim() : '';
  return message || fallback;
}

function normalizeBranchName(value) {
  const branchName = typeof value === 'string' ? value.trim() : '';

  if (!branchName) {
    throw createHttpError(400, 'Branch name is required.');
  }

  if (!BRANCH_NAME_PATTERN.test(branchName)) {
    throw createHttpError(
      400,
      'Branch name can only use letters, numbers, slash, dash, underscore, and dot.'
    );
  }

  if (branchName === 'main' || branchName === 'origin/main') {
    throw createHttpError(400, 'Choose a branch name other than main.');
  }

  return branchName;
}

function getLocalBranches(branches) {
  return branches.filter((branch) => !branch.isRemote);
}

function getRemoteBranches(branches) {
  return branches.filter((branch) => branch.isRemote);
}

function findLocalBranch(branches, name) {
  return branches.find((branch) => !branch.isRemote && branch.name === name);
}

function findRemoteBranch(branches, name) {
  return branches.find((branch) => branch.isRemote && branch.name === name);
}

function getCurrentBranch(session, branches) {
  const branch = findLocalBranch(branches, session.current_branch);

  if (!branch) {
    throw createHttpError(409, 'Current branch is missing.');
  }

  return branch;
}

function isAncestor(commits, ancestorKey, descendantKey) {
  if (ancestorKey === descendantKey) {
    return true;
  }

  const commitByKey = new Map(commits.map((commit) => [commit.commitKey, commit]));
  const queue = [descendantKey];
  const visited = new Set();

  while (queue.length) {
    const currentKey = queue.shift();

    if (!currentKey || visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);
    const commit = commitByKey.get(currentKey);

    if (!commit) {
      continue;
    }

    if (commit.parentKeys.includes(ancestorKey)) {
      return true;
    }

    queue.push(...commit.parentKeys);
  }

  return false;
}

function nextCommitKey(commits) {
  const nextNumber =
    commits
      .map((commit) => {
        const match = String(commit.commitKey || '').match(/^c(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((max, value) => Math.max(max, value), 0) + 1;

  return `c${nextNumber}`;
}

async function ensureSession(user) {
  const existing = await gitSimulatorRepository.getSessionByUserId(Number(user.id));

  if (existing) {
    return existing;
  }

  return gitSimulatorRepository.createInitialSession(Number(user.id));
}

async function buildState(session, notice = '') {
  const [commits, branches, events] = await Promise.all([
    gitSimulatorRepository.getCommits(session.id),
    gitSimulatorRepository.getBranches(session.id),
    gitSimulatorRepository.getEvents(session.id),
  ]);
  const mappedCommits = commits.map(mapCommit);
  const mappedBranches = branches.map(mapBranch);
  const currentBranch =
    mappedBranches.find(
      (branch) => !branch.isRemote && branch.name === session.current_branch
    ) || mappedBranches.find((branch) => !branch.isRemote && branch.name === 'main');

  return {
    session: {
      id: String(session.id),
      name: session.name,
      currentBranch: session.current_branch,
      headCommitKey: currentBranch?.commitKey || 'c0',
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    },
    commits: mappedCommits,
    branches: mappedBranches,
    events: events.map(mapEvent),
    notice,
  };
}

async function getState(user) {
  return buildState(await ensureSession(user));
}

async function withSimulatorMutation(user, action, mutation) {
  const session = await ensureSession(user);

  await gitSimulatorRepository.transaction(async (client) => {
    const snapshot = await gitSimulatorRepository.getSnapshot(client, session.id);
    const result = await mutation(client, snapshot);

    if (!result || result.changed === false) {
      await client.query(
        `
          INSERT INTO git_simulator_events (session_id, user_id, action, message)
          VALUES ($1, $2, $3, $4)
        `,
        [session.id, Number(user.id), action, result?.message || 'No changes made.']
      );
      return;
    }

    await client.query(
      `
        INSERT INTO git_simulator_events (
          session_id,
          user_id,
          action,
          message,
          snapshot_json
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [session.id, Number(user.id), action, result.message, snapshot]
    );
  });

  return getState(user);
}

async function commit(payload, user) {
  return withSimulatorMutation(user, 'commit', async (client, snapshot) => {
    const commits = (snapshot.commits || []).map((commit) => ({
      commitKey: commit.commit_key,
      parentKeys: commit.parent_keys || [],
    }));
    const branches = snapshot.branches || [];
    const currentBranch = getCurrentBranch(snapshot.session, branches);
    const commitKey = nextCommitKey(commits);
    const message = normalizeMessage(payload.message, `Commit ${commitKey}`);

    await client.query(
      `
        INSERT INTO git_simulator_commits (
          session_id,
          commit_key,
          message,
          branch_name,
          parent_keys,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        snapshot.session.id,
        commitKey,
        message,
        currentBranch.name,
        [currentBranch.commit_key],
        Number(user.id),
      ]
    );
    await client.query(
      `
        UPDATE git_simulator_branches
        SET commit_key = $3,
            updated_at = NOW()
        WHERE session_id = $1
          AND name = $2
          AND is_remote = false
      `,
      [snapshot.session.id, currentBranch.name, commitKey]
    );
    await client.query(
      'UPDATE git_simulator_sessions SET updated_at = NOW() WHERE id = $1',
      [snapshot.session.id]
    );

    return {
      message: `Created local commit ${commitKey} on ${currentBranch.name}.`,
    };
  });
}

async function push(_payload, user) {
  return withSimulatorMutation(user, 'push', async (client, snapshot) => {
    const currentBranch = getCurrentBranch(snapshot.session, snapshot.branches || []);

    await client.query(
      `
        INSERT INTO git_simulator_branches (
          session_id,
          name,
          commit_key,
          is_remote
        )
        VALUES ($1, $2, $3, true)
        ON CONFLICT (session_id, name, is_remote)
        DO UPDATE SET commit_key = EXCLUDED.commit_key, updated_at = NOW()
      `,
      [snapshot.session.id, currentBranch.name, currentBranch.commit_key]
    );
    await client.query(
      'UPDATE git_simulator_sessions SET updated_at = NOW() WHERE id = $1',
      [snapshot.session.id]
    );

    return {
      message:
        currentBranch.name === 'main'
          ? 'Pushed main to origin/main.'
          : `Pushed ${currentBranch.name} to origin/${currentBranch.name}.`,
    };
  });
}

async function createBranch(payload, user) {
  const branchName = normalizeBranchName(payload.branchName);

  return withSimulatorMutation(user, 'branch', async (client, snapshot) => {
    const branches = snapshot.branches || [];

    if (findLocalBranch(branches, branchName)) {
      throw createHttpError(409, 'Branch already exists.');
    }

    const currentBranch = getCurrentBranch(snapshot.session, branches);

    await client.query(
      `
        INSERT INTO git_simulator_branches (session_id, name, commit_key, is_remote)
        VALUES ($1, $2, $3, false)
      `,
      [snapshot.session.id, branchName, currentBranch.commit_key]
    );
    await client.query(
      `
        UPDATE git_simulator_sessions
        SET current_branch = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [snapshot.session.id, branchName]
    );

    return {
      message: `Created and checked out branch ${branchName}.`,
    };
  });
}

async function checkout(payload, user) {
  const branchName = typeof payload.branchName === 'string' ? payload.branchName.trim() : '';

  return withSimulatorMutation(user, 'checkout', async (client, snapshot) => {
    if (!findLocalBranch(snapshot.branches || [], branchName)) {
      throw createHttpError(404, 'Branch not found.');
    }

    if (snapshot.session.current_branch === branchName) {
      return {
        changed: false,
        message: `Already on ${branchName}.`,
      };
    }

    await client.query(
      `
        UPDATE git_simulator_sessions
        SET current_branch = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [snapshot.session.id, branchName]
    );

    return {
      message: `Checked out ${branchName}.`,
    };
  });
}

async function merge(payload, user) {
  return withSimulatorMutation(user, 'merge', async (client, snapshot) => {
    const branches = snapshot.branches || [];
    const sourceName =
      typeof payload.sourceBranch === 'string' && payload.sourceBranch.trim()
        ? payload.sourceBranch.trim()
        : '';
    const targetName =
      typeof payload.targetBranch === 'string' && payload.targetBranch.trim()
        ? payload.targetBranch.trim()
        : snapshot.session.current_branch;
    const sourceBranch = findLocalBranch(branches, sourceName);
    const targetBranch = findLocalBranch(branches, targetName);

    if (!sourceBranch || !targetBranch) {
      throw createHttpError(404, 'Merge source or target branch not found.');
    }

    if (sourceBranch.name === targetBranch.name) {
      throw createHttpError(400, 'Choose different source and target branches.');
    }

    if (sourceBranch.commit_key === targetBranch.commit_key) {
      return {
        changed: false,
        message: `${targetBranch.name} already contains ${sourceBranch.name}.`,
      };
    }

    const commits = (snapshot.commits || []).map((commit) => ({
      commitKey: commit.commit_key,
      parentKeys: commit.parent_keys || [],
    }));
    const commitKey = nextCommitKey(commits);

    await client.query(
      `
        INSERT INTO git_simulator_commits (
          session_id,
          commit_key,
          message,
          branch_name,
          parent_keys,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        snapshot.session.id,
        commitKey,
        `Merge ${sourceBranch.name} into ${targetBranch.name}`,
        targetBranch.name,
        [targetBranch.commit_key, sourceBranch.commit_key],
        Number(user.id),
      ]
    );
    await client.query(
      `
        UPDATE git_simulator_branches
        SET commit_key = $4,
            updated_at = NOW()
        WHERE session_id = $1
          AND name = $2
          AND is_remote = $3
      `,
      [snapshot.session.id, targetBranch.name, false, commitKey]
    );
    await client.query(
      `
        UPDATE git_simulator_sessions
        SET current_branch = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [snapshot.session.id, targetBranch.name]
    );

    return {
      message: `Merged ${sourceBranch.name} into ${targetBranch.name} with ${commitKey}.`,
    };
  });
}

async function pull(_payload, user) {
  return withSimulatorMutation(user, 'pull', async (client, snapshot) => {
    const branches = snapshot.branches || [];
    const commits = (snapshot.commits || []).map((commit) => ({
      commitKey: commit.commit_key,
      parentKeys: commit.parent_keys || [],
    }));
    const localBranch = getCurrentBranch(snapshot.session, branches);
    const remoteBranch = findRemoteBranch(branches, localBranch.name);

    if (!remoteBranch) {
      return {
        changed: false,
        message: `No origin/${localBranch.name} branch exists yet. Push first.`,
      };
    }

    if (localBranch.commit_key === remoteBranch.commit_key) {
      return {
        changed: false,
        message: `${localBranch.name} is already up to date.`,
      };
    }

    if (isAncestor(commits, localBranch.commit_key, remoteBranch.commit_key)) {
      await client.query(
        `
          UPDATE git_simulator_branches
          SET commit_key = $4,
              updated_at = NOW()
          WHERE session_id = $1
            AND name = $2
            AND is_remote = $3
        `,
        [snapshot.session.id, localBranch.name, false, remoteBranch.commit_key]
      );
      await client.query(
        'UPDATE git_simulator_sessions SET updated_at = NOW() WHERE id = $1',
        [snapshot.session.id]
      );

      return {
        message: `Pulled origin/${localBranch.name}.`,
      };
    }

    if (isAncestor(commits, remoteBranch.commit_key, localBranch.commit_key)) {
      return {
        changed: false,
        message: `${localBranch.name} is ahead of origin/${localBranch.name}. Push to publish local commits.`,
      };
    }

    return {
      changed: false,
      message: `Branches diverged. Merge or rebase is needed before pulling cleanly.`,
    };
  });
}

async function reset(user) {
  const session = await ensureSession(user);

  await gitSimulatorRepository.transaction(async (client) => {
    await client.query('DELETE FROM git_simulator_commits WHERE session_id = $1', [
      session.id,
    ]);
    await client.query('DELETE FROM git_simulator_branches WHERE session_id = $1', [
      session.id,
    ]);
    await client.query(
      `
        UPDATE git_simulator_sessions
        SET current_branch = 'main',
            updated_at = NOW()
        WHERE id = $1
      `,
      [session.id]
    );
    await client.query(
      `
        INSERT INTO git_simulator_commits (
          session_id,
          commit_key,
          message,
          branch_name,
          parent_keys,
          created_by_user_id
        )
        VALUES ($1, 'c0', 'Initial commit', 'main', '{}', $2)
      `,
      [session.id, Number(user.id)]
    );
    await client.query(
      `
        INSERT INTO git_simulator_branches (session_id, name, commit_key, is_remote)
        VALUES
          ($1, 'main', 'c0', false),
          ($1, 'main', 'c0', true)
      `,
      [session.id]
    );
    await client.query(
      `
        UPDATE git_simulator_events
        SET undone_at = NOW()
        WHERE session_id = $1
          AND snapshot_json IS NOT NULL
          AND undone_at IS NULL
      `,
      [session.id]
    );
    await client.query(
      `
        INSERT INTO git_simulator_events (session_id, user_id, action, message)
        VALUES ($1, $2, 'reset', $3)
      `,
      [session.id, Number(user.id), INITIAL_MESSAGE]
    );
  });

  return getState(user);
}

async function clearHistory(user) {
  const session = await ensureSession(user);

  await gitSimulatorRepository.transaction(async (client) => {
    await client.query('DELETE FROM git_simulator_events WHERE session_id = $1', [
      session.id,
    ]);
    await client.query('DELETE FROM git_simulator_commits WHERE session_id = $1', [
      session.id,
    ]);
    await client.query('DELETE FROM git_simulator_branches WHERE session_id = $1', [
      session.id,
    ]);
    await client.query(
      `
        UPDATE git_simulator_sessions
        SET current_branch = 'main',
            updated_at = NOW()
        WHERE id = $1
      `,
      [session.id]
    );
    await client.query(
      `
        INSERT INTO git_simulator_commits (
          session_id,
          commit_key,
          message,
          branch_name,
          parent_keys,
          created_by_user_id
        )
        VALUES ($1, 'c0', 'Initial commit', 'main', '{}', $2)
      `,
      [session.id, Number(user.id)]
    );
    await client.query(
      `
        INSERT INTO git_simulator_branches (session_id, name, commit_key, is_remote)
        VALUES
          ($1, 'main', 'c0', false),
          ($1, 'main', 'c0', true)
      `,
      [session.id]
    );
  });

  const nextSession = await gitSimulatorRepository.getSessionByUserId(Number(user.id));
  return buildState(nextSession, 'Started a new simulation.');
}

async function undo(user) {
  const session = await ensureSession(user);
  let notice = '';

  await gitSimulatorRepository.transaction(async (client) => {
    const eventResult = await client.query(
      `
        SELECT id, snapshot_json
        FROM git_simulator_events
        WHERE session_id = $1
          AND snapshot_json IS NOT NULL
          AND undone_at IS NULL
          AND action <> 'undo'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [session.id]
    );
    const event = eventResult.rows[0];

    if (!event) {
      notice = 'Nothing to undo.';
      await client.query(
        `
          INSERT INTO git_simulator_events (session_id, user_id, action, message)
          VALUES ($1, $2, 'undo', 'Nothing to undo.')
        `,
        [session.id, Number(user.id)]
      );
      return;
    }

    await gitSimulatorRepository.restoreSnapshot(
      client,
      session.id,
      event.snapshot_json
    );
    await client.query(
      'UPDATE git_simulator_events SET undone_at = NOW() WHERE id = $1',
      [event.id]
    );
    await client.query(
      `
        INSERT INTO git_simulator_events (session_id, user_id, action, message)
        VALUES ($1, $2, 'undo', 'Undid last action.')
      `,
      [session.id, Number(user.id)]
    );
    notice = 'Undid last action.';
  });

  return buildState(await ensureSession(user), notice);
}

async function getEvents(user) {
  const session = await ensureSession(user);
  return (await gitSimulatorRepository.getEvents(session.id)).map(mapEvent);
}

module.exports = {
  checkout,
  clearHistory,
  commit,
  createBranch,
  getEvents,
  getState,
  merge,
  pull,
  push,
  reset,
  undo,
};
