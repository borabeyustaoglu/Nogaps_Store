import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, MapPin, PackageOpen } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { checkoutApi } from '../api/checkout';
import { cartApi } from '../api/cart';
import type { OrderDetailResponse, PaymentProvider } from '../types/checkout';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyError } from '../utils/notify';

const PAYMENT_PROVIDERS: PaymentProvider[] = ['MOCK', 'IYZICO', 'STRIPE', 'PAYTR'];

export const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<OrderDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('MOCK');
  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null);

  const numericOrderId = useMemo(() => {
    const parsed = Number(orderId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [orderId]);

  useEffect(() => {
    if (!numericOrderId) return;
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [orderDetail, cartLines] = await Promise.all([
          checkoutApi.getOrderDetail(numericOrderId),
          cartApi.listCart(),
        ]);
        if (!active) return;
        setDetail(orderDetail);
        setCartCount(cartLines.reduce((sum, line) => sum + line.quantity, 0));
      } catch (error: unknown) {
        if (!active) return;
        notifyError(getApiErrorMessage(error, 'Siparis detayi alinamadi.'));
        navigate('/orders');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [numericOrderId, navigate]);

  const canPay = detail?.status === 'PENDING_PAYMENT' || detail?.status === 'FAILED';

  const runPayment = async (retry: boolean) => {
    if (!detail || isPaying) return;
    setIsPaying(true);
    try {
      const result = retry
        ? await checkoutApi.retryPayment(detail.orderId, { paymentProvider })
        : await checkoutApi.payOrder(detail.orderId, { paymentProvider });
      setDetail((prev) => (prev ? { ...prev, status: result.status } : prev));
      setSuccessPopupMessage(result.message || 'Odeme islemi tamamlandi.');
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Odeme islemi basarisiz.'));
    } finally {
      setIsPaying(false);
    }
  };

  if (!numericOrderId) {
    return (
      <StoreLayout title="Siparis" subtitle="Gecersiz siparis numarasi." cartCount={cartCount}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <p className="text-slate-300">Gecersiz siparis id.</p>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout
      title={detail ? `Siparis ${detail.orderNumber}` : 'Siparis Detayi'}
      subtitle="Siparis durumunu, urunleri ve odeme adimlarini buradan yonet."
      cartCount={cartCount}
    >
      {isLoading && <p className="text-sm text-slate-400">Yukleniyor...</p>}
      {!isLoading && detail && (
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <PackageOpen size={18} />
                Urunler
              </h2>
              <div className="mt-4 space-y-3">
                {detail.items.map((item, index) => (
                  <div
                    key={`${item.productId ?? 'x'}-${index}`}
                    className="rounded-xl border border-slate-800 bg-black/35 p-3"
                  >
                    <p className="text-base font-semibold text-slate-100">{item.productName}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.productSku}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-400">{item.quantity} adet</span>
                      <span className="font-semibold text-white">
                        TRY {item.lineTotal.toLocaleString('tr-TR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <MapPin size={18} />
                Teslimat
              </h2>
              <div className="mt-3 text-sm text-slate-300">
                <p>{detail.shippingAddress.fullName}</p>
                <p>{detail.shippingAddress.phoneNumber}</p>
                <p>
                  {detail.shippingAddress.city} / {detail.shippingAddress.district}
                </p>
                <p>{detail.shippingAddress.addressLine}</p>
                {detail.shippingAddress.postalCode && <p>{detail.shippingAddress.postalCode}</p>}
                {detail.shippingAddress.country && <p>{detail.shippingAddress.country}</p>}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-300">Durum</p>
              <p className="mt-1 text-lg font-semibold text-white">{detail.status}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Ara Toplam</span>
                  <span>TRY {detail.subtotal.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Indirim</span>
                  <span>TRY {detail.discountTotal.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Kargo</span>
                  <span>TRY {detail.shippingFee.toLocaleString('tr-TR')}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 text-base font-semibold text-white">
                  <div className="flex items-center justify-between">
                    <span>Toplam</span>
                    <span>TRY {detail.grandTotal.toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            </div>

            {canPay && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <h3 className="flex items-center gap-2 text-base font-semibold text-amber-200">
                  <CreditCard size={16} />
                  Odeme
                </h3>
                <select
                  value={paymentProvider}
                  onChange={(event) => setPaymentProvider(event.target.value as PaymentProvider)}
                  className="mt-3 w-full rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
                >
                  {PAYMENT_PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void runPayment(false)}
                    disabled={isPaying}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
                  >
                    {isPaying && <Loader2 size={14} className="animate-spin" />}
                    Ode
                  </button>
                  <button
                    type="button"
                    onClick={() => void runPayment(true)}
                    disabled={isPaying}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-brand-500/40 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            <Link
              to="/orders"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-brand-500/40"
            >
              Siparis Listesine Don
            </Link>
          </aside>
        </section>
      )}
      {successPopupMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-900 p-6 text-center shadow-2xl">
            <p className="text-lg font-semibold text-white">{successPopupMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessPopupMessage(null)}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </StoreLayout>
  );
};
