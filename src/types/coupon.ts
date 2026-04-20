export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CouponManageItem {
  id: number;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  active: boolean;
  usageLimit?: number | null;
  usedCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  unlimitedDuration: boolean;
  assignedUserCount: number;
}

export interface CouponCreateRequest {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  active?: boolean;
  usageLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  unlimitedDuration?: boolean;
  userIds?: number[];
  perUserUsageLimit?: number | null;
}

export interface CouponAssignRequest {
  userIds: number[];
  active?: boolean;
  usageLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  unlimitedDuration?: boolean;
}

export interface MyCouponItem {
  userCouponId: number;
  couponId: number;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
  active: boolean;
  usageLimit?: number | null;
  usedCount: number;
  remainingUsage?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  unlimitedDuration: boolean;
}
