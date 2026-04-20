import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Send, PowerOff, RotateCcw, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { couponsApi } from '../api/coupons';
import type { CouponDiscountType, CouponManageItem } from '../types/coupon';
import type { UserListItem } from '../types/auth';
import api from '../api/axios';
import type { CustomAxiosRequestConfig } from '../api/axios';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyError, notifySuccess } from '../utils/notify';

type UnknownRecord = Record<string, unknown>;

const safeAuthConfig: CustomAxiosRequestConfig = {
  skipLogoutOn401: true,
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

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('tr-TR');
};

export const CouponManagementPage = () => {
  const [coupons, setCoupons] = useState<CouponManageItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deactivatingCouponId, setDeactivatingCouponId] = useState<number | null>(null);
  const [reactivatingCouponId, setReactivatingCouponId] = useState<number | null>(null);
  const [deletingCouponId, setDeletingCouponId] = useState<number | null>(null);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('5');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserUsageLimit, setPerUserUsageLimit] = useState('1');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const [assignUserIdByCoupon, setAssignUserIdByCoupon] = useState<Record<number, number | null>>({});

  const userOptions = useMemo(
    () =>
      users
        .filter((item) => item.role.toLowerCase() === 'user')
        .map((item) => ({ id: asNumber(item.id, 0), label: `${item.fullName} (@${item.username})` }))
        .filter((item) => item.id > 0),
    [users]
  );

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [couponItems, userResponse] = await Promise.all([
        couponsApi.listManageCoupons(),
        requestFirstSuccess(['/users', '/users/list', '/users/all', '/users/getall'], (path) =>
          api.get(path, safeAuthConfig)
        ),
      ]);
      setCoupons(couponItems);
      setUsers(toArray(userResponse.data).map(mapUser));
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kupon verileri alinamadi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('5');
    setMinOrderAmount('0');
    setMaxDiscountAmount('');
    setUsageLimit('');
    setPerUserUsageLimit('1');
    setStartsAt('');
    setEndsAt('');
    setIsUnlimited(false);
    setSelectedUserIds([]);
  };

  const handleCreate = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await couponsApi.createCoupon({
        code: code.trim(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount || 0),
        maxDiscountAmount: maxDiscountAmount.trim() ? Number(maxDiscountAmount) : null,
        usageLimit: usageLimit.trim() ? Number(usageLimit) : null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: isUnlimited ? null : endsAt ? new Date(endsAt).toISOString() : null,
        unlimitedDuration: isUnlimited,
        userIds: selectedUserIds,
        perUserUsageLimit: perUserUsageLimit.trim() ? Number(perUserUsageLimit) : null,
      });
      notifySuccess('Kupon olusturuldu.');
      resetForm();
      await loadAll();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kupon olusturulamadi.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssign = async (couponId: number) => {
    const targetUserId = assignUserIdByCoupon[couponId];
    if (!targetUserId) {
      notifyError('Atamak icin bir kullanici sec.');
      return;
    }
    try {
      await couponsApi.assignCoupon(couponId, { userIds: [targetUserId] });
      notifySuccess('Kupon kullaniciya atandi.');
      await loadAll();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kupon atanamadi.'));
    }
  };

  const handleDeactivate = async (couponId: number) => {
    if (deactivatingCouponId != null) return;
    setDeactivatingCouponId(couponId);
    try {
      await couponsApi.deactivateCoupon(couponId);
      notifySuccess('Kupon pasife alindi.');
      await loadAll();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kupon pasife alinamadi.'));
    } finally {
      setDeactivatingCouponId(null);
    }
  };

  const handleReactivate = async (couponId: number) => {
    if (reactivatingCouponId != null) return;
    setReactivatingCouponId(couponId);
    try {
      await couponsApi.reactivateCoupon(couponId);
      notifySuccess('Kupon tekrar aktif edildi.');
      await loadAll();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kupon aktif edilemedi.'));
    } finally {
      setReactivatingCouponId(null);
    }
  };

  const handleDelete = async (couponId: number) => {
    if (deletingCouponId != null) return;
    setDeletingCouponId(couponId);
    try {
      await couponsApi.deleteCoupon(couponId);
      notifySuccess('Kupon silindi.');
      await loadAll();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kupon silinemedi.'));
    } finally {
      setDeletingCouponId(null);
    }
  };

  return (
    <AppShell title="Kupon Yonetimi" subtitle="Manager olarak kupon olustur ve kullanicilara ata">
      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Yeni Kupon Olustur</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Kupon kodu</p>
            <p className="mb-1 text-[11px] text-slate-500">Kisa kod (ornek: BAHAR20)</p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="BAHAR20"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Indirim tipi</p>
            <p className="mb-1 text-[11px] text-slate-500">Yuzde mi, tutar mi</p>
            <select
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as CouponDiscountType)}
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            >
              <option value="PERCENTAGE">Yuzde indirim</option>
              <option value="FIXED_AMOUNT">Sabit tutar indirim</option>
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Indirim degeri</p>
            <p className="mb-1 text-[11px] text-slate-500">Oran veya TL tutari</p>
            <input
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              placeholder="10"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Min siparis</p>
            <p className="mb-1 text-[11px] text-slate-500">Alt limit tutari</p>
            <input
              value={minOrderAmount}
              onChange={(event) => setMinOrderAmount(event.target.value)}
              placeholder="0"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Maks indirim</p>
            <p className="mb-1 text-[11px] text-slate-500">Ust sinir (opsiyonel)</p>
            <input
              value={maxDiscountAmount}
              onChange={(event) => setMaxDiscountAmount(event.target.value)}
              placeholder="Opsiyonel"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Genel kullanim</p>
            <p className="mb-1 text-[11px] text-slate-500">Toplam kac kez</p>
            <input
              value={usageLimit}
              onChange={(event) => setUsageLimit(event.target.value)}
              placeholder="Opsiyonel"
              type="number"
              min="1"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Kullanici basi</p>
            <p className="mb-1 text-[11px] text-slate-500">User basina limit</p>
            <input
              value={perUserUsageLimit}
              onChange={(event) => setPerUserUsageLimit(event.target.value)}
              placeholder="Opsiyonel"
              type="number"
              min="1"
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Baslangic tarihi</p>
            <p className="mb-1 text-[11px] text-slate-500">Ne zaman aktif olur</p>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          {!isUnlimited && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-300">Bitis tarihi</p>
              <p className="mb-1 text-[11px] text-slate-500">Kuponun son gunu</p>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-black/40 px-3 py-2.5 text-sm text-slate-100"
              />
            </div>
          )}
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={isUnlimited}
            onChange={(event) => setIsUnlimited(event.target.checked)}
          />
          Sinirsiz sure
        </label>

        <div className="mt-4 rounded-xl border border-slate-800 bg-black/30 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-200">Olustururken kullanicilara ata</p>
          <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {userOptions.map((user) => (
              <label key={user.id} className="inline-flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                />
                {user.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isSaving}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-2.5 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Kupon Olustur
        </button>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Mevcut Kuponlar</h2>
        {isLoading && (
          <div className="py-8 text-center text-slate-400">
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Kuponlar yukleniyor...
            </span>
          </div>
        )}

        {!isLoading && coupons.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-black/30 p-6 text-center text-slate-500">
            Kayitli kupon yok.
          </div>
        )}

        {!isLoading && coupons.length > 0 && (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <article
                key={coupon.id}
                className="rounded-xl border border-slate-800 bg-black/30 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Kod</p>
                    <p className="text-xl font-black tracking-[0.06em] text-brand-300">{coupon.code}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {coupon.discountType === 'PERCENTAGE'
                        ? `%${coupon.discountValue.toFixed(0)} indirim`
                        : `${coupon.discountValue.toFixed(2)} TL indirim`}
                      {' · '}
                      {coupon.unlimitedDuration ? 'Sinirsiz sure' : `Bitis: ${formatDate(coupon.endsAt)}`}
                      {' · '}
                      Atanan user: {coupon.assignedUserCount}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={assignUserIdByCoupon[coupon.id] ?? ''}
                      onChange={(event) =>
                        setAssignUserIdByCoupon((prev) => ({
                          ...prev,
                          [coupon.id]: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                      className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="">Kullanici sec</option>
                      {userOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleAssign(coupon.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-500/50 hover:text-white"
                    >
                      <Send size={14} />
                      Ata
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeactivate(coupon.id)}
                      disabled={!coupon.active || deactivatingCouponId === coupon.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/60 disabled:text-slate-500"
                    >
                      {deactivatingCouponId === coupon.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <PowerOff size={14} />
                      )}
                      {coupon.active ? 'Kapat' : 'Kapali'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReactivate(coupon.id)}
                      disabled={coupon.active || reactivatingCouponId === coupon.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/60 disabled:text-slate-500"
                    >
                      {reactivatingCouponId === coupon.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      Tekrar Aktif Et
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(coupon.id)}
                      disabled={deletingCouponId === coupon.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/60 disabled:text-slate-500"
                    >
                      {deletingCouponId === coupon.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Sil
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-400 sm:grid-cols-3">
                  <p>Baslangic: {formatDate(coupon.startsAt)}</p>
                  <p>Kullanim: {coupon.usedCount}/{coupon.usageLimit ?? 'Sinirsiz'}</p>
                  <p>Min Siparis: {coupon.minOrderAmount.toFixed(2)} TL</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
};
