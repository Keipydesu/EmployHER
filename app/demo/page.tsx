import type { Metadata } from "next";
import { JudgesDemo } from "./judges-demo";
import "./demo.css";

export const metadata: Metadata = {
  title: "Your next chapter · EmployHER demo",
  description:
    "Explore a sample résumé, an evidence-led career plan, and your next steps. No sign-in needed.",
};

export default function DemoPage() {
  return <JudgesDemo />;
}
