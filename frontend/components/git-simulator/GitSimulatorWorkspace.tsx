'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { API_BASE_URL } from '@/lib/config';

type GitUser = {
  id: string;
  username: string;
  displayName: string;
  avatarColor?: string;
};

type GitCommit = {
  id: string;
  commitKey: string;
  message: string;
  branchName: string;
  parentKeys: string[];
  createdBy: GitUser | null;
  createdAt: string;
};

type GitBranch = {
  id: string;
  name: string;
  commitKey: string;
  isRemote: boolean;
};

type GitEvent = {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  user: GitUser | null;
};

type GitSimulatorState = {
  session: {
    id: string;
    name: string;
    currentBranch: string;
    headCommitKey: string;
    createdAt: string;
    updatedAt: string;
  };
  commits: GitCommit[];
  branches: GitBranch[];
  events: GitEvent[];
  notice?: string;
};

const BRANCH_NAME_PATTERN = /^[A-Za-z0-9._/-]+$/;

async function gitRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }

  return payload as T;
}

function formatTime(value?: string) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getInitials(user: GitUser | null) {
  const name = user?.displayName || user?.username || 'User';

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function commitCoordinates(
  commit: GitCommit,
  commitIndex: number,
  laneIndex: number
) {
  return {
    x: 90 + commitIndex * 110,
    y: 110 + laneIndex * 96,
  };
}

function validateBranchName(value: string, existingBranches: GitBranch[]) {
  const branchName = value.trim();

  if (!branchName) {
    return 'Branch name is required.';
  }

  if (!BRANCH_NAME_PATTERN.test(branchName)) {
    return 'Use letters, numbers, slash, dash, underscore, or dot only.';
  }

  if (branchName === 'main' || branchName === 'origin/main') {
    return 'Choose a branch name other than main.';
  }

  if (
    existingBranches.some(
      (branch) => !branch.isRemote && branch.name === branchName
    )
  ) {
    return 'Branch already exists.';
  }

  return '';
}

export function GitSimulatorWorkspace() {
  const [state, setState] = useState<GitSimulatorState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('feature/new-work');
  const [checkoutBranch, setCheckoutBranch] = useState('');
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('main');

  async function loadState() {
    setIsLoading(true);
    setError('');

    try {
      const nextState = await gitRequest<GitSimulatorState>(
        '/git-simulator/session'
      );
      setState(nextState);
      setMessage(
        nextState.notice ||
          nextState.events[0]?.message ||
          'Simulator loaded for this account.'
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load simulator.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  const localBranches = useMemo(
    () => (state?.branches || []).filter((branch) => !branch.isRemote),
    [state?.branches]
  );
  const remoteBranches = useMemo(
    () => (state?.branches || []).filter((branch) => branch.isRemote),
    [state?.branches]
  );
  const laneNames = useMemo(() => {
    const names = localBranches.map((branch) => branch.name);
    return [
      ...new Set([
        'main',
        ...names
          .filter((name) => name !== 'main')
          .sort((left, right) => left.localeCompare(right)),
      ]),
    ];
  }, [localBranches]);
  const branchLabels = useMemo(() => {
    const labels = new Map<string, string[]>();

    function addLabel(commitKey: string, label: string) {
      labels.set(commitKey, [...(labels.get(commitKey) || []), label]);
    }

    for (const branch of state?.branches || []) {
      addLabel(
        branch.commitKey,
        branch.isRemote ? `origin/${branch.name}` : branch.name
      );
    }

    if (state?.session.headCommitKey) {
      addLabel(state.session.headCommitKey, 'HEAD');
    }

    return labels;
  }, [state?.branches, state?.session.headCommitKey]);

  const commitByKey = useMemo(
    () => new Map((state?.commits || []).map((commit) => [commit.commitKey, commit])),
    [state?.commits]
  );
  const graphHeight = Math.max(320, 190 + laneNames.length * 96);
  const graphWidth = Math.max(820, 220 + (state?.commits.length || 1) * 110);
  const branchNameError = validateBranchName(branchName, state?.branches || []);

  useEffect(() => {
    if (!state) {
      return;
    }

    const firstOtherBranch =
      localBranches.find((branch) => branch.name !== state.session.currentBranch)
        ?.name || '';

    setCheckoutBranch((current) =>
      current && localBranches.some((branch) => branch.name === current)
        ? current
        : firstOtherBranch
    );
    setMergeSource((current) =>
      current && localBranches.some((branch) => branch.name === current)
        ? current
        : firstOtherBranch
    );
    setMergeTarget((current) =>
      current && localBranches.some((branch) => branch.name === current)
        ? current
        : state.session.currentBranch
    );
  }, [localBranches, state]);

  async function runAction(
    path: string,
    body: Record<string, unknown> = {},
    successFallback = 'Saved.'
  ) {
    setIsBusy(true);
    setError('');

    try {
      const nextState = await gitRequest<GitSimulatorState>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setState(nextState);
      setMessage(nextState.notice || nextState.events[0]?.message || successFallback);
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : 'Could not update simulator.'
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCommit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      '/git-simulator/commit',
      { message: commitMessage || undefined },
      'Created local commit.'
    );
    setCommitMessage('');
  }

  async function handleCreateBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (branchNameError) {
      setError(branchNameError);
      return;
    }

    await runAction('/git-simulator/create-branch', { branchName });
    setIsBranchModalOpen(false);
    setBranchName('feature/new-work');
  }

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white/75 p-8 text-sm text-stone-500">
        Loading Git simulator.
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
        {error || 'Could not load Git simulator.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-8 shadow-sm shadow-stone-200/50">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-700">
          Git Simulator
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-950">
              Practice Git workflows with an isolated visual graph.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
              Each signed-in account has a private simulation. Commit, branch,
              push, pull, merge, and undo actions without running real Git
              commands.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Current branch:{' '}
            <span className="font-semibold text-stone-950">
              {state.session.currentBranch}
            </span>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <form
            onSubmit={handleCommit}
            className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Commit
            </p>
            <input
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Commit message"
              className="mt-4 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="mt-3 w-full rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
            >
              Commit
            </button>
          </form>

          <div className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Branches
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(true)}
                disabled={isBusy}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Create branch
              </button>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <select
                  value={checkoutBranch}
                  onChange={(event) => setCheckoutBranch(event.target.value)}
                  className="h-11 min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none"
                >
                  <option value="">Choose branch</option>
                  {localBranches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    void runAction('/git-simulator/checkout', {
                      branchName: checkoutBranch,
                    })
                  }
                  disabled={isBusy || !checkoutBranch}
                  className="rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-700 disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Sync and merge
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void runAction('/git-simulator/push')}
                disabled={isBusy}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Push
              </button>
              <button
                type="button"
                onClick={() => void runAction('/git-simulator/pull')}
                disabled={isBusy}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Pull
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              <select
                value={mergeSource}
                onChange={(event) => setMergeSource(event.target.value)}
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none"
              >
                <option value="">Source branch</option>
                {localBranches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <select
                value={mergeTarget}
                onChange={(event) => setMergeTarget(event.target.value)}
                className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none"
              >
                {localBranches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    into {branch.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  void runAction('/git-simulator/merge', {
                    sourceBranch: mergeSource,
                    targetBranch: mergeTarget,
                  })
                }
                disabled={isBusy || !mergeSource || !mergeTarget}
                className="rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                Merge
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Session controls
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => void runAction('/git-simulator/undo')}
                disabled={isBusy}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset this Git simulation?')) {
                    void runAction('/git-simulator/reset');
                  }
                }}
                disabled={isBusy}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Clean all Git simulator history and start a new simulation? This removes the event log and cannot be undone.'
                    )
                  ) {
                    void runAction(
                      '/git-simulator/clear-history',
                      {},
                      'Started a new simulation.'
                    );
                  }
                }}
                disabled={isBusy}
                className="rounded-xl border border-stone-300 bg-stone-950 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                Clean all history
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Branch pointers
            </p>
            <div className="mt-4 space-y-2 text-sm">
              {localBranches.map((branch) => (
                <p key={branch.name} className="flex justify-between gap-3">
                  <span className="truncate text-stone-600">{branch.name}</span>
                  <span className="font-semibold text-stone-950">
                    {branch.commitKey}
                  </span>
                </p>
              ))}
              {remoteBranches.map((branch) => (
                <p key={`remote-${branch.name}`} className="flex justify-between gap-3">
                  <span className="truncate text-sky-700">origin/{branch.name}</span>
                  <span className="font-semibold text-stone-950">
                    {branch.commitKey}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <div className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                  Commit graph
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Commit nodes show author colors, timestamps, branch labels,
                  remote labels, and HEAD.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-stone-100 bg-stone-50">
              <svg
                role="img"
                aria-label="Visual Git commit graph"
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                className="min-w-full"
                style={{ width: graphWidth, height: graphHeight }}
              >
                {laneNames.map((lane, laneIndex) => (
                  <g key={lane}>
                    <line
                      x1="48"
                      y1={commitCoordinates({} as GitCommit, 0, laneIndex).y}
                      x2={graphWidth - 48}
                      y2={commitCoordinates({} as GitCommit, 0, laneIndex).y}
                      stroke={lane === 'main' ? '#e7e5e4' : '#fde68a'}
                      strokeWidth="2"
                    />
                    <text
                      x="20"
                      y={commitCoordinates({} as GitCommit, 0, laneIndex).y + 4}
                      className="fill-stone-400 text-[11px] font-semibold"
                    >
                      {lane}
                    </text>
                  </g>
                ))}

                {state.commits.flatMap((commit, commitIndex) => {
                  const laneIndex = Math.max(0, laneNames.indexOf(commit.branchName));
                  const from = commitCoordinates(commit, commitIndex, laneIndex);

                  return commit.parentKeys.map((parentKey) => {
                    const parent = commitByKey.get(parentKey);

                    if (!parent) {
                      return null;
                    }

                    const parentIndex = state.commits.findIndex(
                      (current) => current.commitKey === parent.commitKey
                    );
                    const parentLaneIndex = Math.max(
                      0,
                      laneNames.indexOf(parent.branchName)
                    );
                    const to = commitCoordinates(parent, parentIndex, parentLaneIndex);

                    return (
                      <line
                        key={`${parentKey}-${commit.commitKey}`}
                        x1={to.x}
                        y1={to.y}
                        x2={from.x}
                        y2={from.y}
                        stroke={commit.parentKeys.length > 1 ? '#d97706' : '#78716c'}
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    );
                  });
                })}

                {state.commits.map((commit, commitIndex) => {
                  const laneIndex = Math.max(0, laneNames.indexOf(commit.branchName));
                  const { x, y } = commitCoordinates(commit, commitIndex, laneIndex);
                  const labels = branchLabels.get(commit.commitKey) || [];
                  const authorColor = commit.createdBy?.avatarColor || '#F59E0B';

                  return (
                    <g key={commit.commitKey}>
                      <circle
                        cx={x}
                        cy={y}
                        r="15"
                        fill="#1c1917"
                        stroke={authorColor}
                        strokeWidth="5"
                      />
                      <circle cx={x + 13} cy={y - 13} r="5" fill={authorColor} />
                      <text
                        x={x}
                        y={y + 38}
                        textAnchor="middle"
                        className="fill-stone-700 text-[11px] font-semibold"
                      >
                        {commit.commitKey}
                      </text>
                      <text
                        x={x}
                        y={y + 54}
                        textAnchor="middle"
                        className="fill-stone-400 text-[10px]"
                      >
                        {getInitials(commit.createdBy)} · {formatTime(commit.createdAt)}
                      </text>
                      <text
                        x={x}
                        y={y + 70}
                        textAnchor="middle"
                        className="fill-stone-500 text-[10px]"
                      >
                        {commit.message.slice(0, 24)}
                      </text>
                      <title>
                        {commit.commitKey} — {commit.message} —{' '}
                        {commit.createdBy?.displayName ||
                          commit.createdBy?.username ||
                          'Unknown'}{' '}
                        — {formatTime(commit.createdAt)}
                      </title>
                      {labels.map((label, index) => (
                        <g key={label}>
                          <rect
                            x={x - 48}
                            y={y - 58 - index * 24}
                            width="96"
                            height="19"
                            rx="9.5"
                            fill={label === 'HEAD' ? '#0f172a' : '#fff'}
                            stroke={label.startsWith('origin') ? '#38bdf8' : '#d6d3d1'}
                          />
                          <text
                            x={x}
                            y={y - 44 - index * 24}
                            textAnchor="middle"
                            className={`text-[10px] font-semibold ${
                              label === 'HEAD' ? 'fill-white' : 'fill-stone-700'
                            }`}
                          >
                            {label}
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-stone-200 bg-white/85 p-5 shadow-sm shadow-stone-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Event log
            </p>
            <div className="mt-4 space-y-2">
              {state.events.length ? (
                state.events.map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600 md:grid-cols-[auto_auto_auto_minmax(0,1fr)] md:items-center"
                  >
                    <span className="text-xs text-stone-500">
                      {formatTime(event.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-stone-800">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: event.user?.avatarColor || '#F59E0B',
                        }}
                      />
                      {event.user?.displayName || event.user?.username || 'User'}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {event.action}
                    </span>
                    <span>{event.message}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-sm text-stone-500">
                  No history for this simulation yet.
                </div>
              )}
            </div>
          </div>
        </main>
      </section>

      {isBranchModalOpen ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-stone-950/30 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateBranch}
            className="w-full max-w-md rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-900/20"
          >
            <h2 className="text-lg font-semibold tracking-tight text-stone-950">
              Create branch
            </h2>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Branch name
              <input
                autoFocus
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm normal-case tracking-normal text-stone-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              />
            </label>
            {branchNameError ? (
              <p className="mt-2 text-xs text-rose-700">{branchNameError}</p>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                The new branch is created from HEAD and checked out immediately.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(branchNameError) || isBusy}
                className="rounded-xl bg-stone-950 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                Create branch
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
