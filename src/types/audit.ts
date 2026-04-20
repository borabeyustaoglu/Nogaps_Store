export interface AuditLog {
  id: string;
  action: string;
  module: 'products' | 'cart' | 'auth' | 'system' | 'users';
  detail: string;
  createdAt: string;
}
