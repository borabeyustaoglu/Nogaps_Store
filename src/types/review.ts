export interface ProductReview {
  id: number;
  productId: number;
  userId: number;
  username: string;
  fullName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

export interface ProductReviewCreateRequest {
  rating: number;
  title?: string;
  comment: string;
}
