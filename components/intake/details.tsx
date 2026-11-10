"use client";

import { Text, Label, useI18n } from "@/components/i18n/provider";
import type { ReactNode } from "react";
import type { IntakeDraft } from "@/lib/intake/schema";
import { tradeNames, urgencyNames } from "@/lib/intake/copy";
import { areas, trades } from "@/lib/types";

const fieldClass = "form-select font-normal";

export function Details({ draft }: { draft: IntakeDraft }) {
  const { t, label, locale } = useI18n();
  const missing = t("Not provided");
  const { trade, serviceArea } = draft.data;
  const price = (amount: number | null) => amount === null ? missing : t("Rs. {amount}", { amount: amount.toLocaleString(locale) });
  const entries: [string, string][] = [
    [t("Service"), trade ? label(tradeNames[trade]) : missing],
    [t("Neighbourhood"), serviceArea ? serviceArea + ", " + t("Islamabad") : missing],
  ];
  if (draft.kind === "worker") {
    entries.unshift([t("Full name"), draft.data.name || missing]);
    entries.push(
      [t("Experience"), draft.data.experienceYears === null ? missing : t("{count} years", {count: draft.data.experienceYears})],
      [t("Visit charge"), price(draft.data.visitChargePkr)],
      [t("Skills"), draft.data.skills.join(", ") || missing],
    );
  } else {
    entries.push(
      [t("Problem"), draft.data.issueDescription || missing],
      [t("Urgency"), draft.data.urgency ? label(urgencyNames[draft.data.urgency]) : missing],
      [t("Preferred date and time"), draft.data.preferredTime ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(draft.data.preferredTime)) + " PKT" :
        draft.data.preferredDate ? t("{date} · exact time unspecified", {date: draft.data.preferredDate}) : missing],
      [t("Budget"), price(draft.data.budgetPkr)],
    );
  }
  return (
    <dl className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
      {entries.map(([name, value]) => (
        <div className="min-w-0" key={name}>
          <dt className="text-sm font-semibold text-muted">{name}</dt>
          <dd className="wrap-break-word" dir="auto">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-semibold">{label}{children}</label>;
}

function NumberField({ label, value, min, max, onChange }: {
  label: ReactNode; value: number | null; min: number; max: number; onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label}>
      <input className={fieldClass} type="number" min={min} max={max} step={1} value={value ?? ""}
        onChange={(event) => onChange(Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber)} />
    </Field>
  );
}

function localDateTime(value: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short", timeStyle: "short", timeZone: "Asia/Karachi",
  }).format(new Date(value)).replace(" ", "T");
}

export function EditDetails({ draft, onChange, disabled }: { draft: IntakeDraft; onChange: (draft: IntakeDraft) => void; disabled: boolean }) {
  function update(field: string, value: string | number | string[] | null) {
    if (draft.kind === "worker") onChange({ kind: "worker", data: { ...draft.data, [field]: value } });
    else onChange({ kind: "request", data: { ...draft.data, [field]: value } });
  }

  return (
    <fieldset disabled={disabled} className="grid min-w-0 gap-4 sm:grid-cols-2">
      {draft.kind === "worker" && (
        <Field label={<Text k="Full name" />}>
          <input className={fieldClass} autoComplete="name" dir="auto" maxLength={80} value={draft.data.name ?? ""}
            onChange={(event) => update("name", event.target.value || null)} />
        </Field>
      )}
      <Field label={<Text k="Service" />}>
        <select className={fieldClass} value={draft.data.trade ?? ""} onChange={(event) => update("trade", event.target.value || null)}>
          <option value=""> <Text k="Choose a service" /> </option>
          {trades.map((trade) => <option key={trade} value={trade}><Label value={tradeNames[trade]} /></option>)}
        </select>
      </Field>
      <Field label={<Text k="Neighbourhood" />}>
        <select className={fieldClass} value={draft.data.serviceArea ?? ""} onChange={(event) => update("serviceArea", event.target.value || null)}>
          <option value=""> <Text k="Choose an area" /> </option>
          {areas.map((area) => <option key={area} value={area}>{area} <Text k=", Islamabad" /> </option>)}
        </select>
      </Field>
      {draft.kind === "worker" ? (
        <>
          <NumberField label={<Text k="Years of experience" />} min={0} max={80} value={draft.data.experienceYears} onChange={(value) => update("experienceYears", value)} />
          <NumberField label={<Text k="Visit charge in PKR (optional)" />} min={1} max={1000000} value={draft.data.visitChargePkr} onChange={(value) => update("visitChargePkr", value)} />
          <Field label={<Text k="Skills, separated by commas (optional)" />}>
            <input className={fieldClass} dir="auto" maxLength={820} value={draft.data.skills.join(",")}
              onChange={(event) => update("skills", event.target.value ? event.target.value.split(",") : [])} />
          </Field>
        </>
      ) : (
        <>
          <Field label={<Text k="Problem" />}>
            <textarea className={fieldClass} dir="auto" rows={3} maxLength={1500} value={draft.data.issueDescription ?? ""}
              onChange={(event) => update("issueDescription", event.target.value || null)} />
          </Field>
          <Field label={<Text k="Urgency" />}>
            <select className={fieldClass} value={draft.data.urgency ?? ""} onChange={(event) => update("urgency", event.target.value || null)}>
              <option value=""> <Text k="Choose urgency" /> </option>
              {Object.entries(urgencyNames).map(([value, label]) => <option key={value} value={value}><Label value={label} /></option>)}
            </select>
          </Field>
          <Field label={<Text k="Preferred date only (optional)" />}>
            <input className={fieldClass} type="date" value={draft.data.preferredDate ?? ""}
              onChange={(event) => onChange({ kind: "request", data: { ...draft.data, preferredDate: event.target.value || null, preferredTime: null } })} />
          </Field>
          <Field label={<Text k="Exact date and time, PKT (optional)" />}>
            <input className={fieldClass} type="datetime-local" value={localDateTime(draft.data.preferredTime)}
              onChange={(event) => onChange({ kind: "request", data: { ...draft.data, preferredDate: null, preferredTime: event.target.value ? `${event.target.value}:00+05:00` : null } })} />
          </Field>
          <NumberField label={<Text k="Budget in PKR (optional)" />} min={1} max={1000000} value={draft.data.budgetPkr} onChange={(value) => update("budgetPkr", value)} />
        </>
      )}
    </fieldset>
  );
}
