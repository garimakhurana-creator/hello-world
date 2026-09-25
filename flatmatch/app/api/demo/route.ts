import { DEMO_MEMBERS } from "@/lib/demo";
import { getStore } from "@/lib/store";

// Creates a ready-to-view sample group with everyone already submitted.
export async function POST() {
  const store = getStore();
  const [riya, ...others] = DEMO_MEMBERS;
  const { group, member } = await store.createGroup({ name: "Sample flat hunt", expectedSize: 3, coordinatorName: riya.name });
  await store.saveRequirements(member, riya.requirements);
  for (const o of others) await store.saveRequirements(await store.addMember(group.id, o.name), o.requirements);
  return Response.json({ code: group.code, memberId: member.id });
}
