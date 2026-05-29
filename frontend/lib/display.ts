import { Category } from '@/lib/types';

export function getPublicCategoryName(category: Pick<Category, 'name'>) {
  return category.name?.trim() || 'Notes';
}

export function getPublicCategorySlug(category: Pick<Category, 'slug'>) {
  return category.slug?.trim() || 'notes';
}
