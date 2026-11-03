import { auth } from "@wix/essentials";
import { orders } from "@wix/ecom";

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const REFUSED = "Only people signed in to this site's dashboard with access to orders can do this.";

/**
 * HTTP endpoints are public URLs, so every handler starts here. Returns a 403 response to send back,
 * or null when the caller is allowed.
 *
 * 1. The token must be live and belong to a Wix user (someone signed in to the site's dashboard),
 *    not a visitor, member or another app.
 * 2. The user must be able to read this site's orders themselves. The app then acts with its own
 *    elevated access, so without this check any collaborator, whatever their role, could read
 *    customer addresses or mark orders shipped. The check makes one small orders search as the
 *    caller, without elevation, and lets Wix decide. It fails closed.
 */
export async function rejectUnlessOrderManager(): Promise<Response | null> {
  try {
    const info = await auth.getTokenInfo();
    if (!info.active || info.subjectType !== "USER") return json({ error: REFUSED }, 403);
  } catch {
    return json({ error: REFUSED }, 403);
  }
  try {
    await orders.searchOrders({ cursorPaging: { limit: 1 } });
  } catch {
    return json({ error: REFUSED }, 403);
  }
  return null;
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
