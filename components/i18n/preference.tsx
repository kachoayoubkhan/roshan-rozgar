"use client";

import { useI18n } from "./provider";

export function PreferenceText({ online }: { online: boolean }) {
  const { t } = useI18n();
  return t("Your preference is {preference}. Active bookings always keep you off discovery.", {
    preference: t(online ? "Online" : "Offline"),
  });
}
