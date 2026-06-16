"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Mic, MicOff, Power, Volume2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceJarvisButtonProps = {
  userId?: string;
  companyId?: string;
  sessionId?: string;
};

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
  confidence?: number;
};

type SpeechRecognitionResultLike = {
  readonly [index: number]: SpeechRecognitionAlternativeLike | undefined;
  isFinal?: boolean;
};

type SpeechRecognitionResultListLike = {
  readonly [index: number]: SpeechRecognitionResultLike | undefined;
  length: number;
};

type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results?: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorLike = {
  error?: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitAudioContext?: typeof AudioContext;
  }
}

const WAKE_WORDS = ["jarvis", "jervis"];
const WAKE_STATUS = 'Aguardando "Jarvis"';
const READY_STATUS = "Pronto para nova pergunta por alguns segundos.";
const FOLLOW_UP_TIMEOUT_MS = 12_000;
const CLAP_COMMAND_WINDOW_MS = 7_000;
const CLAP_COOLDOWN_MS = 900;
const CLAP_MIN_PEAK = 0.72;
const CLAP_MIN_RMS = 0.16;
const MIN_COMMAND_CHARS = 6;
const MIN_COMMAND_WORDS = 2;
const WAKE_MUSIC_WATCH_URL =
  "https://www.youtube.com/watch?v=wjZMcWaniA4&list=PLR5Cmjo90BNguiSb2wDShPdKoa-Xiw5x1&index=9";
const WAKE_MUSIC_EMBED_URL =
  "https://www.youtube.com/embed/wjZMcWaniA4?autoplay=1&playsinline=1&rel=0&list=PLR5Cmjo90BNguiSb2wDShPdKoa-Xiw5x1&index=9";

const PLAY_MUSIC_COMMANDS = [
  "acorda crianca papai chegou",
  "acorda criança papai chegou",
];

const STOP_MUSIC_COMMANDS = [
  "parar musica",
  "para musica",
  "parar a musica",
  "para a musica",
  "desligar musica",
  "desliga musica",
];

const SHUTDOWN_COMMANDS = [
  "desligar",
  "desliga",
  "desligar mic",
  "desliga mic",
  "desligar o mic",
  "desliga o mic",
  "desligar microfone",
  "desliga microfone",
  "desligar o microfone",
  "desliga o microfone",
  "desligar jarvis",
  "desliga jarvis",
  "desligar o jarvis",
  "desliga o jarvis",
  "parar de ouvir",
];

const END_CONVERSATION_COMMANDS = [
  "finalizar",
  "finaliza",
  "finalizar conversa",
  "finaliza conversa",
  "encerrar",
  "encerra",
  "encerrar conversa",
  "encerra conversa",
];

const ENABLE_COMMANDS = [
  "ligar",
  "liga",
  "ligar mic",
  "liga mic",
  "ligar o mic",
  "liga o mic",
  "ligar microfone",
  "liga microfone",
  "ligar o microfone",
  "liga o microfone",
];

const NOISE_ONLY_PHRASES = new Set([
  "ah",
  "a",
  "e",
  "eh",
  "hum",
  "hmm",
  "uh",
  "ta",
  "ok",
  "opa",
]);

function normalizeSpeech(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCommandAfterWakeWord(transcript: string) {
  const normalizedWords = normalizeSpeech(transcript).split(" ");
  const wakeIndex = normalizedWords.findIndex((word) =>
    WAKE_WORDS.includes(word),
  );

  if (wakeIndex === -1) return null;

  const directMatch = transcript.match(/\b(?:jarvis|jervis)\b[\s,.:;-]?(.*)$/i);
  if (directMatch) return directMatch[1]?.trim() ?? "";

  return normalizedWords.slice(wakeIndex + 1).join(" ").trim();
}

function matchesCommand(command: string, commands: string[]) {
  const normalized = normalizeSpeech(command);

  return commands.some((candidate) => normalized === candidate);
}

function isLikelyNoise(transcript: string) {
  const normalized = normalizeSpeech(transcript);
  if (!normalized) return true;
  if (NOISE_ONLY_PHRASES.has(normalized)) return true;
  if (WAKE_WORDS.includes(normalized)) return false;
  if (normalized.includes("jarvis") || normalized.includes("jervis")) {
    return false;
  }

  const words = normalized.split(" ").filter(Boolean);

  return (
    normalized.length < MIN_COMMAND_CHARS ||
    words.length < MIN_COMMAND_WORDS
  );
}

function getFinalSpeech(event: SpeechRecognitionEventLike) {
  const results = event.results;
  if (!results?.length) return { transcript: "", confidence: undefined };

  const start = event.resultIndex ?? results.length - 1;
  const chunks: string[] = [];
  let confidence: number | undefined;

  for (let index = start; index < results.length; index += 1) {
    const result = results[index];
    if (!result || result.isFinal === false) continue;

    const transcript = result[0]?.transcript?.trim();
    if (typeof result[0]?.confidence === "number") {
      confidence = result[0]?.confidence;
    }
    if (transcript) chunks.push(transcript);
  }

  return { transcript: chunks.join(" ").trim(), confidence };
}

function isRecentClap(timestamp: number) {
  return Date.now() - timestamp <= CLAP_COMMAND_WINDOW_MS;
}

export function VoiceJarvisButton({
  userId,
  companyId,
  sessionId = "dashboard-voice",
}: VoiceJarvisButtonProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastText, setLastText] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [statusText, setStatusText] = useState(WAKE_STATUS);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState("");
  const [clapReady, setClapReady] = useState(false);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioDoneRef = useRef<(() => void) | null>(null);
  const clapAudioContextRef = useRef<AudioContext | null>(null);
  const clapStreamRef = useRef<MediaStream | null>(null);
  const clapAnimationRef = useRef<number | null>(null);
  const clapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  const listeningRef = useRef(false);
  const loadingRef = useRef(false);
  const speakingRef = useRef(false);
  const awaitingCommandRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptRef = useRef("");
  const lastTranscriptAtRef = useRef(0);
  const lastClapAtRef = useRef(0);
  const lastClapDetectedAtRef = useRef(0);
  const musicUrlRef = useRef("");
  const previousClapRmsRef = useRef(0);
  const sendToJarvisRef = useRef<(message: string) => Promise<void>>(
    async () => undefined,
  );
  const processTranscriptRef = useRef<
    (transcript: string, confidence?: number) => Promise<void>
  >(async () => undefined);

  useEffect(() => {
    enabledRef.current = enabled;
    loadingRef.current = loading;
    speakingRef.current = speaking;
  }, [enabled, loading, speaking]);

  useEffect(() => {
    musicUrlRef.current = musicUrl;
  }, [musicUrl]);

  useEffect(() => {
    sendToJarvisRef.current = sendToJarvis;
    processTranscriptRef.current = processTranscript;
  });

  const clearRestartTimer = useCallback(() => {
    if (!restartTimerRef.current) return;

    clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
  }, []);

  const clearFollowUpTimer = useCallback(() => {
    if (!followUpTimerRef.current) return;

    clearTimeout(followUpTimerRef.current);
    followUpTimerRef.current = null;
  }, []);

  const clearClapTimer = useCallback(() => {
    if (!clapTimerRef.current) return;

    clearTimeout(clapTimerRef.current);
    clapTimerRef.current = null;
  }, []);

  const markClapDetected = useCallback(() => {
    lastClapAtRef.current = Date.now();
    setClapReady(true);
    setError("");
    setStatusText("Palma detectada. Diga: acorda crianca papai chegou.");

    clearClapTimer();
    clapTimerRef.current = setTimeout(() => {
      setClapReady(false);
      if (enabledRef.current && !loadingRef.current && !speakingRef.current) {
        setStatusText(awaitingCommandRef.current ? READY_STATUS : WAKE_STATUS);
      }
    }, CLAP_COMMAND_WINDOW_MS);
  }, [clearClapTimer]);

  const closeConversationWindow = useCallback(() => {
    clearFollowUpTimer();
    awaitingCommandRef.current = false;
    setStatusText(WAKE_STATUS);
  }, [clearFollowUpTimer]);

  const openConversationWindow = useCallback(() => {
    clearFollowUpTimer();
    awaitingCommandRef.current = true;
    setStatusText(READY_STATUS);

    followUpTimerRef.current = setTimeout(() => {
      awaitingCommandRef.current = false;
      setStatusText(WAKE_STATUS);
    }, FOLLOW_UP_TIMEOUT_MS);
  }, [clearFollowUpTimer]);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (
      !recognition ||
      !enabledRef.current ||
      listeningRef.current ||
      loadingRef.current ||
      speakingRef.current
    ) {
      return;
    }

    try {
      clearRestartTimer();
      recognition.start();
      setStatusText(awaitingCommandRef.current ? READY_STATUS : WAKE_STATUS);
    } catch {
      setError("O microfone ja esta ativo. Aguarde um instante.");
    }
  }, [clearRestartTimer]);

  const stopRecognition = useCallback(
    (abort = false) => {
      clearRestartTimer();

      const recognition = recognitionRef.current;
      if (!recognition) return;

      try {
        if (abort) recognition.abort();
        else recognition.stop();
      } catch {
        // O navegador pode encerrar o reconhecimento sozinho entre eventos.
      }
    },
    [clearRestartTimer],
  );

  const stopAudioPlayback = useCallback(
    (restart = true) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const finishAudio = audioDoneRef.current;
      audioDoneRef.current = null;
      finishAudio?.();

      speakingRef.current = false;
      setSpeaking(false);

      if (restart && enabledRef.current) startRecognition();
    },
    [startRecognition],
  );

  const stopWakeMusic = useCallback(() => {
    setMusicUrl("");
    setStatusText(awaitingCommandRef.current ? READY_STATUS : WAKE_STATUS);
  }, []);

  const stopClapDetection = useCallback(() => {
    clearClapTimer();

    if (clapAnimationRef.current !== null) {
      cancelAnimationFrame(clapAnimationRef.current);
      clapAnimationRef.current = null;
    }

    clapStreamRef.current?.getTracks().forEach((track) => track.stop());
    clapStreamRef.current = null;

    void clapAudioContextRef.current?.close().catch(() => undefined);
    clapAudioContextRef.current = null;
    previousClapRmsRef.current = 0;
    setClapReady(false);
  }, [clearClapTimer]);

  const startClapDetection = useCallback(async () => {
    if (clapStreamRef.current || !enabledRef.current) return;

    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 1024;
      const data = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      clapStreamRef.current = stream;
      clapAudioContextRef.current = audioContext;

      const detect = () => {
        analyser.getByteTimeDomainData(data);

        let peak = 0;
        let total = 0;
        for (let index = 0; index < data.length; index += 1) {
          const value = Math.abs((data[index] - 128) / 128);
          peak = Math.max(peak, value);
          total += value * value;
        }

        const rms = Math.sqrt(total / data.length);
        const now = Date.now();
        const isSharpTransient = rms > previousClapRmsRef.current * 2.4;

        if (
          enabledRef.current &&
          !loadingRef.current &&
          !speakingRef.current &&
          !musicUrlRef.current &&
          peak >= CLAP_MIN_PEAK &&
          rms >= CLAP_MIN_RMS &&
          isSharpTransient &&
          now - lastClapDetectedAtRef.current > CLAP_COOLDOWN_MS
        ) {
          lastClapDetectedAtRef.current = now;
          markClapDetected();
        }

        previousClapRmsRef.current = rms;
        clapAnimationRef.current = requestAnimationFrame(detect);
      };

      detect();
    } catch {
      // Se o navegador negar o microfone para audio bruto, o Jarvis por voz ainda funciona.
    }
  }, [markClapDetected]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError("");
      listeningRef.current = true;
      setListening(true);
      setStatusText(awaitingCommandRef.current ? READY_STATUS : WAKE_STATUS);
    };

    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);

      if (enabledRef.current && !loadingRef.current && !speakingRef.current) {
        restartTimerRef.current = setTimeout(startRecognition, 350);
      }
    };

    recognition.onerror = (event) => {
      listeningRef.current = false;
      setListening(false);

      if (event.error === "not-allowed") {
        enabledRef.current = false;
        setEnabled(false);
        setError(
          "Permita o microfone no navegador para usar o Jarvis sempre ativo.",
        );
        return;
      }

      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError("Nao consegui ouvir com clareza. Vou tentar de novo.");
      }
    };

    recognition.onresult = async (event) => {
      const { transcript, confidence } = getFinalSpeech(event);
      if (!transcript) return;

      await processTranscriptRef.current(transcript, confidence);
    };

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      clearRestartTimer();
      clearFollowUpTimer();
      clearClapTimer();
      recognition.abort();
      stopClapDetection();
      stopAudioPlayback(false);
    };
  }, [
    clearClapTimer,
    clearFollowUpTimer,
    clearRestartTimer,
    startRecognition,
    stopClapDetection,
    stopAudioPlayback,
  ]);

  useEffect(() => {
    if (supported !== true) return;

    if (enabled) {
      startRecognition();
      void startClapDetection();
    }
    else {
      closeConversationWindow();
      stopRecognition(true);
      stopClapDetection();
      stopAudioPlayback(false);
      setStatusText("Jarvis desligado");
    }
  }, [
    closeConversationWindow,
    enabled,
    startClapDetection,
    startRecognition,
    stopClapDetection,
    stopAudioPlayback,
    stopRecognition,
    supported,
  ]);

  async function processTranscript(transcript: string, confidence?: number) {
    if (!enabledRef.current || loadingRef.current || speakingRef.current) return;

    const normalizedTranscript = normalizeSpeech(transcript);
    const now = Date.now();

    if (
      normalizedTranscript === lastTranscriptRef.current &&
      now - lastTranscriptAtRef.current < 2500
    ) {
      return;
    }

    lastTranscriptRef.current = normalizedTranscript;
    lastTranscriptAtRef.current = now;

    if (typeof confidence === "number" && confidence > 0 && confidence < 0.45) {
      return;
    }

    if (matchesCommand(transcript, PLAY_MUSIC_COMMANDS)) {
      if (!isRecentClap(lastClapAtRef.current)) {
        setError("");
        setLastText(transcript);
        setLastAnswer("Bata uma palma antes do comando da musica.");
        setStatusText("Aguardando palma antes da musica.");
        return;
      }

      clearClapTimer();
      setClapReady(false);
      setError("");
      setLastText(transcript);
      setLastAnswer("Tocando musica.");
      setMusicUrl(WAKE_MUSIC_EMBED_URL);
      setStatusText("Tocando musica.");
      openConversationWindow();
      startRecognition();
      return;
    }

    if (matchesCommand(transcript, STOP_MUSIC_COMMANDS)) {
      setError("");
      setLastText(transcript);
      setLastAnswer("Musica parada.");
      stopWakeMusic();
      startRecognition();
      return;
    }

    const commandAfterWakeWord = extractCommandAfterWakeWord(transcript);
    const inConversation = awaitingCommandRef.current;

    if (commandAfterWakeWord === null && !inConversation) return;

    const commandText = commandAfterWakeWord ?? transcript;

    setError("");
    setLastText(transcript);

    if (matchesCommand(commandText, SHUTDOWN_COMMANDS)) {
      await shutdownJarvisByVoice();
      return;
    }

    if (matchesCommand(commandText, END_CONVERSATION_COMMANDS)) {
      closeConversationWindow();
      await speak("Conversa finalizada. Diga Jarvis para falar comigo de novo.");
      return;
    }

    if (matchesCommand(commandText, ENABLE_COMMANDS)) {
      await speak("Microfone ja esta ligado.");
      openConversationWindow();
      startRecognition();
      return;
    }

    if (commandAfterWakeWord === "") {
      setStatusText("Jarvis chamado. Aguardando comando.");
      await speak("Pode falar.");
      openConversationWindow();
      startRecognition();
      return;
    }

    if (isLikelyNoise(commandText)) return;

    clearFollowUpTimer();
    loadingRef.current = true;
    stopRecognition();
    setStatusText("Jarvis pensando...");
    await sendToJarvisRef.current(commandText);
  }

  async function shutdownJarvisByVoice() {
    enabledRef.current = false;
    closeConversationWindow();
    stopRecognition(true);
    setStatusText("Jarvis desligando...");
    await speak("Jarvis desligado.");
    setEnabled(false);
    setStatusText("Jarvis desligado");
  }

  async function sendToJarvis(message: string) {
    try {
      loadingRef.current = true;
      setLoading(true);
      setError("");

      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          userId,
          companyId,
          sessionId,
          conversationId,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json?.error || "Erro ao chamar o Jarvis.");
      }

      const answer =
        json.data?.answer || json.data?.content || "Nao recebi resposta.";

      setConversationId(json.data?.conversationId ?? null);
      setLastAnswer(answer);
      setStatusText("Jarvis respondendo...");
      await speak(answer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao falar com o Jarvis.";
      setError(message);
      setLastAnswer(message);
      await speak(message);
    } finally {
      loadingRef.current = false;
      setLoading(false);

      if (enabledRef.current) {
        openConversationWindow();
        startRecognition();
      }
    }
  }

  async function speak(text: string) {
    stopRecognition();
    stopAudioPlayback(false);

    try {
      speakingRef.current = true;
      setSpeaking(true);

      const response = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Erro ao gerar voz.");
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audioUrlRef.current = audioUrl;
      audioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audioDoneRef.current = resolve;
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Erro ao tocar audio."));
        audio.play().catch(reject);
      });
    } catch (err) {
      console.error("Erro ao tocar voz ElevenLabs:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao tocar voz ElevenLabs.",
      );
    } finally {
      stopAudioPlayback(false);

      if (enabledRef.current) startRecognition();
    }
  }

  function stopSpeaking(restart = true) {
    stopAudioPlayback(restart);
  }

  function toggleJarvis() {
    const nextEnabled = !enabledRef.current;

    enabledRef.current = nextEnabled;
    setEnabled(nextEnabled);
    setError("");
    awaitingCommandRef.current = false;

      if (nextEnabled) {
      setStatusText(awaitingCommandRef.current ? READY_STATUS : WAKE_STATUS);
      startRecognition();
      void startClapDetection();
    } else {
      stopRecognition(true);
      stopSpeaking(false);
      stopClapDetection();
      stopWakeMusic();
      setStatusText("Jarvis desligado");
    }
  }

  if (supported === false) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle>Jarvis por voz indisponivel</CardTitle>
          <CardDescription>
            Use Chrome ou Edge no desktop para liberar comandos de voz.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const active = enabled && (listening || loading || speaking);

  return (
    <Card className="overflow-hidden border-brand/25">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
              active
                ? "border-brand/30 bg-brand/10 text-brand-400"
                : "border-border-subtle bg-bg-elevated text-slate-400",
            )}
          >
            {enabled ? <Mic size={18} /> : <MicOff size={18} />}
          </div>
          <div className="min-w-0">
            <CardTitle>Jarvis sempre ativo</CardTitle>
            <CardDescription>{error || statusText}</CardDescription>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {lastAnswer && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Parar audio"
              onClick={() => stopSpeaking()}
            >
              <Volume2 size={16} />
            </Button>
          )}
          <Button
            type="button"
            variant={enabled ? "secondary" : "primary"}
            onClick={toggleJarvis}
            disabled={supported !== true}
          >
            <Power size={16} />
            {enabled ? "Desligar mic" : "Ligar mic"}
          </Button>
        </div>
      </CardHeader>
      {(lastText || lastAnswer || error || musicUrl) && (
        <CardContent className="space-y-3">
          {clapReady && !musicUrl && (
            <div className="rounded-lg border border-brand/25 bg-brand/10 px-3 py-2 text-xs text-brand-300">
              Palma identificada. Fale o comando da musica agora.
            </div>
          )}

          {(lastText || lastAnswer || error) && (
            <div className="grid gap-3 md:grid-cols-2">
              {lastText && (
                <div className="rounded-lg border border-border-subtle bg-bg-base p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Ultimo comando
                  </p>
                  <p className="mt-1 text-sm text-slate-200">{lastText}</p>
                </div>
              )}
              {(lastAnswer || error) && (
                <div className="rounded-lg border border-border-subtle bg-bg-base p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Jarvis respondeu
                  </p>
                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-slate-200">
                    {lastAnswer || error}
                  </p>
                </div>
              )}
            </div>
          )}

          {musicUrl && (
            <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-base">
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2">
                <p className="min-w-0 text-xs font-medium text-slate-300">
                  Acorda crianca papai chegou
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={stopWakeMusic}
                  >
                    Parar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Abrir no YouTube"
                    onClick={() => window.open(WAKE_MUSIC_WATCH_URL, "_blank")}
                  >
                    <ExternalLink size={15} />
                  </Button>
                </div>
              </div>
              <div className="aspect-video w-full bg-black">
                <iframe
                  className="h-full w-full"
                  src={musicUrl}
                  title="Acorda crianca papai chegou"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
