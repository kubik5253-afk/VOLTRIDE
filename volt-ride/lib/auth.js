import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "./db";

const COOKIE_NAME = "volt_session";
const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET должен быть не короче 32 символов");
  }
  return new TextEncoder().encode(value);
};

export async function createSession(user) {
  const token = await new SignJWT({
    uid: String(user.id),
    role: user.role,
    email: user.email
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser({ allowBlocked = false } = {}) {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    const db = getDb();
    const [rows] = await db.execute(
      `SELECT id, name, email, role, is_blocked, balance_cents, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [payload.uid]
    );
    const user = rows[0];
    if (!user || (user.is_blocked && !allowBlocked)) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: Response.json({ error: "Необходим вход в аккаунт" }, { status: 401 }) };
  }
  return { user };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.role !== "admin") {
    return { error: Response.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  return result;
}

export function checkSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // local tools/CLI may omit Origin; cookie SameSite=lax remains enabled.
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function originError(request) {
  if (checkSameOrigin(request)) return null;
  return Response.json({ error: "Недопустимый источник запроса" }, { status: 403 });
}
