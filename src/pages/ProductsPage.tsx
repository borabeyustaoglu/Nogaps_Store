import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { notifySuccess, notifyError } from '../utils/notify';
import type { Product, ProductFormData } from '../types/product';
import { appendAuditLog } from '../utils/auditLog';
import { STORAGE_KEYS } from '../constants/storage';
import { catalogApi } from '../api/catalog';
import { getApiErrorMessage } from '../utils/apiError';
import {
  CATEGORY_SPEC_DEFINITIONS,
  type CategorySpecDefinition,
} from '../constants/categorySpecs';

const STORAGE_KEY = STORAGE_KEYS.products;
const STORAGE_VERSION_KEY = `${STORAGE_KEYS.products}:version`;
const PRODUCT_DATA_VERSION = 'computer-store-v2-empty';
const defaultCategoryOptions: Array<{ id: string; name: string }> = [
  { id: '1', name: 'Mouse' },
  { id: '2', name: 'Klavye' },
  { id: '3', name: 'Kulaklik' },
  { id: '4', name: 'Ekran' },
  { id: '5', name: 'Kasa' },
  { id: '6', name: 'Kasa Icerikleri' },
];

const seedProducts: Product[] = [];

const emptyForm: ProductFormData = {
  name: '',
  description: '',
  categoryId: '',
  price: '',
  stock: '',
  specs: {},
};

const readProductsFromStorage = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedProducts;
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedProducts;
  } catch {
    return seedProducts;
  }
};

export const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>(readProductsFromStorage);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>(
    defaultCategoryOptions
  );
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  const [categorySpecDefinitions, setCategorySpecDefinitions] = useState<CategorySpecDefinition[]>(
    CATEGORY_SPEC_DEFINITIONS
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((product) => product.category))).sort()],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = search.trim().toLowerCase();
      const matchesQuery =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === 'all' || product.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + product.stock, 0),
    [products]
  );

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= 5).length,
    [products]
  );

  const persistProducts = (nextProducts: Product[]) => {
    setProducts(nextProducts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProducts));
  };

  const syncProductsFromBackend = async () => {
    const backendProducts = await catalogApi.getProducts();
    persistProducts(backendProducts);
  };

  const trySyncProductsFromBackend = async () => {
    try {
      await syncProductsFromBackend();
      return true;
    } catch {
      return false;
    }
  };

  const upsertProductLocally = (product: Product) => {
    setProducts((current) => {
      const exists = current.some((item) => item.id === product.id);
      const next = exists
        ? current.map((item) => (item.id === product.id ? product : item))
        : [product, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeProductLocally = (id: string) => {
    setProducts((current) => {
      const next = current.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const syncCategoriesFromBackend = async () => {
    const backendCategories = await catalogApi.getCategories();
    const backendMapped = backendCategories.map((item) => ({ id: item.id, name: item.name }));
    const merged = [...defaultCategoryOptions];
    backendMapped.forEach((item) => {
      const exists = merged.some(
        (baseItem) =>
          baseItem.id === item.id ||
          baseItem.name.toLowerCase() === item.name.toLowerCase()
      );
      if (!exists) {
        merged.push(item);
      }
    });
    setCategoryOptions(merged);
  };

  const syncCategorySpecsFromBackend = async () => {
    const specs = await catalogApi.getCategorySpecDefinitions();
    if (specs.length > 0) {
      setCategorySpecDefinitions(specs);
    }
  };

  useEffect(() => {
    let active = true;
    const syncFromBackend = async () => {
      const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);
      if (currentVersion !== PRODUCT_DATA_VERSION) {
        persistProducts(seedProducts);
        localStorage.setItem(STORAGE_VERSION_KEY, PRODUCT_DATA_VERSION);
      }
      setIsSyncing(true);
      try {
        await syncProductsFromBackend();
        await syncCategoriesFromBackend();
        await syncCategorySpecsFromBackend();
        if (!active) return;
      } catch (error: unknown) {
        if (!active) return;
        const message = getApiErrorMessage(error, 'Product list backendden yuklenemedi.');
        notifyError(message);
      } finally {
        if (active) setIsSyncing(false);
      }
    };
    void syncFromBackend();
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const resolveCategoryNameById = (categoryIdValue: string) => {
    const matched = categoryOptions.find((option) => option.id === categoryIdValue);
    return matched?.name ?? '';
  };

  const resolveSpecDefinition = (categoryName: string) =>
    categorySpecDefinitions.find((item) => item.categoryName === categoryName);

  const trimSpecsByCategory = (categoryName: string, specs: Record<string, string>) => {
    const definition = resolveSpecDefinition(categoryName);
    if (!definition) return {};
    const allowed = new Set(definition.fields.map((field) => field.key));
    return Object.entries(specs).reduce<Record<string, string>>((acc, [key, value]) => {
      if (!allowed.has(key)) return acc;
      const trimmed = value.trim();
      if (!trimmed) return acc;
      acc[key] = trimmed;
      return acc;
    }, {});
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId ? String(product.categoryId) : '',
      price: String(product.price),
      stock: String(product.stock),
      specs: product.specs ?? {},
    });
  };

  const handleDelete = async (id: string) => {
    if (isSaving) return;
    const deletedProduct = products.find((product) => product.id === id);
    setIsSaving(true);
    try {
      await catalogApi.deleteProduct(id);
      const synced = await trySyncProductsFromBackend();
      notifySuccess('Product removed.');
      if (!synced) {
        removeProductLocally(id);
        notifyError('Product deleted but list refresh failed.');
      }
      if (deletedProduct) {
        appendAuditLog({
          action: 'delete',
          module: 'products',
          detail: `${deletedProduct.name} (${deletedProduct.sku}) removed`,
        });
      }
      if (editingId === id) resetForm();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Product could not be deleted in backend.');
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    const name = formData.name.trim();
    const description = formData.description.trim();
    const categoryId = Number(formData.categoryId);
    const categoryName = resolveCategoryNameById(formData.categoryId);
    const specs = trimSpecsByCategory(categoryName, formData.specs);
    const price = Number(formData.price);
    const stock = Number(formData.stock);

    if (!name || !Number.isInteger(categoryId) || categoryId <= 0) {
      notifyError('Name and valid category are required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      notifyError('Price must be a valid number.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      notifyError('Stock must be a valid non-negative integer.');
      return;
    }

    setIsSaving(true);
    try {
      let savedProduct: Product | null = null;
      if (editingId) {
        savedProduct = await catalogApi.updateProduct({
          id: editingId,
          name,
          description,
          categoryId,
          price,
          stockQuantity: stock,
          specs,
        });
        appendAuditLog({
          action: 'update',
          module: 'products',
          detail: `${name} updated`,
        });
      } else {
        savedProduct = await catalogApi.createProduct({
          name,
          description,
          categoryId,
          price,
          stockQuantity: stock,
          specs,
        });
        appendAuditLog({
          action: 'create',
          module: 'products',
          detail: `${name} created`,
        });
      }

      const synced = await trySyncProductsFromBackend();
      notifySuccess(editingId ? 'Product updated.' : 'Product created.');
      if (!synced) {
        if (savedProduct) {
          upsertProductLocally(savedProduct);
        }
        notifyError('Product saved but list refresh failed.');
      }
      resetForm();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Product could not be saved in backend.');
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell title="Urunler" subtitle="Arama, filtreleme ve CRUD islemleri">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-up" style={{ opacity: 0 }}>
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4">
          <p className="text-xs uppercase tracking-widest text-brand-300 mb-2">Total products</p>
          <p className="text-2xl font-display font-bold text-white flex items-center gap-2">
            {products.length}
            {isSyncing && <Loader2 size={16} className="animate-spin text-brand-300" />}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Total stock units</p>
          <p className="text-2xl font-display font-bold text-white">{totalStock}</p>
        </div>
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Low stock (&lt;=5)</p>
          <p className="text-2xl font-display font-bold text-white">{lowStockCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 mb-6 animate-fade-up" style={{ animationDelay: '0.04s', opacity: 0 }}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="product-search"
              name="productSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by product name or SKU"
              className="w-full rounded-xl border border-slate-700/60 bg-black/50 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
            />
          </div>
          <select
            id="product-category-filter"
            name="categoryFilter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All categories' : category}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden animate-fade-up" style={{ animationDelay: '0.08s', opacity: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-black/50">
                <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No product found for this filter.
                    </td>
                  </tr>
                )}
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-slate-800/70 hover:bg-slate-800/20 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.description || product.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{product.category}</td>
                    <td className="px-4 py-3 text-slate-300">TRY {product.price.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          product.stock <= 5
                            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-brand-400/40 hover:bg-brand-500/10 transition-all duration-150"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-150"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 animate-fade-up" style={{ animationDelay: '0.12s', opacity: 0 }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-white">
              {editingId ? 'Edit Product' : 'Create Product'}
            </h2>
            {editingId && (
              <button
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors duration-150"
              >
                <X size={12} />
                Cancel
              </button>
            )}
          </div>

          <div className="space-y-3">
            <input
              id="product-name"
              name="name"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Product name"
              className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
            />
            <textarea
              id="product-description"
              name="description"
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Description"
              rows={3}
              className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
            />
            <select
              id="product-category-id"
              name="categoryId"
              value={formData.categoryId}
              onChange={(event) => {
                const nextCategoryId = event.target.value;
                const nextCategoryName = resolveCategoryNameById(nextCategoryId);
                setFormData((prev) => ({
                  ...prev,
                  categoryId: nextCategoryId,
                  specs: trimSpecsByCategory(nextCategoryName, prev.specs),
                }));
              }}
              className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
            >
              <option value="">Select category</option>
              {categoryOptions.map((categoryOption) => (
                <option key={categoryOption.id} value={categoryOption.id}>
                  {categoryOption.name}
                </option>
              ))}
            </select>
            {(() => {
              const selectedCategoryName = resolveCategoryNameById(formData.categoryId);
              const selectedDefinition = resolveSpecDefinition(selectedCategoryName);
              if (!selectedDefinition) return null;
              return (
                <div className="rounded-xl border border-slate-700/60 bg-black/40 p-3">
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-brand-300">
                    Alt Kategori Ozellikleri
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedDefinition.fields.map((field) => (
                      <label key={field.key} className="grid gap-1 text-xs text-slate-400">
                        <span>{field.label}</span>
                        <select
                          value={formData.specs[field.key] ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              specs: {
                                ...prev.specs,
                                [field.key]: value,
                              },
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-700/60 bg-slate-950/70 px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
                        >
                          <option value="">Seciniz</option>
                          {field.options.map((option) => (
                            <option key={`${field.key}-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3">
              <input
                id="product-price"
                name="price"
                value={formData.price}
                onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="Price"
                type="number"
                min="0"
                className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
              />
              <input
                id="product-stock"
                name="stock"
                value={formData.stock}
                onChange={(event) => setFormData((prev) => ({ ...prev, stock: event.target.value }))}
                placeholder="Stock"
                type="number"
                min="0"
                className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm py-2.5 transition-colors duration-150"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {isSaving ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
};
