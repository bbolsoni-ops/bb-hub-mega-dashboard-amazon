// Tabelas oficiais Amazon Brasil. Fontes: Docs "Comissão", "FBA", "DBA" e Termos Experimente FBA+.
// Para atualizar tarifas, altere SOMENTE este arquivo e a data FEES_CONFIG_VERSION.
export const FEES_CONFIG_VERSION = '2026-10-08';
export const PACKAGING_GRAMS = 20;
export const FBA_BENEFIT_END = '2027-01-31';
export const FBA_FIXED_FEE_BENEFIT = 6.0;
export const FBA_MIN_ADS_PERCENT = 3.5;
export const DBA_HALF_FEE_PROMO = { start: '2026-06-01', end: '2026-09-30' };
export const PRICE_FIXED_FBA = [
  { below: 30, fee: 5.65 },
  { below: 50, fee: 5.85 },
  { below: 79, fee: 6.05 },
];
// Colunas FBA >= R$79: 79-99,99 | 100-119,99 | 120-149,99 | 150-199,99 | >= 200
export const FBA_ROWS: { upTo: number; v: number[] }[] = [
  { upTo: 100, v: [10.05, 12.05, 14.05, 15.05, 15.55] },
  { upTo: 200, v: [10.45, 12.45, 14.45, 15.45, 16.05] },
  { upTo: 300, v: [10.95, 12.95, 14.95, 15.95, 16.55] },
  { upTo: 400, v: [11.45, 13.45, 15.45, 16.95, 17.15] },
  { upTo: 500, v: [11.95, 13.95, 15.95, 17.05, 17.85] },
  { upTo: 750, v: [12.05, 14.05, 16.05, 18.45, 18.55] },
  { upTo: 1000, v: [12.45, 14.45, 16.45, 19.05, 19.25] },
  { upTo: 1500, v: [12.95, 14.95, 16.95, 19.45, 20.35] },
  { upTo: 2000, v: [13.05, 15.05, 17.05, 19.95, 21.35] },
  { upTo: 3000, v: [14.05, 16.05, 18.05, 20.05, 22.35] },
  { upTo: 4000, v: [15.05, 17.05, 19.05, 21.95, 23.35] },
  { upTo: 5000, v: [16.05, 18.05, 20.05, 22.95, 24.35] },
  { upTo: 6000, v: [24.05, 27.05, 29.05, 30.05, 30.35] },
  { upTo: 7000, v: [25.05, 28.05, 30.05, 31.05, 33.35] },
  { upTo: 8000, v: [26.05, 29.05, 31.05, 32.05, 35.35] },
  { upTo: 9000, v: [27.05, 30.05, 32.05, 33.05, 37.35] },
  { upTo: 10000, v: [35.05, 40.05, 46.05, 51.05, 51.35] },
];
export const FBA_EXTRA_KG = [3.05, 3.05, 3.05, 3.5, 3.5];
export type DbaRegion = 'sp_capital' | 'outras_capitais_s_se' | 'interior_s_se' | 'co_n_ne';
export const DBA_FIXED = [
  { below: 30, fee: 4.5 },
  { below: 50, fee: 6.5 },
  { below: 79, fee: 6.75 },
];
// Colunas DBA 79-199,99: 79-99,99 | 100-119,99 | 120-149,99 | 150-199,99 (igual em todas as regiões)
export const DBA_ROWS_79_199: { upTo: number; v: number[] }[] = [
  { upTo: 250, v: [11.95, 13.95, 15.95, 17.95] },
  { upTo: 500, v: [12.85, 15.0, 17.15, 19.3] },
  { upTo: 1000, v: [13.45, 15.7, 17.95, 20.2] },
  { upTo: 2000, v: [14.0, 16.35, 18.75, 21.1] },
  { upTo: 3000, v: [14.95, 17.45, 19.95, 22.4] },
  { upTo: 4000, v: [16.15, 18.85, 21.55, 24.2] },
  { upTo: 5000, v: [17.0, 19.9, 22.75, 25.6] },
  { upTo: 6000, v: [25, 30, 34, 38] },
  { upTo: 7000, v: [26, 31, 35, 39] },
  { upTo: 8000, v: [27, 32, 36, 40] },
  { upTo: 9000, v: [28, 33, 37, 41] },
  { upTo: 10000, v: [39.5, 46, 52.75, 59] },
];
export const DBA_EXTRA_KG_79_199 = [3.05, 3.05, 3.05, 3.5];
// DBA >= R$200 por região: [sp_capital, outras_capitais_s_se, interior_s_se, co_n_ne]
export const DBA_ROWS_200: { upTo: number; v: number[] }[] = [
  { upTo: 250, v: [19.95, 19.95, 20.45, 20.45] },
  { upTo: 500, v: [20.45, 20.45, 20.95, 20.95] },
  { upTo: 1000, v: [21.45, 21.45, 21.95, 21.95] },
  { upTo: 2000, v: [22.95, 22.95, 23.45, 23.45] },
  { upTo: 3000, v: [23.95, 23.95, 24.45, 24.45] },
  { upTo: 4000, v: [25.95, 25.95, 25.95, 25.95] },
  { upTo: 5000, v: [27.95, 27.95, 27.95, 27.95] },
  { upTo: 6000, v: [36.95, 36.95, 36.95, 36.95] },
  { upTo: 7000, v: [39.45, 39.45, 39.45, 39.45] },
  { upTo: 8000, v: [40.45, 40.45, 40.45, 40.45] },
  { upTo: 9000, v: [45.45, 46.95, 46.95, 46.95] },
  { upTo: 10000, v: [59.95, 61.45, 65.95, 65.95] },
];
export const DBA_EXTRA_KG_200 = 4.0;
export const DBA_REGION_INDEX: Record<DbaRegion, number> = {
  sp_capital: 0,
  outras_capitais_s_se: 1,
  interior_s_se: 2,
  co_n_ne: 3,
};
