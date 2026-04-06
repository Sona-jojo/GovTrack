"use client";

import { useRouter } from "next/navigation";

export function HistoryBackLink({
  fallbackHref = "/",
  className = "",
  children,
  type = "button",
  preferHistory = true,
}) {
  const router = useRouter();

  const handleBack = () => {
    if (preferHistory && window.history.length > 1) {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (!referrer || referrer.origin === window.location.origin && referrer.pathname === window.location.pathname) {
        router.push(fallbackHref);
        return;
      }
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button type={type} onClick={handleBack} className={className}>
      {children}
    </button>
  );
}
