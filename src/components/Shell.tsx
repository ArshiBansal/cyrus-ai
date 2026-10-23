/* ══ Shell.tsx — client chrome: store, scroll, splash, nav, footer ═════ */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { useLocation } from "@/lib/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Palette from "@/components/Palette";
import AuthModal from "@/components/AuthModal";
import { Logo } from "@/components/ui";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    else setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [pathname, hash]);
  return null;
}

/* one-time intro curtain: marketing pages only, decided after mount so
   server HTML never carries it */
function Splash({ app }: { app: boolean }) {
  const [state, setState] = useState<"pending" | "show" | "gone">("pending");
  useEffect(() => {
    if (app || sessionStorage.getItem("cyrus-splashed") === "1" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setState("gone");
      return;
    }
    sessionStorage.setItem("cyrus-splashed", "1");
    setState("show");
    document.body.style.overflow = "hidden";
    const t1 = setTimeout(() => { document.body.style.overflow = ""; }, 1500);
    const t2 = setTimeout(() => setState("gone"), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); document.body.style.overflow = ""; };
  }, [app]);
  if (state !== "show") return null;
  return (
    <div className="splash" aria-hidden="true">
      <div className="flex flex-col items-center gap-5">
        <div className="splash-mark rounded-[24px]"><Logo size={88} /></div>
        <div className="splash-word font-display font-extrabold tracking-[-.02em] text-[34px]">
          cyrus<span className="text-accent">.ai</span>
        </div>
        <div className="splash-sub font-mono text-[10.5px] tracking-[.18em] uppercase text-dim">
          open source · programs · skills
        </div>
      </div>
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  /* the board is an application: it owns its top bar and sidebar, so the
     marketing header and footer stay off those routes */
  const app = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  return (
    <StoreProvider>
      <ScrollManager />
      <Splash app={app} />
      <div className="min-h-screen flex flex-col">
        <a className="skip-link" href="#main">Skip to content</a>
        {!app && <Nav />}
        <main id="main" tabIndex={-1} className="flex-1">{children}</main>
        {!app && <Footer />}
      </div>
      <Palette />
      <AuthModal />
    </StoreProvider>
  );
}
