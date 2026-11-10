"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RefreshJobs() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 6000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
