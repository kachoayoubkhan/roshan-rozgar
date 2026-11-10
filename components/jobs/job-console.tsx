"use client";

import { Text, Label, ErrorText, useI18n } from "@/components/i18n/provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck, CircleAlert, Mic, Send, Square, Star, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRecorder } from "@/components/intake/use-recorder";
import { useSpeech } from "@/components/intake/use-speech";
import { preferredTimeLabel, tradeNames, urgencyNames } from "@/lib/intake/copy";
import { jobSchema, jobStatus, type Job, type JobAction } from "@/lib/jobs/schema";
import { cn } from "@/lib/utils";
import { sendJobAction } from "./actions";

const quickReplies = {
  customer: ["Aap kab aa sakte hain?", "Shukriya, main intezar karoon ga."],
  worker: ["Main aa sakta hoon.", "Meherbani karke maslay ki tafseel batayein."],
};

function localTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short", timeStyle: "short", timeZone: "Asia/Karachi",
  }).format(new Date(value)).replace(" ", "T") : "";
}



export function JobConsole({ initial }: { initial: Job }) {
  const { label, t, locale } = useI18n();
  const money = (amount: number) => t("Rs. {amount}", {amount: amount.toLocaleString(locale)});
  const [job, setJob] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState(false);
  const [text, setText] = useState("");
  const [price, setPrice] = useState("");
  const [time, setTime] = useState(localTime(initial.preferred_time));
  const [processing, setProcessing] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const { id } = initial;
  const read = useRef<AbortController | null>(null);
  const { speak, stop: stopSpeech, status: speechStatus, audioUrl, attachAudio } = useSpeech();

  const refresh = useCallback(async () => {
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    try {
      const response = await fetch(`/api/jobs?request=${id}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh");
      const latest = jobSchema.parse(await response.json());
      if (!controller.signal.aborted) {
        setJob(latest);
        setRefreshError(false);
      }
    } catch {
      if (!controller.signal.aborted) setRefreshError(true);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 3500);
    return () => {
      window.clearInterval(timer);
      read.current?.abort();
    };
  }, [refresh]);

  async function run(action: JobAction, success?: () => void) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await sendJobAction(action);
      success?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the change.");
    } finally {
      await refresh();
      setPending(false);
    }
  }

  async function transcribeMessage(audio: Blob) {
    setProcessing(true);
    setError("");
    try {
      const response = await fetch(`/api/jobs/voice?request=${id}`, { method: "POST", body: audio, signal: AbortSignal.timeout(25_000) });
      const result = await response.json();
      if (!response.ok || typeof result.text !== "string") {
        throw new Error(typeof result.error === "string" ? result.error : "Could not understand the recording.");
      }
      setText(result.text);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not understand the recording.");
    } finally {
      setProcessing(false);
    }
  }

  const recorder = useRecorder((audio) => void transcribeMessage(audio), setError);
  const recording = recorder.state === "recording";
  const locked = pending || processing || recorder.state !== "idle";
  const isCustomer = job.role === "customer";
  const quote = job.quote;
  const booking = job.booking;
  const review = job.review;
  const ended = job.status === "declined" || job.status === "cancelled" ||
    booking?.status === "completed" || booking?.status === "cancelled";
  const canReview = isCustomer && booking?.status === "completed" && !review;
  const counterparty = isCustomer ? job.worker : job.customer;

  return (
    <>
      <div className="mb-5">
        <span className="rounded-full bg-mint px-3 py-1 text-sm font-semibold text-deep"><Label value={jobStatus(booking?.status ?? job.status)} /></span>
        <h1 className="page-title mt-3">{t("{service} in {area}", {service: label(tradeNames[job.trade]),area:job.area})}</h1>
        <p className="mt-2 text-muted"> <Text k="Conversation with" /> {counterparty}</p>
      </div>
      <div className="mb-4 space-y-2">
        {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><CircleAlert size={17} className="shrink-0" aria-hidden />{error && <ErrorText message={error} />}</p>}
        {refreshError && <p role="status" className="text-sm text-muted"> <Text k="Could not refresh the conversation. Retrying when this tab is visible." /> </p>}
        {speechStatus && <p role="status" className="text-sm text-muted"><Label value={speechStatus} /></p>}
        {audioUrl && <audio ref={attachAudio} src={audioUrl} controls className="max-w-full" aria-label={label("AI-generated playback")} />}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title"> <Text k="Messages" /> </h2>
            <Button type="button" variant="outline" disabled={locked} onClick={() => void speak(t("Problem: {value}.", {value: job.problem}) + " " + t("Area: {value}.", {value: job.area}))}><Volume2 aria-hidden /> <Text k="Listen to job" /> </Button>
          </div>
          <div className="max-h-[29rem] overflow-y-auto rounded-xl bg-canvas p-3 sm:p-4" tabIndex={0} aria-label={label("Conversation history")}>
            {job.messages.length === 0 ? <p className="p-3 text-sm text-muted"> <Text k="No messages yet. Send a message to start the conversation." /> </p> : (
              <ol className="grid gap-3">
                {job.messages.map((message) => {
                  const mine = message.sender_role === job.role;
                  return (
                    <li key={message.id} className={cn("max-w-[92%] min-w-0 rounded-2xl border border-line bg-white px-3 py-2 sm:max-w-[80%]", mine && "ms-auto bg-mint")}>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <strong>{mine ? <Text k="You" /> : counterparty}</strong>
                        <time dateTime={message.created_at}>{preferredTimeLabel(message.created_at, locale)} <Text k="PKT" /> </time>
                      </div>
                      <p className="mt-1 wrap-break-word whitespace-pre-wrap" dir="auto">{message.message_text}</p>
                      {!mine && <Button type="button" variant="outline" className="mt-2" disabled={locked} onClick={() => void speak(message.message_text.slice(0, 2300))}><Volume2 aria-hidden /> <Text k="Listen" /> </Button>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          {!ended && (
            <form className="grid gap-3" onSubmit={(event) => {
              event.preventDefault();
              if (text.trim()) void run({ action: "message", requestId: id, text }, () => setText(""));
            }}>
              <label className="grid gap-1.5 text-sm font-semibold"> <Text k="Message" /> <textarea className="form-select font-normal" dir="auto" rows={2} maxLength={4000} value={text}
                  onChange={(event) => setText(event.target.value)} disabled={locked} placeholder={label("Write or record a message")} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={locked || !text.trim()}><Send aria-hidden /> <Text k="Send message" /> </Button>
                <Button type="button" variant="outline" disabled={locked && !recording} onClick={() => {
                  if (recording) recorder.stop();
                  else { stopSpeech(); setError(""); void recorder.start(); }
                }}>
                  {recording ? <Square aria-hidden /> : <Mic aria-hidden />}<Label value={recording ? "Stop recording" : "Record message"} />
                </Button>
              </div>
              {processing && <p role="status" className="text-sm text-muted"> <Text k="Transcribing for your review…" /> </p>}
              {recorder.state === "permission" && <p role="status" className="text-sm text-muted"> <Text k="Waiting for microphone permission…" /> </p>}
              {recording && <p role="status" className="text-sm text-deep"> <Text k="Recording. Speak now." /> </p>}
              <div className="flex flex-wrap gap-2" aria-label={label("Quick replies")}>
                {quickReplies[job.role].map((reply) => (
                  <Button key={reply} type="button" variant="outline" disabled={locked} onClick={() => setText(label(reply))}><Label value={reply} /></Button>
                ))}
              </div>
            </form>
          )}
          {ended && <p className="text-sm text-muted"> <Text k="This conversation is closed. The history remains available." /> </p>}
        </Card>
        <div className="grid min-w-0 gap-4">
          <Card className="grid gap-2">
            <h2 className="section-title"> <Text k="Job details" /> </h2>
            <p className="wrap-break-word" dir="auto">{job.problem}</p>
            <p className="text-sm text-muted"> <Text k="Urgency:" /> <Label value={urgencyNames[job.urgency]} />{job.budget_pkr ? <> · <Text k="Budget" /> {money(job.budget_pkr)}</> : null}</p>
            {job.preferred_time && <p className="text-sm text-muted"> <Text k="Preferred" /> {preferredTimeLabel(job.preferred_time, locale)} <Text k="PKT" /> </p>}
            {job.preferred_date && <p className="text-sm text-muted"> <Text k="Preferred date" /> {job.preferred_date}</p>}
          </Card>
          {booking ? (
            <Card className="grid gap-3 border-emerald-200">
              <h2 className="section-title flex items-center gap-2"><CalendarCheck size={22} aria-hidden /> <Text k="Booking details" /> </h2>
              <p className="text-sm text-muted"> <Text k="Reference" /> <span dir="ltr" className="font-mono break-all text-ink">{booking.id}</span></p>
              <p className="font-semibold">{job.worker} · <Label value={tradeNames[job.trade]} /></p>
              <p>{preferredTimeLabel(booking.time, locale)} <Text k="PKT" /> </p>
              <p className="text-xl font-bold text-deep">{money(booking.amount)}</p>
              <p className="text-sm font-semibold"><Label value={jobStatus(booking.status)} /></p>
              {!isCustomer && (booking.status === "confirmed" || booking.status === "in_progress") && (
                <Button type="button" disabled={locked} onClick={() => void run({ action: booking.status === "confirmed" ? "start" : "complete", requestId: id })}>
                  <Label value={booking.status === "confirmed" ? "Start job" : "Mark completed"} />
                </Button>
              )}
            </Card>
          ) : null}
          {canReview && (
            <Card className="grid gap-3 border-amber-200 bg-amber-50/40">
              <h2 className="section-title"> <Text k="Rate your experience" /> </h2>
              <p className="text-sm text-muted"> <Text k="Share a star rating and optional feedback for {name}. This appears in discovery after you submit." values={{name: job.worker}} /> </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={label("Star rating")}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button key={value} type="button" variant={rating === value ? "primary" : "outline"} disabled={locked}
                    onClick={() => setRating(value)} aria-pressed={rating === value}>
                    <Star size={16} className={cn(rating >= value && "fill-amber-400 text-amber-700")} aria-hidden />
                    {value}
                  </Button>
                ))}
              </div>
              <form className="grid gap-3" onSubmit={(event) => {
                event.preventDefault();
                void run({
                  action: "review",
                  requestId: id,
                  rating,
                  ...(feedback.trim() && { comment: feedback.trim() }),
                }, () => setFeedback(""));
              }}>
                <label className="grid gap-1.5 text-sm font-semibold"> <Text k="Written feedback (optional)" /> <textarea className="form-select font-normal" dir="auto" rows={2} maxLength={1000} value={feedback}
                    onChange={(event) => setFeedback(event.target.value)} disabled={locked}
                    placeholder={label("Kaam kaisa raha? / How was the work?")} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={locked && !recording} onClick={() => {
                    if (recording) recorder.stop();
                    else { stopSpeech(); setError(""); void recorder.start(); }
                  }}>
                    {recording ? <Square aria-hidden /> : <Mic aria-hidden />}<Label value={recording ? "Stop recording" : "Record feedback"} />
                  </Button>
                  <Button type="submit" disabled={locked}> <Text k="Submit review" /> </Button>
                </div>
              </form>
            </Card>
          )}
          {review && (
            <Card className="grid gap-2 border-amber-200">
              <h2 className="section-title"><Label value={isCustomer ? "Your review" : "Customer review"} /></h2>
              <p className="flex items-center gap-1 font-semibold text-deep">
                <Star size={18} className="fill-amber-400 text-amber-700" aria-hidden />
                {review.rating} / 5
              </p>
              {review.comment && <p className="text-sm wrap-break-word" dir="auto">{review.comment}</p>}
              <p className="text-xs text-muted"> <Text k="Submitted" /> {preferredTimeLabel(review.created_at, locale)} <Text k="PKT" /> </p>
            </Card>
          )}
          {!booking && !ended && (
            <Card className="grid gap-4">
              <h2 className="section-title"><Label value={quote?.status === "accepted" && isCustomer ? "Confirm booking" : "Price agreement"} /></h2>
              {quote ? (
                <div className="rounded-xl bg-mint p-4">
                  <p className="text-sm font-semibold text-deep"><Label value={quote.status === "accepted" ? "Agreed price" : "Proposed price"} /></p>
                  <p className="text-2xl font-bold text-ink">{money(quote.amount)}</p>
                </div>
              ) : <p className="text-sm text-muted"><Label value={isCustomer ? "Waiting for the worker to send a quote." : "Send a quotation in Pakistani rupees."} /></p>}
              {!isCustomer && quote?.status !== "accepted" && (
                <form className="grid gap-2" onSubmit={(event) => {
                  event.preventDefault();
                  void run({ action: "quote", requestId: id, quoteId: quote?.id ?? null, amount: Number(price) }, () => setPrice(""));
                }}>
                  <label className="grid gap-1.5 text-sm font-semibold"> <Text k="Quote amount in PKR" /> <input className="form-select font-normal" type="number" min="1" max="1000000" required step="1" value={price} onChange={(event) => setPrice(event.target.value)} disabled={locked} />
                  </label>
                  <Button type="submit" disabled={locked}><Label value={quote ? "Send revised quote" : "Send quote"} /></Button>
                </form>
              )}
              {isCustomer && quote && (
                <>
                  {quote.status === "proposed" ? (
                    <Button type="button" disabled={locked} onClick={() => void run({ action: "accept", requestId: id, quoteId: quote.id })}> <Text k="Accept price" /> </Button>
                  ) : (
                    <form className="grid gap-3" onSubmit={(event) => {
                      event.preventDefault();
                      if (time) void run({ action: "confirm", requestId: id, quoteId: quote.id, time: `${time}:00+05:00` });
                    }}>
                      <p className="text-sm text-muted">{job.worker} · <Label value={tradeNames[job.trade]} /> · {job.area}</p>
                      <label className="grid gap-1.5 text-sm font-semibold"> <Text k="Booking date and time (PKT)" /> <input className="form-select font-normal" type="datetime-local" required value={time} onChange={(event) => setTime(event.target.value)} disabled={locked} />
                      </label>
                      <Button type="submit" disabled={locked}> <Text k="Confirm booking" /> </Button>
                    </form>
                  )}
                  <Button type="button" variant="outline" disabled={locked} onClick={() => void run({ action: "revise", requestId: id, quoteId: quote.id })}> <Text k="Request a revised price" /> </Button>
                </>
              )}
              <Button type="button" variant="outline" disabled={locked} onClick={() => {
                if (window.confirm(t(isCustomer ? "Cancel this request?" : "Decline this request?"))) {
                  void run({ action: isCustomer ? "cancel" : "decline", requestId: id });
                }
              }}><Label value={isCustomer ? "Cancel request" : "Decline request"} /></Button>
            </Card>
          )}
          {pending && <p role="status" className="text-sm text-muted"> <Text k="Saving your change…" /> </p>}
        </div>
      </div>
    </>
  );
}
