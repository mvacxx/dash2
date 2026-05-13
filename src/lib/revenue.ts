export const activeViewDiscountRate = 0.1;
export const taxRate = 0.09;
export const gamNetRevenueRate = (1 - activeViewDiscountRate) * (1 - taxRate);

export function calculateGamNetRevenue(grossRevenue: number) {
  return grossRevenue * gamNetRevenueRate;
}

export function calculateGamRevenueBreakdown(grossRevenue: number) {
  const activeViewDiscount = grossRevenue * activeViewDiscountRate;
  const revenueAfterActiveView = grossRevenue - activeViewDiscount;
  const tax = revenueAfterActiveView * taxRate;
  const netRevenue = revenueAfterActiveView - tax;

  return {
    activeViewDiscount,
    grossRevenue,
    netRevenue,
    revenueAfterActiveView,
    tax,
  };
}
