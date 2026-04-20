import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Search, Shield, Trash2, Users, X } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { notifySuccess, notifyError } from '../utils/notify';
import { appendAuditLog } from '../utils/auditLog';
import { getApiErrorMessage } from '../utils/apiError';
import api from '../api/axios';
import type { CustomAxiosRequestConfig } from '../api/axios';
import type { UserListItem, UserUpdateRequest } from '../types/auth';

type UnknownRecord = Record<string, unknown>;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  const record = value as UnknownRecord;
  const candidates = [
    'data',
    'Data',
    'content',
    'items',
    'results',
    'list',
    'rows',
    'users',
    'payload',
    'value',
  ];

  for (const key of candidates) {
    const item = record[key];
    if (Array.isArray(item)) return item;
    if (item && typeof item === 'object') {
      const nested = toArray(item);
      if (nested.length > 0) return nested;
    }
  }
  return [];
};

const mapUser = (raw: unknown): UserListItem => {
  const item = (raw ?? {}) as UnknownRecord;
  return {
    id: asString(item.id || item.userId, ''),
    username: asString(item.username || item.userName, ''),
    fullName: asString(item.fullName || item.fullname || item.name, ''),
    email: asString(item.email || item.mail, ''),
    phoneNumber: asString(item.phoneNumber || item.phone || item.phone_number, ''),
    address: asString(item.address || item.addr, ''),
    role: asString(item.role || item.roleName, 'user'),
    permissions: Array.isArray(item.permissions) ? item.permissions : [],
    createdAt: asString(item.createdAt || item.created_at, ''),
    updatedAt: asString(item.updatedAt || item.updated_at, ''),
  };
};

const ROLE_OPTIONS = ['user', 'manager', 'administrator'];

const requestFirstSuccess = async <T,>(
  endpoints: string[],
  handler: (path: string) => Promise<T>
) => {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await handler(endpoint);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No endpoint succeeded.');
};

const safeAuthConfig: CustomAxiosRequestConfig = {
  skipLogoutOn401: true,
};

export const UsersManagementPage = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [formRole, setFormRole] = useState('user');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await requestFirstSuccess(
        ['/users', '/users/list', '/users/all', '/users/getall'],
        (path) => api.get(path, safeAuthConfig)
      );
      const mapped = toArray(response.data).map(mapUser);
      setUsers(mapped);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kullanici listesi alinamadi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      await fetchUsers();
      if (!active) return;
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const resetForm = () => {
    setEditingUser(null);
    setFormRole('user');
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
  };

  const handleEdit = (user: UserListItem) => {
    setEditingUser(user);
    setFormRole(user.role);
    setFormFullName(user.fullName);
    setFormEmail(user.email);
    setFormPhone(user.phoneNumber);
    setFormAddress(user.address);
  };

  const handleDelete = async (id: string) => {
    if (isSaving) return;
    const target = users.find((u) => u.id === id);
    setIsSaving(true);
    try {
      await requestFirstSuccess(
        [`/users/${id}`],
        (path) => api.delete(path, safeAuthConfig)
      );
      await fetchUsers();
      if (editingUser?.id === id) resetForm();
      if (target) {
        appendAuditLog({
          action: 'delete',
          module: 'users',
          detail: `User deleted: ${target.username}`,
        });
      }
      notifySuccess('Kullanici silindi.');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Kullanici silinemedi.');
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isSaving || !editingUser) return;

    const payload: UserUpdateRequest = {
      id: editingUser.id,
      fullName: formFullName.trim() || undefined,
      email: formEmail.trim() || undefined,
      phoneNumber: formPhone.trim() || undefined,
      address: formAddress.trim() || undefined,
      role: formRole,
    };

    setIsSaving(true);
    try {
      await requestFirstSuccess(
        [`/users/${editingUser.id}`],
        (path) => api.put(path, payload, safeAuthConfig)
      );
      appendAuditLog({
        action: 'update',
        module: 'users',
        detail: `User updated: ${editingUser.username} → role: ${formRole}`,
      });
      notifySuccess('Kullanici guncellendi.');
      await fetchUsers();
      resetForm();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Kullanici guncellenemedi.');
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'administrator':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'manager':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  return (
    <AppShell
      title="Kullanici Yonetimi"
      subtitle="Kullanicilari goruntule, duzenle ve sil"
    >
      <section
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 mb-6 animate-fade-up"
        style={{ opacity: 0 }}
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5">
            <Search size={16} className="text-slate-400" />
            <input
              id="users-search"
              name="usersSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kullanici ara"
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            <span>{users.length} kullanici</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div
          className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden animate-fade-up"
          style={{ animationDelay: '0.05s', opacity: 0 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-black/50">
                <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Kullanici</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">Islemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      {isLoading ? 'Yukleniyor...' : 'Kullanici bulunamadi.'}
                    </td>
                  </tr>
                )}
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id || user.username}
                    className="border-t border-slate-800/70 hover:bg-slate-800/20 transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{user.fullName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">@{user.username}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadgeColor(user.role)}`}
                      >
                        <Shield size={10} />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-brand-400/40 hover:bg-brand-500/10 transition-all duration-150"
                        >
                          <Pencil size={12} />
                          Duzenle
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-150"
                        >
                          <Trash2 size={12} />
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 animate-fade-up"
          style={{ animationDelay: '0.1s', opacity: 0 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
              <Users size={18} />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">
              {editingUser ? 'Kullanici Duzenle' : 'Kullanici Sec'}
            </h2>
          </div>

          {editingUser ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-500 mb-1 block">
                  Kullanici Adi
                </label>
                <p className="rounded-xl border border-slate-700/60 bg-black/30 px-3 py-2.5 text-sm text-slate-400">
                  @{editingUser.username}
                </p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-500 mb-1 block">
                  Ad Soyad
                </label>
                <input
                  id="user-fullname"
                  name="fullName"
                  value={formFullName}
                  onChange={(event) => setFormFullName(event.target.value)}
                  placeholder="Ad Soyad"
                  className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-500 mb-1 block">
                  E-posta
                </label>
                <input
                  id="user-email"
                  name="email"
                  value={formEmail}
                  onChange={(event) => setFormEmail(event.target.value)}
                  placeholder="E-posta"
                  className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-500 mb-1 block">
                  Telefon
                </label>
                <input
                  id="user-phone"
                  name="phoneNumber"
                  value={formPhone}
                  onChange={(event) => setFormPhone(event.target.value)}
                  placeholder="Telefon"
                  className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-500 mb-1 block">
                  Adres
                </label>
                <input
                  id="user-address"
                  name="address"
                  value={formAddress}
                  onChange={(event) => setFormAddress(event.target.value)}
                  placeholder="Adres"
                  className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-500 mb-1 block">
                  Rol
                </label>
                <select
                  id="user-role"
                  name="role"
                  value={formRole}
                  onChange={(event) => setFormRole(event.target.value)}
                  className="w-full rounded-xl border border-slate-800/80 bg-black/50 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm py-2.5 transition-colors duration-150"
              >
                {isSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Pencil size={15} />
                )}
                {isSaving ? 'Kaydediliyor...' : 'Guncelle'}
              </button>
              <button
                onClick={resetForm}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm py-2.5 transition-colors duration-150"
              >
                <X size={14} />
                Iptal
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Duzenlemek icin tablodaki bir kullaniciyi secin.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
};
