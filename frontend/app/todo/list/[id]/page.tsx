import { TodoWorkspace } from '@/components/todo/TodoWorkspace';

type TodoListPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TodoListPage({ params }: TodoListPageProps) {
  const { id } = await params;
  return <TodoWorkspace initialListId={id} />;
}
