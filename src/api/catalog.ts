import api from './axios';
import type { Product } from '../types/product';
import type { CategorySpecDefinition } from '../constants/categorySpecs';
import { CATEGORY_SPEC_DEFINITIONS } from '../constants/categorySpecs';

type UnknownRecord = Record<string, unknown>;

const parseEndpoints = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (parsed.length === 0) return fallback;
  const merged = [...parsed];
  for (const endpoint of fallback) {
    if (!merged.includes(endpoint)) {
      merged.push(endpoint);
    }
  }
  return merged;
};

const CATALOG_ENDPOINTS = {
  productsGet: parseEndpoints(import.meta.env.VITE_PRODUCTS_GET_ENDPOINTS, [
    '/products',
    '/products/list',
    '/product/list',
    '/products/getall',
    '/products/all',
  ]),
  productsCreate: parseEndpoints(import.meta.env.VITE_PRODUCTS_CREATE_ENDPOINTS, ['/products']),
  productsUpdate: parseEndpoints(import.meta.env.VITE_PRODUCTS_UPDATE_ENDPOINTS, ['/products/{id}']),
  productsDelete: parseEndpoints(import.meta.env.VITE_PRODUCTS_DELETE_ENDPOINTS, ['/products/{id}']),
  categoriesGet: parseEndpoints(import.meta.env.VITE_CATEGORIES_GET_ENDPOINTS, [
    '/categories',
    '/categories/list',
    '/category/list',
    '/categories/getall',
    '/categories/all',
  ]),
  categoriesCreate: parseEndpoints(import.meta.env.VITE_CATEGORIES_CREATE_ENDPOINTS, ['/categories']),
  categoriesUpdate: parseEndpoints(import.meta.env.VITE_CATEGORIES_UPDATE_ENDPOINTS, ['/categories/{id}']),
  categoriesDelete: parseEndpoints(import.meta.env.VITE_CATEGORIES_DELETE_ENDPOINTS, ['/categories/{id}']),
  categorySpecsGet: parseEndpoints(import.meta.env.VITE_CATEGORY_SPECS_GET_ENDPOINTS, [
    '/categories/specs',
    '/category/specs',
  ]),
};

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const record = value as UnknownRecord;
  const candidates = [
    'data',
    'Data',
    'content',
    'items',
    'results',
    'list',
    'rows',
    'products',
    'categories',
    'payload',
    'value',
  ];

  for (const key of candidates) {
    const item = record[key];
    if (Array.isArray(item)) return item;
    if (item && typeof item === 'object') {
      const nested = toArray(item);
      if (nested.length > 0) return nested;
    }
  }

  // Supports dictionary-style responses: { "1": { ...product }, "2": { ...product } }
  const values = Object.values(record);
  if (values.length > 0 && values.every((item) => item && typeof item === 'object')) {
    return values;
  }

  return [];
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolvePath = (pathTemplate: string, id?: string) => {
  if (!id) {
    return pathTemplate.replace('/{id}', '').replace('/{productId}', '');
  }
  return pathTemplate
    .replace('{id}', encodeURIComponent(id))
    .replace('{productId}', encodeURIComponent(id));
};

const mapProduct = (raw: unknown, index: number): Product => {
  const item = (raw ?? {}) as UnknownRecord;
  const id = asString(item.id ?? item.productId, `product-${index + 1}`);
  const name = asString(item.name || item.productName, `Product ${index + 1}`);
  const sku = asString(item.sku || item.code, `PRD-${id}`);
  const description = asString(item.description || item.detail, '');
  const categoryId = asNumber(item.categoryId, 0) || undefined;
  const category = asString(item.categoryName || item.category || item.groupName, 'General');
  const price = asNumber(item.price || item.unitPrice || item.salePrice, 0);
  const stock = asNumber(item.stockQuantity || item.stock || item.quantity, 0);
  const updatedAt = asString(
    item.updatedAt || item.updated_at || item.lastUpdated,
    new Date().toISOString()
  );
  const imageUrl = asString(item.imageUrl || item.image || item.imagePath || item.photo || item.url, '');
  const specs = toRecord(item.specs ?? item.specifications ?? item.attributes);

  return { id, name, description, sku, category, categoryId, price, stock, updatedAt, imageUrl, specs };
};

const toRecord = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as UnknownRecord).reduce<Record<string, string>>((acc, [key, entry]) => {
    if (entry == null) return acc;
    const parsed = asString(entry, '').trim();
    if (!parsed) return acc;
    acc[key] = parsed;
    return acc;
  }, {});
};

const mapCategory = (
  raw: unknown,
  index: number
): { id: string; name: string; description?: string } => {
  const item = (raw ?? {}) as UnknownRecord;
  const id = asString(item.id, `category-${index + 1}`);
  const name = asString(item.name || item.categoryName, `Category ${index + 1}`);
  const description = asString(item.description, '');
  return { id, name, description };
};

const extractProductLike = (value: unknown): unknown | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  if (typeof value !== 'object') return null;

  const record = value as UnknownRecord;
  const hasProductFields =
    'id' in record ||
    'productId' in record ||
    'name' in record ||
    'productName' in record;
  if (hasProductFields) return value;

  const candidates = ['data', 'Data', 'item', 'product', 'payload', 'value', 'result'];
  for (const key of candidates) {
    const nested = extractProductLike(record[key]);
    if (nested) return nested;
  }
  return null;
};

const toProductPayload = (input: {
  id?: string;
  name: string;
  description?: string;
  categoryId: number;
  price: number;
  stockQuantity: number;
  specs?: Record<string, string>;
}) => ({
  name: input.name,
  description: input.description ?? '',
  price: input.price,
  categoryId: input.categoryId,
  stockQuantity: input.stockQuantity,
  specs: input.specs ?? {},
});

const toCategoryPayload = (input: { id?: string; name: string; description?: string }) => ({
  id: input.id,
  name: input.name,
  categoryName: input.name,
  description: input.description ?? '',
});

const requestFirstSuccess = async <T>(
  endpoints: string[],
  handler: (resolvedPath: string) => Promise<T>,
  idForTemplate?: string
) => {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const resolvedPath = resolvePath(endpoint, idForTemplate);
    try {
      return await handler(resolvedPath);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No endpoint succeeded.');
};

const mapCategorySpecDefinitions = (value: unknown): CategorySpecDefinition[] => {
  const array = toArray(value);
  if (array.length === 0) return CATEGORY_SPEC_DEFINITIONS;

  const mapped = array
    .map((item) => {
      const record = (item ?? {}) as UnknownRecord;
      const categoryName = asString(record.categoryName || record.name, '');
      const fields = toArray(record.fields).map((rawField) => {
        const field = (rawField ?? {}) as UnknownRecord;
        return {
          key: asString(field.key, ''),
          label: asString(field.label, ''),
          options: toArray(field.options).map((option) => asString(option, '')).filter(Boolean),
        };
      });
      return {
        categoryName,
        fields: fields.filter((field) => field.key && field.label),
      } as CategorySpecDefinition;
    })
    .filter((item) => item.categoryName.length > 0 && item.fields.length > 0);

  return mapped.length > 0 ? mapped : CATEGORY_SPEC_DEFINITIONS;
};

export const catalogApi = {
  async getProducts(): Promise<Product[]> {
    const response = await requestFirstSuccess(CATALOG_ENDPOINTS.productsGet, (path) => api.get(path));
    return toArray(response.data).map(mapProduct);
  },

  async getCategories(): Promise<Array<{ id: string; name: string; description?: string }>> {
    const response = await requestFirstSuccess(CATALOG_ENDPOINTS.categoriesGet, (path) => api.get(path));
    return toArray(response.data).map(mapCategory);
  },

  async getCategorySpecDefinitions(): Promise<CategorySpecDefinition[]> {
    try {
      const response = await requestFirstSuccess(CATALOG_ENDPOINTS.categorySpecsGet, (path) => api.get(path));
      return mapCategorySpecDefinitions(response.data);
    } catch {
      return CATEGORY_SPEC_DEFINITIONS;
    }
  },

  async createProduct(input: {
    name: string;
    description?: string;
    categoryId: number;
    price: number;
    stockQuantity: number;
    specs?: Record<string, string>;
  }): Promise<Product | null> {
    const payload = toProductPayload(input);
    const response = await requestFirstSuccess(CATALOG_ENDPOINTS.productsCreate, (path) =>
      api.post(path, payload)
    );
    const productLike = extractProductLike(response.data);
    return productLike ? mapProduct(productLike, 0) : null;
  },

  async updateProduct(input: {
    id: string;
    name: string;
    description?: string;
    categoryId: number;
    price: number;
    stockQuantity: number;
    specs?: Record<string, string>;
  }): Promise<Product | null> {
    const payload = toProductPayload(input);
    const response = await requestFirstSuccess(
      CATALOG_ENDPOINTS.productsUpdate,
      (path) => api.put(path, payload),
      input.id
    );
    const productLike = extractProductLike(response.data);
    return productLike ? mapProduct(productLike, 0) : null;
  },

  async deleteProduct(id: string) {
    return requestFirstSuccess(
      CATALOG_ENDPOINTS.productsDelete,
      (path) => api.delete(path),
      id
    );
  },

  async createCategory(input: { name: string; description?: string }) {
    const payload = toCategoryPayload(input);
    return requestFirstSuccess(CATALOG_ENDPOINTS.categoriesCreate, (path) => api.post(path, payload));
  },

  async updateCategory(input: { id: string; name: string; description?: string }) {
    const payload = toCategoryPayload(input);
    return requestFirstSuccess(
      CATALOG_ENDPOINTS.categoriesUpdate,
      (path) => api.put(path, payload),
      input.id
    );
  },

  async deleteCategory(id: string) {
    return requestFirstSuccess(
      CATALOG_ENDPOINTS.categoriesDelete,
      (path) => api.delete(path),
      id
    );
  },
};
