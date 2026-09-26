import Link from "next/link";
import type { ReactNode } from "react";

import { AccountChip, Logo } from "@/components/shell";
import { TemaToggle } from "@/components/tema";
import { requireUser } from "@/server/auth";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <Link href="/panel" aria-label="VIGÍA, mis auditorías">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <TemaToggle className="rounded-[6px] border border-line bg-surface px-2.5 py-1.5 text-[11.5px] font-medium text-ink-soft transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
          <AccountChip user={user} />
        </div>
      </header>
      <main id="contenido" className="pb-12">{children}</main>
    </div>
  );
}
