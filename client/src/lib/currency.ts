import { useQuery } from "@tanstack/react-query";

// Hook to get current currency settings
export function useCurrencySettings() {
  return useQuery({
    queryKey: ["/api/settings/currency"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings/currency");
        if (!res.ok) {
          return {
            baseCurrency: "INR",
            currencySymbol: "₹",
            currencyPosition: "before",
            decimalPlaces: "0",
            thousandSeparator: ",",
            decimalSeparator: ".",
          };
        }
        return await res.json();
      } catch (error) {
        return {
          baseCurrency: "INR",
          currencySymbol: "₹",
          currencyPosition: "before",
          decimalPlaces: "0",
          thousandSeparator: ",",
          decimalSeparator: ".",
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Function to format currency amounts
export function formatCurrency(
  amount: number | string,
  settings?: {
    currencySymbol?: string;
    currencyPosition?: "before" | "after";
    decimalPlaces?: string;
    thousandSeparator?: string;
    decimalSeparator?: string;
  }
) {
  const defaultSettings = {
    currencySymbol: "₹",
    currencyPosition: "before" as const,
    decimalPlaces: "0",
    thousandSeparator: ",",
    decimalSeparator: ".",
  };

  const config = { ...defaultSettings, ...settings };
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return config.currencySymbol + "0.00";

  const decimals = parseInt(config.decimalPlaces);
  const thousandSep = config.thousandSeparator === "none" ? "" : config.thousandSeparator;
  
  let formattedAmount = numAmount.toFixed(decimals).replace(".", config.decimalSeparator);
  
  // Add thousand separator if not "none"
  if (thousandSep) {
    formattedAmount = formattedAmount.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
  }

  return config.currencyPosition === "before" 
    ? `${config.currencySymbol}${formattedAmount}`
    : `${formattedAmount}${config.currencySymbol}`;
}

// Hook to format currency with current settings
export function useFormatCurrency() {
  const { data: settings } = useCurrencySettings();
  
  return (amount: number | string) => formatCurrency(amount, settings);
}