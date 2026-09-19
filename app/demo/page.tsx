import type { Metadata } from "next";
import { JudgesDemo } from "./judges-demo";
import "./demo.css";
import { loadDemoProfile } from "./load-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your next chapter · EmployHER demo",
  description:
    "Explore a sample résumé, an evidence-led career plan, and your next steps. No sign-in needed.",
};

export default async function DemoPage() {
  return <JudgesDemo profile={await loadDemoProfile()} />;
}
