interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      size: "invisible";
      execution: "execute";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    }
  ) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable"));
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Return one single-use Turnstile token. Local/dev builds without a site key skip it. */
export async function getTurnstileToken(action: string): Promise<string | undefined> {
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  if (!sitekey) return undefined;
  const api = await loadTurnstile();
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.inset = "auto 0 0 auto";
  document.body.appendChild(container);

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let widgetId = "";
    const cleanup = () => {
      if (widgetId) api.remove(widgetId);
      container.remove();
    };
    const finish = (token?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      if (token) resolve(token);
      else reject(new Error("Human verification failed"));
    };
    const timer = window.setTimeout(() => finish(), 15_000);
    widgetId = api.render(container, {
      sitekey,
      action,
      size: "invisible",
      execution: "execute",
      callback: (token) => finish(token),
      "error-callback": () => finish(),
      "expired-callback": () => finish(),
    });
    api.execute(widgetId);
  });
}

export {};
