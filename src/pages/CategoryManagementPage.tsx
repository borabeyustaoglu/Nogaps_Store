import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { notifySuccess, notifyError } from '../utils/notify';
import { catalogApi } from '../api/catalog';
import { STORAGE_KEYS } from '../constants/storage';
import { appendAuditLog } from '../utils/auditLog';
import { getApiErrorMessage } from '../utils/apiError';

interface CategoryItem {
  id: string;
  name: string;
  description: string;
}

const STORAGE_KEY = STORAGE_KEYS.categories;
const STORAGE_VERSION_KEY = `${STORAGE_KEYS.categories}:version`;
const CATEGORY_DATA_VERSION = 'computer-store-v1';

const seedCategories: CategoryItem[] = [
  { id: 'cat-001', name: 'Processors', description: 'Desktop CPU urun grubu' },
  { id: 'cat-002', name: 'Graphics Cards', description: 'Ekran karti urun grubu' },
  { id: 'cat-003', name: 'Motherboards', description: 'Anakart urun grubu' },
  { id: 'cat-004', name: 'Memory', description: 'RAM urun grubu' },
  { id: 'cat-005', name: 'Storage', description: 'SSD ve HDD urun grubu' },
  { id: 'cat-006', name: 'Displays', description: 'Monitor urun grubu' },
];

const readCategories = (): CategoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedCategories;
    const parsed = JSON.parse(raw) as CategoryItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedCategories;
  } catch {
    return seedCategories;
  }
};

export const CategoryManagementPage = () => {
  const [categories, setCategories] = useState<CategoryItem[]>(readCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const persistCategories = (next: CategoryItem[]) => {
    setCategories(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const syncCategoriesFromBackend = async () => {
    const data = await catalogApi.getCategories();
    if (data.length > 0) {
      const mapped = data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
      }));
      persistCategories(mapped);
    }
  };

  useEffect(() => {
    let active = true;
    const sync = async () => {
      const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);
      if (currentVersion !== CATEGORY_DATA_VERSION) {
        persistCategories(seedCategories);
        localStorage.setItem(STORAGE_VERSION_KEY, CATEGORY_DATA_VERSION);
      }

      setIsLoading(true);
      try {
        await syncCategoriesFromBackend();
        if (!active) return;
      } catch {
        if (!active) return;
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void sync();
    return () => {
      active = false;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [categories, search]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
  };

  const handleEdit = (item: CategoryItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
  };

  const handleDelete = async (id: string) => {
    if (isSaving) return;
    const item = categories.find((category) => category.id === id);
    setIsSaving(true);
    try {
      await catalogApi.deleteCategory(id);
      await syncCategoriesFromBackend();
      if (editingId === id) resetForm();
      if (item) {
        appendAuditLog({
          action: 'delete',
          module: 'products',
          detail: `Category deleted: ${item.name}`,
        });
      }
      notifySuccess('Category deleted.');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Category could not be deleted in backend.');
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (!cleanName) {
      notifyError('Category name is required.');
      return;
    }

    const duplicate = categories.some(
      (item) =>
        item.name.toLowerCase() === cleanName.toLowerCase() &&
        item.id !== editingId
    );
    if (duplicate) {
      notifyError('Category name must be unique.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await catalogApi.updateCategory({
          id: editingId,
          name: cleanName,
          description: cleanDescription,
        });
        appendAuditLog({
          action: 'update',
          module: 'products',
          detail: `Category updated: ${cleanName}`,
        });
        notifySuccess('Category updated.');
      } else {
        await catalogApi.createCategory({
          name: cleanName,
          description: cleanDescription,
        });
        appendAuditLog({
          action: 'create',
          module: 'products',
          detail: `Category created: ${cleanName}`,
        });
        notifySuccess('Category created.');
      }

      await syncCategoriesFromBackend();
      resetForm();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Category could not be saved in backend.');
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="Category Management"
      subtitle="Create, update ve delete kategori islemleri"
    >
      <section
        className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 mb-6 animate-fade-up"
        style={{ opacity: 0 }}
      >
        <div className="flex flex-col md:flex-row gap-3">
          <input
            id="category-search"
            name="categorySearch"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kategori ara"
            className="flex-1 rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
          />
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            <span>{categories.length} kategori</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div
          className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden animate-fade-up"
          style={{ animationDelay: '0.05s', opacity: 0 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-black/50">
                <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Category bulunamadi.
                    </td>
                  </tr>
                )}
                {filteredCategories.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-800/70 hover:bg-slate-800/20 transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{item.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{item.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-brand-400/40 hover:bg-brand-500/10 transition-all duration-150"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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

        <div
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 animate-fade-up"
          style={{ animationDelay: '0.1s', opacity: 0 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-300">
              <Tags size={18} />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">
              {editingId ? 'Edit Category' : 'Create Category'}
            </h2>
          </div>

          <div className="space-y-3">
            <input
              id="category-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Category name"
              className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
            />
            <textarea
              id="category-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              rows={4}
              className="w-full rounded-xl border border-slate-700/60 bg-black/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-sm py-2.5 transition-colors duration-150"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {isSaving ? 'Saving...' : editingId ? 'Update Category' : 'Add Category'}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm py-2.5 transition-colors duration-150"
              >
                <X size={14} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
};
