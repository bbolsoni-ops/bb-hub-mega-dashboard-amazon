// Amazon Brasil Fee Calculators. Todas as tabelas ficam em src/config/amazonFeesConfig.ts
import {
  DBA_EXTRA_KG_200, DBA_EXTRA_KG_79_199, DBA_FIXED, DBA_HALF_FEE_PROMO, DBA_REGION_INDEX, DBA_ROWS_200,
  DBA_ROWS_79_199, DbaRegion, FBA_BENEFIT_END, FBA_EXTRA_KG, FBA_FIXED_FEE_BENEFIT, FBA_MIN_ADS_PERCENT,
  FBA_ROWS, PACKAGING_GRAMS, PRICE_FIXED_FBA,
} from '../config/amazonFeesConfig';

export type { DbaRegion };

export interface AmazonCategoryFee {
  id: string;
  name: string;
  defaultPercent: number;
  minFee: number;
  tiered?: { threshold: number; rateBelow: number; rateAbove: number };
}

const c = (id: string, name: string, defaultPercent: number): AmazonCategoryFee => ({ id, name, defaultPercent, minFee: 1.0 });

export const AMAZON_BR_CATEGORIES: AmazonCategoryFee[] = [
  c('casa_cozinha', 'Casa e Cozinha', 12),
  c('comidas_bebidas', 'Comidas e Bebidas', 10),
  c('cerveja_vinho', 'Cerveja e Vinho', 11),
  c('eletronicos_portateis', 'Eletrônicos portáteis', 13),
  c('celulares', 'Celulares', 11),
  c('cameras', 'Câmeras e Fotografia', 11),
  { id: 'acessorios_eletronicos', name: 'Acessórios Eletrônicos (15% até R$100 / 10% acima)', defaultPercent: 15, minFee: 1.0, tiered: { threshold: 100, rateBelow: 15, rateAbove: 10 } },
  c('videogames', 'Videogames, Acessórios e Consoles', 11),
  c('computadores', 'Computadores', 12),
  c('tv_audio', 'TV, Áudio e Cinema em Casa', 10),
  c('ferramentas', 'DIY e Ferramentas', 11),
  c('ferramentas_eletricas', 'Ferramentas Elétricas Essenciais', 11),
  c('papelaria', 'Papelaria e Escritório', 13),
  c('esportes', 'Esportes, Aventura e Lazer', 12),
  c('eletrodomesticos', 'Eletrodomésticos Grandes (inclui ar-condicionado)', 11),
  { id: 'moveis', name: 'Móveis (15% até R$200 / 10% acima)', defaultPercent: 15, minFee: 1.0, tiered: { threshold: 200, rateBelow: 15, rateAbove: 10 } },
  { id: 'colchoes', name: 'Colchões (15% até R$200 / 10% acima)', defaultPercent: 15, minFee: 1.0, tiered: { threshold: 200, rateBelow: 15, rateAbove: 10 } },
  c('brinquedos', 'Brinquedos e Jogos', 12),
  c('bebes', 'Produtos para Bebês', 12),
  c('saude', 'Saúde e Cuidado Pessoal', 12),
  c('cuidados_pessoais', 'Produtos para cuidados pessoais', 12),
  c('beleza', 'Beleza', 13),
  c('beleza_luxo', 'Produtos de beleza de luxo', 14),
  c('roupas', 'Roupas e Acessórios', 14),
  c('calcados', 'Calçados', 14),
  c('oculos', 'Óculos', 14),
  c('mochilas_bolsas', 'Mochilas, Bolsas, Bagagem e Acessórios de Viagem', 14),
  c('relogios', 'Relógios', 13),
  c('joias', 'Joias', 14),
  c('livros_midia', 'Mídia: Livros, DVD, Música, Software, Vídeo', 15),
  c('gramado_jardim', 'Gramado e Jardim', 12),
  c('instrumentos_musicais', 'Instrumentos Musicais e Produção Audiovisual', 12),
  c('pet', 'Produtos para Animais de Estimação', 12),
  c('automotivo', 'Automotivos e Esportes a Motor', 12),
  c('pneus', 'Pneus', 10),
  c('suprimentos_comerciais', 'Suprimentos Comerciais, Industriais e Científicos', 12),
  c('outros', 'Outros (Geral)', 15),
];

/**
 * Comissão = maior entre percentual e mínimo, calculada sobre preço do item + frete pago pelo cliente.
 */
export function calculateAmazonCommission(
  price: number,
  categoryId: string = 'outros',
  customPercent?: number,
  customerShippingPaid: number = 0
): { amount: number; effectivePercent: number; isMinimumApplied: boolean } {
  if (price <= 0) return { amount: 0, effectivePercent: 0, isMinimumApplied: false };
  const base = price + Math.max(0, customerShippingPaid);

  if (customPercent !== undefined) {
    const raw = (base * customPercent) / 100;
    const finalVal = Math.max(1.0, raw);
    return { amount: finalVal, effectivePercent: (finalVal / price) * 100, isMinimumApplied: raw < 1.0 };
  }

  const category = AMAZON_BR_CATEGORIES.find((x) => x.id === categoryId) || AMAZON_BR_CATEGORIES[AMAZON_BR_CATEGORIES.length - 1];
  let rawAmount: number;
  if (category.tiered) {
    const { threshold, rateBelow, rateAbove } = category.tiered;
    rawAmount = base <= threshold
      ? (base * rateBelow) / 100
      : (threshold * rateBelow) / 100 + ((base - threshold) * rateAbove) / 100;
  } else {
    rawAmount = (base * category.defaultPercent) / 100;
  }
  const finalAmount = Math.max(category.minFee, rawAmount);
  return { amount: finalAmount, effectivePercent: (finalAmount / price) * 100, isMinimumApplied: rawAmount < category.minFee };
}

/** Peso efetivo em gramas: maior entre peso real e peso cúbico (C x L x A / 6000), dimensões em cm. */
export function effectiveWeightGrams(actualGrams: number, dims?: { l: number; w: number; h: number }): number {
  const cubicGrams = dims ? ((dims.l * dims.w * dims.h) / 6000) * 1000 : 0;
  return Math.max(actualGrams, cubicGrams);
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bandedFee(rows: { upTo: number; v: number[] }[], col: number, grams: number, extraPerKg: number): number {
  const row = rows.find((r) => grams <= r.upTo);
  if (row) return row.v[col];
  const last = rows[rows.length - 1];
  return last.v[col] + Math.ceil((grams - last.upTo) / 1000) * extraPerKg;
}

/**
 * Tarifa DBA. Peso cobrado = peso informado + 20 g de embalagem.
 * Desconto de 50% (SP) só vale entre 01/06/2026 e 30/09/2026 e para preço >= R$ 79.
 */
export function calculateDbaFee(
  price: number,
  weightGrams: number = 450,
  hasSp50Discount: boolean = false,
  region: DbaRegion = 'sp_capital',
  referenceDate: Date = new Date()
): { standardFee: number; effectiveFee: number; discountApplied: number; ruleExplanation: string } {
  if (price <= 0) return { standardFee: 0, effectiveFee: 0, discountApplied: 0, ruleExplanation: 'Sem preço' };

  const fixed = DBA_FIXED.find((f) => price < f.below);
  if (fixed) {
    return { standardFee: fixed.fee, effectiveFee: fixed.fee, discountApplied: 0, ruleExplanation: `Preço abaixo de R$ 79: tarifa fixa DBA R$ ${fixed.fee.toFixed(2)}` };
  }

  const grams = weightGrams + PACKAGING_GRAMS;
  let baseFee: number;
  if (price >= 200) {
    baseFee = bandedFee(DBA_ROWS_200, DBA_REGION_INDEX[region], grams, DBA_EXTRA_KG_200);
  } else {
    const col = price < 100 ? 0 : price < 120 ? 1 : price < 150 ? 2 : 3;
    baseFee = bandedFee(DBA_ROWS_79_199, col, grams, DBA_EXTRA_KG_79_199[col]);
  }

  const today = toIsoDate(referenceDate);
  const promoOn = today >= DBA_HALF_FEE_PROMO.start && today <= DBA_HALF_FEE_PROMO.end;
  if (hasSp50Discount && promoOn) {
    const discounted = baseFee * 0.5;
    return { standardFee: baseFee, effectiveFee: discounted, discountApplied: baseFee - discounted, ruleExplanation: `DBA R$ ${baseFee.toFixed(2)} com 50% de desconto (campanha SP até ${DBA_HALF_FEE_PROMO.end}) = R$ ${discounted.toFixed(2)}` };
  }
  const expiredNote = hasSp50Discount && !promoOn ? ` Desconto de 50% encerrado em ${DBA_HALF_FEE_PROMO.end}.` : '';
  return { standardFee: baseFee, effectiveFee: baseFee, discountApplied: 0, ruleExplanation: `DBA tabela oficial R$ ${baseFee.toFixed(2)} (${weightGrams} g + embalagem, R$ ${price.toFixed(2)}).${expiredNote}` };
}

export type FbaProgramMode = 'standard' | 'experimente_r6' | 'nova_conta_isencao';

/**
 * Tarifa FBA. Abaixo de R$ 79 a tarifa é fixa (R$ 5,65 / 5,85 / 6,05). De R$ 79 em diante varia por peso.
 * Experimente FBA+ (conta existente): R$ 6,00 para preço >= R$ 79 se Ads >= 3,5% da receita da conta, até 31/01/2027.
 */
export function calculateFbaFee(
  price: number,
  weightGrams: number = 450,
  fbaProgram: FbaProgramMode = 'standard',
  adsInvestmentPercent: number = 0,
  referenceDate: Date = new Date()
): { standardFee: number; effectiveFee: number; discountApplied: number; isEligibleForR6: boolean; ruleExplanation: string } {
  if (price <= 0) return { standardFee: 0, effectiveFee: 0, discountApplied: 0, isEligibleForR6: false, ruleExplanation: 'Sem preço' };

  const fixed = PRICE_FIXED_FBA.find((f) => price < f.below);
  let standardFee: number;
  if (fixed) {
    standardFee = fixed.fee;
  } else {
    const col = price < 100 ? 0 : price < 120 ? 1 : price < 150 ? 2 : price < 200 ? 3 : 4;
    standardFee = bandedFee(FBA_ROWS, col, weightGrams + PACKAGING_GRAMS, FBA_EXTRA_KG[col]);
  }

  if (fbaProgram === 'nova_conta_isencao') {
    return { standardFee, effectiveFee: 0, discountApplied: standardFee, isEligibleForR6: true, ruleExplanation: 'Conta nova em FBA: isenção de 100% da logística por 30 dias' };
  }

  if (fbaProgram === 'experimente_r6' && price >= 79) {
    const inPeriod = toIsoDate(referenceDate) <= FBA_BENEFIT_END;
    const adsOk = adsInvestmentPercent >= FBA_MIN_ADS_PERCENT;
    if (inPeriod && adsOk) {
      return { standardFee, effectiveFee: FBA_FIXED_FEE_BENEFIT, discountApplied: Math.max(0, standardFee - FBA_FIXED_FEE_BENEFIT), isEligibleForR6: true, ruleExplanation: `Experimente FBA+: tarifa única de R$ 6,00 (preço >= R$ 79 e Ads >= 3,5%). Economia R$ ${Math.max(0, standardFee - FBA_FIXED_FEE_BENEFIT).toFixed(2)}/unid.` };
    }
    const why = !inPeriod ? `benefício encerrado em ${FBA_BENEFIT_END}` : `Ads em ${adsInvestmentPercent.toFixed(1)}% (mínimo 3,5%)`;
    return { standardFee, effectiveFee: standardFee, discountApplied: 0, isEligibleForR6: false, ruleExplanation: `Tarifa padrão R$ ${standardFee.toFixed(2)}: ${why}.` };
  }

  return { standardFee, effectiveFee: standardFee, discountApplied: 0, isEligibleForR6: false, ruleExplanation: `FBA tabela padrão R$ ${standardFee.toFixed(2)} (${weightGrams} g + embalagem, R$ ${price.toFixed(2)})` };
}
