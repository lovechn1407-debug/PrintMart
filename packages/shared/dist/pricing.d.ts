import { GlobalPricing, Offer, PricingBreakdown, PrintJobConfiguration } from "./types";
export interface CalculatePriceParams {
    config: PrintJobConfiguration;
    pricing: GlobalPricing;
    offer?: Offer | null;
    machinePricingOverride?: {
        enabled: boolean;
        bwPerSidePaise: number;
        colorPerSidePaise: number;
    } | null;
}
/**
 * Deterministically computes pricing breakdown strictly in integer paise.
 * Avoids any floating-point representation of currency.
 */
export declare function calculatePrintPrice(params: CalculatePriceParams): PricingBreakdown;
export declare function formatRupees(paise: number): string;
