import { auth } from "@wix/essentials";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * HTTP endpoints are public URLs, so every handler starts here. Only a Wix user signed in to this
 * site's dashboard (the dashboard page calls with fetchWithAuth) may continue. Returns a 403 response
 * to send back, or null when the caller is allowed.
 */
export async function rejectUnlessDashboardUser(): Promise<Response | null> {
  try {
    const info = await auth.getTokenInfo();
    if (info.subjectType === "USER") return null;
  } catch {
    // No token or an unreadable one: fall through to the refusal.
  }
  return json({ error: "Only people signed in to this site's dashboard can do this." }, 403);
}

export async function readJson<T>(request: Request): Promise<T | undefined> {
  try {
    return (await request.json()) as T;
  } catch {
    return undefined;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
