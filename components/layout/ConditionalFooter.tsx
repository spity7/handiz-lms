"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const hideFooter = pathname.includes("/learn/");

  if (hideFooter) return null;

  return <Footer />;
}
