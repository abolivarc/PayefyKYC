import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-sm text-foreground transition-all duration-[180ms] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(168,248,152,.30)] focus-visible:border-[rgba(168,248,152,.60)] disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export { Textarea }
