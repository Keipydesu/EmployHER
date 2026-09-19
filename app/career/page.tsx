import Link from "next/link";
import { auth0 } from "@/server/auth0";
import { CareerWorkspace } from "@/components/career-workspace";
export const dynamic = "force-dynamic";
export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = auth0 ? await auth0.getSession() : null;
  if (!session)
    return (
      <main className="opportunities">
        <h1>Your career plan</h1>
        <p>Sign in to view your private résumé-based guidance.</p>
        <a href="/auth/login?returnTo=/profile">Sign in</a>
        <p>
          <Link href="/demo/profile">Try the sample demo</Link>
        </p>
      </main>
    );
  const params = await searchParams;
  const id = typeof params.profileId === "string" ? params.profileId : "";
  const version = Number(params.profileVersion);
  if (!id || !Number.isInteger(version) || version < 1)
    return (
      <main className="opportunities">
        <h1>Start with your résumé</h1>
        <Link href="/profile">Open your profile</Link>
      </main>
    );
  return <CareerWorkspace profileId={id} profileVersion={version} />;
}
