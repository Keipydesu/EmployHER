import type { Fact, PublicProfile } from "./contracts";

export type DraftEdit = Pick<
  Fact,
  "id" | "kind" | "label" | "detail" | "dateText"
>;

/**
 * A demo session loss issues a brand-new random owner, so the profile it
 * created cannot be reopened. Re-extracting the same fixture reproduces the
 * same facts in the same order but with fresh random IDs. This reattaches an
 * in-progress draft (edits, added facts, removals) onto that fresh
 * extraction by content, not by ID, so the user does not retype anything.
 */
export function reconcileAfterSessionRecovery(
  freshProfile: PublicProfile,
  preservedOriginal: DraftEdit[],
  preservedEdits: DraftEdit[],
): DraftEdit[] {
  const available = freshProfile.facts.map((f) => ({
    id: f.id,
    kind: f.kind,
    label: f.label,
    detail: f.detail,
    dateText: f.dateText,
    used: false,
  }));
  const matchIndexByOriginalId = new Map<string, number>();
  for (let i = 0; i < preservedOriginal.length; i++) {
    const original = preservedOriginal[i];
    const slot = available[i];
    if (
      slot &&
      !slot.used &&
      slot.kind === original.kind &&
      slot.label === original.label &&
      slot.detail === original.detail &&
      slot.dateText === original.dateText
    ) {
      matchIndexByOriginalId.set(original.id, i);
    }
  }
  return preservedEdits.map((edit) => {
    const slotIndex = matchIndexByOriginalId.get(edit.id);
    const slot = slotIndex === undefined ? undefined : available[slotIndex];
    if (!slot || slot.used) {
      return {
        ...edit,
        id: edit.id.startsWith("new-") ? edit.id : `new-${crypto.randomUUID()}`,
      };
    }
    slot.used = true;
    return { ...edit, id: slot.id };
  });
}
