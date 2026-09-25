import { getStore } from "@/lib/store";
import { cleanName } from "@/lib/validate";

export async function POST(req: Request, ctx: RouteContext<"/api/groups/[code]/members">) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) return Response.json({ error: "Please enter your name." }, { status: 400 });

  const store = getStore();
  const bundle = await store.getBundle(code);
  if (!bundle) return Response.json({ error: "No group with that code." }, { status: 404 });
  if (bundle.members.length >= bundle.group.expectedSize)
    return Response.json({ error: `This group is full (${bundle.group.expectedSize} people).` }, { status: 409 });
  if (bundle.members.some((m) => m.name.toLowerCase() === name.toLowerCase()))
    return Response.json({ error: `Someone called ${name} is already in this group.` }, { status: 409 });

  const member = await store.addMember(bundle.group.id, name);
  return Response.json({ memberId: member.id });
}
