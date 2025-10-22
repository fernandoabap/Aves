import { toast as sonnerToast } from "sonner";

const customToast = {
  ...sonnerToast,
  success: (message: string) =>
    sonnerToast(message, {
      style: {
        backgroundColor: '#dcfce7',
        borderColor: '#4ade80',
        color: '#16a34a',
      },
    }),
  error: (message: string) =>
    sonnerToast.error(message, {
      style: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        color: '#dc2626',
      },
    }),
};

export function useToast() {
  return customToast;
}

export type Toast = typeof customToast;