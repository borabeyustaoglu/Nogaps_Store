import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart2,
  ClipboardList,
  Loader2,
  Package,
  Shield,
  ShoppingCart,
  Tags,
  TicketPercent,
  User,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AppShell } from '../components/AppShell';
import type { Product } from '../types/product';
import type { CartItem } from '../types/cart';
import type { UserListItem } from '../types/auth';
import { STORAGE_KEYS } from '../constants/storage';
import { normalizeRole } from '../utils/roles';
import api from '../api/axios';
import type { CustomAxiosRequestConfig } from '../api/axios';

const PRODUCTS_STORAGE_KEY = STORAGE_KEYS.products;
const CART_STORAGE_KEY = STORAGE_KEYS.cart;

type UnknownRecord = Record<string, unknown>;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const record = value as UnknownRecord;
  const candidates = ['data', 'Data', 'content', 'items', 'results', 'list', 'rows', 'users', 'payload'];
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

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const role = normalizeRole(user?.role);
  const [managerUsers, setManagerUsers] = useState<UserListItem[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const productStats = useMemo(() => {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (!raw) return { count: 0, lowStock: 0 };
      const parsed = JSON.parse(raw) as Product[];
      if (!Array.isArray(parsed)) return { count: 0, lowStock: 0 };
      return {
        count: parsed.length,
        lowStock: parsed.filter((product) => product.stock <= 5).length,
      };
    } catch {
      return { count: 0, lowStock: 0 };
    }
  }, []);

  const cartStats = useMemo(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return { lines: 0, quantity: 0 };
      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return { lines: 0, quantity: 0 };
      return {
        lines: parsed.length,
        quantity: parsed.reduce((sum, item) => sum + item.quantity, 0),
      };
    } catch {
      return { lines: 0, quantity: 0 };
    }
  }, []);

  useEffect(() => {
    if (role !== 'manager') return;
    let active = true;
    const fetchUsersForManager = async () => {
      setIsUsersLoading(true);
      try {
        const response = await requestFirstSuccess(
          ['/users', '/users/list', '/users/all', '/users/getall'],
          (path) =>
            api.get(path, {
              skipLogoutOn401: true,
            } as CustomAxiosRequestConfig)
        );
        if (!active) return;
        setManagerUsers(toArray(response.data).map(mapUser));
      } catch {
        if (!active) return;
      } finally {
        if (active) setIsUsersLoading(false);
      }
    };
    void fetchUsersForManager();
    return () => {
      active = false;
    };
  }, [role]);

  const cards = [
    {
      icon: <User size={20} />,
      title: 'Profil',
      desc: 'Hesap bilgilerini guncelle',
      color: 'from-slate-800/70 to-black/70 border-slate-700/40',
      to: '/profile',
      visible: Boolean(user),
    },
    {
      icon: <ShoppingCart size={20} />,
      title: 'Sepet',
      desc:
        cartStats.lines > 0
          ? `${cartStats.lines} kalem, ${cartStats.quantity} adet urun`
          : 'Sepet alanina git',
      color: 'from-slate-800/70 to-black/70 border-slate-700/40',
      to: '/cart',
      visible: role === 'user',
    },
    {
      icon: <TicketPercent size={20} />,
      title: 'Kuponlarim',
      desc: 'Hesabina atanan kuponlari gor',
      color: 'from-slate-800/70 to-black/70 border-slate-700/40',
      to: '/my-coupons',
      visible: role === 'user',
    },
    {
      icon: <ClipboardList size={20} />,
      title: 'Siparislerim',
      desc: 'Tum siparislerini gor, takip et ve iptal et',
      color: 'from-slate-800/70 to-black/70 border-slate-700/40',
      to: '/orders',
      visible: role === 'user',
    },
    {
      icon: <Package size={20} />,
      title: 'Urun Yonetimi',
      desc:
        productStats.count > 0
          ? `${productStats.count} urun, ${productStats.lowStock} kritik stok`
          : 'Urun yonetim alanina git',
      color: 'from-brand-500/10 to-brand-900/10 border-brand-500/30',
      to: '/products',
      visible: role === 'administrator',
    },
    {
      icon: <Tags size={20} />,
      title: 'Kategori Yonetimi',
      desc: 'Kategori yonetim alanina git',
      color: 'from-brand-500/10 to-brand-900/10 border-brand-500/30',
      to: '/categories',
      visible: role === 'manager',
    },
    {
      icon: <BarChart2 size={20} />,
      title: 'Loglar',
      desc: 'Sistem loglarini goruntule',
      color: 'from-slate-800/70 to-black/70 border-slate-700/40',
      to: '/logs',
      visible: role === 'administrator' || role === 'manager',
    },
    {
      icon: <Users size={20} />,
      title: 'Kullanici Yonetimi',
      desc: 'Tum kullanicilari goruntule ve guncelle',
      color: 'from-brand-500/10 to-brand-900/10 border-brand-500/30',
      to: '/users',
      visible: role === 'manager',
    },
    {
      icon: <TicketPercent size={20} />,
      title: 'Kupon Yonetimi',
      desc: 'Kupon olustur ve kullanicilara ata',
      color: 'from-brand-500/10 to-brand-900/10 border-brand-500/30',
      to: '/coupon-management',
      visible: role === 'manager',
    },
  ].filter((card) => card.visible);

  return (
    <AppShell
      title={`Hos geldiniz, ${user?.fullName?.split(' ')[0] ?? 'Kullanici'}`}
      subtitle="Bugun ne yapmak istersiniz?"
    >
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up"
        style={{ animationDelay: '0.1s', opacity: 0 }}
      >
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className={`group rounded-2xl border bg-gradient-to-br p-6 transition-all duration-200 hover:scale-[1.02] hover:border-brand-400/40 ${card.color}`}
          >
            <div className="flex items-start justify-between">
              <div className="mb-4 text-brand-300">{card.icon}</div>
              <ArrowRight
                size={16}
                className="text-slate-500 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-brand-300"
              />
            </div>
            <h3 className="mb-1 font-display font-semibold text-white">{card.title}</h3>
            <p className="text-sm text-slate-500">{card.desc}</p>
          </Link>
        ))}
      </div>

      {role === 'manager' && (
        <section
          className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 animate-fade-up"
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Manager Kullanici Listesi</h2>
              <p className="text-sm text-slate-400">
                Tum kullanicilar manager panelinden guncellenebilir. Bu alan adminde gorunmez.
              </p>
            </div>
            <Link
              to="/users"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/20"
            >
              Kullanici Yonetimine Git
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-black/50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kullanici</th>
                  <th className="px-4 py-3 text-left">E-posta</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                </tr>
              </thead>
              <tbody>
                {isUsersLoading && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Kullanicilar yukleniyor...
                      </span>
                    </td>
                  </tr>
                )}
                {!isUsersLoading && managerUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      Kullanici listesi su an bos.
                    </td>
                  </tr>
                )}
                {!isUsersLoading &&
                  managerUsers.slice(0, 8).map((item) => (
                    <tr key={item.id || item.username} className="border-t border-slate-800/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-100">{item.fullName}</p>
                        <p className="text-xs text-slate-500">@{item.username}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{item.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-black/40 px-2.5 py-1 text-xs text-slate-300">
                          <Shield size={10} />
                          {item.role}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
};
