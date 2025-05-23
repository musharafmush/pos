import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  percentageChange?: number;
  percentageLabel?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  percentageChange,
  percentageLabel
}: StatsCardProps) {
  const isPositive = percentageChange && percentageChange > 0;
  const isNegative = percentageChange && percentageChange < 0;

  return (
    <Card className="bg-white dark:bg-gray-800 shadow p-5">
      <div className="flex items-center">
        <div className={cn(
          "flex-shrink-0 rounded-md p-3",
          iconBgColor
        )}>
          <div className={cn(
            "h-6 w-6",
            iconColor
          )}>
            {icon}
          </div>
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{value}</p>
          {(percentageChange !== undefined && percentageLabel) && (
            <p className={cn(
              "mt-1 text-xs flex items-center",
              isPositive && "text-green-500 dark:text-green-400",
              isNegative && "text-red-500 dark:text-red-400",
              !isPositive && !isNegative && "text-gray-500 dark:text-gray-400"
            )}>
              {isPositive && <ArrowUpIcon className="h-4 w-4 mr-1" />}
              {isNegative && <ArrowDownIcon className="h-4 w-4 mr-1" />}
              {Math.abs(percentageChange)}% {percentageLabel}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
