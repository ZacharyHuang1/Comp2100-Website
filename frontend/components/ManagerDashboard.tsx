'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

import { DocumentationWorkspace } from '@/components/documentation/DocumentationWorkspace';
import { API_BASE_URL } from '@/lib/config';

type AdminCategory = {
  id: string;
  name: string;
  slug: string | null;
  parent_id: string | null;
  topic_count?: number;
  child_count?: number;
};

type AdminTopic = {
  id: string;
  title: string;
  slug: string | null;
  categoryId: string;
  visibility?: 'public' | 'internal';
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
  contentCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type AdminContent = {
  id: string;
  topicId: string;
  query: string;
  code: string | null;
  explanation: string | null;
  complexity: string | null;
  uml?: string | null;
  visibility?: 'public' | 'internal';
  topicVisibility?: 'public' | 'internal';
  topic: {
    id: string;
    title: string;
    slug: string | null;
  };
  category: {
    id: string;
    name: string;
    slug: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
};

type AdminVariant = {
  id: string;
  topicId: string;
  parentContentId: string | null;
  label: string;
  instruction?: string | null;
  code: string | null;
  explanation: string | null;
  complexity: string | null;
  uml?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'user' | 'manager' | 'root_manager' | string;
  status: 'active' | 'disabled' | string;
  notes: string;
  avatarColor: string;
  accentColor?: string;
  todoListCount: number;
  todoTaskCount: number;
  protected: boolean;
  hasPassword?: boolean;
  passwordSetAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryNode = AdminCategory & {
  children: CategoryNode[];
};

type CategoryForm = {
  name: string;
  parentId: string;
};

type TopicForm = {
  title: string;
  categoryId: string;
};

type ContentForm = {
  title: string;
  categoryId: string;
  topicId: string;
  query: string;
  code: string;
  explanation: string;
  complexity: string;
  uml: string;
};

type VariantForm = {
  label: string;
  code: string;
  explanation: string;
  complexity: string;
  uml: string;
};

type UserForm = {
  displayName: string;
  email: string;
  role: string;
  status: string;
  notes: string;
  avatarColor: string;
};

type DrawerState =
  | { type: 'category'; item: AdminCategory; form: CategoryForm }
  | { type: 'topic'; item: AdminTopic; form: TopicForm }
  | { type: 'content'; item: AdminContent; form: ContentForm }
  | { type: 'variant'; item: AdminVariant; form: VariantForm }
  | { type: 'user'; item: AdminUser; form: UserForm }
  | null;

type CreatePanel =
  | 'category'
  | 'topic'
  | 'content'
  | 'upload'
  | 'import'
  | 'user'
  | null;

type AuthState = 'checking' | 'logged_out' | 'logged_in';

type SelectedItem =
  | { type: 'folder'; id: string }
  | { type: 'topic'; id: string; topicId: string }
  | { type: 'content'; id: string; topicId: string; contentId: string }
  | { type: 'variant'; id: string; topicId: string; variantId: string }
  | { type: 'user'; id: string; userId: string }
  | null;

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers:
      options.body instanceof FormData
        ? options.headers
        : {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed: ${path}`);
  }

  return payload as T;
}

function buildCategoryTree(categories: AdminCategory[]) {
  const nodes = new Map<string, CategoryNode>();

  for (const category of categories) {
    nodes.set(category.id, {
      ...category,
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: CategoryNode[]) => {
    items.sort((left, right) => left.name.localeCompare(right.name));
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);
  return roots;
}

function flattenCategoryTree(
  nodes: CategoryNode[],
  depth = 0
): Array<{ category: CategoryNode; depth: number }> {
  return nodes.flatMap((node) => [
    { category: node, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ]);
}

function getCategoryAncestorIds(categoryId: string, categories: AdminCategory[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const ancestors: string[] = [];
  let current = categoryById.get(categoryId);
  const visited = new Set<string>();

  while (current?.parent_id && !visited.has(current.parent_id)) {
    visited.add(current.parent_id);
    ancestors.unshift(current.parent_id);
    current = categoryById.get(current.parent_id);
  }

  return ancestors;
}

function getDefaultExpandedCategoryIds(categories: AdminCategory[]) {
  return categories
    .filter((category) =>
      ['code bases', 'comp2100 minilab'].includes(category.name.toLowerCase())
    )
    .map((category) => category.id);
}

function getCodePreview(code: string | null) {
  if (!code?.trim()) {
    return 'No code stored.';
  }

  const preview = code
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 4)
    .join('\n');

  return preview.length > 360 ? `${preview.slice(0, 360)}...` : preview;
}

function getDescendantCategoryIds(categoryId: string, categories: AdminCategory[]) {
  const descendants = new Set<string>();
  const visit = (parentId: string) => {
    for (const category of categories) {
      if (category.parent_id === parentId && !descendants.has(category.id)) {
        descendants.add(category.id);
        visit(category.id);
      }
    }
  };

  visit(categoryId);
  return descendants;
}

function compactText(value: string | null, fallback: string) {
  const text = value?.trim();

  if (!text) {
    return fallback;
  }

  return text.length > 160 ? `${text.slice(0, 160)}...` : text;
}

function getCategoryPathNames(categoryId: string, categories: AdminCategory[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const names: string[] = [];
  let currentId = categoryId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const category = categoryById.get(currentId);

    if (!category) {
      break;
    }

    names.unshift(category.name);
    currentId = category.parent_id || '';
  }

  return names;
}

function getTaskSortKey(title: string) {
  const match = title.match(/^(DS|PD|DP)(\d{1,3})\b/i);

  if (!match) {
    return null;
  }

  const prefixOrder: Record<string, number> = {
    DS: 0,
    PD: 1,
    DP: 2,
  };

  return {
    prefixRank: prefixOrder[match[1].toUpperCase()] ?? 99,
    number: Number(match[2]),
  };
}

function ManagerChevron({
  open,
  visible,
}: {
  open: boolean;
  visible: boolean;
}) {
  if (!visible) {
    return <span className="h-4 w-4 shrink-0" aria-hidden="true" />;
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0 text-stone-400"
      fill="none"
    >
      <path
        d={open ? 'm4.5 6 3.5 3.5L11.5 6' : 'M6 4.5 9.5 8 6 11.5'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function ManagerFolderIcon({
  open,
  selected,
}: {
  open: boolean;
  selected: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 ${
        selected ? 'text-amber-200' : 'text-amber-700'
      }`}
      fill="none"
    >
      <path
        d={
          open
            ? 'M3.75 6.25h4.06l1.25 1.5h7.19c.69 0 1.25.56 1.25 1.25v5.5c0 .69-.56 1.25-1.25 1.25H3.75c-.69 0-1.25-.56-1.25-1.25v-7c0-.69.56-1.25 1.25-1.25Z'
            : 'M2.5 6.5c0-.69.56-1.25 1.25-1.25h3.91c.37 0 .71.16.95.44l.96 1.12h6.68c.69 0 1.25.56 1.25 1.25v6.44c0 .69-.56 1.25-1.25 1.25H3.75c-.69 0-1.25-.56-1.25-1.25v-8Z'
        }
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.45"
      />
    </svg>
  );
}

export function ManagerDashboard() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [contents, setContents] = useState<AdminContent[]>([]);
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedContentId, setSelectedContentId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicCategoryId, setTopicCategoryId] = useState('');
  const [contentTopicId, setContentTopicId] = useState('');
  const [contentQuery, setContentQuery] = useState('');
  const [contentCode, setContentCode] = useState('');
  const [contentExplanation, setContentExplanation] = useState('');
  const [contentComplexity, setContentComplexity] = useState('');
  const [contentUml, setContentUml] = useState('');
  const [uploadCategoryId, setUploadCategoryId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [importPath, setImportPath] = useState('imports/app');
  const [importName, setImportName] = useState('COMP2100 MiniLab');
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newStatus, setNewStatus] = useState('active');
  const [newNotes, setNewNotes] = useState('');
  const [newAvatarColor, setNewAvatarColor] = useState('#F59E0B');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordResetUserId, setPasswordResetUserId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [createPanel, setCreatePanel] = useState<CreatePanel>(null);
  const [isDocumentationManagerOpen, setIsDocumentationManagerOpen] =
    useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const categoryOptions = useMemo(
    () => flattenCategoryTree(categoryTree),
    [categoryTree]
  );
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );
  const getTopicSortTime = (topic: AdminTopic) => {
    const topicTime = Math.max(
      Date.parse(topic.updatedAt || '') || 0,
      Date.parse(topic.createdAt || '') || 0
    );
    const contentTime = contents
      .filter((content) => content.topicId === topic.id)
      .reduce(
        (latest, content) =>
          Math.max(
            latest,
            Date.parse(content.updatedAt || '') || 0,
            Date.parse(content.createdAt || '') || 0
          ),
        0
      );
    const variantTime = variants
      .filter((variant) => variant.topicId === topic.id)
      .reduce(
        (latest, variant) =>
          Math.max(
            latest,
            Date.parse(variant.updatedAt || '') || 0,
            Date.parse(variant.createdAt || '') || 0
          ),
        0
      );

    return Math.max(topicTime, contentTime, variantTime);
  };
  const selectedCategoryTopics = useMemo(
    () => {
      const categoryPathNames = getCategoryPathNames(
        selectedCategoryId,
        categories
      ).map((name) => name.toLowerCase());
      const isNotes =
        categoryPathNames.includes('notes') ||
        categoryPathNames.includes('reference notes');
      const isMockHackathon = categoryPathNames.includes('mock_hackathon');

      return topics
        .filter((topic) => topic.category.id === selectedCategoryId)
        .sort((left, right) => {
          if (isNotes) {
            const timeDifference =
              getTopicSortTime(right) - getTopicSortTime(left);

            if (timeDifference) {
              return timeDifference;
            }
          }

          if (isMockHackathon) {
            const leftTaskKey = getTaskSortKey(left.title);
            const rightTaskKey = getTaskSortKey(right.title);

            if (leftTaskKey && rightTaskKey) {
              const prefixDifference =
                leftTaskKey.prefixRank - rightTaskKey.prefixRank;

              if (prefixDifference) {
                return prefixDifference;
              }

              const numberDifference = leftTaskKey.number - rightTaskKey.number;

              if (numberDifference) {
                return numberDifference;
              }
            }

            if (leftTaskKey || rightTaskKey) {
              return leftTaskKey ? -1 : 1;
            }
          }

          const timeDifference = getTopicSortTime(right) - getTopicSortTime(left);

          return (
            timeDifference ||
            left.title.localeCompare(right.title, undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          );
        });
    },
    [selectedCategoryId, categories, topics, contents, variants]
  );
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId);
  const selectedTopicContents = contents.filter(
    (content) => content.topicId === selectedTopicId
  );
  const selectedTopicVariants = variants.filter(
    (variant) => variant.topicId === selectedTopicId
  );
  const selectedContent = contents.find(
    (content) => content.id === selectedContentId
  );
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedVariantId
  );
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const passwordResetUser = users.find((user) => user.id === passwordResetUserId);
  const visibleUsers = users.filter((user) => {
    const filter = userFilter.trim().toLowerCase();

    if (!filter) {
      return true;
    }

    return [user.username, user.displayName, user.email, user.role, user.status]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(filter));
  });
  const inspectorTitle = selectedUser
    ? selectedUser.displayName || selectedUser.username
    : selectedVariant
      ? selectedVariant.label
      : selectedContent
        ? selectedContent.query || selectedContent.topic.title
        : selectedTopic
          ? selectedTopic.title
          : selectedCategory
            ? selectedCategory.name
            : 'Nothing selected';
  useEffect(() => {
    setExpandedCategoryIds((currentIds) => {
      const nextIds = new Set(currentIds);
      let changed = false;

      for (const categoryId of getDefaultExpandedCategoryIds(categories)) {
        if (!nextIds.has(categoryId)) {
          nextIds.add(categoryId);
          changed = true;
        }
      }

      if (selectedCategoryId) {
        for (const categoryId of getCategoryAncestorIds(selectedCategoryId, categories)) {
          if (!nextIds.has(categoryId)) {
            nextIds.add(categoryId);
            changed = true;
          }
        }
      }

      return changed ? nextIds : currentIds;
    });
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }

    setTopicCategoryId(selectedCategoryId);
    setUploadCategoryId(selectedCategoryId);
    setContentTopicId((currentTopicId) => {
      const currentTopicStillVisible = selectedCategoryTopics.some(
        (topic) => topic.id === currentTopicId
      );

      return currentTopicStillVisible
        ? currentTopicId
        : selectedCategoryTopics[0]?.id || '';
    });
  }, [selectedCategoryId, selectedCategoryTopics]);

  useEffect(() => {
    if (selectedTopicId && !topics.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId('');
      setSelectedContentId('');
      setSelectedVariantId('');
      if (
        selectedItem?.type === 'topic' ||
        selectedItem?.type === 'content' ||
        selectedItem?.type === 'variant'
      ) {
        setSelectedItem(null);
      }
      return;
    }

    if (
      selectedContentId &&
      !contents.some((content) => content.id === selectedContentId)
    ) {
      setSelectedContentId('');
      if (selectedItem?.type === 'content') {
        setSelectedItem(selectedTopicId ? { type: 'topic', id: selectedTopicId, topicId: selectedTopicId } : null);
      }
    }

    if (
      selectedVariantId &&
      !variants.some((variant) => variant.id === selectedVariantId)
    ) {
      setSelectedVariantId('');
      if (selectedItem?.type === 'variant') {
        setSelectedItem(selectedTopicId ? { type: 'topic', id: selectedTopicId, topicId: selectedTopicId } : null);
      }
    }

    if (selectedUserId && !users.some((user) => user.id === selectedUserId)) {
      setSelectedUserId('');

      if (selectedItem?.type === 'user') {
        setSelectedItem(null);
      }
    }
  }, [
    contents,
    selectedItem,
    selectedContentId,
    selectedTopicId,
    selectedUserId,
    selectedVariantId,
    topics,
    users,
    variants,
  ]);

  async function refreshData(preferredCategoryId = selectedCategoryId) {
    const [
      nextCategories,
      nextTopics,
      nextContents,
      nextUsers,
    ] =
      await Promise.all([
        adminFetch<AdminCategory[]>('/admin/categories'),
        adminFetch<AdminTopic[]>('/admin/topics'),
        adminFetch<AdminContent[]>('/admin/contents'),
        adminFetch<AdminUser[]>('/admin/users'),
      ]);
    const nextVariants = (
      await Promise.all(
        nextTopics.map((topic) =>
          adminFetch<AdminVariant[]>(`/admin/topics/${topic.id}/variants`)
        )
      )
    ).flat();
    const nextCategoryId =
      nextCategories.find((category) => category.id === preferredCategoryId)?.id ||
      nextCategories[0]?.id ||
      '';
    const nextSelectedTopics = nextTopics.filter(
      (topic) => topic.category.id === nextCategoryId
    );

    setCategories(nextCategories);
    setTopics(nextTopics);
    setContents(nextContents);
    setUsers(nextUsers);
    setVariants(nextVariants);
    setSelectedCategoryId(nextCategoryId);
    setTopicCategoryId((currentCategoryId) =>
      currentCategoryId || nextCategoryId
    );
    setUploadCategoryId((currentCategoryId) =>
      currentCategoryId || nextCategoryId
    );
    setContentTopicId((currentTopicId) => {
      const currentTopicStillVisible = nextSelectedTopics.some(
        (topic) => topic.id === currentTopicId
      );

      return currentTopicStillVisible
        ? currentTopicId
        : nextSelectedTopics[0]?.id || '';
    });
    setSelectedTopicId((currentTopicId) => {
      const currentTopicStillVisible = nextSelectedTopics.some(
        (topic) => topic.id === currentTopicId
      );

      return currentTopicStillVisible ? currentTopicId : '';
    });
  }

  async function runAction(
    action: () => Promise<void>,
    successMessage: string,
    failureMessage = 'Request failed.',
    preferredCategoryId = selectedCategoryId
  ) {
    setIsBusy(true);
    setMessage('');
    setError('');

    try {
      await action();
      await refreshData(preferredCategoryId);
      setMessage(successMessage);
    } catch (actionError) {
      console.error(actionError);
      setError(
        actionError instanceof Error ? actionError.message : failureMessage
      );
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await adminFetch<{ authenticated: boolean }>('/admin/me');

        if (session.authenticated) {
          setAuthState('logged_in');
          await refreshData();
          return;
        }

        setAuthState('logged_out');
      } catch (_error) {
        setAuthState('logged_out');
      }
    }

    void checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError('');

    try {
      await adminFetch('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuthState('logged_in');
      await refreshData();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Login failed'
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogout() {
    await adminFetch('/admin/logout', { method: 'POST' });
    setAuthState('logged_out');
    setPassword('');
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage('');
    setError('');

    try {
      const createdCategory = await adminFetch<AdminCategory>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: categoryName,
          parentId: parentCategoryId || null,
        }),
      });

      setCategoryName('');
      setParentCategoryId('');
      setCreatePanel(null);
      await refreshData(createdCategory.id);
      setMessage('Saved.');
    } catch (createError) {
      console.error(createError);
      setError('Could not save category.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreateTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetCategoryId = topicCategoryId || selectedCategoryId;

    if (!targetCategoryId) {
      setError('Select a category first.');
      return;
    }

    await runAction(
      async () => {
        await adminFetch('/admin/topics', {
          method: 'POST',
          body: JSON.stringify({
            title: topicTitle,
            categoryId: targetCategoryId,
          }),
        });
        setTopicTitle('');
        setSelectedCategoryId(targetCategoryId);
        setCreatePanel(null);
      },
      'Saved.',
      'Could not save topic.',
      targetCategoryId
    );
  }

  async function handleCreateContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCategoryId) {
      setError('Select a category first.');
      return;
    }

    if (!contentTopicId) {
      setError('Select a topic first.');
      return;
    }

    await runAction(async () => {
      await adminFetch('/admin/contents', {
        method: 'POST',
        body: JSON.stringify({
          topicId: contentTopicId,
          query: contentQuery,
          code: contentCode,
          explanation: contentExplanation,
          complexity: contentComplexity,
          uml: contentUml,
        }),
      });
      setContentQuery('');
      setContentCode('');
      setContentExplanation('');
      setContentComplexity('');
      setContentUml('');
      setCreatePanel(null);
    }, 'Saved.', 'Could not save content.');
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    await runAction(
      async () => {
        const created = await adminFetch<AdminUser>('/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            username: newUsername,
            displayName: newDisplayName,
            email: newEmail,
            role: newRole,
            status: newStatus,
            notes: newNotes,
            avatarColor: newAvatarColor,
            accentColor: newAvatarColor,
            password: newPassword,
          }),
        });

        setNewUsername('');
        setNewDisplayName('');
        setNewEmail('');
        setNewRole('user');
        setNewStatus('active');
        setNewNotes('');
        setNewAvatarColor('#F59E0B');
        setNewPassword('');
        setNewPasswordConfirm('');
        setCreatePanel(null);
        setSelectedUserId(created.id);
        setSelectedItem({ type: 'user', id: created.id, userId: created.id });
      },
      'Saved.',
      'Could not save user.'
    );
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordResetUserId) {
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    if (resetPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    await runAction(
      async () => {
        await adminFetch(`/admin/users/${passwordResetUserId}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ password: resetPassword }),
        });
        setPasswordResetUserId('');
        setResetPassword('');
        setResetPasswordConfirm('');
      },
      'Password updated.',
      'Could not update password.'
    );
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetCategoryId = uploadCategoryId || selectedCategoryId;

    if (!targetCategoryId) {
      setError('Select a category first.');
      return;
    }

    await runAction(
      async () => {
        if (!uploadFile) {
          throw new Error('Choose a .java file.');
        }

        const formData = new FormData();
        formData.append('categoryId', targetCategoryId);
        formData.append('file', uploadFile);

        await adminFetch('/admin/upload-java', {
          method: 'POST',
          body: formData,
        });
        setUploadFile(null);
        setUploadInputKey((currentKey) => currentKey + 1);
        setCreatePanel(null);
      },
      'Uploaded.',
      'Could not upload file.',
      targetCategoryId
    );
  }

  async function handleImportCodebase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction(async () => {
      await adminFetch('/admin/import-codebase', {
        method: 'POST',
        body: JSON.stringify({
          path: importPath,
          name: importName,
        }),
      });
      setCreatePanel(null);
    }, 'Uploaded.', 'Could not import codebase.');
  }

  function openCategoryDrawer(category: AdminCategory) {
    setDrawer({
      type: 'category',
      item: category,
      form: {
        name: category.name,
        parentId: category.parent_id || '',
      },
    });
  }

  function openTopicDrawer(topic: AdminTopic) {
    setDrawer({
      type: 'topic',
      item: topic,
      form: {
        title: topic.title,
        categoryId: topic.category.id,
      },
    });
  }

  function openContentDrawer(content: AdminContent) {
    setDrawer({
      type: 'content',
      item: content,
      form: {
        title: content.topic.title,
        categoryId: content.category.id,
        topicId: content.topicId,
        query: content.query,
        code: content.code || '',
        explanation: content.explanation || '',
        complexity: content.complexity || '',
        uml: content.uml || '',
      },
    });
  }

  function openVariantDrawer(variant: AdminVariant) {
    setDrawer({
      type: 'variant',
      item: variant,
      form: {
        label: variant.label,
        code: variant.code || '',
        explanation: variant.explanation || '',
        complexity: variant.complexity || '',
        uml: variant.uml || '',
      },
    });
  }

  function openUserDrawer(user: AdminUser) {
    setDrawer({
      type: 'user',
      item: user,
      form: {
        displayName: user.displayName,
        email: user.email,
        role: user.role === 'root_manager' ? 'root_manager' : user.role || 'user',
        status: user.status || 'active',
        notes: user.notes || '',
        avatarColor: user.accentColor || user.avatarColor || '#F59E0B',
      },
    });
  }

  async function saveDrawer() {
    if (!drawer) {
      return;
    }

    setIsBusy(true);
    setMessage('');
    setError('');

    try {
      if (drawer.type === 'category') {
        await adminFetch(`/admin/categories/${drawer.item.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: drawer.form.name,
            parentId: drawer.form.parentId || null,
          }),
        });
      }

      if (drawer.type === 'topic') {
        await adminFetch(`/admin/topics/${drawer.item.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: drawer.form.title,
            categoryId: drawer.form.categoryId,
          }),
        });
      }

      if (drawer.type === 'content') {
        await adminFetch(`/admin/contents/${drawer.item.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: drawer.form.title,
            categoryId: drawer.form.categoryId,
            topicId: drawer.form.topicId,
            query: drawer.form.query,
            code: drawer.form.code,
            explanation: drawer.form.explanation,
            complexity: drawer.form.complexity,
            uml: drawer.form.uml,
          }),
        });
      }

      if (drawer.type === 'variant') {
        await adminFetch(`/admin/variants/${drawer.item.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            label: drawer.form.label,
            code: drawer.form.code,
            explanation: drawer.form.explanation,
            complexity: drawer.form.complexity,
            uml: drawer.form.uml,
          }),
        });
      }

      if (drawer.type === 'user') {
        await adminFetch(`/admin/users/${drawer.item.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            displayName: drawer.form.displayName,
            email: drawer.form.email,
            role: drawer.form.role,
            status: drawer.form.status,
            notes: drawer.form.notes,
            avatarColor: drawer.form.avatarColor,
            accentColor: drawer.form.avatarColor,
          }),
        });
      }

      const nextSelectedCategoryId =
        drawer.type === 'category'
          ? drawer.item.id
          : drawer.type === 'topic'
            ? drawer.form.categoryId
            : drawer.type === 'content'
              ? drawer.form.categoryId
              : selectedCategoryId;

      setDrawer(null);
      await refreshData(nextSelectedCategoryId);
      setMessage('Saved.');
    } catch (saveError) {
      console.error(saveError);
      setError('Could not save item.');
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteItem(
    label: string,
    path: string,
    successMessage = 'Deleted.'
  ) {
    if (!window.confirm(`Delete ${label}?`)) {
      return;
    }

    await runAction(async () => {
      await adminFetch(path, { method: 'DELETE' });
    }, successMessage, 'Could not delete this item.');
  }

  function selectCategory(categoryId: string) {
    setSelectedItem({ type: 'folder', id: categoryId });
    setSelectedCategoryId(categoryId);
    setSelectedTopicId('');
    setSelectedContentId('');
    setSelectedVariantId('');
    setSelectedUserId('');
  }

  function selectTopic(topicId: string) {
    const topic = topics.find((currentTopic) => currentTopic.id === topicId);

    if (topic) {
      setSelectedCategoryId(topic.category.id);
    }

    setSelectedTopicId(topicId);
    setSelectedItem({ type: 'topic', id: topicId, topicId });
    setSelectedContentId('');
    setSelectedVariantId('');
    setSelectedUserId('');
  }

  function selectContent(contentId: string) {
    const content = contents.find((currentContent) => currentContent.id === contentId);

    if (content) {
      setSelectedCategoryId(content.category.id);
      setSelectedTopicId(content.topicId);
    }

    setSelectedContentId(contentId);
    setSelectedItem({
      type: 'content',
      id: contentId,
      topicId: content?.topicId || '',
      contentId,
    });
    setSelectedVariantId('');
    setSelectedUserId('');
  }

  function selectVariant(variantId: string) {
    const variant = variants.find((currentVariant) => currentVariant.id === variantId);

    if (variant) {
      const topic = topics.find((currentTopic) => currentTopic.id === variant.topicId);

      if (topic) {
        setSelectedCategoryId(topic.category.id);
      }

      setSelectedTopicId(variant.topicId);
    }

    setSelectedVariantId(variantId);
    setSelectedItem({
      type: 'variant',
      id: variantId,
      topicId: variant?.topicId || '',
      variantId,
    });
    setSelectedContentId('');
    setSelectedUserId('');
  }

  function selectUser(userId: string) {
    setSelectedUserId(userId);
    setSelectedItem({ type: 'user', id: userId, userId });
    setSelectedTopicId('');
    setSelectedContentId('');
    setSelectedVariantId('');
  }

  function openCreatePanel(panel: CreatePanel) {
    if (panel === 'category') {
      setCategoryName('');
      setParentCategoryId(selectedCategoryId);
    }

    if (panel === 'topic') {
      setTopicTitle('');
      setTopicCategoryId(selectedCategoryId);
    }

    if (panel === 'content') {
      setContentTopicId(selectedTopicId || selectedCategoryTopics[0]?.id || '');
      setContentQuery('');
      setContentCode('');
      setContentExplanation('');
      setContentComplexity('');
      setContentUml('');
    }

    if (panel === 'upload') {
      setUploadCategoryId(selectedCategoryId);
      setUploadFile(null);
      setUploadInputKey((currentKey) => currentKey + 1);
    }

    if (panel === 'user') {
      setNewUsername('');
      setNewDisplayName('');
      setNewEmail('');
      setNewRole('user');
      setNewStatus('active');
      setNewNotes('');
      setNewPassword('');
      setNewPasswordConfirm('');
    }

    setCreatePanel(panel);
  }

  function renderCategoryNode(node: CategoryNode, depth = 0): ReactNode {
    const isSelected = node.id === selectedCategoryId;
    const normalizedFilter = categoryFilter.trim().toLowerCase();
    const nodeMatches = node.name.toLowerCase().includes(normalizedFilter);
    const childMatches = node.children.some((childNode) =>
      JSON.stringify(childNode).toLowerCase().includes(normalizedFilter)
    );

    if (normalizedFilter && !nodeMatches && !childMatches) {
      return null;
    }

    const hasChildren = node.children.length > 0;
    const isOpen = normalizedFilter || expandedCategoryIds.has(node.id);

    const toggleCategory = () => {
      setExpandedCategoryIds((currentIds) => {
        const nextIds = new Set(currentIds);

        if (nextIds.has(node.id)) {
          nextIds.delete(node.id);
        } else {
          nextIds.add(node.id);
        }

        return nextIds;
      });
    };

    return (
      <div key={node.id}>
        <div
          className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
            isSelected
              ? 'bg-stone-900 text-white shadow-sm'
              : 'text-stone-700 hover:bg-stone-100'
          }`}
          style={{ paddingLeft: `${0.5 + depth * 0.85}rem` }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) {
                toggleCategory();
              }
            }}
            className="rounded p-0.5 hover:bg-black/5 disabled:hover:bg-transparent"
            disabled={!hasChildren}
            aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
          >
            <ManagerChevron open={Boolean(isOpen)} visible={hasChildren} />
          </button>
          <button
            type="button"
            onClick={() => selectCategory(node.id)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <ManagerFolderIcon open={Boolean(isOpen && hasChildren)} selected={isSelected} />
            <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
          </button>
          <span
            className={`rounded-full px-2 py-0.5 text-[0.65rem] ${
              isSelected ? 'bg-white/10 text-stone-200' : 'bg-white text-stone-500'
            }`}
          >
            {node.topic_count || 0}
          </span>
        </div>
        {isOpen
          ? node.children.map((childNode) => renderCategoryNode(childNode, depth + 1))
          : null}
      </div>
    );
  }

  function updateDrawerField(field: string, value: string) {
    setDrawer((currentDrawer) =>
      currentDrawer
        ? ({
            ...currentDrawer,
            form: {
              ...currentDrawer.form,
              [field]: value,
            },
          } as DrawerState)
        : currentDrawer
    );
  }

  function renderCategorySelect(
    value: string,
    onChange: (nextValue: string) => void,
    options: { includeEmpty?: boolean; emptyLabel?: string } = {}
  ) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
      >
        {options.includeEmpty ? (
          <option value="">{options.emptyLabel || 'No parent'}</option>
        ) : null}
        {categoryOptions.map(({ category, depth }) => (
          <option key={category.id} value={category.id}>
            {'  '.repeat(depth)}
            {category.name}
          </option>
        ))}
      </select>
    );
  }

  if (authState === 'checking') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8f5ee]">
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-sm text-stone-600">
          Loading...
        </div>
      </div>
    );
  }

  if (authState === 'logged_out') {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#f8f5ee] px-4">
        <form
          onSubmit={handleLogin}
          className="w-full rounded-lg border border-stone-200 bg-white p-8 shadow-sm"
          style={{ maxWidth: 448 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
            Manager
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-stone-950">
            Sign in
          </h1>

          <label className="mt-6 block text-sm font-medium text-stone-700">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-stone-900"
              autoComplete="username"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-stone-900"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

          <button
            disabled={isBusy}
            className="mt-6 w-full rounded-md bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-hidden bg-[#f6f2ea] text-stone-950">
      <div className="flex h-full flex-col">
        <header className="z-30 flex shrink-0 items-center justify-between border-b border-stone-200 bg-white/95 px-6 py-4 shadow-sm shadow-stone-200/40">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
              Manager
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Knowledge Base Control
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshData()}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Sign out
            </button>
          </div>
        </header>

        {message || error ? (
          <div className="shrink-0 border-b border-stone-200 bg-white px-6 py-3">
            {message ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
                {error}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden xl:grid-cols-[320px_minmax(520px,1fr)_420px]">
          <aside className="min-h-0 overflow-y-auto border-r border-stone-200 bg-white p-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-400">
                    Library
                  </p>
                  <h2 className="mt-1 text-base font-semibold">Folders</h2>
                </div>
                <button
                  type="button"
                  onClick={() => openCreatePanel('category')}
                  className="rounded-lg bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
                >
                  New
                </button>
              </div>
              <input
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                placeholder="Filter folders..."
                className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
              />
              <div className="mt-3 space-y-1">
                {categoryTree.map((category) => renderCategoryNode(category))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Documentation</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Manage guide spaces and posts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDocumentationManagerOpen(true)}
                  className="rounded-lg bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
                >
                  Manage
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Users</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Owners and manager permissions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreatePanel('user')}
                  className="rounded-lg bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
                >
                  New
                </button>
              </div>
              <input
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                placeholder="Filter users..."
                className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
              />
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {visibleUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => selectUser(user.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedUserId === user.id
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-white'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {user.displayName || user.username}
                      </span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-stone-600">
                        {user.role === 'root_manager'
                          ? 'Root'
                          : user.role === 'manager'
                            ? 'Manager'
                            : 'User'}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs opacity-70">
                      @{user.username} · {user.status}
                    </span>
                  </button>
                ))}
                {!visibleUsers.length ? (
                  <p className="px-1 py-2 text-sm text-stone-500">
                    No users found.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openCreatePanel('upload')}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Upload Java
              </button>
              <button
                type="button"
                onClick={() => openCreatePanel('import')}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Import
              </button>
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-5">
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                    Selected folder
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                    {selectedCategory?.name || 'Select a folder'}
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">
                    {selectedCategory
                      ? `${selectedCategoryTopics.length} file${selectedCategoryTopics.length === 1 ? '' : 's'} in this folder.`
                      : 'Choose a folder from the explorer to manage files.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!selectedCategory}
                    onClick={() => openCreatePanel('category')}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
                  >
                    New folder
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCategory}
                    onClick={() => openCreatePanel('topic')}
                    className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    New file
                  </button>
                  <button
                    type="button"
                    disabled={!selectedTopic}
                    onClick={() => openCreatePanel('content')}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
                  >
                    New content
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm shadow-stone-200/60">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_170px] border-b border-stone-100 bg-stone-50 px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-stone-400">
                <span>File</span>
                <span>Content</span>
                <span>Blocks</span>
                <span className="text-right">Actions</span>
              </div>
              {!selectedCategory ? (
                <div className="p-8 text-sm text-stone-500">
                  Select a folder to manage its files.
                </div>
              ) : selectedCategoryTopics.length === 0 ? (
                <div className="p-8 text-sm text-stone-500">
                  No files in this folder.
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {selectedCategoryTopics.map((topic) => {
                    const topicContents = contents.filter(
                      (content) => content.topicId === topic.id
                    );
                    const topicVariants = variants.filter(
                      (variant) => variant.topicId === topic.id
                    );
                    const isTopicSelected = topic.id === selectedTopicId;

                    return (
                      <div
                        key={topic.id}
                        className={`grid grid-cols-[minmax(0,1fr)_120px_120px_170px] items-center gap-3 px-4 py-3 transition ${
                          isTopicSelected ? 'bg-amber-50/70' : 'hover:bg-stone-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectTopic(topic.id)}
                          className="min-w-0 text-left"
                        >
                          <span className="block truncate text-sm font-semibold text-stone-950">
                            {topic.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 truncate text-xs text-stone-500">
                            <span className="truncate">{topic.category.name}</span>
                            {topic.visibility === 'internal' ? (
                              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-amber-800">
                                Internal
                              </span>
                            ) : null}
                          </span>
                        </button>
                        <span className="text-sm text-stone-600">
                          {topicContents.length}
                        </span>
                        <span className="flex items-center gap-2 text-sm text-stone-600">
                          <span>{topicVariants.length}</span>
                        </span>
                        <div className="flex justify-end gap-1.5">
                          <a
                            href={`/topic/${topic.id}`}
                            target="_blank"
                            className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-white"
                          >
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => openTopicDrawer(topic)}
                            className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void deleteItem(topic.title, `/admin/topics/${topic.id}`)
                            }
                            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto border-l border-stone-200 bg-white p-5">
            <div className="sticky top-0 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  Inspector
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {inspectorTitle}
                </h2>
              </div>

              {!selectedCategory && !selectedUser ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-500">
                  Select a folder or file to manage it.
                </div>
              ) : null}

              {selectedCategory && !selectedTopic && !selectedUser ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm text-stone-600">
                    {selectedCategory.topic_count || 0} direct files. Use the actions
                    below to edit this folder or create content inside it.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openCategoryDrawer(selectedCategory)}
                      className="rounded-xl bg-stone-950 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Edit folder
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteItem(
                          selectedCategory.name,
                          `/admin/categories/${selectedCategory.id}`
                        )
                      }
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedUser ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                        User
                      </p>
                      <p className="mt-2 text-sm font-semibold text-stone-900">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                selectedUser.accentColor ||
                                selectedUser.avatarColor ||
                                '#F59E0B',
                            }}
                          />
                          @{selectedUser.username}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {selectedUser.email || 'No email'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                        selectedUser.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-600">
                    <div className="rounded-xl bg-stone-50 p-3">
                      <p className="font-semibold text-stone-900">
                        {selectedUser.todoListCount}
                      </p>
                      <p>To-do lists</p>
                    </div>
                    <div className="rounded-xl bg-stone-50 p-3">
                      <p className="font-semibold text-stone-900">
                        {selectedUser.todoTaskCount}
                      </p>
                      <p>Tasks</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-stone-500">
                    Role:{' '}
                    <span className="font-semibold text-stone-700">
                      {selectedUser.role === 'root_manager'
                        ? 'Root manager'
                        : selectedUser.role}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    Login:{' '}
                    <span className="font-semibold text-stone-700">
                      {selectedUser.lastLoginAt
                        ? new Date(selectedUser.lastLoginAt).toLocaleString()
                        : 'Never'}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    Password:{' '}
                    <span className="font-semibold text-stone-700">
                      {selectedUser.hasPassword ? 'Set' : 'Not set'}
                    </span>
                  </p>
                  {selectedUser.notes ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-stone-500">
                      {selectedUser.notes}
                    </p>
                  ) : null}
                  {selectedUser.protected ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Root manager is protected.
                    </p>
                  ) : null}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openUserDrawer(selectedUser)}
                      className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Edit user
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordResetUserId(selectedUser.id);
                        setResetPassword('');
                        setResetPasswordConfirm('');
                      }}
                      className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700"
                    >
                      Reset password
                    </button>
                    {selectedUser.role === 'manager' ? (
                      <button
                        type="button"
                        disabled={selectedUser.protected}
                        onClick={() =>
                          void runAction(
                            () =>
                              adminFetch(
                                `/admin/users/${selectedUser.id}/revoke-manager`,
                                { method: 'POST' }
                              ),
                            'Saved.',
                            'Could not update user.'
                          )
                        }
                        className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        Revoke manager
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={selectedUser.protected}
                        onClick={() =>
                          void runAction(
                            () =>
                              adminFetch(
                                `/admin/users/${selectedUser.id}/grant-manager`,
                                { method: 'POST' }
                              ),
                            'Saved.',
                            'Could not update user.'
                          )
                        }
                        className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        Grant manager
                      </button>
                    )}
                    {selectedUser.status === 'disabled' ? (
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(
                            () =>
                              adminFetch(`/admin/users/${selectedUser.id}/enable`, {
                                method: 'POST',
                              }),
                            'Saved.',
                            'Could not update user.'
                          )
                        }
                        className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700"
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={selectedUser.protected}
                        onClick={() =>
                          void runAction(
                            () =>
                              adminFetch(`/admin/users/${selectedUser.id}/disable`, {
                                method: 'POST',
                              }),
                            'Saved.',
                            'Could not update user.'
                          )
                        }
                        className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-40"
                      >
                        Disable
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={selectedUser.protected}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete ${selectedUser.username} and all of their To-do and Documentation data? This cannot be undone.`
                          )
                        ) {
                          void runAction(
                            () =>
                              adminFetch(`/admin/users/${selectedUser.id}`, {
                                method: 'DELETE',
                              }),
                            'Deleted.',
                            'Could not delete user.'
                          );
                        }
                      }}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedContent ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    Selected content
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {selectedContent.query}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {selectedContent.topic.title} · {selectedContent.category.name}
                  </p>
                  <pre className="mt-3 max-h-40 overflow-hidden rounded-xl bg-stone-950 p-3 font-mono text-xs leading-5 text-stone-100">
                    {getCodePreview(selectedContent.code)}
                  </pre>
                  <p className="mt-3 text-xs text-stone-500">
                    {compactText(selectedContent.explanation, 'No explanation')}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    Complexity: {compactText(selectedContent.complexity, 'Not specified.')}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    UML: {selectedContent.uml?.trim() ? 'Present' : 'Empty'}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <a
                      href={`/topic/${selectedContent.topicId}`}
                      target="_blank"
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => openContentDrawer(selectedContent)}
                      className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteItem(
                          selectedContent.query,
                          `/admin/contents/${selectedContent.id}`
                        )
                      }
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedVariant ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Selected block
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">
                    {selectedVariant.label}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {selectedTopic?.title || 'Parent topic'}
                  </p>
                  <pre className="mt-3 max-h-36 overflow-hidden rounded-xl bg-white p-3 font-mono text-xs leading-5 text-stone-700">
                    {getCodePreview(selectedVariant.code)}
                  </pre>
                  <p className="mt-3 text-xs text-stone-500">
                    {compactText(selectedVariant.explanation, 'No explanation')}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <a
                      href={`/topic/${selectedVariant.topicId}`}
                      target="_blank"
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700"
                    >
                      Open
                    </a>
                    <button
                      type="button"
                      onClick={() => openVariantDrawer(selectedVariant)}
                      className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteItem(
                          selectedVariant.label,
                          `/admin/variants/${selectedVariant.id}`
                        )
                      }
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedTopic ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                      File
                    </p>
                    <p className="mt-2 text-sm text-stone-600">
                      {selectedTopicContents.length} content entries,{' '}
                      {selectedTopicVariants.length} blocks
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <a
                        href={`/topic/${selectedTopic.id}`}
                        target="_blank"
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-xs font-semibold text-stone-700"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => openTopicDrawer(selectedTopic)}
                        className="rounded-xl bg-stone-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteItem(
                            selectedTopic.title,
                            `/admin/topics/${selectedTopic.id}`
                          )
                        }
                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Content</h3>
                      <button
                        type="button"
                        onClick={() => openCreatePanel('content')}
                        className="rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold"
                      >
                        New
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedTopicContents.map((content) => (
                        <button
                          key={content.id}
                          type="button"
                          onClick={() => selectContent(content.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            selectedContentId === content.id
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-stone-200 bg-stone-50 hover:bg-white'
                          }`}
                        >
                          <span className="block truncate text-sm font-semibold">
                            {content.query}
                          </span>
                          <span className="mt-1 block truncate text-xs opacity-70">
                            {compactText(content.explanation, 'No explanation')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <h3 className="text-sm font-semibold">Blocks</h3>
                    <div className="mt-3 space-y-2">
                      {selectedTopicVariants.length ? (
                        selectedTopicVariants.map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => selectVariant(variant.id)}
                            className={`w-full rounded-xl border p-3 text-left transition ${
                              selectedVariantId === variant.id
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-stone-200 bg-stone-50 hover:bg-white'
                            }`}
                          >
                            <span className="block text-sm font-semibold">
                              {variant.label}
                            </span>
                            <span className="mt-1 block truncate text-xs text-stone-500">
                              {compactText(variant.explanation, 'No explanation')}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-stone-500">No blocks.</p>
                      )}
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {createPanel ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/40 p-4">
          <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Create
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {createPanel === 'category'
                    ? 'Folder'
                    : createPanel === 'topic'
                      ? 'Java file/topic'
                      : createPanel === 'content'
                        ? 'Content entry'
                        : createPanel === 'upload'
                          ? 'Upload Java file'
                          : createPanel === 'import'
                            ? 'Import codebase'
                            : 'User'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreatePanel(null)}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            {createPanel === 'category' ? (
              <form onSubmit={handleCreateCategory} className="space-y-4 p-6">
                <input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Folder name"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                {renderCategorySelect(parentCategoryId, setParentCategoryId, {
                  includeEmpty: true,
                  emptyLabel: 'No parent',
                })}
                <button
                  disabled={isBusy}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Create folder
                </button>
              </form>
            ) : null}

            {createPanel === 'topic' ? (
              <form onSubmit={handleCreateTopic} className="space-y-4 p-6">
                <input
                  value={topicTitle}
                  onChange={(event) => setTopicTitle(event.target.value)}
                  placeholder="Topic or Java filename"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                {renderCategorySelect(topicCategoryId || selectedCategoryId, setTopicCategoryId)}
                <button
                  disabled={isBusy || !selectedCategoryId}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Create file
                </button>
              </form>
            ) : null}

            {createPanel === 'content' ? (
              <form onSubmit={handleCreateContent} className="space-y-4 p-6">
                <select
                  value={contentTopicId}
                  onChange={(event) => setContentTopicId(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                >
                  <option value="">Select topic</option>
                  {selectedCategoryTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
                <input
                  value={contentQuery}
                  onChange={(event) => setContentQuery(event.target.value)}
                  placeholder="Search query"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <textarea
                  value={contentCode}
                  onChange={(event) => setContentCode(event.target.value)}
                  placeholder="Java code"
                  rows={12}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-stone-900"
                />
                <textarea
                  value={contentExplanation}
                  onChange={(event) => setContentExplanation(event.target.value)}
                  placeholder="Explanation"
                  rows={4}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <input
                  value={contentComplexity}
                  onChange={(event) => setContentComplexity(event.target.value)}
                  placeholder="Complexity"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <textarea
                  value={contentUml}
                  onChange={(event) => setContentUml(event.target.value)}
                  placeholder="Mermaid UML"
                  rows={5}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-stone-900"
                />
                <button
                  disabled={isBusy || !contentTopicId}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Create content
                </button>
              </form>
            ) : null}

            {createPanel === 'user' ? (
              <form onSubmit={handleCreateUser} className="space-y-4 p-6">
                <input
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  placeholder="username"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <input
                  value={newDisplayName}
                  onChange={(event) => setNewDisplayName(event.target.value)}
                  placeholder="Display name"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <input
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="Email"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Temporary password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  placeholder="Confirm temporary password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <p className="text-xs text-stone-500">
                  User can change this password later.
                </p>
                <select
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                </select>
                <select
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
                <textarea
                  value={newNotes}
                  onChange={(event) => setNewNotes(event.target.value)}
                  placeholder="Notes"
                  rows={4}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Accent color
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={newAvatarColor}
                      onChange={(event) => setNewAvatarColor(event.target.value)}
                      className="h-10 w-14 rounded-lg border border-stone-300 bg-white"
                    />
                    <input
                      value={newAvatarColor}
                      onChange={(event) => setNewAvatarColor(event.target.value)}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-stone-300 px-3 text-sm normal-case tracking-normal outline-none focus:border-stone-900"
                    />
                  </div>
                </label>
                <button
                  disabled={isBusy}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Create user
                </button>
              </form>
            ) : null}

            {createPanel === 'upload' ? (
              <form onSubmit={handleUpload} className="space-y-4 p-6">
                {renderCategorySelect(uploadCategoryId || selectedCategoryId, setUploadCategoryId)}
                <input
                  key={uploadInputKey}
                  type="file"
                  accept=".java"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  disabled={isBusy || !(uploadCategoryId || selectedCategoryId)}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Upload Java file
                </button>
              </form>
            ) : null}

            {createPanel === 'import' ? (
              <form onSubmit={handleImportCodebase} className="space-y-4 p-6">
                <input
                  value={importPath}
                  onChange={(event) => setImportPath(event.target.value)}
                  placeholder="imports/app"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <input
                  value={importName}
                  onChange={(event) => setImportName(event.target.value)}
                  placeholder="COMP2100 MiniLab"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                />
                <button
                  disabled={isBusy}
                  className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Import codebase
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {passwordResetUser ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/35 px-4 py-8 backdrop-blur-sm">
          <form
            onSubmit={handleResetPassword}
            className="w-[calc(100vw-32px)] max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl shadow-stone-950/25"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  User access
                </p>
                <h2 className="mt-1 text-xl font-semibold text-stone-950">
                  Reset password
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  @{passwordResetUser.username}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUserId('')}
                className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
              >
                Close
              </button>
            </div>
            <div className="mt-5 space-y-3">
              <input
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm outline-none focus:border-stone-900"
                autoFocus
              />
              <input
                type="password"
                value={resetPasswordConfirm}
                onChange={(event) => setResetPasswordConfirm(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm outline-none focus:border-stone-900"
              />
              <p className="text-xs text-stone-500">
                Passwords must be at least 8 characters. Existing passwords are
                never displayed.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordResetUserId('')}
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isDocumentationManagerOpen ? (
        <div className="fixed inset-0 z-[85] overflow-y-auto bg-stone-950/45 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-stone-200 bg-[#f6f2ea] p-5 shadow-2xl shadow-stone-950/25">
            <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Manager
                </p>
                <h2 className="mt-1 text-xl font-semibold text-stone-950">
                  Documentation
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDocumentationManagerOpen(false);
                  void refreshData();
                }}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700"
              >
                Close
              </button>
            </div>
            <DocumentationWorkspace adminMode />
          </div>
        </div>
      ) : null}

      {drawer ? (
        <div className="fixed inset-0 z-[90] bg-stone-950/35">
          <div className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-stone-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Edit
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {drawer.type === 'category'
                    ? 'Folder'
                    : drawer.type === 'topic'
                      ? 'Topic'
                      : drawer.type === 'content'
                        ? 'Content'
                        : drawer.type === 'variant'
                          ? 'Block'
                          : 'User'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(null)}
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {drawer.type === 'category' ? (
                <>
                  <input
                    value={drawer.form.name}
                    onChange={(event) => updateDrawerField('name', event.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  {renderCategorySelect(drawer.form.parentId, (value) => updateDrawerField('parentId', value), {
                    includeEmpty: true,
                    emptyLabel: 'No parent',
                  })}
                </>
              ) : null}

              {drawer.type === 'topic' ? (
                <>
                  <input
                    value={drawer.form.title}
                    onChange={(event) => updateDrawerField('title', event.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  {renderCategorySelect(drawer.form.categoryId, (value) => updateDrawerField('categoryId', value))}
                </>
              ) : null}

              {drawer.type === 'content' ? (
                <>
                  <input
                    value={drawer.form.title}
                    onChange={(event) => updateDrawerField('title', event.target.value)}
                    placeholder="Title"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  {renderCategorySelect(drawer.form.categoryId, (value) => updateDrawerField('categoryId', value))}
                  <input
                    value={drawer.form.query}
                    onChange={(event) => updateDrawerField('query', event.target.value)}
                    placeholder="Query"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <textarea
                    value={drawer.form.code}
                    onChange={(event) => updateDrawerField('code', event.target.value)}
                    className="min-h-[48vh] w-full rounded-2xl border border-stone-300 bg-stone-950 px-4 py-3 font-mono text-sm leading-6 text-stone-50 outline-none focus:border-amber-500"
                  />
                  <textarea
                    value={drawer.form.explanation}
                    onChange={(event) => updateDrawerField('explanation', event.target.value)}
                    placeholder="Explanation"
                    className="min-h-32 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <input
                    value={drawer.form.complexity}
                    onChange={(event) => updateDrawerField('complexity', event.target.value)}
                    placeholder="Complexity"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <textarea
                    value={drawer.form.uml}
                    onChange={(event) => updateDrawerField('uml', event.target.value)}
                    placeholder="Mermaid UML"
                    className="min-h-40 w-full rounded-xl border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-stone-900"
                  />
                </>
              ) : null}

              {drawer.type === 'variant' ? (
                <>
                  <input
                    value={drawer.form.label}
                    onChange={(event) => updateDrawerField('label', event.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <textarea
                    value={drawer.form.code}
                    onChange={(event) => updateDrawerField('code', event.target.value)}
                    className="min-h-[48vh] w-full rounded-2xl border border-stone-300 bg-stone-950 px-4 py-3 font-mono text-sm leading-6 text-stone-50 outline-none focus:border-amber-500"
                  />
                  <textarea
                    value={drawer.form.explanation}
                    onChange={(event) => updateDrawerField('explanation', event.target.value)}
                    placeholder="Explanation"
                    className="min-h-32 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <input
                    value={drawer.form.complexity}
                    onChange={(event) => updateDrawerField('complexity', event.target.value)}
                    placeholder="Complexity"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <textarea
                    value={drawer.form.uml}
                    onChange={(event) => updateDrawerField('uml', event.target.value)}
                    placeholder="Mermaid UML"
                    className="min-h-40 w-full rounded-xl border border-stone-300 px-3 py-2 font-mono text-sm outline-none focus:border-stone-900"
                  />
                </>
              ) : null}

              {drawer.type === 'user' ? (
                <>
                  <input
                    value={drawer.item.username}
                    disabled
                    className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-sm text-stone-500"
                  />
                  <input
                    value={drawer.form.displayName}
                    onChange={(event) => updateDrawerField('displayName', event.target.value)}
                    placeholder="Display name"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <input
                    value={drawer.form.email}
                    onChange={(event) => updateDrawerField('email', event.target.value)}
                    placeholder="Email"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <select
                    value={drawer.form.role}
                    disabled={drawer.item.protected}
                    onChange={(event) => updateDrawerField('role', event.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
                  >
                    {drawer.item.protected ? (
                      <option value="root_manager">Root manager</option>
                    ) : null}
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                  </select>
                  <select
                    value={drawer.form.status}
                    disabled={drawer.item.protected}
                    onChange={(event) => updateDrawerField('status', event.target.value)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <textarea
                    value={drawer.form.notes}
                    onChange={(event) => updateDrawerField('notes', event.target.value)}
                    placeholder="Notes"
                    rows={5}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900"
                  />
                  <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Accent color
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={drawer.form.avatarColor}
                        onChange={(event) => updateDrawerField('avatarColor', event.target.value)}
                        className="h-10 w-14 rounded-lg border border-stone-300 bg-white"
                      />
                      <input
                        value={drawer.form.avatarColor}
                        onChange={(event) => updateDrawerField('avatarColor', event.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-stone-300 px-3 text-sm normal-case tracking-normal outline-none focus:border-stone-900"
                      />
                    </div>
                  </label>
                  {drawer.item.protected ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Root manager is protected.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setDrawer(null)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void saveDrawer()}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );

}
