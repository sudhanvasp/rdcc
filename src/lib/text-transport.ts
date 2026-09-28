// Helpers for moving pasted text (especially source code) between the
// browser and the API safely.

// Base64 in the browser and on the server. Works for any Unicode text.
// Sending code as base64 keeps the request body free of code-looking
// patterns (SQL keywords, <script>, shell commands...) that some hosting
// firewalls reject on sight, even though they're just text being stored.
export function toBase64(text: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(text, "utf-8").toString("base64");
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000; // chunked so big pastes don't overflow the call stack
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export function fromBase64(b64: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf-8");
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Postgres text columns cannot store the NUL character (\u0000). One stray
// NUL anywhere in a paste makes the whole insert fail with a 500, so strip it.
export function cleanText(text: string): string {
  return text.replace(/\u0000/g, "");
}