import { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { checkoutApi } from '../api/checkout';
import { cartApi } from '../api/cart';
import type { OrderSummaryResponse } from '../types/checkout';
import { getApiErrorMessage } from '../utils/apiError';
import { notifyError, notifySuccess } from '../utils/notify';

export const OrdersPage = () => {
  const [orders, setOrders] = useState<OrderSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [orderList, cartLines] = await Promise.all([checkoutApi.listMyOrders(), cartApi.listCart()]);
        if (!active) return;
        setOrders(orderList);
        setCartCount(cartLines.reduce((sum, line) => sum + line.quantity, 0));
      } catch (error: unknown) {
        if (!active) return;
        notifyError(getApiErrorMessage(error, 'Siparisler alinamadi.'));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const statusColor = useMemo(
    () =>
      new Map<string, string>([
        ['PAID', 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'],
        ['PENDING_PAYMENT', 'text-amber-300 border-amber-500/30 bg-amber-500/10'],
        ['FAILED', 'text-rose-300 border-rose-500/30 bg-rose-500/10'],
        ['CANCELLED', 'text-slate-300 border-slate-600/40 bg-slate-700/20'],
      ]),
    []
  );

  const handleCancelAndDelete = async (orderId: number) => {
    if (deletingOrderId != null) return;
    setDeletingOrderId(orderId);
    try {
      await checkoutApi.cancelOrder(orderId);
      setOrders((current) => current.filter((order) => order.orderId !== orderId));
      notifySuccess('Siparis iptal edilip listeden kaldirildi.');
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Siparis iptal edilemedi.'));
    } finally {
      setDeletingOrderId(null);
    }
  };

  return (
    <StoreLayout title="Siparislerim" subtitle="Tum siparislerinizi buradan takip edin." cartCount={cartCount}>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList size={18} className="text-brand-300" />
          <h2 className="text-lg font-semibold text-white">Gecmis Siparisler</h2>
        </div>
        {isLoading && <p className="text-sm text-slate-400">Yukleniyor...</p>}
        {!isLoading && orders.length === 0 && (
          <p className="text-sm text-slate-500">Henuz siparis bulunmuyor.</p>
        )}
        <div className="space-y-3">
          {orders.map((order) => (
            <article
              key={order.orderId}
              className="rounded-xl border border-slate-800 bg-black/35 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-100">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(order.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    statusColor.get(order.status) ?? 'text-slate-300 border-slate-700/50 bg-slate-900/40'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <p className="text-slate-400">{order.itemCount} urun</p>
                <p className="font-semibold text-white">
                  TRY {order.grandTotal.toLocaleString('tr-TR')}
                </p>
              </div>
              <Link
                to={`/orders/${order.orderId}`}
                className="mt-3 inline-flex rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-brand-500/40"
              >
                Siparis Detayi
              </Link>
              <button
                type="button"
                onClick={() => void handleCancelAndDelete(order.orderId)}
                disabled={deletingOrderId === order.orderId}
                className="mt-3 ml-2 inline-flex rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingOrderId === order.orderId ? 'Isleniyor...' : 'Siparisi Iptal Et'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </StoreLayout>
  );
};
