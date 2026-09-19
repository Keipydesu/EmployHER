import { auth0 } from "../src/server/auth0";

export async function SignInWidget({
  returnTo = "/",
}: {
  returnTo?: "/" | "/demo";
}) {
  const session = auth0 ? await auth0.getSession() : null;
  if (session?.user) {
    return (
      <span role="status" className="account-status">
        Signed in{session.user.name ? ` as ${session.user.name}` : ""}
      </span>
    );
  }
  if (!auth0) return null;
  const loginUrl = new URL("/auth/login", process.env.APP_BASE_URL);
  loginUrl.searchParams.set("returnTo", returnTo);
  return (
    <a className="account-sign-in" href={loginUrl.toString()}>
      Sign in
    </a>
  );
}
