import { notFound } from 'next/navigation';

import { ArticleDetail } from '@/components/ArticleDetail';
import { getTopic } from '@/lib/api';

type TopicPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TopicPage({ params }: TopicPageProps) {
  const { id } = await params;
  const topic = await getTopic(id).catch(() => null);

  if (!topic) {
    notFound();
  }

  return <ArticleDetail initialTopic={topic} />;
}
