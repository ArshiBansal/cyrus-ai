"use client"
/* ══ turnstile.ts — the browser half of the Cloudflare human check ═══════
   The widget is rendered explicitly into a slot the sign-in sheet owns, and
   the Cloudflare script is only fetched when a site key is actually
   configured. On a deploy without keys nothing third-party loads at all and
   the sheet looks exactly like it always did.                          ═ */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
  /** fires once Turnstile's internals are live - render() before this is a silent no-op */
  ready?: (cb: () => void) => void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

export const turnstileSiteKey = (): string =>
  (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string | undefined)?.trim() || "";

export const turnstileConfigured = (): boolean => Boolean(turnstileSiteKey());

let loading: Promise<TurnstileApi | null> | null = null;

function loadScript(): Promise<TurnstileApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((res) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => res(window.turnstile ?? null);
    s.onerror = () => res(null);
    document.head.appendChild(s);
  });
  return loading;
}

export type TurnstileHandle = { reset: () => void; remove: () => void };

/** one widget per slot element - React 18 dev mounts effects twice, and a
    second render() into an occupied slot silently drops the first. */
const hosted = new WeakMap<HTMLElement, { id: string; api: TurnstileApi }>();

function forget(el: HTMLElement) {
  const prev = hosted.get(el);
  if (prev) {
    try { prev.api.remove(prev.id); } catch { /* already gone */ }
    hosted.delete(el);
  }
}

/** only tears the widget down if it is still the one occupying the slot, so a
    cancelled mount can never wipe the replacement that already rendered. */
function forgetId(el: HTMLElement, id: string) {
  if (hosted.get(el)?.id !== id) return;
  forget(el);
  el.replaceChildren();
}

function whenReady(api: TurnstileApi): Promise<void> {
  if (typeof api.ready !== "function") return Promise.resolve();
  return new Promise((res) => {
    let done = false;
    const finish = () => { if (!done) { done = true; res(); } };
    try { api.ready!(finish); } catch { finish(); }
    setTimeout(finish, 2500);
  });
}

/**
 * Mount the managed widget. `onToken` fires with the fresh token once the
 * visitor passes, and with an empty string when it expires or errors, so the
 * caller can never submit with a stale token.
 */
export async function mountTurnstile(
  el: HTMLElement,
  onToken: (token: string) => void,
): Promise<TurnstileHandle | null> {
  const [api, sitekey] = [await loadScript(), turnstileSiteKey()];
  if (!api || !sitekey || !el.isConnected) return null;
  await whenReady(api);
  if (!el.isConnected) return null;
  forget(el);
  el.replaceChildren();
  let id = "";
  try {
    id = api.render(el, {
      sitekey,
      /* the site is dark by default and carries .light on <html> in light mode */
      theme: document.documentElement.classList.contains("light") ? "light" : "dark",
      size: "flexible",
      /* Turnstile only accepts letters, digits, - and _ here, max 32 chars */
      action: "cyrus-email-signin",
      appearance: "always",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
  } catch {
    return null;
  }
  hosted.set(el, { id, api });
  const handle: TurnstileHandle = {
    reset: () => {
      if (hosted.get(el)?.id !== id) return;
      onToken("");
      try { api.reset(id); } catch { /* widget already gone */ }
    },
    remove: () => forgetId(el, id),
  };
  return handle;
}

