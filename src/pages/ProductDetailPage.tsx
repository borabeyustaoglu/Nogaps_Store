import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  CreditCard,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
} from 'lucide-react';
import { StoreLayout } from '../components/StoreLayout';
import { STORAGE_KEYS } from '../constants/storage';
import { readProductsFromStorage, persistProductsToStorage } from '../utils/productStore';
import type { Product } from '../types/product';
import type { CartItem } from '../types/cart';
import { catalogApi } from '../api/catalog';
import { getProductImage } from '../utils/productImages';
import { useAuthStore } from '../store/authStore';
import { cartApi } from '../api/cart';
import { appendAuditLog } from '../utils/auditLog';
import { notifyError, notifySuccess } from '../utils/notify';
import { getApiErrorMessage } from '../utils/apiError';
import { reviewsApi } from '../api/reviews';
import type { ProductReview } from '../types/review';
import { normalizeRole } from '../utils/roles';
import { favoritesApi } from '../api/favorites';
import { getCategorySpecDefinition } from '../constants/categorySpecs';
import { readGuestCart, writeGuestCart } from '../utils/guestCart';

const RECENTLY_VIEWED_PRODUCTS_KEY = STORAGE_KEYS.recentlyViewedProducts;

const readCartItems = (): CartItem[] => readGuestCart();

const formatReviewDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const authenticated = isAuthenticated();

  const [products, setProducts] = useState<Product[]>(() => readProductsFromStorage());
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(() =>
    readCartItems().reduce((sum, item) => sum + item.quantity, 0)
  );
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');
  const [isImageHovered, setIsImageHovered] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<number>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<number | null>(null);

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
    if (!authenticated) {
      setCartCount(readCartItems().reduce((sum, item) => sum + item.quantity, 0));
      return;
    }
    let active = true;
    const syncRemoteCart = async () => {
      try {
        const lines = await cartApi.listCart();
        if (!active) return;
        setCartCount(lines.reduce((sum, line) => sum + line.quantity, 0));
      } catch {
        if (!active) return;
      }
    };
    void syncRemoteCart();
    return () => {
      active = false;
    };
  }, [authenticated]);

  useEffect(() => {
    const onLocalCartUpdate = () => {
      if (authenticated) return;
      setCartCount(readCartItems().reduce((sum, item) => sum + item.quantity, 0));
    };
    window.addEventListener('nogaps:cart-updated', onLocalCartUpdate);
    return () => {
      window.removeEventListener('nogaps:cart-updated', onLocalCartUpdate);
    };
  }, [authenticated]);

  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [products, productId]
  );

  useEffect(() => {
    if (!product?.id) return;
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_PRODUCTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      const normalized = Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === 'string' && item.trim().length > 0)
        : [];
      const next = [product.id, ...normalized.filter((item) => item !== product.id)].slice(0, 8);
      localStorage.setItem(RECENTLY_VIEWED_PRODUCTS_KEY, JSON.stringify(next));
    } catch {
      // ignore recently-viewed storage issues
    }
  }, [product?.id]);

  const numericProductId = useMemo(() => {
    if (!product) return null;
    const parsed = Number(product.id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [product]);

  useEffect(() => {
    if (!numericProductId) {
      setReviews([]);
      return;
    }
    let active = true;
    const fetchReviews = async () => {
      setIsReviewsLoading(true);
      try {
        const data = await reviewsApi.listByProductId(numericProductId);
        if (!active) return;
        setReviews(data);
      } catch (error: unknown) {
        if (!active) return;
        notifyError(getApiErrorMessage(error, 'Yorumlar yuklenemedi.'));
      } finally {
        if (active) setIsReviewsLoading(false);
      }
    };
    void fetchReviews();
    return () => {
      active = false;
    };
  }, [numericProductId]);

  useEffect(() => {
    if (!authenticated) {
      setFavoriteProductIds(new Set());
      return;
    }

    let active = true;
    const syncFavorites = async () => {
      try {
        const favorites = await favoritesApi.listFavorites();
        if (!active) return;
        setFavoriteProductIds(new Set(favorites.map((item) => item.productId)));
      } catch {
        if (!active) return;
      }
    };

    void syncFavorites();
    return () => {
      active = false;
    };
  }, [authenticated]);

  const relatedProducts = useMemo(() => {
    if (!product) return products.slice(0, 4);
    return products
      .filter((item) => item.id !== product.id && item.category === product.category)
      .slice(0, 4);
  }, [products, product]);

  const monthlyInstallment = product ? Math.round(product.price / 6) : 0;
  const cartSubtotal = useMemo(() => {
    if (authenticated) return 0;
    const map = products.reduce<Record<string, Product>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    return readCartItems().reduce((sum, item) => {
      const p = map[item.productId];
      if (!p) return sum;
      return sum + p.price * item.quantity;
    }, 0);
  }, [products, authenticated]);

  const reviewAverage = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
  }, [reviews]);
  const specRows = useMemo(() => {
    if (!product?.specs) return [];
    const definition = getCategorySpecDefinition(product.category);
    const labelByKey = new Map((definition?.fields ?? []).map((field) => [field.key, field.label]));
    return Object.entries(product.specs)
      .filter(([, value]) => value != null && String(value).trim().length > 0)
      .map(([key, value]) => ({
        key,
        label: labelByKey.get(key) ?? key,
        value: String(value),
      }));
  }, [product?.specs, product?.category]);
  const canModerateReviews = useMemo(() => {
    const role = normalizeRole(user?.role);
    return role === 'administrator' || role === 'manager';
  }, [user?.role]);

  const isCurrentProductFavorite = useMemo(() => {
    if (!numericProductId) return false;
    return favoriteProductIds.has(numericProductId);
  }, [favoriteProductIds, numericProductId]);

  const addToCart = async () => {
    if (!product || quantity <= 0) return;
    if (authenticated) {
      const numericId = Number(product.id);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        notifyError('Product id cart API icin uygun degil.');
        return;
      }
      try {
        await cartApi.addToCart({ productId: numericId, quantity });
        const lines = await cartApi.listCart();
        setCartCount(lines.reduce((sum, line) => sum + line.quantity, 0));
        appendAuditLog({
          action: 'add_item',
          module: 'cart',
          detail: `${product.name} added from detail page`,
        });
      } catch (error: unknown) {
        notifyError(getApiErrorMessage(error, 'Cart add request failed.'));
      }
      return;
    }

    const cartItems = readCartItems();
    const existing = cartItems.find((item) => item.productId === product.id);
    const nextItems = existing
      ? cartItems.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + quantity } : item
        )
      : [...cartItems, { productId: product.id, quantity }];

    writeGuestCart(nextItems);
    window.dispatchEvent(new Event('nogaps:cart-updated'));
    setCartCount(nextItems.reduce((sum, item) => sum + item.quantity, 0));
    appendAuditLog({
      action: 'add_item',
      module: 'cart',
      detail: `${product.name} added from detail page`,
    });
  };

  const toggleFavorite = async () => {
    if (!product || !numericProductId) {
      notifyError('Bu urun backend urun kaydiyla eslesmiyor.');
      return;
    }
    if (!authenticated) {
      notifyError('Favorilemek icin giris yapmalisiniz.');
      navigate('/login?redirect=/product/' + product.id);
      return;
    }
    if (favoriteBusyId === numericProductId) return;

    setFavoriteBusyId(numericProductId);
    try {
      if (favoriteProductIds.has(numericProductId)) {
        await favoritesApi.removeFavorite(numericProductId);
        setFavoriteProductIds((prev) => {
          const next = new Set(prev);
          next.delete(numericProductId);
          return next;
        });
      } else {
        await favoritesApi.addFavorite(numericProductId);
        setFavoriteProductIds((prev) => new Set(prev).add(numericProductId));
      }
      window.dispatchEvent(new Event('nogaps:favorites-updated'));
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Favori islemi basarisiz.'));
    } finally {
      setFavoriteBusyId(null);
    }
  };

  const submitReview = async () => {
    if (!numericProductId) {
      notifyError('Bu urun backend urun kaydiyla eslesmiyor.');
      return;
    }
    if (!authenticated) {
      notifyError('Yorum yazmak icin giris yapmalisiniz.');
      navigate('/login?redirect=/product/' + (product?.id ?? ''));
      return;
    }
    const trimmedComment = reviewComment.trim();
    if (trimmedComment.length < 3) {
      notifyError('Yorum en az 3 karakter olmali.');
      return;
    }
    if (isReviewSubmitting) return;

    setIsReviewSubmitting(true);
    try {
      const created = await reviewsApi.create(numericProductId, {
        rating: reviewRating,
        title: reviewTitle.trim() || undefined,
        comment: trimmedComment,
      });
      setReviews((prev) => [created, ...prev]);
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
      notifySuccess('Yorumunuz kaydedildi.');
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Yorum kaydedilemedi.'));
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const removeReview = async (reviewId: number) => {
    if (!numericProductId) return;
    if (!canModerateReviews) return;
    try {
      await reviewsApi.remove(numericProductId, reviewId);
      setReviews((prev) => prev.filter((item) => item.id !== reviewId));
      notifySuccess('Yorum silindi.');
    } catch (error: unknown) {
      notifyError(getApiErrorMessage(error, 'Yorum silinemedi.'));
    }
  };

  if (!product) {
    return (
      <StoreLayout title="Urun Bulunamadi" subtitle="Bu urun artik mevcut degil." cartCount={cartCount}>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-slate-300">Aradiginiz urun bulunamadi.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Ana sayfaya don
          </button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout
      title={product.name}
      subtitle="Urun detaylarini inceleyin, taksit seceneklerini gorun ve hizla sepete ekleyin."
      cartCount={cartCount}
    >
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width) * 100;
              const y = ((event.clientY - rect.top) / rect.height) * 100;
              setZoomOrigin(`${x}% ${y}%`);
            }}
            onMouseEnter={() => setIsImageHovered(true)}
            onMouseLeave={() => {
              setIsImageHovered(false);
              setZoomOrigin('50% 50%');
            }}
          >
            <img
              src={getProductImage(product.category, product.imageUrl)}
              alt={product.name}
              style={{ transformOrigin: zoomOrigin }}
              className={`h-[28rem] w-full object-cover transition duration-500 ${
                isImageHovered ? 'scale-[1.45]' : 'scale-100'
              }`}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">SKU</p>
              <p className="mt-1 text-base font-semibold text-slate-200">{product.sku}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Kategori</p>
              <p className="mt-1 text-base font-semibold text-slate-200">{product.category}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Stok</p>
              <p className="mt-1 text-base font-semibold text-slate-200">{product.stock} adet</p>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-300">Fiyat</p>
            <p className="mt-2 text-4xl font-semibold text-white">
              TRY {product.price.toLocaleString('tr-TR')}
            </p>
            <p className="mt-2 text-base text-emerald-300">
              Pesin fiyatina 6 taksit: TRY {monthlyInstallment.toLocaleString('tr-TR')} / ay
            </p>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-200"
              >
                <Minus size={14} />
              </button>
              <span className="inline-flex min-w-12 items-center justify-center rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.min(Math.max(product.stock, 1), prev + 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-200"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void addToCart()}
              disabled={product.stock === 0}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              <ShoppingCart size={16} />
              Sepete ekle
            </button>
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              disabled={favoriteBusyId === numericProductId}
              className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isCurrentProductFavorite
                  ? 'border-rose-400/60 bg-rose-500/20 text-rose-200'
                  : 'border-slate-700 text-slate-200 hover:border-rose-400/50 hover:text-rose-300'
              }`}
            >
              <Heart size={16} fill={isCurrentProductFavorite ? 'currentColor' : 'none'} />
              {isCurrentProductFavorite ? 'Favorilerden kaldir' : 'Favorilere ekle'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-base font-semibold text-slate-200"
            >
              Sepete git
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-sm uppercase tracking-[0.2em] text-brand-300">Sepet Bilgisi</h3>
            <p className="mt-2 text-base text-slate-300">Toplam urun adedi: {cartCount}</p>
            {!authenticated && (
              <p className="mt-1 text-base text-slate-400">
                Misafir ara toplam: TRY {cartSubtotal.toLocaleString('tr-TR')}
              </p>
            )}
            <p className="mt-3 text-base text-slate-300">
              Ortalama puan: {reviews.length > 0 ? reviewAverage.toFixed(1) : '-'} / 5
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-sm uppercase tracking-[0.2em] text-brand-300">Alisveris Avantajlari</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 text-emerald-300" />
                2 yil resmi distributor garantisi
              </li>
              <li className="flex items-start gap-2">
                <Truck size={16} className="mt-0.5 text-emerald-300" />
                Ayni gun kargo ve ucretsiz teslimat secenekleri
              </li>
              <li className="flex items-start gap-2">
                <CreditCard size={16} className="mt-0.5 text-emerald-300" />
                Taksitli odeme, havale indirimi ve kapida odeme
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-emerald-300" />
                14 gun kosulsuz iade
              </li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-lg font-semibold text-white">Teknik Ozellikler</h3>
          <div className="mt-4 space-y-2 text-base">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-black/30 px-3 py-2">
              <span className="text-slate-400">Urun Kodu</span>
              <span className="text-slate-200">{product.sku}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-black/30 px-3 py-2">
              <span className="text-slate-400">Kategori</span>
              <span className="text-slate-200">{product.category}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-black/30 px-3 py-2">
              <span className="text-slate-400">Garanti</span>
              <span className="text-slate-200">24 ay</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-black/30 px-3 py-2">
              <span className="text-slate-400">Stok Durumu</span>
              <span className="text-slate-200">{product.stock > 0 ? 'Stokta' : 'Tukendi'}</span>
            </div>
            {specRows.map((row) => (
              <div
                key={`spec-${row.key}`}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-black/30 px-3 py-2"
              >
                <span className="text-slate-400">{row.label}</span>
                <span className="text-slate-200">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <h3 className="text-lg font-semibold text-white">Odeme ve Taksit Secenekleri</h3>
          <div className="mt-4 space-y-2 text-base">
            {[1, 3, 6, 9].map((installment) => (
              <div
                key={installment}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-black/30 px-3 py-2"
              >
                <span className="text-slate-400">{installment} taksit</span>
                <span className="text-slate-200">
                  TRY {Math.round(product.price / installment).toLocaleString('tr-TR')} / ay
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="text-lg font-semibold text-white">Urun Degerlendirmeleri ve Yorumlar</h3>
        <div className="mt-4 rounded-xl border border-slate-800 bg-black/30 p-4">
          <p className="text-sm font-semibold text-slate-100">Yorum Yaz</p>
          <p className="mt-1 text-xs text-slate-500">
            {user ? `${user.fullName} olarak yorum yapiyorsunuz.` : 'Yorum yazmak icin giris gerekli.'}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
            <select
              id="review-rating"
              name="rating"
              value={reviewRating}
              onChange={(event) => setReviewRating(Number(event.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              {[5, 4, 3, 2, 1].map((item) => (
                <option key={item} value={item}>
                  {item} puan
                </option>
              ))}
            </select>
            <input
              id="review-title"
              name="title"
              value={reviewTitle}
              onChange={(event) => setReviewTitle(event.target.value)}
              placeholder="Baslik (opsiyonel)"
              className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
          <textarea
            id="review-comment"
            name="comment"
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder="Urun hakkinda deneyiminizi yazin"
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={() => void submitReview()}
            disabled={isReviewSubmitting}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Star size={14} />
            {isReviewSubmitting ? 'Kaydediliyor...' : 'Yorumu Kaydet'}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {isReviewsLoading && <p className="text-sm text-slate-400">Yorumlar yukleniyor...</p>}
          {!isReviewsLoading && reviews.length === 0 && (
            <p className="text-sm text-slate-500">Bu urun icin henuz yorum yok.</p>
          )}
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-slate-800 bg-black/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">{review.fullName || review.username}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500">{formatReviewDate(review.createdAt)}</p>
                  {canModerateReviews && (
                    <button
                      type="button"
                      onClick={() => void removeReview(review.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
                      aria-label="Yorumu sil"
                      title="Yorumu sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-amber-300">Rating: {review.rating}/5</p>
              {review.title && <p className="mt-2 text-base font-semibold text-slate-200">{review.title}</p>}
              <p className="mt-1 text-base text-slate-300">{review.comment}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Benzer Urunler</h3>
          <Link to="/" className="text-sm text-brand-300 hover:text-brand-200">
            Tum urunlere don
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {relatedProducts.map((item) => (
            <Link
              key={item.id}
              to={`/product/${item.id}`}
              className="rounded-xl border border-slate-800 bg-black/35 p-3 transition hover:border-brand-500/40"
            >
              <img
                src={getProductImage(item.category, item.imageUrl)}
                alt={item.name}
                className="h-24 w-full rounded-lg object-cover"
              />
              <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-100">{item.name}</p>
              <p className="mt-1 text-xs text-slate-400">TRY {item.price.toLocaleString('tr-TR')}</p>
            </Link>
          ))}
        </div>
      </section>
    </StoreLayout>
  );
};
