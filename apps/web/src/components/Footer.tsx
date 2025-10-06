"use client";

import { useMobile } from "@/hooks/useMobile";
import FooterDesktop from "./FooterDesktop";
import FooterMobile from "./FooterMobile";
import type { MenuItem } from "@/lib/server/menuCache";

export default function Footer({ menus }: { menus: MenuItem[] }) {
  const isMobile = useMobile();

  return isMobile ? (
    <FooterMobile menus={menus} />
  ) : (
    <FooterDesktop menus={menus} />
  );
}
