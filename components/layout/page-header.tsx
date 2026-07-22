import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
        )}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
