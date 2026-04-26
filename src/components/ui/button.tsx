import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] hover:-translate-y-[1px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_12px_hsl(var(--primary)/0.4)] shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_4px_12px_hsl(var(--destructive)/0.4)]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent hover:shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:translate-y-0",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0",
        success:
          "bg-[hsl(var(--btn-success))] text-[hsl(var(--btn-success-foreground))] hover:bg-[hsl(var(--btn-success-hover))] hover:shadow-[0_4px_12px_hsl(var(--btn-success)/0.4)] shadow-sm",
        info:
          "bg-[hsl(var(--btn-info))] text-[hsl(var(--btn-info-foreground))] hover:bg-[hsl(var(--btn-info-hover))] hover:shadow-[0_4px_12px_hsl(var(--btn-info)/0.4)] shadow-sm",
        warning:
          "bg-[hsl(var(--btn-warning))] text-[hsl(var(--btn-warning-foreground))] hover:bg-[hsl(var(--btn-warning-hover))] hover:shadow-[0_4px_12px_hsl(var(--btn-warning)/0.4)] shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
