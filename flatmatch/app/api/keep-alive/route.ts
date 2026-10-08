import { getStore } from "@/lib/store";

// Called once a day by the Vercel cron in vercel.json. Supabase pauses free
// projects after about a week without activity; one tiny read prevents that.
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const store = getStore();
    const properties = await store.ping();
    return Response.json({ ok: true, storage: store.kind, properties, at: new Date().toISOString() });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message.slice(0, 200) }, { status: 503 });
  }
}
