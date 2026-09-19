"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { careerFields, type Interests } from "@/opportunities/interests";
export function InterestWorkspace({ initial }: { initial: Interests }) {
  const router = useRouter();
  const [fields, setFields] = useState(initial.fields);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/me/interests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ expectedVersion: initial.version, fields }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message ?? "Could not save your interests.",
        );
      router.push("/profile");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="opportunities">
      <section className="panel">
        <h1>What would you like to explore?</h1>
        <p>
          Choose one or more fields. We’ll use these interests to focus your
          career guidance. You can change them later.
        </p>
        <fieldset disabled={busy}>
          <legend>Fields of interest</legend>
          {careerFields.map((field) => (
            <label
              key={field.id}
              style={{ display: "block", marginBlock: "1rem" }}
            >
              <input
                type="checkbox"
                checked={fields.includes(field.id)}
                onChange={(e) =>
                  setFields(
                    e.target.checked
                      ? [...fields, field.id]
                      : fields.filter((id) => id !== field.id),
                  )
                }
              />{" "}
              {field.title}
            </label>
          ))}
        </fieldset>
        <p>
          Unsure? Pick the field you’re most curious about. You can explore
          another after updating your choices.
        </p>
        {error && (
          <p role="alert">
            {error} Reload this page if your choices changed in another tab.
          </p>
        )}
        <button disabled={busy || !fields.length} onClick={() => void save()}>
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </section>
    </main>
  );
}
