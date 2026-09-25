import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";
import { btn, Card, Eyebrow, Page } from "@/components/ui";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function JoinGroup(props: PageProps<"/join/[code]">) {
  const { code } = await props.params;
  const bundle = await getStore().getBundle(code);

  if (!bundle)
    return (
      <Page narrow>
        <h1 className="text-2xl font-semibold">No group with code {code.toUpperCase()}</h1>
        <p className="mt-2 text-stone-600">Check the code with whoever invited you.</p>
        <Link href="/join" className={`${btn.secondary} mt-6`}>Try another code</Link>
      </Page>
    );

  const { group, members } = bundle;
  const coordinator = members.find((m) => m.role === "coordinator");
  const full = members.length >= group.expectedSize;

  return (
    <Page narrow>
      <Eyebrow>You&apos;re invited</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{group.name}</h1>
      <p className="mt-2 text-stone-600">
        {coordinator?.name} started this group for {group.expectedSize} people. Joined so far: {members.map((m) => m.name).join(", ")}.
      </p>
      <Card className="mt-6">
        {full ? (
          <div>
            <p className="font-medium">This group is full.</p>
            <p className="mt-1 text-sm text-stone-600">If you&apos;re already a member, open the group page.</p>
            <Link href={`/g/${group.code}`} className={`${btn.secondary} mt-4`}>Open group</Link>
          </div>
        ) : (
          <JoinForm code={group.code} />
        )}
      </Card>
      <p className="mt-4 text-sm text-stone-500">
        Fill in your requirements on your own. The others won&apos;t see them until everyone has submitted.
      </p>
    </Page>
  );
}
