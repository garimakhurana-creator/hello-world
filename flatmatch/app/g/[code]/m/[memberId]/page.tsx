import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteCard } from "@/components/InviteCard";
import { RequirementsForm } from "@/components/RequirementsForm";
import { btn, Eyebrow, Page } from "@/components/ui";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MemberRequirements(props: PageProps<"/g/[code]/m/[memberId]">) {
  const { code, memberId } = await props.params;
  const { new: isNew } = await props.searchParams;
  const bundle = await getStore().getBundle(code);
  const me = bundle?.members.find((m) => m.id === memberId);
  if (!bundle || !me) notFound();

  const waitingFor = bundle.group.expectedSize - bundle.members.length;

  return (
    <Page>
      <div className="mx-auto max-w-2xl">
        <Link href={`/g/${bundle.group.code}`} className={btn.ghost}>← {bundle.group.name}</Link>
        <Eyebrow>
          <span className="mt-4 block">{me.submittedAt ? "Editing your answers" : "Step 2 of 3"}</span>
        </Eyebrow>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">{me.name}, what do you need from this flat?</h1>
        <p className="mt-2 text-stone-600">
          Answer for yourself only. Mark something <b>Must have</b> only if you&apos;d genuinely say no to a flat without it.
          Everything else is a <b>Prefer</b>, and those are what the group can negotiate.
        </p>
        {me.role === "coordinator" && waitingFor > 0 && isNew !== "1" && (
          <div className="mt-6"><InviteCard code={bundle.group.code} waitingFor={waitingFor} /></div>
        )}
        <RequirementsForm code={bundle.group.code} memberId={me.id} initial={me.requirements} />
      </div>
    </Page>
  );
}
