import api from './axios';
import type { ProductReview, ProductReviewCreateRequest } from '../types/review';

type UnknownRecord = Record<string, unknown>;

const parseEndpoints = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : fallback;
};

const REVIEW_ENDPOINTS = {
  list: parseEndpoints(import.meta.env.VITE_PRODUCT_REVIEWS_ENDPOINTS, ['/products/{productId}/reviews']),
  create: parseEndpoints(import.meta.env.VITE_PRODUCT_REVIEW_CREATE_ENDPOINTS, ['/products/{productId}/reviews']),
  remove: parseEndpoints(
    import.meta.env.VITE_PRODUCT_REVIEW_DELETE_ENDPOINTS,
    ['/products/{productId}/reviews/{reviewId}']
  ),
};

const resolvePath = (pathTemplate: string, productId: number, reviewId?: number) =>
  pathTemplate
    .replace('{productId}', encodeURIComponent(String(productId)))
    .replace('{reviewId}', encodeURIComponent(String(reviewId ?? '')));

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as UnknownRecord;
    const candidates = ['data', 'content', 'items', 'results', 'list', 'rows', 'reviews'];
    for (const key of candidates) {
      const item = record[key];
      if (Array.isArray(item)) return item;
    }
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

const mapReview = (raw: unknown): ProductReview => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    id: asNumber(item.id, 0),
    productId: asNumber(item.productId, 0),
    userId: asNumber(item.userId, 0),
    username: asString(item.username, ''),
    fullName: asString(item.fullName, ''),
    rating: asNumber(item.rating, 0),
    title: asString(item.title, ''),
    comment: asString(item.comment, ''),
    createdAt: asString(item.createdAt, new Date().toISOString()),
  };
};

const requestFirstSuccess = async <T>(
  endpoints: string[],
  productId: number,
  reviewId: number | undefined,
  handler: (resolvedPath: string) => Promise<T>
) => {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const resolvedPath = resolvePath(endpoint, productId, reviewId);
    try {
      return await handler(resolvedPath);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No review endpoint succeeded.');
};

export const reviewsApi = {
  async listByProductId(productId: number): Promise<ProductReview[]> {
    const response = await requestFirstSuccess(REVIEW_ENDPOINTS.list, productId, undefined, (path) =>
      api.get(path)
    );
    return toArray(response.data).map(mapReview).filter((item) => item.id > 0 || item.comment.length > 0);
  },
  async create(productId: number, payload: ProductReviewCreateRequest): Promise<ProductReview> {
    const response = await requestFirstSuccess(REVIEW_ENDPOINTS.create, productId, undefined, (path) =>
      api.post(path, payload)
    );
    return mapReview(response.data);
  },
  async remove(productId: number, reviewId: number) {
    return requestFirstSuccess(REVIEW_ENDPOINTS.remove, productId, reviewId, (path) => api.delete(path));
  },
};
