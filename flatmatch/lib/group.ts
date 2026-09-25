import "server-only";
import { analyseGroup, matchAll, readyMembers } from "./matching";
import { getStore } from "./store";

// Everything a group page needs, computed fresh from stored requirements.
export async function loadGroup(code: string) {
  const store = getStore();
  const bundle = await store.getBundle(code);
  if (!bundle) return null;
  const properties = await store.listProperties();
  const people = readyMembers(bundle.members);
  const complete = bundle.members.length >= bundle.group.expectedSize && people.length === bundle.members.length;
  return {
    ...bundle,
    properties,
    people,
    complete,
    results: complete ? matchAll(properties, people) : [],
    analysis: complete ? analyseGroup(properties, people) : null,
    storage: store.kind,
  };
}

export const SHORTLIST_SIZE = 3;
