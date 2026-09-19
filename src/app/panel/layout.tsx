import Link from "next/link";
import type { ReactNode } from "react";

import { AccountChip, Logo } from "@/components/shell";
import { requireUser } from "@/server/auth";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <Link href="/panel" aria-label="VIGÍA, mis auditorías">
          <Logo />
        </Link>
        <AccountChip user={user} />
      </header>
      <main id="contenido" className="pb-12">{children}</main>
    </div>
  );
}
