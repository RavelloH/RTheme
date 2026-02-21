import { Hero } from "./_components/hero";
import { Philosophy } from "./_components/philosophy";
import { Features } from "./_components/features";
import { FrontShowcase, AdminShowcase } from "./_components/showcase";
import { Architecture } from "./_components/architecture";
import { FeatureList } from "./_components/feature-list";
import { CallToAction } from "./_components/cta";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "主页",
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Philosophy />
      <Features />
      <FrontShowcase />
      <AdminShowcase />
      <Architecture />
      <FeatureList />
      <CallToAction />
    </main>
  );
}
