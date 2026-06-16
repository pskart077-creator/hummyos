import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/context";
import { env } from "@/lib/env";

const MAX_TEXT_LENGTH = 1800;

function cleanTextForSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "codigo omitido")
    .replace(/[#*_`>-]/g, "")
    .slice(0, MAX_TEXT_LENGTH);
}

export async function POST(req: Request) {
  try {
    const ctx = await getCurrentUser();
    if (!ctx) {
      return NextResponse.json(
        { ok: false, error: "Nao autenticado" },
        { status: 401 },
      );
    }

    const { text } = await req.json();
    const cleanText = cleanTextForSpeech(String(text ?? "").trim());

    if (!cleanText) {
      return NextResponse.json(
        { ok: false, error: "Texto obrigatorio." },
        { status: 400 },
      );
    }

    if (!env.elevenLabs.configured) {
      return NextResponse.json(
        { ok: false, error: "ElevenLabs nao configurado no ambiente." },
        { status: 500 },
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${env.elevenLabs.voiceId}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.elevenLabs.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.62,
            similarity_boost: 0.78,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          ok: false,
          error: "Erro ao gerar voz na ElevenLabs.",
          details: errorText.slice(0, 500),
        },
        { status: response.status },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Erro interno ao gerar voz.",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
