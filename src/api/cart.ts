import api from './axios';
import type { AddToCartRequest, CartLine } from '../types/cart';

type UnknownRecord = Record<string, unknown>;

const parseEndpoints = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : fallback;
};

const CART_ENDPOINTS = {
  list: parseEndpoints(import.meta.env.VITE_CART_LIST_ENDPOINTS, ['/cart']),
  add: parseEndpoints(import.meta.env.VITE_CART_ADD_ENDPOINTS, ['/cart']),
  remove: parseEndpoints(import.meta.env.VITE_CART_DELETE_ENDPOINTS, ['/cart/{productId}']),
};

const resolvePath = (pathTemplate: string, productId?: number) => {
  if (productId == null) return pathTemplate.replace('/{productId}', '');
  return pathTemplate.replace('{productId}', encodeURIComponent(String(productId)));
};

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as UnknownRecord;
    const candidates = ['data', 'content', 'items', 'results', 'list', 'rows'];
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
  typeof value === 'string' ? value : fallback;

const mapCartLine = (raw: unknown): CartLine => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    productId: asNumber(item.productId, 0),
    productName: asString(item.productName || item.name, ''),
    quantity: asNumber(item.quantity, 0),
    unitPrice: asNumber(item.unitPrice || item.price, 0),
    lineTotal: asNumber(item.lineTotal, 0),
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
  throw lastError ?? new Error('No cart endpoint succeeded.');
};

export const cartApi = {
  async listCart(): Promise<CartLine[]> {
    const response = await requestFirstSuccess(CART_ENDPOINTS.list, (path) => api.get(path));
    return toArray(response.data).map(mapCartLine).filter((line) => line.productId > 0);
  },
  async addToCart(payload: AddToCartRequest) {
    return requestFirstSuccess(CART_ENDPOINTS.add, (path) => api.post(path, payload));
  },
  async removeFromCart(productId: number) {
    return requestFirstSuccess(
      CART_ENDPOINTS.remove,
      (path) => api.delete(path),
      productId
    );
  },
};

