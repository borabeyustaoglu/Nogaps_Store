export const normalizeRole = (role?: string | null): string => {
  const value = String(role ?? '').trim().toLowerCase();
  if (value === 'admin' || value === 'administrator' || value === 'adminstrator') {
    return 'administrator';
  }
  if (value === 'manager') {
    return 'manager';
  }
  if (value === 'user') {
    return 'user';
  }
  return value;
};

export const hasAnyRole = (
  role: string | null | undefined,
  allowedRoles: string[]
): boolean => {
  const current = normalizeRole(role);
  const normalizedAllowed = allowedRoles.map((item) => normalizeRole(item));
  return normalizedAllowed.includes(current);
};
