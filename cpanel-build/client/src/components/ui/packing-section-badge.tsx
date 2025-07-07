
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
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
        active 
          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700 font-medium" 
          : "text-gray-600 hover:bg-gray-50",
        className
      )}
    >
      <BoxIcon className="w-4 h-4" />
      Packing
      {active && (
        <div className="w-2 h-2 bg-blue-600 rounded-full ml-auto"></div>
      )}
    </button>
  )
}
