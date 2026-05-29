import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { API_BASE_URL } from '@/lib/config';
import {
  Category,
  CategoryTopicsResponse,
  ExplorerNode,
  SearchResponse,
  TopicSummary,
} from '@/lib/types';
import { DocumentationPage } from '@/components/documentation/types';

async function fetchJson<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      redirect('/login');
    }

    const message = await response.text();
    throw new Error(message || `Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

async function fetchCachedJson<T>(
  path: string,
  revalidateSeconds: number
): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      redirect('/login');
    }

    const message = await response.text();
    throw new Error(message || `Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getCategories(): Promise<Category[]> {
  return fetchCachedJson<Category[]>('/categories', 30);
}

export async function getExplorer(): Promise<ExplorerNode[]> {
  return fetchCachedJson<ExplorerNode[]>('/explorer', 10);
}

export async function getCategoryTopics(
  categoryId: string
): Promise<CategoryTopicsResponse> {
  return fetchCachedJson<CategoryTopicsResponse>(
    `/categories/${categoryId}/topics`,
    10
  );
}

export async function getTopic(topicId: string): Promise<TopicSummary> {
  return fetchJson<TopicSummary>(`/topics/${topicId}`);
}

export async function getDocumentationPage(
  pageId: string
): Promise<DocumentationPage> {
  return fetchJson<DocumentationPage>(`/documentation/pages/${pageId}`);
}

export async function searchTopics(query: string): Promise<SearchResponse> {
  return fetchJson<SearchResponse>(`/search?q=${encodeURIComponent(query)}`);
}
