import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createSession, originError } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request) {
  const origin = originError(request); if (origin) return origin;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return Response.json({error:"Слишком много попыток входа. Попробуйте позже."},{status:429});
  let body;
  try { body = await request.json(); } catch { return Response.json({error:"Некорректный JSON"},{status:400}); }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return Response.json({error:"Введите корректный email и пароль."},{status:400});
  try {
    const db = getDb();
    const [rows] = await db.execute("SELECT id,name,email,password_hash,role,is_blocked FROM users WHERE email=? LIMIT 1",[parsed.data.email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(parsed.data.password,user.password_hash))) {
      return Response.json({error:"Неверный email или пароль."},{status:401});
    }
    if (user.is_blocked) return Response.json({error:"Аккаунт заблокирован. Обратитесь в поддержку."},{status:403});
    await createSession(user);
    return Response.json({user:{id:user.id,name:user.name,email:user.email,role:user.role}});
  } catch (e) {
    console.error("login error",e);
    return Response.json({error:"Ошибка входа. Проверьте подключение к базе данных."},{status:500});
  }
}
