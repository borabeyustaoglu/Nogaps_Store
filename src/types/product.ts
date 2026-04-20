export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  category: string;
  categoryId?: number;
  price: number;
  stock: number;
  updatedAt: string;
  imageUrl?: string;
  specs?: Record<string, string>;
}

export interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  stock: string;
  specs: Record<string, string>;
}
