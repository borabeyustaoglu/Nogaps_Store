import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className="min-h-screen bg-black flex items-center justify-center font-body px-6">
    <div className="text-center space-y-4 animate-fade-up" style={{ opacity: 0 }}>
      <p className="font-display text-8xl font-bold text-brand-500/20">404</p>
      <h1 className="font-display text-2xl font-bold text-white">Sayfa bulunamadi</h1>
      <p className="text-slate-500 text-sm">Aradiginiz sayfa mevcut degil.</p>
      <Link
        to="/dashboard"
        className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-400 transition-colors"
      >
        Dashboard'a don
      </Link>
    </div>
  </div>
);
