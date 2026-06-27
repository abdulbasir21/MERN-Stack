"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Doctor from "../../../components/Doctor";
import HeroSection from "../../../components/HeroSection";
import ServicesSection from "@/app/components/Navbar/ServicesSection";
import Footer from "../../../components/Footer";

export default function HomePage() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#doctors") {
      setTimeout(() => {
        const el = document.getElementById("doctors");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <Doctor />
      <ServicesSection />
    </div>
  );
}
