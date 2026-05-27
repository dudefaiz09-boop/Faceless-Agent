import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

const ToastContext = createContext<{ toast: (input: ToastInput) => void }>({
  toast: () => {},
});

const toneStyles = {
  success: {
    icon: CheckCircle2,
    className:
      'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  },
  error: {
    icon: XCircle,
    className:
      'border-red-100 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  },
  info: {
    icon: Info,
    className:
      'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-cyan-200',
  },
  warning: {
    icon: AlertTriangle,
    className:
      'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  },
} satisfies Record<ToastTone, { icon: React.ElementType; className: string }>;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((current) => [
      ...current,
      {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone || 'info',
      },
    ]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        <AnimatePresence>
          {toasts.map((item) => {
            const tone = toneStyles[item.tone];
            const Icon = tone.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 30, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.96 }}
                className={`pointer-events-auto rounded-2xl border p-4 shadow-xl shadow-slate-200/60 backdrop-blur dark:shadow-none ${tone.className}`}
              >
                <div className="flex gap-3">
                  <Icon size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-xs font-semibold opacity-80">{item.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
