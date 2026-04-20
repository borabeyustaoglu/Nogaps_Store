import { toast, type Toast } from 'react-hot-toast';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const variantStyles: Record<'success' | 'error' | 'info', string> = {
  success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100',
  error: 'border-rose-500/30 bg-rose-500/5 text-rose-100',
  info: 'border-slate-600/30 bg-slate-950/90 text-slate-100',
};

const variantIcon = {
  success: <CheckCircle2 size={18} className="text-emerald-400" />,
  error: <AlertCircle size={18} className="text-rose-400" />,
  info: <Info size={18} className="text-slate-300" />,
};

interface NotifyOptions {
  duration?: number;
}

const renderToast = (message: string, type: 'success' | 'error' | 'info') => (toastObject: Toast) => (
  <div
    className={`group relative flex items-start gap-3 rounded-3xl border p-4 pr-3 shadow-xl shadow-black/20 ${variantStyles[type]}`}
  >
    <div className="mt-1">{variantIcon[type]}</div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold leading-5">{message}</p>
    </div>
    <button
      type="button"
      onClick={() => toast.dismiss(toastObject.id)}
      className="rounded-full p-2 text-slate-300 transition hover:text-white"
      aria-label="Bildirimi kapat"
    >
      <X size={16} />
    </button>
  </div>
);

export const notify = (message: string, type: 'success' | 'error' | 'info' = 'info', options?: NotifyOptions) =>
  toast.custom(renderToast(message, type), {
    duration: options?.duration ?? 5000,
  });

export const notifySuccess = (message: string, options?: NotifyOptions) => notify(message, 'success', options);
export const notifyError = (message: string, options?: NotifyOptions) => notify(message, 'error', options);
export const notifyInfo = (message: string, options?: NotifyOptions) => notify(message, 'info', options);
