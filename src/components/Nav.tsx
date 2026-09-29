"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="nav-demo">
      <div className="nav-top">
        <span className="nav-logo">
          <Image src="/logo.svg" alt="Hotsourced" width={28} height={28} />
          Dev Performance
        </span>
        <div className="nav-links">
          <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
            Dashboard
          </Link>
          <Link href="/audits" className={`nav-link ${pathname === "/audits" ? "active" : ""}`}>
            Audits
          </Link>
        </div>
      </div>
    </nav>
  );
}
