const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
] as const;

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyApiError = {
  error?: {
    status?: number;
    message?: string;
  };
};

type SpotifyImage = {
  url: string;
  height?: number;
  width?: number;
};

type SpotifyArtist = {
  name: string;
};

type SpotifyTrack = {
  id?: string;
  name?: string;
  uri?: string;
  type?: string;
  artists?: SpotifyArtist[];
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
  external_urls?: {
    spotify?: string;
  };
};

type SpotifyCurrentlyPlaying = {
  is_playing?: boolean;
  progress_ms?: number;
  currently_playing_type?: string;
  item?: SpotifyTrack | null;
};

export function getSpotifyRedirectUri() {
  return (
    process.env.SPOTIFY_REDIRECT_URI ||
    `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/integrations/spotify/callback`
  );
}

export function getSpotifyClientConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify nao configurado. Defina SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET.",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getSpotifyRedirectUri(),
  };
}

export function buildSpotifyAuthorizeUrl(state: string) {
  const { clientId, redirectUri } = getSpotifyClientConfig();
  const url = new URL("/authorize", SPOTIFY_ACCOUNTS_URL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");

  return url;
}

export async function exchangeSpotifyCodeForToken(code: string) {
  const { clientSecret, clientId, redirectUri } = getSpotifyClientConfig();
  return spotifyTokenRequest({
    clientId,
    clientSecret,
    body: {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    },
  });
}

export async function refreshSpotifyAccessToken() {
  const { clientSecret, clientId } = getSpotifyClientConfig();
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error(
      "Spotify nao configurado. Defina SPOTIFY_REFRESH_TOKEN no .env.",
    );
  }

  return spotifyTokenRequest({
    clientId,
    clientSecret,
    body: {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
  });
}

export async function getSpotifyCurrentTrack() {
  const data = await spotifyApiFetch<SpotifyCurrentlyPlaying | null>(
    "/me/player/currently-playing",
  );

  if (!data?.item) {
    return {
      isPlaying: false,
      item: null,
      message: "Nada tocando agora.",
    };
  }

  return {
    isPlaying: Boolean(data.is_playing),
    progressMs: data.progress_ms ?? null,
    type: data.currently_playing_type ?? data.item.type ?? "unknown",
    track: {
      id: data.item.id ?? null,
      name: data.item.name ?? null,
      uri: data.item.uri ?? null,
      artists: data.item.artists?.map((artist) => artist.name) ?? [],
      album: data.item.album?.name ?? null,
      imageUrl: data.item.album?.images?.[0]?.url ?? null,
      spotifyUrl: data.item.external_urls?.spotify ?? null,
    },
  };
}

export async function spotifyPause(deviceId?: string) {
  await spotifyApiFetch("/me/player/pause", {
    method: "PUT",
    deviceId,
  });
  return { ok: true, action: "pause" };
}

export async function spotifyNext(deviceId?: string) {
  await spotifyApiFetch("/me/player/next", {
    method: "POST",
    deviceId,
  });
  return { ok: true, action: "next" };
}

export async function spotifyPrevious(deviceId?: string) {
  await spotifyApiFetch("/me/player/previous", {
    method: "POST",
    deviceId,
  });
  return { ok: true, action: "previous" };
}

export async function spotifyPlay(input: {
  deviceId?: string;
  uri?: string;
  contextUri?: string;
}) {
  const body = input.uri
    ? { uris: [input.uri] }
    : input.contextUri
      ? { context_uri: input.contextUri }
      : undefined;

  await spotifyApiFetch("/me/player/play", {
    method: "PUT",
    deviceId: input.deviceId,
    body,
  });

  return {
    ok: true,
    action: "play",
    uri: input.uri,
    contextUri: input.contextUri,
  };
}

async function spotifyTokenRequest(params: {
  clientId: string;
  clientSecret: string;
  body: Record<string, string>;
}) {
  const body = new URLSearchParams(params.body);
  const auth = Buffer.from(
    `${params.clientId}:${params.clientSecret}`,
  ).toString("base64");

  const res = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as
    | SpotifyTokenResponse
    | { error?: string; error_description?: string };

  if (!res.ok || !("access_token" in data)) {
    throw new Error(
      "Erro ao autenticar no Spotify: " +
        ("error_description" in data && data.error_description
          ? data.error_description
          : "resposta invalida"),
    );
  }

  return data;
}

async function spotifyApiFetch<T = unknown>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    deviceId?: string;
  } = {},
): Promise<T | null> {
  const token = await refreshSpotifyAccessToken();
  const url = new URL(`${SPOTIFY_API_URL}${path}`);

  if (init.deviceId) {
    url.searchParams.set("device_id", init.deviceId);
  }

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? (data as SpotifyApiError).error?.message
        : undefined;

    throw new Error(
      `Spotify ${res.status}: ${message ?? (text || "erro desconhecido")}`,
    );
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
