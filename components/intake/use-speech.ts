"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Playback = { controller: AbortController; audio?: HTMLAudioElement; url?: string; local?: SpeechSynthesisUtterance };

export function useSpeech() {
  const active = useRef<Playback | null>(null);
  const [status, setStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState<string>();
  const clearPlayback = useCallback(() => {
    const current = active.current;
    active.current = null;
    if (!current) return;
    current.controller.abort();
    if (current.local) window.speechSynthesis.cancel();
    current.audio?.pause();
    if (current.url) URL.revokeObjectURL(current.url);
  }, []);

  useEffect(() => clearPlayback, [clearPlayback]);

  function stop() {
    clearPlayback();
    setAudioUrl(undefined);
    setStatus("");
  }

  async function speak(text: string, allowCloud = true) {
    stop();
    const current: Playback = { controller: new AbortController() };
    active.current = current;
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find(({ lang }) => /^ur(?:-|$)/i.test(lang));
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(text);
      current.local = utterance;
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.86;
      utterance.onend = () => { if (active.current === current) setStatus(""); };
      utterance.onerror = () => {
        if (active.current !== current) return;
        if (allowCloud) void speakCloud(current, text);
        else setStatus("Tap Listen to try spoken playback again.");
      };
      synth.speak(utterance);
    } else if (allowCloud) {
      await speakCloud(current, text);
    } else {
      setStatus("Tap Listen to hear this in Urdu.");
    }
  }

  async function speakCloud(current: Playback, text: string) {
    setStatus("Preparing AI-generated Urdu audio…");
    try {
      const response = await fetch("/api/intake/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: current.controller.signal,
      });
      if (!response.ok) throw new Error("Audio unavailable");
      const blob = await response.blob();
      if (active.current !== current) return;
      current.url = URL.createObjectURL(blob);
      setAudioUrl(current.url);
      setStatus("AI-generated Urdu audio is ready. Press play to listen.");
    } catch {
      if (active.current === current) setStatus("Urdu audio is unavailable. Read the details or try Listen again.");
    }
  }

  const attachAudio = useCallback((element: HTMLAudioElement | null) => {
    if (active.current && element) active.current.audio = element;
  }, []);

  return { speak, stop, status, audioUrl, attachAudio };
}
