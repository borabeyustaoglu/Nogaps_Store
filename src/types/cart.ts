export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartLine {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
}
