import api from './axios';
import type { FavoriteProduct } from '../types/favorite';

type UnknownRecord = Record<string, unknown>;

const parseEndpoints = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : fallback;
};

const FAVORITE_ENDPOINTS = {
  list: parseEndpoints(import.meta.env.VITE_FAVORITES_LIST_ENDPOINTS, ['/favorites']),
  add: parseEndpoints(import.meta.env.VITE_FAVORITES_ADD_ENDPOINTS, ['/favorites/{productId}']),
  remove: parseEndpoints(import.meta.env.VITE_FAVORITES_REMOVE_ENDPOINTS, ['/favorites/{productId}']),
};

const resolvePath = (pathTemplate: string, productId?: number) => {
  if (productId == null) return pathTemplate.replace('/{productId}', '');
  return pathTemplate.replace('{productId}', encodeURIComponent(String(productId)));
};

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const record = value as UnknownRecord;
  const candidates = ['data', 'content', 'items', 'results', 'list', 'rows', 'favorites'];
  for (const key of candidates) {
    const item = record[key];
    if (Array.isArray(item)) return item;
  }
  return [];
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const mapFavorite = (raw: unknown): FavoriteProduct => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    favoriteId: asNumber(item.favoriteId, 0),
    productId: asNumber(item.productId, 0),
    name: asString(item.name, ''),
    description: asString(item.description, ''),
    price: asNumber(item.price, 0),
    stockQuantity: asNumber(item.stockQuantity, 0),
    categoryId:
      item.categoryId == null
        ? null
        : Number.isFinite(Number(item.categoryId))
          ? Number(item.categoryId)
          : null,
    categoryName: asString(item.categoryName, '') || null,
  };
};

const requestFirstSuccess = async <T>(
  endpoints: string[],
  handler: (resolvedPath: string) => Promise<T>,
  productId?: number
) => {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const resolvedPath = resolvePath(endpoint, productId);
    try {
      return await handler(resolvedPath);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No favorites endpoint succeeded.');
};

export const favoritesApi = {
  async listFavorites(): Promise<FavoriteProduct[]> {
    const response = await requestFirstSuccess(FAVORITE_ENDPOINTS.list, (path) => api.get(path));
    return toArray(response.data).map(mapFavorite).filter((item) => item.productId > 0);
  },
  async addFavorite(productId: number) {
    return requestFirstSuccess(FAVORITE_ENDPOINTS.add, (path) => api.post(path), productId);
  },
  async removeFavorite(productId: number) {
    return requestFirstSuccess(FAVORITE_ENDPOINTS.remove, (path) => api.delete(path), productId);
  },
};
