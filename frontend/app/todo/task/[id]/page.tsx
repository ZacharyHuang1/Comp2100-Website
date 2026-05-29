import { TodoWorkspace } from '@/components/todo/TodoWorkspace';

type TodoTaskPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TodoTaskPage({ params }: TodoTaskPageProps) {
  const { id } = await params;
  return <TodoWorkspace initialTaskId={id} />;
}
