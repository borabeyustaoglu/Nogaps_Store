import { STORAGE_KEYS } from '../constants/storage';
import type { CartItem } from '../types/cart';
import { cartApi } from '../api/cart';

const GUEST_CART_COOKIE_KEY = STORAGE_KEYS.cart;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const parseGuestCart = (raw: string | null | undefined): CartItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        productId: String((item as CartItem).productId ?? '').trim(),
        quantity: Number((item as CartItem).quantity ?? 0),
      }))
      .filter((item) => item.productId.length > 0 && Number.isFinite(item.quantity) && item.quantity > 0);
  } catch {
    return [];
  }
};

const getCookieValue = (key: string): string | null => {
  if (!isBrowser()) return null;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookieValue = (key: string, value: string, maxAgeSeconds: number) => {
  if (!isBrowser()) return;
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
};

const removeCookieValue = (key: string) => {
  if (!isBrowser()) return;
  document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
};

const writeLocalMirror = (items: CartItem[]) => {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(items));
};

export const readGuestCart = (): CartItem[] => {
  if (!isBrowser()) return [];

  const cookieItems = parseGuestCart(getCookieValue(GUEST_CART_COOKIE_KEY));
  if (cookieItems.length > 0) {
    writeLocalMirror(cookieItems);
    return cookieItems;
  }

  const localItems = parseGuestCart(localStorage.getItem(STORAGE_KEYS.cart));
  if (localItems.length > 0) {
    setCookieValue(GUEST_CART_COOKIE_KEY, JSON.stringify(localItems), COOKIE_MAX_AGE_SECONDS);
    writeLocalMirror(localItems);
  }
  return localItems;
};

export const writeGuestCart = (items: CartItem[]) => {
  const normalized = parseGuestCart(JSON.stringify(items));
  if (normalized.length === 0) {
    clearGuestCart();
    return;
  }
  if (!isBrowser()) return;
  setCookieValue(GUEST_CART_COOKIE_KEY, JSON.stringify(normalized), COOKIE_MAX_AGE_SECONDS);
  writeLocalMirror(normalized);
};

export const clearGuestCart = () => {
  if (!isBrowser()) return;
  removeCookieValue(GUEST_CART_COOKIE_KEY);
  localStorage.removeItem(STORAGE_KEYS.cart);
};

export const mergeGuestCartIntoRemoteCart = async (): Promise<void> => {
  const guestItems = readGuestCart();
  if (guestItems.length === 0) return;

  const failed: CartItem[] = [];

  for (const item of guestItems) {
    const productId = Number(item.productId);
    if (!Number.isInteger(productId) || productId <= 0 || item.quantity <= 0) continue;
    try {
      await cartApi.addToCart({ productId, quantity: item.quantity });
    } catch {
      failed.push(item);
    }
  }

  if (failed.length === 0) {
    clearGuestCart();
    return;
  }

  writeGuestCart(failed);
};

export const clearRemoteCart = async (): Promise<void> => {
  const lines = await cartApi.listCart();
  if (lines.length === 0) return;
  await Promise.all(lines.map((line) => cartApi.removeFromCart(line.productId)));
};
