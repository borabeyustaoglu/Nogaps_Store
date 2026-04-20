export type PaymentProvider = 'MOCK' | 'IYZICO' | 'STRIPE' | 'PAYTR';

export interface ShippingAddressRequest {
  fullName: string;
  phoneNumber: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode?: string;
  country?: string;
}

export interface CheckoutPreviewRequest {
  couponCode?: string;
  installmentCount?: number;
}

export interface CheckoutPreviewResponse {
  itemCount: number;
  installmentCount: number;
  couponCode?: string | null;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  grandTotal: number;
}

export interface OrderCreateRequest {
  couponCode?: string;
  installmentCount?: number;
  paymentProvider?: PaymentProvider;
  shippingAddress: ShippingAddressRequest;
}

export interface OrderItemResponse {
  productId: number | null;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderSummaryResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  itemCount: number;
  grandTotal: number;
  createdAt: string;
}

export interface OrderDetailResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  installmentCount: number;
  couponCode?: string | null;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  grandTotal: number;
  shippingAddress: ShippingAddressRequest;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  paymentProvider?: PaymentProvider;
}

export interface PaymentResultResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  transactionId?: string | null;
  message: string;
}
