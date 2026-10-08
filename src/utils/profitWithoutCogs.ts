import { SkuUnitEconomics } from '../types/amazon';

export interface ResultBeforeCogsRow {
  sku: string;
  title?: string;
  unitsSold: number;
  grossSales: number;
  pmv: number;
  amazonFeeUnit: number;
  shippingUnit: number;
  taxUnit: number;
  adsUnit: number;
  resultBeforeCogsBeforeAdsUnit: number;
  resultBeforeCogsAfterAdsUnit: number;
  resultBeforeCogsAfterAdsTotal: number;
  marginBeforeCogsPercent: number | null;
  maxCogsBreakEvenUnit: number | null;
  maxCogsForTargetMarginUnit: number | null;
  hasCogsProvided: boolean;
}

const safe = (n: number | undefined | null) => (typeof n === 'number' && isFinite(n) ? n : 0);

/**
 * Resultado por SKU ANTES do COGS (nao subtrai custo do produto).
 * resultado/un = PMV - tarifas Amazon - frete - impostos - Ads/un
 * Teto de COGS (equilibrio) = resultado/un depois de Ads (se > 0).
 * Teto de COGS p/ margem alvo = resultado/un - PMV * margemAlvo.
 */
export function calcResultBeforeCogs(s: SkuUnitEconomics, targetMarginPercent = 10): ResultBeforeCogsRow {
  const units = safe(s.unitsSold);
  const pmv = safe(s.pmv);
  const amazonFeeUnit = safe(s.amazonTotalFeeUnit);
  const shippingUnit = safe(s.shippingCost);
  const taxUnit = (pmv * safe(s.taxRatePercent)) / 100;
  const adsUnit = units > 0 ? safe(s.adsSpend) / units : 0;

  const beforeAds = pmv - amazonFeeUnit - shippingUnit - taxUnit;
  const afterAds = beforeAds - adsUnit;
  const total = afterAds * units;
  const gross = safe(s.grossSales);

  return {
    sku: s.sku,
    title: s.title,
    unitsSold: units,
    grossSales: gross,
    pmv,
    amazonFeeUnit,
    shippingUnit,
    taxUnit,
    adsUnit,
    resultBeforeCogsBeforeAdsUnit: beforeAds,
    resultBeforeCogsAfterAdsUnit: afterAds,
    resultBeforeCogsAfterAdsTotal: total,
    marginBeforeCogsPercent: gross > 0 ? (total / gross) * 100 : null,
    maxCogsBreakEvenUnit: afterAds > 0 ? afterAds : null,
    maxCogsForTargetMarginUnit: afterAds - (pmv * targetMarginPercent) / 100 > 0 ? afterAds - (pmv * targetMarginPercent) / 100 : null,
    hasCogsProvided: !!s.hasCogsProvided,
  };
}

export function calcAllResultsBeforeCogs(skus: SkuUnitEconomics[], targetMarginPercent = 10): ResultBeforeCogsRow[] {
  return skus.map((s) => calcResultBeforeCogs(s, targetMarginPercent));
}
