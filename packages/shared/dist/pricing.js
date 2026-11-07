"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePrintPrice = calculatePrintPrice;
exports.formatRupees = formatRupees;
/**
 * Deterministically computes pricing breakdown strictly in integer paise.
 * Avoids any floating-point representation of currency.
 */
function calculatePrintPrice(params) {
    const { config, pricing, offer, machinePricingOverride } = params;
    const bwRate = machinePricingOverride && machinePricingOverride.enabled
        ? machinePricingOverride.bwPerSidePaise
        : pricing.bwPerSidePaise;
    const colorRate = machinePricingOverride && machinePricingOverride.enabled
        ? machinePricingOverride.colorPerSidePaise
        : pricing.colorPerSidePaise;
    const baseRatePaise = config.colorMode === "color" ? colorRate : bwRate;
    // Paper size multiplier (e.g., A4: 1, A3: 2)
    const sizeMultiplier = pricing.paperSizeMultipliers[config.paperSize] || 1;
    // Total pages to print = pages in selection * copies
    const pageCount = config.totalPagesToPrint || (config.selectedPages && config.selectedPages.length > 0 ? config.selectedPages.length : 1);
    const copies = Math.max(1, config.copies || 1);
    const totalPages = Math.max(1, pageCount * copies);
    // Subtotal in paise
    const subtotalPaise = Math.round(totalPages * baseRatePaise * sizeMultiplier);
    let discountPaise = 0;
    let appliedOfferCode = null;
    if (offer && offer.active) {
        const now = Date.now();
        const isDateValid = now >= offer.validFrom && now <= offer.validUntil;
        const isMinOrderValid = subtotalPaise >= offer.minOrderPaise;
        const isMinPagesValid = totalPages >= offer.minPages;
        const isLimitAvailable = offer.currentUsage < offer.globalUsageLimit;
        if (isDateValid && isMinOrderValid && isMinPagesValid && isLimitAvailable) {
            if (offer.discountType === "PERCENTAGE") {
                const rawDiscount = Math.round((subtotalPaise * offer.discountValue) / 100);
                discountPaise = Math.min(rawDiscount, offer.maxDiscountPaise);
            }
            else if (offer.discountType === "FLAT") {
                discountPaise = Math.min(offer.discountValue, subtotalPaise);
            }
            appliedOfferCode = offer.code;
        }
    }
    const finalPayablePaise = Math.max(0, subtotalPaise - discountPaise);
    return {
        baseRatePaise,
        subtotalPaise,
        discountPaise,
        taxPaise: 0,
        finalPayablePaise,
        offerCode: appliedOfferCode,
    };
}
function formatRupees(paise) {
    const rupees = (paise / 100).toFixed(2);
    return `₹${rupees}`;
}
