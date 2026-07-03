import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-[#fef2f2] text-[#d1622f]",
        outline:     "text-foreground border-border",
        success:     "border-transparent bg-[#e7f6ec] text-[#1f7a4d]",
        warning:     "border-transparent bg-[#fdf1e6] text-[#c9772f]",
        info:        "border-transparent bg-[#EFF4FF] text-[#1D4ED8]",
        pending:     "border-transparent bg-secondary text-muted-foreground",
        expired:     "border-transparent bg-secondary text-tertiary",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
