export type TodoUser = {
  id: string;
  username: string;
  displayName: string;
  avatarColor?: string;
  accentColor?: string;
  defaultTodoColor?: string;
};

export type TodoList = {
  id: string;
  name: string;
  description: string;
  color: string;
  markerColor?: string;
  archived: boolean;
  ownerUserId: string;
  owner: TodoUser | null;
  taskCount: number;
  doneCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type TodoTag = {
  id: string;
  name: string;
  color: string;
};

export type TodoSubtask = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
};

export type TodoActivity = {
  id: string;
  taskId: string;
  userId: string | null;
  eventType: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: TodoUser | null;
};

export type TodoTask = {
  id: string;
  listId: string;
  listName: string;
  listColor: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  linkedTopicId: string | null;
  linkedCategoryId: string | null;
  linkedTopic: { id: string; title: string; slug: string | null } | null;
  linkedCategory: { id: string; name: string; slug: string | null } | null;
  ownerUserId: string;
  owner: TodoUser | null;
  archived: boolean;
  subtaskCount: number;
  completedSubtaskCount: number;
  tags: TodoTag[];
  subtasks?: TodoSubtask[];
  activity?: TodoActivity[];
  createdAt?: string;
  updatedAt?: string;
};

export type TodoFilter =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'overdue'
  | 'no_due'
  | 'done'
  | 'archived';

export type CreateTaskInput = {
  listId?: string | null;
  title: string;
  description?: string;
  subtasks?: Array<{ title: string }>;
  status?: TodoTask['status'];
  priority?: TodoTask['priority'];
  dueDate?: string | null;
  tags?: string[];
  linkedTopicId?: string | null;
  linkedCategoryId?: string | null;
  ownerUserId?: string;
};
