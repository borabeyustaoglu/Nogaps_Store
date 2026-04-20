import { useEffect, useMemo, useState } from 'react';
import { TicketPercent, Clock3, Infinity as InfinityIcon, RefreshCw } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { couponsApi } from '../api/coupons';
import type { MyCouponItem } from '../types/coupon';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyError } from '../utils/notify';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('tr-TR');
};

const discountLabel = (coupon: MyCouponItem) =>
  coupon.discountType === 'PERCENTAGE'
    ? `%${coupon.discountValue.toFixed(0)} indirim`
    : `${coupon.discountValue.toFixed(2)} TL indirim`;

export const MyCouponsPage = () => {
  const [coupons, setCoupons] = useState<MyCouponItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const items = await couponsApi.listMyCoupons();
      setCoupons(items);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Kuponlar alinamadi.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCoupons();
  }, []);

  const activeCoupons = useMemo(() => coupons.filter((item) => item.active), [coupons]);

  return (
    <AppShell title="Kuponlarim" subtitle="Sana atanan kuponlari burada kullanabilirsin">
      <section className="mb-6 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <p className="text-sm text-slate-400">Toplam kupon</p>
          <p className="text-xl font-semibold text-white">
            {coupons.length} <span className="text-sm text-emerald-300">({activeCoupons.length} aktif)</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCoupons()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-black/40 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-500/60 hover:text-white"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </section>

      {coupons.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400">
          Hesabina atanmis kupon bulunmuyor.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {coupons.map((coupon) => (
          <article
            key={coupon.userCouponId}
            className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/60 to-black/70 p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Kupon Kodu</p>
                <p className="mt-1 text-2xl font-black tracking-[0.08em] text-brand-300">{coupon.code}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                  coupon.active
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400'
                }`}
              >
                <TicketPercent size={12} />
                {coupon.active ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            <p className="text-base font-semibold text-white">{discountLabel(coupon)}</p>
            <p className="mt-1 text-sm text-slate-400">
              Min. siparis: <span className="text-slate-200">{coupon.minOrderAmount.toFixed(2)} TL</span>
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <Clock3 size={14} className="text-brand-300" />
                Baslangic: {formatDate(coupon.startsAt)}
              </p>
              <p className="inline-flex items-center gap-2">
                {coupon.unlimitedDuration ? (
                  <InfinityIcon size={14} className="text-brand-300" />
                ) : (
                  <Clock3 size={14} className="text-brand-300" />
                )}
                Bitis: {coupon.unlimitedDuration ? 'Sinirsiz' : formatDate(coupon.endsAt)}
              </p>
              <p>
                Kullanim: {coupon.usedCount}
                {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ' / Sinirsiz'}
              </p>
              <p>
                Kalan: {coupon.remainingUsage == null ? 'Sinirsiz' : `${coupon.remainingUsage} adet`}
              </p>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
};
