import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Loader2, Receipt, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { checkoutApi } from '../api/checkout';
import { cartApi } from '../api/cart';
import type {
  CheckoutPreviewResponse,
  OrderCreateRequest,
  OrderDetailResponse,
  PaymentProvider,
} from '../types/checkout';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyError, notifySuccess } from '../utils/notify';
import type { CartLine } from '../types/cart';

const PAYMENT_PROVIDERS: PaymentProvider[] = ['MOCK', 'IYZICO', 'STRIPE', 'PAYTR'];

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isOrderCreating, setIsOrderCreating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderDetailResponse | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('MOCK');

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Turkey');

  const cartCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines]
  );

  const loadCart = async () => {
    setIsCartLoading(true);
    try {
      const lines = await cartApi.listCart();
      setCartLines(lines);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Sepet bilgisi alinamadi.'));
    } finally {
      setIsCartLoading(false);
    }
  };

  const refreshPreview = async () => {
    setIsPreviewLoading(true);
    try {
      const response = await checkoutApi.preview({
        couponCode: couponCode.trim() || undefined,
        installmentCount,
      });
      setPreview(response);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Checkout on izleme basarisiz.'));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadCart();
      await refreshPreview();
    })();
  }, []);

  const validateAddress = () => {
    if (!fullName.trim() || !phoneNumber.trim() || !city.trim() || !district.trim() || !addressLine.trim()) {
      notifyError('Teslimat bilgilerini eksiksiz doldurun.');
      return false;
    }
    return true;
  };

  const createOrder = async () => {
    if (isOrderCreating) return;
    if (cartCount === 0) {
      notifyError('Sepetiniz bos.');
      return;
    }
    if (!validateAddress()) return;

    setIsOrderCreating(true);
    try {
      const payload: OrderCreateRequest = {
        couponCode: couponCode.trim() || undefined,
        installmentCount,
        paymentProvider,
        shippingAddress: {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          city: city.trim(),
          district: district.trim(),
          addressLine: addressLine.trim(),
          postalCode: postalCode.trim() || undefined,
          country: country.trim() || 'Turkey',
        },
      };
      const order = await checkoutApi.createOrder(payload);
      setCreatedOrder(order);
      setCartLines([]);
      notifySuccess(`Siparis olusturuldu: ${order.orderNumber}`);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Siparis olusturulamadi.'));
    } finally {
      setIsOrderCreating(false);
    }
  };

  const payOrder = async () => {
    if (!createdOrder || isPaying) return;
    setIsPaying(true);
    try {
      const result = await checkoutApi.payOrder(createdOrder.orderId, { paymentProvider });
      setCreatedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: result.status,
            }
          : prev
      );
      notifySuccess(result.message || 'Odeme tamamlandi.');
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Odeme basarisiz.'));
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <StoreLayout
      title="Checkout"
      subtitle="Adres, kupon ve odeme seceneklerini tek adimda yonet."
      cartCount={cartCount}
    >
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ShoppingBag size={18} />
              Teslimat Bilgileri
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ad Soyad"
                className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="Telefon"
                className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Sehir"
                className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                placeholder="Ilce"
                className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                placeholder="Posta Kodu (opsiyonel)"
                className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Ulke"
                className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <textarea
                value={addressLine}
                onChange={(event) => setAddressLine(event.target.value)}
                placeholder="Adres satiri"
                rows={3}
                className="sm:col-span-2 rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CreditCard size={18} />
              Odeme Ayarlari
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
                placeholder="Kupon kodu"
                className="sm:col-span-2 rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
              <select
                value={String(installmentCount)}
                onChange={(event) => setInstallmentCount(Number(event.target.value))}
                className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              >
                {[1, 2, 3, 6, 9, 12].map((item) => (
                  <option key={item} value={item}>
                    {item} taksit
                  </option>
                ))}
              </select>
              <select
                value={paymentProvider}
                onChange={(event) => setPaymentProvider(event.target.value as PaymentProvider)}
                className="sm:col-span-2 rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
              >
                {PAYMENT_PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void refreshPreview()}
                disabled={isPreviewLoading}
                className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 py-2.5 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/20 disabled:opacity-50"
              >
                {isPreviewLoading ? 'Hesaplaniyor...' : 'On Izleme'}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Receipt size={18} />
              Siparis Ozeti
            </h3>
            {isCartLoading ? (
              <p className="mt-4 text-sm text-slate-400">Sepet yukleniyor...</p>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Kalem</span>
                  <span>{preview?.itemCount ?? cartCount}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Ara Toplam</span>
                  <span>TRY {(preview?.subtotal ?? 0).toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Indirim</span>
                  <span>TRY {(preview?.discountTotal ?? 0).toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Kargo</span>
                  <span>TRY {(preview?.shippingFee ?? 0).toLocaleString('tr-TR')}</span>
                </div>
                <div className="mt-2 border-t border-slate-800 pt-2 text-base font-semibold text-white">
                  <div className="flex items-center justify-between">
                    <span>Toplam</span>
                    <span>TRY {(preview?.grandTotal ?? 0).toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void createOrder()}
              disabled={isOrderCreating || cartCount === 0}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
            >
              {isOrderCreating && <Loader2 size={16} className="animate-spin" />}
              Siparisi Olustur
            </button>
          </div>

          {createdOrder && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Olusturuldu</p>
              <p className="mt-1 text-base font-semibold text-white">{createdOrder.orderNumber}</p>
              <p className="mt-1 text-sm text-slate-300">Durum: {createdOrder.status}</p>
              <p className="mt-1 text-sm text-slate-300">
                Toplam: TRY {createdOrder.grandTotal.toLocaleString('tr-TR')}
              </p>
              <button
                type="button"
                onClick={() => void payOrder()}
                disabled={isPaying || createdOrder.status === 'PAID'}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {isPaying && <Loader2 size={16} className="animate-spin" />}
                {createdOrder.status === 'PAID' ? 'Odeme Tamamlandi' : 'Odemeyi Tamamla'}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  to={`/orders/${createdOrder.orderId}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-brand-500/40"
                >
                  Siparis Detayi
                </Link>
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-brand-500/40"
                >
                  Tum Siparisler
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>
    </StoreLayout>
  );
};
