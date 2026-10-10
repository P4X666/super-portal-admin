import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import type * as React from "react"

const badgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 rounded-md border px-1.5 py-0.5 text-caption leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-badge-blue-bg text-badge-blue",
        blue: "border-transparent bg-badge-blue-bg text-badge-blue",
        green: "border-transparent bg-badge-green-bg text-badge-green",
        purple: "border-transparent bg-badge-purple-bg text-badge-purple",
        warning: "border-transparent bg-warning-bg text-warning",
        outline: "border-border text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
