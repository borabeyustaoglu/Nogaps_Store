import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatedLogoBackground } from './AnimatedLogoBackground';
import { BrandLogo } from './BrandLogo';

interface Props {
  children: ReactNode;
}

export const AuthLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-black flex font-body relative overflow-hidden">
      <AnimatedLogoBackground opacity={0.28} className="z-[1] mix-blend-screen" />
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden border-r border-brand-500/10">
        <div className="absolute inset-0 z-[2] bg-grid-pattern bg-grid opacity-100" style={{ backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0 z-[3] bg-gradient-to-r from-black/5 via-black/35 to-black/65" />
        <div className="absolute bottom-0 left-0 z-[4] w-96 h-96 bg-brand-500/15 rounded-full blur-3xl" />
        <div className="absolute top-16 right-0 z-[4] w-64 h-64 bg-brand-400/12 rounded-full blur-2xl" />

        <div className="relative z-20 space-y-7 mt-12">
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <p className="text-base font-semibold tracking-[0.2em] uppercase text-brand-300">Inventory and order control</p>
            <h1 className="font-display text-[4.35rem] font-bold text-white leading-[1.03]">
              No gaps in
              <br />
              <span className="text-brand-400">your workflow.</span>
            </h1>
          </div>

          <p
            className="text-slate-200 text-[1.32rem] leading-relaxed max-w-md font-body animate-fade-up"
            style={{ animationDelay: '0.2s', opacity: 0 }}
          >
            Manage products, users and order operations from one secure panel.
          </p>

          <div className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
            {[
              { icon: '01', text: 'Secure session flow' },
              { icon: '02', text: 'Role based access' },
              { icon: '03', text: 'Fast stock operations' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/18 border border-brand-500/35 flex items-center justify-center text-[11px] font-semibold text-brand-200">
                  {item.icon}
                </div>
                <span className="text-slate-200 text-[1.28rem]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-20 animate-fade-in" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <span className="text-sm text-slate-500 font-mono">v1.0.0 - Spring Boot + React</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/85" />
        <Link
          to="/"
          className="absolute left-6 top-6 z-20 inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-brand-500/50 hover:text-white"
          aria-label="Ana sayfaya don"
        >
          <BrandLogo compact className="h-8 w-auto" />
          <span>Ana Sayfa</span>
        </Link>
        <div className="relative z-10 w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};
