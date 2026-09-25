import { explainResults, explainSummary } from "@/lib/explain";
import { loadGroup, SHORTLIST_SIZE } from "@/lib/group";

export async function GET(req: Request, ctx: RouteContext<"/api/groups/[code]/explain">) {
  const { code } = await ctx.params;
  const scope = new URL(req.url).searchParams.get("scope");
  const data = await loadGroup(code);
  if (!data) return Response.json({ error: "Group not found." }, { status: 404 });
  if (!data.complete || !data.analysis)
    return Response.json({ error: "Waiting for everyone to submit." }, { status: 409 });

  if (scope === "summary") return Response.json(await explainSummary(data.group.id, data.analysis));
  if (scope === "results") return Response.json(await explainResults(data.group.id, data.results.slice(0, SHORTLIST_SIZE)));
  return Response.json({ error: "scope must be summary or results" }, { status: 400 });
}
