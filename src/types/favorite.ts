export interface FavoriteProduct {
  favoriteId: number;
  productId: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  categoryId: number | null;
  categoryName: string | null;
}
