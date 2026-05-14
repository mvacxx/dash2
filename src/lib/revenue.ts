export const activeViewDiscountRate = 0.1;
export const gamTaxRate = 0.11;
export const metaAdsTaxRate = 0.1383;
export const defaultDollarExchangeRate = 5;
export const gamNetRevenueRate = 1 - activeViewDiscountRate - gamTaxRate;

export function calculateGamNetRevenue(grossRevenue: number) {
  return grossRevenue * gamNetRevenueRate;
}

export function calculateGamRevenueBreakdown(grossRevenue: number) {
  const activeViewDiscount = grossRevenue * activeViewDiscountRate;
  const tax = grossRevenue * gamTaxRate;
  const netRevenue = grossRevenue - activeViewDiscount - tax;
  const revenueAfterActiveView = grossRevenue - activeViewDiscount;

  return {
    activeViewDiscount,
    grossRevenue,
    netRevenue,
    revenueAfterActiveView,
    tax,
  };
}

export function calculateMetaSpendBreakdown(
  grossSpendUsd: number,
  dollarExchangeRate = defaultDollarExchangeRate,
) {
  const convertedSpend = grossSpendUsd * dollarExchangeRate;
  const metaTax = convertedSpend * metaAdsTaxRate;
  const totalSpend = convertedSpend + metaTax;

  return {
    convertedSpend,
    dollarExchangeRate,
    grossSpendUsd,
    metaTax,
    totalSpend,
  };
}
