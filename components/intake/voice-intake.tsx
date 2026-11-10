"use client";

import { Text, Label, ErrorText, useI18n } from "@/components/i18n/provider";
import Link from "next/link";
import { Check, CircleAlert, LoaderCircle, Mic, Pencil, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmationPhrase, followUp, prompts, readBack } from "@/lib/intake/copy";
import { audioExtensions, draftReply, emptyDraft, saveIntakeSchema, type IntakeDraft, type IntakeKind } from "@/lib/intake/schema";
import { Details, EditDetails } from "./details";
import { useRecorder } from "./use-recorder";
import { useSpeech } from "./use-speech";

const serverError = z.object({ error: z.string() });
const saveReply = z.union([z.object({ retry: z.literal(true) }), z.object({ href: z.string().startsWith("/") })]);

async function responseBody(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = serverError.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error : "The service is unavailable. Try again.");
  }
  return body;
}

export function VoiceIntake({ kind, initial, version = null }: {
  kind: IntakeKind; initial?: IntakeDraft; version?: number | null;
}) {
  const { label, language } = useI18n();
  const [draft, setDraft] = useState(initial ?? emptyDraft(kind));
  const [stage, setStage] = useState<"capture" | "edit" | "review">("capture");
  const [busy, setBusy] = useState<"understanding" | "saving" | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [saved, setSaved] = useState<string>();
  const [method, setMethod] = useState<"voice" | "assisted">("assisted");
  const nextHeading = useRef<HTMLHeadingElement>(null);
  const processing = useRef(false);
  const operation = useRef<AbortController | null>(null);
  const recordingIntent = useRef<"extract" | "confirm">("extract");
  const draftId = useRef<string | undefined>(undefined);
  const speech = useSpeech();
  const copy = prompts[kind];
  const missing = followUp(draft);
  const phrase = confirmationPhrase(kind, language);

  useEffect(() => { nextHeading.current?.focus(); }, [stage, saved]);
  useEffect(() => () => operation.current?.abort(), []);

  const recorder = useRecorder(
    (audio) => {
      const form = new FormData();
      const extension = audioExtensions[audio.type.split(";")[0]];
      form.set("audio", audio, `recording.${extension}`);
      form.set("draft", JSON.stringify(draft));
      form.set("intent", recordingIntent.current);
      form.set("language", language);
      void understand(form);
    },
    setError,
  );

  async function save() {
    if (busy === "saving" || saved) return;
    if (kind === "request") draftId.current ??= crypto.randomUUID();
    const input = saveIntakeSchema.safeParse({ ...draft, ...(kind === "worker"
      ? { expectedVersion: version, method } : { draftId: draftId.current }) });
    if (!input.success) {
      setError(missing?.text ?? "Check the fields before saving.");
      return;
    }
    speech.stop();
    setError("");
    setBusy("saving");
    const send = () => fetch("/api/intake/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    }).then(responseBody).then((data) => saveReply.parse(data));
    try {
      let result = await send();
      if ("retry" in result) result = await send();
      if ("retry" in result) throw new Error("Allow cookies for Roshan Rozgar and try again.");
      setSaved(result.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Saving failed. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function understand(form?: FormData) {
    if (processing.current) return;
    processing.current = true;
    speech.stop();
    setError("");
    setBusy("understanding");
    const controller = new AbortController();
    operation.current = controller;
    try {
      const response = await fetch("/api/intake/understand", {
        method: "POST",
        ...(form ? { body: form } : {
          body: JSON.stringify({ draft, text, language }), headers: { "Content-Type": "application/json" },
        }),
        signal: controller.signal,
      });
      const result = draftReply.parse(await responseBody(response));
      if (result.mode === "confirm") {
        if (result.confirmed) await save();
        else setError(`No details were saved. Say “${confirmationPhrase(kind, "en")}” clearly, or tap the save button.`);
        return;
      }
      if (result.draft.kind !== kind) throw new Error("The response could not be matched to this form.");
      setDraft(result.draft);
      setTranscript(result.transcript);
      setText("");
      setMethod(form ? "voice" : "assisted");
      setStage("review");
      void speech.speak(readBack(result.draft, language), false);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Voice processing failed. Try again.");
    } finally {
      processing.current = false;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  function start(intent: "extract" | "confirm") {
    recordingIntent.current = intent;
    speech.stop();
    setError("");
    void recorder.start();
  }

  function openEditor() {
    speech.stop();
    setError("");
    setStage("edit");
  }

  function review() {
    const parsed = saveIntakeSchema.safeParse({ ...draft, ...(kind === "worker"
      ? { expectedVersion: version, method } : { draftId: crypto.randomUUID() }) });
    if (!parsed.success) {
      setError(missing?.text ?? "Check the values. Use whole numbers, and enter up to 10 skills of 80 characters each.");
      return;
    }
    setDraft(parsed.data.kind === "worker"
      ? { kind: "worker", data: parsed.data.data }
      : { kind: "request", data: parsed.data.data });
    setMethod("assisted");
    setError("");
    setStage("review");
  }

  if (saved) {
    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <Check size={34} className="text-primary" aria-hidden />
        <h2 ref={nextHeading} tabIndex={-1} className="section-title"><Label value={kind === "worker" ? "Profile saved" : "Request saved"} /></h2>
        <p className="text-muted"><Label value={kind === "worker" ? "آپ کی پروفائل محفوظ ہو گئی ہے۔" : "آپ کی درخواست محفوظ ہو گئی ہے۔"} /></p>
        <Button asChild><Link href={saved}><Label value={kind === "worker" ? "View my profile" : "Find matching workers"} /></Link></Button>
      </Card>
    );
  }

  const isRecording = recorder.state === "recording";
  const disabled = Boolean(busy) || recorder.state !== "idle";
  const recordingConfirm = isRecording && recordingIntent.current === "confirm";
  const canConfirm = stage === "review" && !missing;
  const spokenText = stage === "review" ? readBack(draft, language) : (language === "en" ? label(copy.hint) : copy.urdu);

  return (
    <div className="grid min-w-0 gap-5">
      {stage === "capture" && (
        <Card className="grid justify-items-center gap-4 bg-mint py-8 text-center">
          <h2 className="section-title"><Label value={kind === "worker" ? "Bol kar profile banayein" : "Awaz mein apna masla batayein"} /></h2>
          <p className="max-w-md text-muted"><Label value={copy.hint} /></p>
          
          <Button className="size-20 rounded-full p-0 ring-4 ring-emerald-100 [&_svg]:size-8" type="button"
            aria-label={label(isRecording ? "Stop recording" : "Start recording")}
            disabled={Boolean(busy) || recorder.state === "permission"}
            onClick={() => isRecording ? recorder.stop() : start("extract")}>
            {isRecording ? <Square aria-hidden /> : <Mic aria-hidden />}
          </Button>
          <p className="text-sm font-semibold text-deep" aria-hidden><Label value={isRecording ? "Tap to stop" : kind === "worker" ? "Tap to speak" : "Tap to speak · 30 seconds max"} /></p>
          <p className="text-sm text-muted"> <Text k="Your recording is sent to OpenAI for processing." /> </p>
        </Card>
      )}

      {stage === "edit" && (
        <Card className="grid gap-4">
          <h2 ref={nextHeading} tabIndex={-1} className="section-title"> <Text k="Enter the details" /> </h2>
          <EditDetails draft={draft} onChange={setDraft} disabled={disabled} />
          <Button type="button" disabled={disabled} onClick={review} className="w-full sm:w-fit"> <Text k="Review details" /> </Button>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => { setError(""); setStage("capture"); }} className="w-full sm:w-fit"> <Text k="Back to microphone" /> </Button>
        </Card>
      )}

      {stage === "review" && (
        <Card className="grid gap-4">
          <h2 ref={nextHeading} tabIndex={-1} className="section-title"><Label value={kind === "worker" ? "Apni profile tasdeeq karein" : "Confirm your request"} /></h2>
          {missing && <p className="rounded-xl bg-mint p-3 font-semibold text-deep"><Label value={missing.text} /></p>}
          <Details draft={draft} />
          {draft.kind === "request" && !draft.data.preferredTime && <p className="text-sm text-muted"> <Text k="You can add an exact time if you have one. A time is optional for discovery." /> </p>}
          {canConfirm && <p className="text-sm text-muted"><Text k="If the details are right, say “{phrase}” or use the save button." values={{phrase}} /></p>}
          <div className="flex flex-wrap gap-2">
            {canConfirm && <Button type="button" disabled={disabled} onClick={() => void save()}><Check aria-hidden /><Label value={version ? "Save profile changes" : kind === "worker" ? "Save profile" : "Save request"} /></Button>}
            {canConfirm && (
              <Button type="button" variant="outline" disabled={disabled && !recordingConfirm} onClick={() => recordingConfirm ? recorder.stop() : start("confirm")}>
                {recordingConfirm ? <Square aria-hidden /> : <Mic aria-hidden />}<Label value={recordingConfirm ? "Stop confirmation" : "Confirm by voice"} />
              </Button>
            )}
            <Button type="button" variant="outline" disabled={disabled && !(isRecording && !recordingConfirm)} onClick={() => isRecording ? recorder.stop() : start("extract")}>
              {isRecording && !recordingConfirm ? <Square aria-hidden /> : <Mic aria-hidden />}
              <Label value={isRecording && !recordingConfirm ? "Stop recording" : missing ? "Answer by voice" : "Correct by voice"} />
            </Button>
            <Button type="button" variant="outline" disabled={disabled} onClick={openEditor}><Pencil aria-hidden /> <Text k="Edit details" /> </Button>
          </div>
          {transcript && <details className="text-sm text-muted"><summary className="flex min-h-11 cursor-pointer items-center"> <Text k="Latest transcript" /> </summary><p dir="auto" className="wrap-break-word">{transcript}</p></details>}
        </Card>
      )}

      <div className="grid gap-2">
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-deep">
          {busy && <LoaderCircle size={17} className="motion-safe:animate-spin" aria-hidden />}
          <Label value={busy === "understanding" ? "Understanding your details…" : busy === "saving" ? "Saving confirmed details…" :
            recorder.state === "permission" ? "Waiting for microphone permission…" : isRecording ? "Recording. Speak now." : ""} />
        </p>
        {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden />{error && <ErrorText message={error} />}</p>}
        {stage !== "edit" && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={disabled} onClick={() => void speech.speak(spokenText)}>
              <Volume2 aria-hidden /><Label value={stage === "review" ? "Listen to details" : "Listen to instructions"} />
            </Button>
            {stage === "capture" && <Button type="button" variant="outline" disabled={disabled} onClick={openEditor}> <Text k="Enter details manually" /> </Button>}
          </div>
        )}
        {speech.status && <p role="status" className="text-sm text-muted"><Label value={speech.status} /></p>}
        {speech.audioUrl && <audio ref={speech.attachAudio} controls src={speech.audioUrl} className="max-w-full" aria-label={label("AI-generated playback")} />}
      </div>

      {stage !== "edit" && (
        <Card>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void understand(); }}>
            <label className="grid gap-2 text-sm font-semibold">
              <Label value={stage === "review" ? "Or type a correction" : "Or type your details"} />
              <textarea className="form-select font-normal" value={text} onChange={(event) => setText(event.target.value)}
                disabled={disabled} maxLength={2000} rows={2} dir="auto" />
            </label>
            {stage === "capture" && <p className="text-sm text-muted"><Label value={copy.example} /></p>}
            <Button type="submit" variant="outline" disabled={disabled || !text.trim()} className="w-full sm:w-fit"> <Text k="Understand typed details" /> </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
