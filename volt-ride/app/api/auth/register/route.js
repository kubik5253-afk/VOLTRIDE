import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createSession, originError } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request) {
  const origin = originError(request); if (origin) return origin;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return Response.json({error:"Слишком много попыток. Попробуйте позже."},{status:429});
  let body;
  try { body = await request.json(); } catch { return Response.json({error:"Некорректный JSON"},{status:400}); }
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return Response.json({error:parsed.error.issues[0]?.message || "Проверьте данные"},{status:400});
  if (body.acceptedRules !== true) return Response.json({error:"Необходимо подтвердить правила и возрастное требование."},{status:400});

  try {
    const db = getDb();
    const [existing] = await db.execute("SELECT id FROM users WHERE email = ? LIMIT 1",[parsed.data.email]);
    if (existing.length) return Response.json({error:"Аккаунт с таким email уже существует."},{status:409});
    const hash = await bcrypt.hash(parsed.data.password, 12);
    const [result] = await db.execute(
      "INSERT INTO users (name,email,password_hash,accepted_rules_at) VALUES (?,?,?,NOW())",
      [parsed.data.name, parsed.data.email, hash]
    );
    const user = {id:result.insertId,name:parsed.data.name,email:parsed.data.email,role:"user"};
    await createSession(user);
    return Response.json({user:{id:user.id,name:user.name,email:user.email,role:user.role}}, {status:201});
  } catch (e) {
    console.error("register error", e);
    return Response.json({error:"Не удалось создать аккаунт. Проверьте подключение к базе данных."},{status:500});
  }
}
