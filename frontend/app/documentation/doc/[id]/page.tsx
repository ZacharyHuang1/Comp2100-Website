import { notFound } from 'next/navigation';

import { DocumentationPageViewer } from '@/components/documentation/DocumentationPageViewer';
import { getDocumentationPage } from '@/lib/api';

type DocumentationDocPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlight?: string }>;
};

export default async function DocumentationDocPage({
  params,
  searchParams,
}: DocumentationDocPageProps) {
  const { id } = await params;
  const { highlight = '' } = await searchParams;
  const page = await getDocumentationPage(id).catch(() => null);

  if (!page) {
    notFound();
  }

  return <DocumentationPageViewer page={page} highlight={highlight} />;
}
