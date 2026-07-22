import { CircleDashed, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
};

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = CircleDashed,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center px-4 py-10 text-center", className)}
      {...props}
    >
      <span className="mb-3 flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
