import api from './axios';
import type {
  CouponAssignRequest,
  CouponCreateRequest,
  CouponManageItem,
  MyCouponItem,
} from '../types/coupon';

type UnknownRecord = Record<string, unknown>;

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const record = value as UnknownRecord;
  const candidates = ['data', 'content', 'items', 'results', 'list', 'rows'];
  for (const key of candidates) {
    const item = record[key];
    if (Array.isArray(item)) return item;
  }
  return [];
};

const extractObject = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as UnknownRecord;
  const candidates = ['data', 'content', 'item', 'result', 'payload', 'value'];
  for (const key of candidates) {
    const nested = record[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested;
  }
  return value;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const mapManageItem = (raw: unknown): CouponManageItem => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    id: asNumber(item.id, 0),
    code: asString(item.code, ''),
    discountType: asString(item.discountType, 'PERCENTAGE') as CouponManageItem['discountType'],
    discountValue: asNumber(item.discountValue, 0),
    minOrderAmount: asNumber(item.minOrderAmount, 0),
    maxDiscountAmount: item.maxDiscountAmount == null ? null : asNumber(item.maxDiscountAmount, 0),
    active: asBoolean(item.active, true),
    usageLimit: item.usageLimit == null ? null : asNumber(item.usageLimit, 0),
    usedCount: asNumber(item.usedCount, 0),
    startsAt: item.startsAt == null ? null : asString(item.startsAt, ''),
    endsAt: item.endsAt == null ? null : asString(item.endsAt, ''),
    unlimitedDuration: asBoolean(item.unlimitedDuration, false),
    assignedUserCount: asNumber(item.assignedUserCount, 0),
  };
};

const mapMyCoupon = (raw: unknown): MyCouponItem => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    userCouponId: asNumber(item.userCouponId, 0),
    couponId: asNumber(item.couponId, 0),
    code: asString(item.code, ''),
    discountType: asString(item.discountType, 'PERCENTAGE') as MyCouponItem['discountType'],
    discountValue: asNumber(item.discountValue, 0),
    minOrderAmount: asNumber(item.minOrderAmount, 0),
    maxDiscountAmount: item.maxDiscountAmount == null ? null : asNumber(item.maxDiscountAmount, 0),
    active: asBoolean(item.active, true),
    usageLimit: item.usageLimit == null ? null : asNumber(item.usageLimit, 0),
    usedCount: asNumber(item.usedCount, 0),
    remainingUsage: item.remainingUsage == null ? null : asNumber(item.remainingUsage, 0),
    startsAt: item.startsAt == null ? null : asString(item.startsAt, ''),
    endsAt: item.endsAt == null ? null : asString(item.endsAt, ''),
    unlimitedDuration: asBoolean(item.unlimitedDuration, false),
  };
};

const requestFirstSuccess = async <T>(
  endpoints: string[],
  handler: (resolvedPath: string) => Promise<T>
) => {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await handler(endpoint);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No coupon endpoint succeeded.');
};

const MANAGE_LIST_ENDPOINTS = ['/coupons', '/coupons/list', '/coupons/all'];

export const couponsApi = {
  async listManageCoupons(): Promise<CouponManageItem[]> {
    const response = await requestFirstSuccess(MANAGE_LIST_ENDPOINTS, (path) => api.get(path));
    return toArray(response.data).map(mapManageItem).filter((item) => item.id > 0);
  },

  async createCoupon(payload: CouponCreateRequest): Promise<CouponManageItem> {
    const response = await requestFirstSuccess(['/coupons'], (path) => api.post(path, payload));
    return mapManageItem(extractObject(response.data));
  },

  async assignCoupon(couponId: number, payload: CouponAssignRequest): Promise<CouponManageItem> {
    const response = await requestFirstSuccess([`/coupons/${couponId}/assign`], (path) =>
      api.post(path, payload)
    );
    return mapManageItem(extractObject(response.data));
  },

  async deactivateCoupon(couponId: number): Promise<CouponManageItem> {
    const response = await requestFirstSuccess([`/coupons/${couponId}/deactivate`], (path) =>
      api.post(path, {})
    );
    return mapManageItem(extractObject(response.data));
  },

  async reactivateCoupon(couponId: number): Promise<CouponManageItem> {
    const response = await requestFirstSuccess([`/coupons/${couponId}/reactivate`], (path) =>
      api.post(path, {})
    );
    return mapManageItem(extractObject(response.data));
  },

  async deleteCoupon(couponId: number): Promise<void> {
    await requestFirstSuccess([`/coupons/${couponId}`], (path) => api.delete(path));
  },

  async listMyCoupons(): Promise<MyCouponItem[]> {
    const response = await requestFirstSuccess(['/coupons/my'], (path) => api.get(path));
    return toArray(response.data).map(mapMyCoupon).filter((item) => item.userCouponId > 0);
  },
};
