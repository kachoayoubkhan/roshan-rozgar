"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioExtensions, maxAudioBytes } from "@/lib/intake/schema";

const durationMs = 30_000;

type Recording = {
  stream: MediaStream;
  recorder: MediaRecorder;
  context?: AudioContext;
  timer?: number;
  meter?: number;
};

function release(recording: Recording) {
  window.clearTimeout(recording.timer);
  window.clearInterval(recording.meter);
  recording.stream.getTracks().forEach((track) => track.stop());
  if (recording.context && recording.context.state !== "closed") void recording.context.close().catch(() => {});
}

export function useRecorder(onAudio: (blob: Blob) => void, onError: (message: string) => void) {
  const [state, setState] = useState<"idle" | "permission" | "recording">("idle");
  const active = useRef<Recording | null>(null);
  const attempt = useRef(0);
  const starting = useRef(false);

  useEffect(() => () => {
    attempt.current++;
    if (active.current) {
      release(active.current);
      active.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const recorder = active.current?.recorder;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  async function start() {
    if (starting.current || active.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("This browser cannot record here. Use HTTPS or localhost, or enter your details below.");
      return;
    }
    const mime = Object.keys(audioExtensions).find((type) => MediaRecorder.isTypeSupported(type));
    if (!mime) {
      onError("This browser does not support a compatible recording format. Enter your details below.");
      return;
    }
    const id = ++attempt.current;
    starting.current = true;
    setState("permission");
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (attempt.current !== id) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48_000 });
      const recording: Recording = { stream, recorder };
      active.current = recording;
      const chunks: Blob[] = [];
      let audible = false;
      let metered = false;
      if (typeof AudioContext !== "undefined") {
        try {
          const context = new AudioContext();
          recording.context = context;
          void context.resume().catch(() => {});
          const analyser = context.createAnalyser();
          context.createMediaStreamSource(stream).connect(analyser);
          const samples = new Float32Array(analyser.fftSize);
          recording.meter = window.setInterval(() => {
            if (context.state !== "running") return;
            metered = true;
            analyser.getFloatTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
            if (rms >= 0.004) audible = true;
          }, 75);
        } catch {
          // The server also checks for a usable transcript.
        }
      }
      recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      recorder.onerror = () => {
        if (active.current !== recording) return;
        active.current = null;
        release(recording);
        setState("idle");
        onError("The microphone stopped unexpectedly. Try recording again.");
      };
      recorder.onstop = () => {
        if (active.current !== recording) return;
        active.current = null;
        release(recording);
        setState("idle");
        const blob = new Blob(chunks, { type: recorder.mimeType || mime });
        if (!blob.size || (metered && !audible)) {
          onError("No speech was heard. Move closer to the microphone and try again.");
        } else if (blob.size > maxAudioBytes) {
          onError("The recording is too large. Try a shorter recording.");
        } else {
          onAudio(blob);
        }
      };
      recorder.start();
      recording.timer = window.setTimeout(stop, durationMs);
      setState("recording");
    } catch (error) {
      if (active.current) {
        release(active.current);
        active.current = null;
      } else {
        stream?.getTracks().forEach((track) => track.stop());
      }
      if (attempt.current !== id) return;
      setState("idle");
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      onError(denied
        ? "Microphone permission was denied. Allow the microphone in browser settings, or enter your details below."
        : "The microphone could not start. Check your device or enter your details below.");
    } finally {
      starting.current = false;
    }
  }

  return { state, start, stop };
}
