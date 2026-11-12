"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Toast = { id: number; tone: "success" | "error"; message: string };

const ToastContext = createContext<(tone: Toast["tone"], message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, tone, message }]);
    setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      tone === "error" ? 6000 : 3200,
    );
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className="internal-pop pointer-events-auto flex items-start gap-2.5 rounded-xl border border-[var(--i-line)] bg-[var(--i-panel)] px-3.5 py-3 text-[13px] shadow-[var(--i-shadow-pop)]"
            data-state="open"
          >
            {toast.tone === "success" ? (
              <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <WarningCircle size={18} weight="fill" className="mt-px shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className={cn("leading-snug", toast.tone === "error" && "text-[var(--i-ink)]")}>
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
