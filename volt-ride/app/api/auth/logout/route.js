import { destroySession, originError } from "@/lib/auth";

export async function POST(request) {
  const origin = originError(request); if (origin) return origin;
  await destroySession();
  return Response.json({ok:true});
}
