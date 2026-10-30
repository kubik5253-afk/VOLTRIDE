import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({user:null},{status:401});
  return Response.json({user:{
    id:Number(user.id),name:user.name,email:user.email,role:user.role,
    balanceCents:Number(user.balance_cents),createdAt:user.created_at
  }});
}
