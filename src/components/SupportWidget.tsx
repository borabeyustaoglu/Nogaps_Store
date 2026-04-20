import { useState } from 'react';
import { Headset, Mail, MessageCircle, X } from 'lucide-react';

export const SupportWidget = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 left-6 z-[70]">
        <div className="relative">
          {isMenuOpen && (
            <div className="mb-3 w-64 rounded-2xl border border-slate-700/70 bg-slate-900/95 p-3 shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setIsLiveChatOpen(true);
                  setIsMenuOpen(false);
                }}
                className="mb-2 flex w-full items-center gap-2 rounded-xl border border-slate-700/70 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:border-brand-500/50 hover:bg-brand-500/10"
              >
                <MessageCircle size={15} className="text-brand-300" />
                Canli Destek
              </button>
              <a
                href="mailto:support@nogaps.com"
                onClick={() => setIsMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl border border-slate-700/70 px-3 py-2.5 text-left text-sm text-slate-100 transition hover:border-brand-500/50 hover:bg-brand-500/10"
              >
                <Mail size={15} className="text-brand-300" />
                Mail
              </a>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/50 bg-brand-500 text-white shadow-lg shadow-brand-500/40 transition hover:bg-brand-400"
            aria-label="Destek"
          >
            <Headset size={18} />
          </button>
        </div>
      </div>

      {isLiveChatOpen && (
        <div className="fixed bottom-24 left-6 z-[70] w-[320px] rounded-2xl border border-slate-700/70 bg-slate-900/95 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
            <p className="text-sm font-semibold text-white">Canli Destek</p>
            <button
              type="button"
              onClick={() => setIsLiveChatOpen(false)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Canli destegi kapat"
            >
              <X size={14} />
            </button>
          </div>
          <div className="space-y-3 px-4 py-4 text-sm">
            <div className="max-w-[90%] rounded-2xl bg-slate-800 px-3 py-2 text-slate-100">
              Merhaba, NOGAPS canli destege hos geldiniz. Size nasil yardimci olabilirim?
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-black/40 px-3 py-2 text-slate-400">
              Mesajinizi yazarak destek ekibine iletebilirsiniz.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

