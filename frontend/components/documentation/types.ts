import { TodoUser } from '@/components/todo/types';

export type DocumentationSpace = {
  id: string;
  name: string;
  description: string;
  ownerUserId: string;
  owner: TodoUser | null;
  visibility: 'private' | 'shared' | 'public_to_users' | string;
  markerColor: string;
  archived: boolean;
  pageCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type DocumentationPage = {
  id: string;
  spaceId: string;
  spaceName: string;
  spaceMarkerColor: string;
  title: string;
  content: string;
  instructionType: string;
  ownerUserId: string;
  owner: TodoUser | null;
  visibility: 'private' | 'shared' | 'public_to_users' | string;
  archived: boolean;
  createdAt?: string;
  updatedAt?: string;
};
