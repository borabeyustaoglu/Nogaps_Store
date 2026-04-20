import { Link } from 'react-router-dom';

export const ForbiddenPage = () => (
  <div className="min-h-screen bg-black flex items-center justify-center font-body px-6">
    <div className="text-center space-y-4 animate-fade-up max-w-md" style={{ opacity: 0 }}>
      <p className="font-display text-8xl font-bold text-red-500/20">403</p>
      <h1 className="font-display text-2xl font-bold text-white">Erisim reddedildi</h1>
      <p className="text-slate-500 text-sm">
        Bu sayfayi goruntulemek icin gerekli role veya izne sahip degilsiniz.
      </p>
      <Link
        to="/dashboard"
        className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-400 transition-colors"
      >
        Dashboard'a don
      </Link>
    </div>
  </div>
);
