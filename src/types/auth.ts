export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
}

export interface PermissionResponse {
  id: number;
  name: string;
}

export interface LoginResponse {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  role: string;
  permissions: PermissionResponse[];
}

export interface MessageResponse {
  message: string;
}

export interface ProfileUpdateRequest {
  email: string;
  phoneNumber: string;
  password?: string;
  verificationCode: string;
}

export interface UserListItem extends AuthUser {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserUpdateRequest {
  id: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  role?: string;
  password?: string;
}

export interface SendVerificationCodeRequest {
  email?: string;
  phoneNumber?: string;
}

export interface AuthUser extends LoginResponse {
  username: string;
}
