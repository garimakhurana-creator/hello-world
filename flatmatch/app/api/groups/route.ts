import { getStore } from "@/lib/store";
import { cleanName } from "@/lib/validate";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.groupName);
  const coordinatorName = cleanName(body.yourName);
  if (!name || !coordinatorName) return Response.json({ error: "Group name and your name are required." }, { status: 400 });
  const expectedSize = Math.min(6, Math.max(2, Math.round(Number(body.expectedSize) || 3)));

  const { group, member } = await getStore().createGroup({ name, expectedSize, coordinatorName });
  return Response.json({ code: group.code, memberId: member.id });
}
