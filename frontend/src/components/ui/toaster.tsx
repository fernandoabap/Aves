import { Toaster as SonnerToaster } from "sonner";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      className={cn("toaster group", props.className)}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          success: "group-[.toaster]:!bg-[#dcfce7] group-[.toaster]:!border-[#4ade80] group-[.toaster]:!text-[#16a34a]",
          error: "group-[.toaster]:!bg-red-50 group-[.toaster]:!border-red-200 group-[.toaster]:!text-red-900",
          description: "group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}