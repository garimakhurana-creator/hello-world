import { getStore } from "@/lib/store";
import { cleanRequirements } from "@/lib/validate";

export async function PUT(req: Request, ctx: RouteContext<"/api/groups/[code]/members/[memberId]">) {
  const { code, memberId } = await ctx.params;
  const store = getStore();
  const bundle = await store.getBundle(code);
  const member = bundle?.members.find((m) => m.id === memberId);
  if (!member) return Response.json({ error: "Member not found in this group." }, { status: 404 });

  const requirements = cleanRequirements(await req.json().catch(() => null));
  await store.saveRequirements(member, requirements);
  return Response.json({ ok: true, requirements });
}
