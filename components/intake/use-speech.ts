"use client";

import { useI18n } from "@/components/i18n/provider";
import { speechLanguage, type Language } from "@/lib/i18n/core";
import { useCallback, useEffect, useRef, useState } from "react";

type Playback = { controller: AbortController; audio?: HTMLAudioElement; url?: string; local?: SpeechSynthesisUtterance };

export function useSpeech() {
  const { language } = useI18n();
  const [playbackLanguage, setPlaybackLanguage] = useState<Language>();
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

  useEffect(() => clearPlayback, [clearPlayback, language]);

  function stop() {
    clearPlayback();
    setAudioUrl(undefined);
    setStatus("");
  }

  async function speak(text: string, allowCloud = true) {
    stop();
    setPlaybackLanguage(language);
    const current: Playback = { controller: new AbortController() };
    active.current = current;
    const synth = window.speechSynthesis;
    const target = speechLanguage(language);
    const voice = synth?.getVoices().find(({ lang }) => lang.toLowerCase().startsWith(target));
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
      setStatus("Tap Listen to hear the details.");
    }
  }

  async function speakCloud(current: Playback, text: string) {
    setStatus("Preparing AI-generated audio…");
    try {
      const response = await fetch("/api/intake/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: speechLanguage(language) }),
        signal: current.controller.signal,
      });
      if (!response.ok) throw new Error("Audio unavailable");
      const blob = await response.blob();
      if (active.current !== current) return;
      current.url = URL.createObjectURL(blob);
      setAudioUrl(current.url);
      setStatus("AI-generated audio is ready. Press play to listen.");
    } catch {
      if (active.current === current) setStatus("Speech is unavailable. Read the details or try Listen again.");
    }
  }

  const attachAudio = useCallback((element: HTMLAudioElement | null) => {
    if (active.current && element) active.current.audio = element;
  }, []);

  return { speak, stop, status: playbackLanguage === language ? status : "", audioUrl: playbackLanguage === language ? audioUrl : undefined, attachAudio };
}
