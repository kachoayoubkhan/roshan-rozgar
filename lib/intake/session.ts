import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { IntakeError } from "./http";

const cookieName = "rr_intake_session";
const lifetime = 60 * 60 * 24 * 30;
const sessionId = z.uuid();

function secret() {
  const value = process.env.DEMO_SESSION_SECRET?.trim();
  if (!value || Buffer.byteLength(value) < 32) {
    throw new IntakeError(503, "This demo needs a server session setting before voice and saving can work.");
  }
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function readSession() {
  const raw = (await cookies()).get(cookieName)?.value;
  if (!raw || !process.env.DEMO_SESSION_SECRET || Buffer.byteLength(process.env.DEMO_SESSION_SECRET.trim()) < 32) return null;
  const [id, expires, signature, extra] = raw.split(".");
  if (extra || !sessionId.safeParse(id).success || !/^\d{10}$/.test(expires ?? "") || Number(expires) <= Date.now() / 1000 || !/^[\w-]{43}$/.test(signature ?? "")) return null;
  const expected = Buffer.from(sign(`${id}.${expires}`));
  return timingSafeEqual(Buffer.from(signature), expected) ? id : null;
}

export async function ensureSession(request: Request) {
  const current = await readSession();
  if (current) return current;
  const id = randomUUID();
  const value = `${id}.${Math.floor(Date.now() / 1000) + lifetime}`;
  (await cookies()).set(cookieName, `${value}.${sign(value)}`, {
    httpOnly: true, sameSite: "lax", secure: new URL(request.url).protocol === "https:",
    path: "/", maxAge: lifetime,
  });
  return id;
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || (origin !== `https://${host}` && origin !== `http://${host}`) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    throw new IntakeError(403, "Open Roshan Rozgar in its own tab and try again.");
  }
}

// One-process demo throttle. Hosted deployments need a shared rate limiter.
const limits = new Map<string, { count: number; expires: number }>();
export function throttle(request: Request, key: string, session: string, limit: number) {
  const now = Date.now();
  for (const [entry, window] of limits) {
    if (window.expires <= now) limits.delete(entry);
  }
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? "local";
  const keys = [`${key}:session:${session}`, `${key}:network:${forwarded.slice(0, 128)}`];
  if (keys.some((entry, index) => (limits.get(entry)?.count ?? 0) >= limit * (index === 0 ? 1 : 4))) {
    throw new IntakeError(429, "Too many attempts. Wait a minute and try again.");
  }
  for (const entry of keys) {
    const window = limits.get(entry);
    if (window) window.count++;
    else limits.set(entry, { count: 1, expires: now + 60_000 });
  }
}
