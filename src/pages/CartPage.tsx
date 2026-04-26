import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout';
import { notifyError } from '../utils/notify';
import type { Product } from '../types/product';
import type { CartItem, CartLine } from '../types/cart';
import { appendAuditLog } from '../utils/auditLog';
import { useAuthStore } from '../store/authStore';
import { readProductsFromStorage, persistProductsToStorage } from '../utils/productStore';
import { catalogApi } from '../api/catalog';
import { getProductImage } from '../utils/productImages';
import { cartApi } from '../api/cart';
import { getApiErrorMessage } from '../utils/apiError';
import { readGuestCart, writeGuestCart } from '../utils/guestCart';

const readLocalCart = (): CartItem[] => readGuestCart();

export const CartPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const authenticated = isAuthenticated();

  const [products, setProducts] = useState<Product[]>(() => readProductsFromStorage());
  const [localCartItems, setLocalCartItems] = useState<CartItem[]>(() => readLocalCart());
  const [remoteCartLines, setRemoteCartLines] = useState<CartLine[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartSaving, setIsCartSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const syncProducts = async () => {
      try {
        const backendProducts = await catalogApi.getProducts();
        if (!active || backendProducts.length === 0) return;
        persistProductsToStorage(backendProducts);
        setProducts(backendProducts);
      } catch {
        if (!active) return;
      }
    };
    void syncProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    const syncRemoteCart = async () => {
      setIsCartLoading(true);
      try {
        const lines = await cartApi.listCart();
        if (!active) return;
        setRemoteCartLines(lines);
      } catch (error: unknown) {
        if (!active) return;
        notifyError(getApiErrorMessage(error, 'Cart list request failed.'));
      } finally {
        if (active) setIsCartLoading(false);
      }
    };
    void syncRemoteCart();
    return () => {
      active = false;
    };
  }, [authenticated]);

  const localProductById = useMemo(
    () =>
      products.reduce<Record<string, Product>>((acc, product) => {
        acc[product.id] = product;
        return acc;
      }, {}),
    [products]
  );

  const localDetailedItems = useMemo(() => {
    return localCartItems
      .map((item) => {
        const product = localProductById[item.productId];
        if (!product) return null;
        return {
          key: item.productId,
          productId: Number(item.productId),
          title: product.name,
          subtitle: product.sku,
          imageUrl: getProductImage(product.category, product.imageUrl),
          quantity: item.quantity,
          unitPrice: product.price,
          lineTotal: product.price * item.quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [localCartItems, localProductById]);

  const remoteDetailedItems = useMemo(
    () =>
      remoteCartLines.map((line) => ({
        key: String(line.productId),
        productId: line.productId,
        title: line.productName,
        subtitle: `Product ID: ${line.productId}`,
        imageUrl: getProductImage('General'),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    [remoteCartLines]
  );

  const detailedItems = authenticated ? remoteDetailedItems : localDetailedItems;

  const cartCount = useMemo(
    () => detailedItems.reduce((sum, item) => sum + item.quantity, 0),
    [detailedItems]
  );

  const subtotal = useMemo(
    () => detailedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [detailedItems]
  );

  const vat = Math.round(subtotal * 0.2);
  const grandTotal = subtotal + vat;

  const persistLocalCart = (nextItems: CartItem[]) => {
    setLocalCartItems(nextItems);
    writeGuestCart(nextItems);
    window.dispatchEvent(new Event('nogaps:cart-updated'));
  };

  const refreshRemoteCart = async () => {
    const lines = await cartApi.listCart();
    setRemoteCartLines(lines);
  };

  const updateQuantity = async (productId: number, nextQuantity: number) => {
    if (!authenticated) {
      const productIdAsString = String(productId);
      if (nextQuantity <= 0) {
        persistLocalCart(localCartItems.filter((item) => item.productId !== productIdAsString));
        return;
      }
      persistLocalCart(
        localCartItems.map((item) =>
          item.productId === productIdAsString ? { ...item, quantity: nextQuantity } : item
        )
      );
      return;
    }

    if (isCartSaving) return;
    setIsCartSaving(true);
    try {
      const currentQuantity =
        remoteCartLines.find((line) => line.productId === productId)?.quantity ?? 0;

      if (nextQuantity <= 0) {
        await cartApi.removeFromCart(productId);
      } else if (nextQuantity > currentQuantity) {
        await cartApi.addToCart({ productId, quantity: nextQuantity - currentQuantity });
      } else if (nextQuantity < currentQuantity) {
        await cartApi.removeFromCart(productId);
        await cartApi.addToCart({ productId, quantity: nextQuantity });
      } else {
        return;
      }
      await refreshRemoteCart();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Cart update request failed.'));
    } finally {
      setIsCartSaving(false);
    }
  };

  const removeItem = async (productId: number) => {
    if (!authenticated) {
      persistLocalCart(localCartItems.filter((item) => item.productId !== String(productId)));
      return;
    }

    if (isCartSaving) return;
    setIsCartSaving(true);
    try {
      await cartApi.removeFromCart(productId);
      await refreshRemoteCart();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Cart remove request failed.'));
    } finally {
      setIsCartSaving(false);
    }
  };

  const clearCart = async () => {
    if (detailedItems.length === 0) return;

    if (!authenticated) {
      persistLocalCart([]);
      return;
    }

    if (isCartSaving) return;
    setIsCartSaving(true);
    try {
      await Promise.all(detailedItems.map((item) => cartApi.removeFromCart(item.productId)));
      await refreshRemoteCart();
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Cart clear request failed.'));
    } finally {
      setIsCartSaving(false);
    }
  };

  const handleCheckout = () => {
    if (!authenticated) {
      notifyError('Satin alma icin once giris yapmalisiniz.');
      navigate('/login?redirect=/cart');
      return;
    }
    appendAuditLog({
      action: 'checkout',
      module: 'cart',
      detail: 'User proceeded to checkout',
    });
    navigate('/checkout');
  };

  return (
    <StoreLayout
      title="Sepet"
      subtitle="Satin alma adiminda giris zorunludur."
      cartCount={cartCount}
    >
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-black/50">
                <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Urun</th>
                  <th className="px-4 py-3">Birim Fiyat</th>
                  <th className="px-4 py-3">Adet</th>
                  <th className="px-4 py-3">Toplam</th>
                  <th className="px-4 py-3 text-right">Islem</th>
                </tr>
              </thead>
              <tbody>
                {detailedItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      {isCartLoading ? 'Sepet yukleniyor...' : 'Sepetiniz su an bos.'}
                    </td>
                  </tr>
                )}
                {detailedItems.map((item) => (
                  <tr
                    key={item.key}
                    className="border-t border-slate-800/70 hover:bg-slate-800/20 transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium text-slate-100">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.subtitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      TRY {item.unitPrice.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center rounded-lg border border-slate-700 overflow-hidden">
                        <button
                          onClick={() => void updateQuantity(item.productId, item.quantity - 1)}
                          disabled={isCartSaving}
                          className="px-2.5 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors duration-150 disabled:opacity-50"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-3 py-1.5 text-slate-200">{item.quantity}</span>
                        <button
                          onClick={() => void updateQuantity(item.productId, item.quantity + 1)}
                          disabled={isCartSaving}
                          className="px-2.5 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors duration-150 disabled:opacity-50"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">
                      TRY {item.lineTotal.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void removeItem(item.productId)}
                        disabled={isCartSaving}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-150 disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        Kaldir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
              <ShoppingCart size={18} />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">Siparis Ozeti</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span>Kalem</span>
              <span>{detailedItems.length}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Ara Toplam</span>
              <span>TRY {subtotal.toLocaleString('tr-TR')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>KDV (20%)</span>
              <span>TRY {vat.toLocaleString('tr-TR')}</span>
            </div>
            <div className="h-px bg-slate-800 my-1" />
            <div className="flex items-center justify-between text-white font-semibold">
              <span>Genel Toplam</span>
              <span>TRY {grandTotal.toLocaleString('tr-TR')}</span>
            </div>
          </div>

          <button
            onClick={() => void clearCart()}
            disabled={detailedItems.length === 0 || isCartSaving}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-slate-200 transition-all duration-150"
          >
            <Trash2 size={14} />
            Sepeti temizle
          </button>
          <button
            onClick={handleCheckout}
            disabled={detailedItems.length === 0}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-brand-900"
          >
            <ShoppingCart size={14} />
            Satin alma
          </button>
          {!authenticated && detailedItems.length > 0 && (
            <p className="mt-3 text-center text-sm text-slate-400">
              Satin alma icin giris yapmaniz gerekiyor.
            </p>
          )}
        </aside>
      </section>
    </StoreLayout>
  );
};
