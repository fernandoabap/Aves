import { toast } from "sonner";

export function useToast() {
  return toast;
}

export type Toast = typeof toast;