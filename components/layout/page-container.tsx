import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: ComponentProps<"main">) {
  return (
    <main
      data-slot="page-container"
      className={cn("mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8", className)}
      {...props}
    />
  );
}
