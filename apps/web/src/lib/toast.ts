import type { ToastInput } from '../components/saas/ToastProvider';

export type ToastFn = (input: ToastInput) => void;

export const toastMessages = {
  success(toast: ToastFn, title: string, description?: string) {
    toast({ tone: 'success', title, description });
  },
  error(toast: ToastFn, title: string, description?: string) {
    toast({ tone: 'error', title, description });
  },
  info(toast: ToastFn, title: string, description?: string) {
    toast({ tone: 'info', title, description });
  },
  warning(toast: ToastFn, title: string, description?: string) {
    toast({ tone: 'warning', title, description });
  },
};
