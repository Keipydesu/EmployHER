import type { Metadata } from "next";
import { SignInWidget } from "../sign-in-widget";
import { JudgesDemo } from "./judges-demo";
import "./demo.css";
import { loadDemoProfile } from "./load-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your next chapter · EmployHER",
  description:
    "Explore your résumé, an evidence-led career plan, and your next steps.",
};

export default async function DemoPage() {
  return (
    <JudgesDemo
      profile={await loadDemoProfile()}
      signIn={<SignInWidget returnTo="/demo" />}
    />
  );
}
