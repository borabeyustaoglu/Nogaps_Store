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
  PaymentRequest,
  PaymentProvider,
} from '../types/checkout';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyError } from '../utils/notify';
import type { CartLine } from '../types/cart';

const PAYMENT_PROVIDERS: PaymentProvider[] = ['MOCK', 'IYZICO', 'STRIPE', 'PAYTR'];
const IYZICO_SANDBOX_TEST_CARD = {
  cardHolderName: 'John Doe',
  cardNumber: '5528790000000008',
  expireMonth: '12',
  expireYear: '2030',
  cvc: '123',
};

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isOrderCreating, setIsOrderCreating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderDetailResponse | null>(null);
  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('MOCK');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expireMonth, setExpireMonth] = useState('');
  const [expireYear, setExpireYear] = useState('');
  const [cvc, setCvc] = useState('');

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
    if (
      !fullName.trim() ||
      !phoneNumber.trim() ||
      !city.trim() ||
      !district.trim() ||
      !addressLine.trim() ||
      !country.trim()
    ) {
      notifyError('Teslimat bilgilerini eksiksiz doldurun.');
      return false;
    }
    const phoneDigits = phoneNumber.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      notifyError('Telefon numarasi en az 10 haneli olmali.');
      return false;
    }
    if (paymentProvider === 'IYZICO' && !postalCode.trim()) {
      notifyError('Iyzico odemesinde posta kodu zorunludur.');
      return false;
    }
    return true;
  };

  const validateIyzicoPayment = () => {
    if (paymentProvider !== 'IYZICO') return true;

    const holder = cardHolderName.trim();
    const numberDigits = cardNumber.replace(/\D/g, '');
    const monthDigits = expireMonth.replace(/\D/g, '');
    const yearDigits = expireYear.replace(/\D/g, '');
    const cvcDigits = cvc.replace(/\D/g, '');

    if (!holder || !numberDigits || !monthDigits || !yearDigits || !cvcDigits) {
      notifyError('Iyzico kart bilgilerini eksiksiz doldurun.');
      return false;
    }
    if (numberDigits.length < 12 || numberDigits.length > 19) {
      notifyError('Kart numarasi gecersiz.');
      return false;
    }
    const monthNumber = Number(monthDigits);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      notifyError('Kart son kullanma ayi gecersiz.');
      return false;
    }
    if (!(yearDigits.length === 2 || yearDigits.length === 4)) {
      notifyError('Kart son kullanma yili gecersiz.');
      return false;
    }
    if (cvcDigits.length < 3 || cvcDigits.length > 4) {
      notifyError('CVC bilgisi gecersiz.');
      return false;
    }
    return true;
  };

  const buildPaymentPayload = (): PaymentRequest => {
    if (paymentProvider !== 'IYZICO') {
      return { paymentProvider };
    }

    const monthNumber = Number(expireMonth.replace(/\D/g, ''));
    const normalizedMonth = String(monthNumber).padStart(2, '0');
    const rawYear = expireYear.replace(/\D/g, '');
    const normalizedYear = rawYear.length === 2 ? `20${rawYear}` : rawYear;

    return {
      paymentProvider,
      cardHolderName: cardHolderName.trim(),
      cardNumber: cardNumber.replace(/\D/g, ''),
      expireMonth: normalizedMonth,
      expireYear: normalizedYear,
      cvc: cvc.replace(/\D/g, ''),
    };
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
      setSuccessPopupMessage(`Siparis olusturuldu: ${order.orderNumber}`);
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Siparis olusturulamadi.'));
    } finally {
      setIsOrderCreating(false);
    }
  };

  const payOrder = async () => {
    if (!createdOrder || isPaying) return;
    if (!validateIyzicoPayment()) return;
    setIsPaying(true);
    try {
      const result = await checkoutApi.payOrder(createdOrder.orderId, buildPaymentPayload());
      setCreatedOrder((prev) =>
        prev
          ? {
              ...prev,
              status: result.status,
            }
          : prev
      );
      setSuccessPopupMessage(result.message || 'Odeme tamamlandi.');
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
              {paymentProvider === 'IYZICO' && (
                <>
                  <input
                    value={cardHolderName}
                    onChange={(event) => setCardHolderName(event.target.value)}
                    placeholder="Kart sahibi"
                    className="sm:col-span-2 rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
                  />
                  <input
                    value={cardNumber}
                    onChange={(event) => setCardNumber(event.target.value)}
                    placeholder="Kart numarasi"
                    className="sm:col-span-2 rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
                  />
                  <input
                    value={expireMonth}
                    onChange={(event) => setExpireMonth(event.target.value)}
                    placeholder="Son kullanma ayi (AA)"
                    className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
                  />
                  <input
                    value={expireYear}
                    onChange={(event) => setExpireYear(event.target.value)}
                    placeholder="Son kullanma yili (YYYY)"
                    className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
                  />
                  <input
                    value={cvc}
                    onChange={(event) => setCvc(event.target.value)}
                    placeholder="CVC"
                    className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCardHolderName(IYZICO_SANDBOX_TEST_CARD.cardHolderName);
                      setCardNumber(IYZICO_SANDBOX_TEST_CARD.cardNumber);
                      setExpireMonth(IYZICO_SANDBOX_TEST_CARD.expireMonth);
                      setExpireYear(IYZICO_SANDBOX_TEST_CARD.expireYear);
                      setCvc(IYZICO_SANDBOX_TEST_CARD.cvc);
                    }}
                    className="sm:col-span-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
                  >
                    Iyzico sandbox test kartini doldur
                  </button>
                </>
              )}
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
