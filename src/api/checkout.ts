import api from './axios';
import type {
  CheckoutPreviewRequest,
  CheckoutPreviewResponse,
  OrderCreateRequest,
  OrderDetailResponse,
  OrderItemResponse,
  OrderSummaryResponse,
  PaymentRequest,
  PaymentResultResponse,
} from '../types/checkout';

type UnknownRecord = Record<string, unknown>;

const parseEndpoints = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback;
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return parsed.length > 0 ? parsed : fallback;
};

const CHECKOUT_ENDPOINTS = {
  preview: parseEndpoints(import.meta.env.VITE_CHECKOUT_PREVIEW_ENDPOINTS, ['/checkout/preview']),
  createOrder: parseEndpoints(import.meta.env.VITE_ORDERS_CREATE_ENDPOINTS, ['/orders']),
  listOrders: parseEndpoints(import.meta.env.VITE_ORDERS_LIST_ENDPOINTS, ['/orders', '/orders/my']),
  detailOrder: parseEndpoints(import.meta.env.VITE_ORDERS_DETAIL_ENDPOINTS, ['/orders/{orderId}']),
  cancelOrder: parseEndpoints(import.meta.env.VITE_ORDERS_CANCEL_ENDPOINTS, [
    '/orders/{orderId}',
    '/orders/{orderId}/cancel',
  ]),
  payOrder: parseEndpoints(import.meta.env.VITE_ORDERS_PAY_ENDPOINTS, ['/orders/{orderId}/pay']),
  retryPayment: parseEndpoints(import.meta.env.VITE_ORDERS_RETRY_ENDPOINTS, [
    '/orders/{orderId}/retry-payment',
  ]),
};

const resolvePath = (pathTemplate: string, orderId?: number) => {
  if (orderId == null) return pathTemplate.replace('/{orderId}', '');
  return pathTemplate.replace('{orderId}', encodeURIComponent(String(orderId)));
};

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

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const mapOrderItem = (raw: unknown): OrderItemResponse => {
  const item = (raw ?? {}) as UnknownRecord;
  const productId = asNumber(item.productId, NaN);
  return {
    productId: Number.isFinite(productId) ? productId : null,
    productName: asString(item.productName, ''),
    productSku: asString(item.productSku, ''),
    quantity: asNumber(item.quantity, 0),
    unitPrice: asNumber(item.unitPrice, 0),
    lineTotal: asNumber(item.lineTotal, 0),
  };
};

const mapOrderSummary = (raw: unknown): OrderSummaryResponse => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    orderId: asNumber(item.orderId, 0),
    orderNumber: asString(item.orderNumber, ''),
    status: asString(item.status, ''),
    itemCount: asNumber(item.itemCount, 0),
    grandTotal: asNumber(item.grandTotal, 0),
    createdAt: asString(item.createdAt, ''),
  };
};

const mapOrderDetail = (raw: unknown): OrderDetailResponse => {
  const item = (raw ?? {}) as UnknownRecord;
  const shippingAddress = (item.shippingAddress ?? {}) as UnknownRecord;
  return {
    orderId: asNumber(item.orderId, 0),
    orderNumber: asString(item.orderNumber, ''),
    status: asString(item.status, ''),
    installmentCount: asNumber(item.installmentCount, 1),
    couponCode: asString(item.couponCode, '') || null,
    subtotal: asNumber(item.subtotal, 0),
    discountTotal: asNumber(item.discountTotal, 0),
    shippingFee: asNumber(item.shippingFee, 0),
    grandTotal: asNumber(item.grandTotal, 0),
    shippingAddress: {
      fullName: asString(shippingAddress.fullName, ''),
      phoneNumber: asString(shippingAddress.phoneNumber, ''),
      city: asString(shippingAddress.city, ''),
      district: asString(shippingAddress.district, ''),
      addressLine: asString(shippingAddress.addressLine, ''),
      postalCode: asString(shippingAddress.postalCode, ''),
      country: asString(shippingAddress.country, ''),
    },
    items: toArray(item.items).map(mapOrderItem),
    createdAt: asString(item.createdAt, ''),
    updatedAt: asString(item.updatedAt, ''),
  };
};

const mapPreview = (raw: unknown): CheckoutPreviewResponse => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    itemCount: asNumber(item.itemCount, 0),
    installmentCount: asNumber(item.installmentCount, 1),
    couponCode: asString(item.couponCode, '') || null,
    subtotal: asNumber(item.subtotal, 0),
    discountTotal: asNumber(item.discountTotal, 0),
    shippingFee: asNumber(item.shippingFee, 0),
    grandTotal: asNumber(item.grandTotal, 0),
  };
};

const mapPaymentResult = (raw: unknown): PaymentResultResponse => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    orderId: asNumber(item.orderId, 0),
    orderNumber: asString(item.orderNumber, ''),
    status: asString(item.status, ''),
    transactionId: asString(item.transactionId, '') || null,
    message: asString(item.message, ''),
  };
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

const requestFirstSuccess = async <T>(
  endpoints: string[],
  handler: (resolvedPath: string) => Promise<T>,
  orderId?: number
) => {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    const resolvedPath = resolvePath(endpoint, orderId);
    try {
      return await handler(resolvedPath);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No checkout endpoint succeeded.');
};

export const checkoutApi = {
  async preview(payload: CheckoutPreviewRequest): Promise<CheckoutPreviewResponse> {
    const response = await requestFirstSuccess(CHECKOUT_ENDPOINTS.preview, (path) =>
      api.post(path, payload ?? {})
    );
    return mapPreview(extractObject(response.data));
  },

  async createOrder(payload: OrderCreateRequest): Promise<OrderDetailResponse> {
    const response = await requestFirstSuccess(CHECKOUT_ENDPOINTS.createOrder, (path) =>
      api.post(path, payload)
    );
    return mapOrderDetail(extractObject(response.data));
  },

  async listMyOrders(): Promise<OrderSummaryResponse[]> {
    const response = await requestFirstSuccess(CHECKOUT_ENDPOINTS.listOrders, (path) => api.get(path));
    return toArray(response.data).map(mapOrderSummary).filter((item) => item.orderId > 0);
  },

  async getOrderDetail(orderId: number): Promise<OrderDetailResponse> {
    const response = await requestFirstSuccess(
      CHECKOUT_ENDPOINTS.detailOrder,
      (path) => api.get(path),
      orderId
    );
    return mapOrderDetail(extractObject(response.data));
  },

  async cancelOrder(orderId: number): Promise<void> {
    await requestFirstSuccess(
      CHECKOUT_ENDPOINTS.cancelOrder,
      async (path) => {
        try {
          return await api.delete(path);
        } catch {
          return api.post(path, {});
        }
      },
      orderId
    );
  },

  async payOrder(orderId: number, payload?: PaymentRequest): Promise<PaymentResultResponse> {
    const response = await requestFirstSuccess(
      CHECKOUT_ENDPOINTS.payOrder,
      (path) => api.post(path, payload ?? {}),
      orderId
    );
    return mapPaymentResult(extractObject(response.data));
  },

  async retryPayment(orderId: number, payload?: PaymentRequest): Promise<PaymentResultResponse> {
    const response = await requestFirstSuccess(
      CHECKOUT_ENDPOINTS.retryPayment,
      (path) => api.post(path, payload ?? {}),
      orderId
    );
    return mapPaymentResult(extractObject(response.data));
  },
};
