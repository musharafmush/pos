
import * as React from "react"
import { BoxIcon } from "lucide-react"
import { SectionBadge } from "./section-badge"
import { cn } from "@/lib/utils"

interface PackingSectionBadgeProps {
  active?: boolean
  onClick?: () => void
  className?: string
}

export function PackingSectionBadge({ 
  active = false, 
  onClick, 
  className 
}: PackingSectionBadgeProps) {
  return (
    <SectionBadge
      variant={active ? "active" : "inactive"}
      icon={<BoxIcon className="w-4 h-4" />}
      active={active}
      onClick={onClick}
      className={cn(
        "cursor-pointer w-full justify-start font-normal",
        active && "bg-blue-50 text-blue-700 border-l-4 border-blue-700 font-medium",
        !active && "text-gray-600 hover:bg-gray-50",
        className
      )}
    >
      Packing
      {active && (
        <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto"></div>
      )}
    </SectionBadge>
  )
}
