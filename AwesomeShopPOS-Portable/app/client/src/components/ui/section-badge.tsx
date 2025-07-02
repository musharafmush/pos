
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const sectionBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        active: "bg-blue-50 text-blue-700 border-l-4 border-blue-700",
        inactive: "bg-gray-50 text-gray-600 hover:bg-gray-100",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-6 px-2 py-1 text-xs",
        lg: "h-10 px-4 py-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface SectionBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sectionBadgeVariants> {
  icon?: React.ReactNode
  active?: boolean
}

function SectionBadge({ 
  className, 
  variant, 
  size, 
  icon, 
  active = false, 
  children, 
  ...props 
}: SectionBadgeProps) {
  return (
    <div 
      className={cn(
        sectionBadgeVariants({ 
          variant: active ? "active" : variant, 
          size 
        }), 
        className
      )} 
      {...props}
    >
      {icon && <span className="mr-2 flex items-center">{icon}</span>}
      {children}
    </div>
  )
}

export { SectionBadge, sectionBadgeVariants }
