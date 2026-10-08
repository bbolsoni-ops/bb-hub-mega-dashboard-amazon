// Amazon Brasil Official Fee Tables & Calculators (2026/2027)

export interface AmazonCategoryFee {
  id: string;
  name: string;
  defaultPercent: number;
  minFee: number;
  tiered?: {
    threshold: number;
    rateBelow: number;
    rateAbove: number;
  };
}

export const AMAZON_BR_CATEGORIES: AmazonCategoryFee[] = [
  { id: 'casa_cozinha', name: 'Casa e Cozinha', defaultPercent: 12, minFee: 1.0 },
  { id: 'comidas_bebidas', name: 'Comidas e Bebidas', defaultPercent: 10, minFee: 1.0 },
  { id: 'cerveja_vinho', name: 'Cerveja e Vinho', defaultPercent: 11, minFee: 1.0 },
  { id: 'eletronicos_portateis', name: 'Eletrônicos portáteis', defaultPercent: 13, minFee: 1.0 },
  { id: 'celulares', name: 'Celulares e Câmeras', defaultPercent: 11, minFee: 1.0 },
  {
    id: 'acessorios_eletronicos',
    name: 'Acessórios Eletrônicos (15% até R$100 / 10% acima)',
    defaultPercent: 15,
    minFee: 1.0,
    tiered: { threshold: 100, rateBelow: 15, rateAbove: 10 },
  },
  { id: 'videogames', name: 'Videogames e Consoles', defaultPercent: 11, minFee: 1.0 },
  { id: 'computadores', name: 'Computadores', defaultPercent: 12, minFee: 1.0 },
  { id: 'tv_audio', name: 'TV, Áudio e Cinema em Casa', defaultPercent: 10, minFee: 1.0 },
  { id: 'ferramentas', name: 'DIY e Ferramentas', defaultPercent: 11, minFee: 1.0 },
  { id: 'papelaria', name: 'Papelaria e Escritório', defaultPercent: 13, minFee: 1.0 },
  { id: 'esportes', name: 'Esportes, Aventura e Lazer', defaultPercent: 12, minFee: 1.0 },
  { id: 'eletrodomesticos', name: 'Eletrodomésticos Grandes', defaultPercent: 11, minFee: 1.0 },
  {
    id: 'moveis',
    name: 'Móveis & Colchões (15% até R$200 / 10% acima)',
    defaultPercent: 15,
    minFee: 1.0,
    tiered: { threshold: 200, rateBelow: 15, rateAbove: 10 },
  },
  { id: 'brinquedos', name: 'Brinquedos e Jogos', defaultPercent: 12, minFee: 1.0 },
  { id: 'bebes', name: 'Produtos para Bebês', defaultPercent: 12, minFee: 1.0 },
  { id: 'saude', name: 'Saúde e Cuidados Pessoais', defaultPercent: 12, minFee: 1.0 },
  { id: 'beleza', name: 'Beleza', defaultPercent: 13, minFee: 1.0 },
  { id: 'roupas', name: 'Roupas, Calçados e Acessórios', defaultPercent: 14, minFee: 1.0 },
  { id: 'relogios', name: 'Relógios', defaultPercent: 13, minFee: 1.0 },
  { id: 'joias', name: 'Joias', defaultPercent: 14, minFee: 1.0 },
  { id: 'livros_midia', name: 'Mídia: Livros, DVD, Software', defaultPercent: 15, minFee: 1.0 },
  { id: 'pet', name: 'Produtos para Animais de Estimação', defaultPercent: 12, minFee: 1.0 },
  { id: 'automotivo', name: 'Automotivos e Esportes a Motor', defaultPercent: 12, minFee: 1.0 },
  { id: 'pneus', name: 'Pneus', defaultPercent: 10, minFee: 1.0 },
  { id: 'outros', name: 'Outros (Geral)', defaultPercent: 15, minFee: 1.0 },
];

/**
 * Calcula a comissão da Amazon Brasil conforme regras oficiais (tiered ou percentual padrão, mínimo R$ 1,00)
 */
export function calculateAmazonCommission(price: number, categoryId: string = 'outros', customPercent?: number): {
  amount: number;
  effectivePercent: number;
  isMinimumApplied: boolean;
} {
  if (price <= 0) return { amount: 0, effectivePercent: 0, isMinimumApplied: false };

  if (customPercent !== undefined) {
    const raw = (price * customPercent) / 100;
    const finalVal = Math.max(1.0, raw);
    return {
      amount: finalVal,
      effectivePercent: (finalVal / price) * 100,
      isMinimumApplied: raw < 1.0,
    };
  }

  const category = AMAZON_BR_CATEGORIES.find((c) => c.id === categoryId) || AMAZON_BR_CATEGORIES[AMAZON_BR_CATEGORIES.length - 1];

  let rawAmount = 0;
  if (category.tiered) {
    const { threshold, rateBelow, rateAbove } = category.tiered;
    if (price <= threshold) {
      rawAmount = (price * rateBelow) / 100;
    } else {
      rawAmount = (threshold * rateBelow) / 100 + ((price - threshold) * rateAbove) / 100;
    }
  } else {
    rawAmount = (price * category.defaultPercent) / 100;
  }

  const finalAmount = Math.max(category.minFee, rawAmount);
  return {
    amount: finalAmount,
    effectivePercent: (finalAmount / price) * 100,
    isMinimumApplied: rawAmount < category.minFee,
  };
}

/**
 * Calcula a Tarifa DBA (Delivery by Amazon) conforme as regras da Amazon Brasil
 * - Para produtos < R$ 79: Tarifa fixa por preço (<30: 4,50; 30-49,99: 6,50; 50-78,99: 6,75)
 * - Para produtos >= R$ 79: Tarifa por faixa de peso com suporte ao desconto de 50% da campanha SP
 */
export function calculateDbaFee(
  price: number,
  weightGrams: number = 450,
  hasSp50Discount: boolean = false
): {
  standardFee: number;
  effectiveFee: number;
  discountApplied: number;
  ruleExplanation: string;
} {
  if (price <= 0) return { standardFee: 0, effectiveFee: 0, discountApplied: 0, ruleExplanation: 'Sem preço' };

  // Produtos abaixo de R$ 79 (Tarifas fixas independentes de peso/origem)
  if (price < 30) {
    return {
      standardFee: 4.5,
      effectiveFee: 4.5,
      discountApplied: 0,
      ruleExplanation: 'Preço < R$ 30 (Tarifa fixa DBA R$ 4,50)',
    };
  }
  if (price < 50) {
    return {
      standardFee: 6.5,
      effectiveFee: 6.5,
      discountApplied: 0,
      ruleExplanation: 'Preço R$ 30 a R$ 49,99 (Tarifa fixa DBA R$ 6,50)',
    };
  }
  if (price < 79) {
    return {
      standardFee: 6.75,
      effectiveFee: 6.75,
      discountApplied: 0,
      ruleExplanation: 'Preço R$ 50 a R$ 78,99 (Tarifa fixa DBA R$ 6,75)',
    };
  }

  // Produtos a partir de R$ 79: Tabela por faixa de peso e preço (SP Capital / Nacional)
  let baseFee = 15.0; // fallback

  if (price >= 79 && price < 100) {
    if (weightGrams <= 250) baseFee = 11.95;
    else if (weightGrams <= 500) baseFee = 12.85;
    else if (weightGrams <= 1000) baseFee = 13.45;
    else if (weightGrams <= 2000) baseFee = 14.0;
    else if (weightGrams <= 3000) baseFee = 14.95;
    else if (weightGrams <= 4000) baseFee = 16.15;
    else if (weightGrams <= 5000) baseFee = 17.0;
    else baseFee = 25.0;
  } else if (price >= 100 && price < 120) {
    if (weightGrams <= 250) baseFee = 13.95;
    else if (weightGrams <= 500) baseFee = 15.0;
    else if (weightGrams <= 1000) baseFee = 15.7;
    else if (weightGrams <= 2000) baseFee = 16.35;
    else if (weightGrams <= 3000) baseFee = 17.45;
    else if (weightGrams <= 4000) baseFee = 18.85;
    else if (weightGrams <= 5000) baseFee = 19.9;
    else baseFee = 30.0;
  } else if (price >= 120 && price < 150) {
    if (weightGrams <= 250) baseFee = 15.95;
    else if (weightGrams <= 500) baseFee = 17.15;
    else if (weightGrams <= 1000) baseFee = 17.95;
    else if (weightGrams <= 2000) baseFee = 18.75;
    else if (weightGrams <= 3000) baseFee = 19.95;
    else if (weightGrams <= 4000) baseFee = 21.55;
    else if (weightGrams <= 5000) baseFee = 22.75;
    else baseFee = 34.0;
  } else if (price >= 150 && price < 200) {
    if (weightGrams <= 250) baseFee = 17.95;
    else if (weightGrams <= 500) baseFee = 19.3;
    else if (weightGrams <= 1000) baseFee = 20.2;
    else if (weightGrams <= 2000) baseFee = 21.1;
    else if (weightGrams <= 3000) baseFee = 22.4;
    else if (weightGrams <= 4000) baseFee = 24.2;
    else if (weightGrams <= 5000) baseFee = 25.6;
    else baseFee = 38.0;
  } else {
    // >= 200
    if (weightGrams <= 250) baseFee = 19.95;
    else if (weightGrams <= 500) baseFee = 20.45;
    else if (weightGrams <= 1000) baseFee = 21.45;
    else if (weightGrams <= 2000) baseFee = 22.95;
    else if (weightGrams <= 3000) baseFee = 23.95;
    else if (weightGrams <= 4000) baseFee = 25.95;
    else if (weightGrams <= 5000) baseFee = 27.95;
    else baseFee = 36.95;
  }

  if (hasSp50Discount && price >= 79) {
    const discounted = baseFee * 0.5;
    return {
      standardFee: baseFee,
      effectiveFee: discounted,
      discountApplied: baseFee - discounted,
      ruleExplanation: `DBA Tabela Oficial R$ ${(baseFee ?? 0).toFixed(2)} com 50% de desconto da Campanha SP = R$ ${(discounted ?? 0).toFixed(2)}`,
    };
  }

  return {
    standardFee: baseFee,
    effectiveFee: baseFee,
    discountApplied: 0,
    ruleExplanation: `DBA Tabela Oficial R$ ${(baseFee ?? 0).toFixed(2)} (${weightGrams}g, R$ ${(price ?? 0).toFixed(2)})`,
  };
}

export type FbaProgramMode = 'standard' | 'experimente_r6' | 'nova_conta_isencao';

/**
 * Calcula a Tarifa FBA (Logística da Amazon) conforme as regras e programas vigentes:
 * 1) "nova_conta_isencao": 100% isenção nos primeiros 30 dias (R$ 0,00)
 * 2) "experimente_r6": Tarifa fixa de R$ 6,00 para produtos >= R$ 79 (desde que invista >= 3,5% em Ads)
 * 3) "standard": Tabela oficial baseada em peso e preço
 */
export function calculateFbaFee(
  price: number,
  weightGrams: number = 450,
  fbaProgram: FbaProgramMode = 'experimente_r6',
  adsInvestmentPercent: number = 4.0
): {
  standardFee: number;
  effectiveFee: number;
  discountApplied: number;
  isEligibleForR6: boolean;
  ruleExplanation: string;
} {
  if (price <= 0) {
    return {
      standardFee: 0,
      effectiveFee: 0,
      discountApplied: 0,
      isEligibleForR6: false,
      ruleExplanation: 'Sem preço',
    };
  }

  // 1. Tabela Padrão FBA (sem promoções)
  let standardFee = 14.0;
  if (price < 30) {
    if (weightGrams <= 100) standardFee = 5.65;
    else if (weightGrams <= 200) standardFee = 10.45;
    else if (weightGrams <= 300) standardFee = 10.95;
    else if (weightGrams <= 400) standardFee = 11.45;
    else if (weightGrams <= 500) standardFee = 11.95;
    else if (weightGrams <= 750) standardFee = 12.05;
    else if (weightGrams <= 1000) standardFee = 12.45;
    else if (weightGrams <= 1500) standardFee = 12.95;
    else if (weightGrams <= 2000) standardFee = 13.05;
    else standardFee = 14.05;
  } else if (price < 50) {
    if (weightGrams <= 100) standardFee = 5.85;
    else if (weightGrams <= 200) standardFee = 12.45;
    else if (weightGrams <= 300) standardFee = 12.95;
    else if (weightGrams <= 400) standardFee = 13.45;
    else if (weightGrams <= 500) standardFee = 13.95;
    else if (weightGrams <= 750) standardFee = 14.05;
    else if (weightGrams <= 1000) standardFee = 14.45;
    else if (weightGrams <= 1500) standardFee = 14.95;
    else if (weightGrams <= 2000) standardFee = 15.05;
    else standardFee = 16.05;
  } else if (price < 79) {
    if (weightGrams <= 100) standardFee = 6.05;
    else if (weightGrams <= 200) standardFee = 14.45;
    else if (weightGrams <= 300) standardFee = 14.95;
    else if (weightGrams <= 400) standardFee = 15.45;
    else if (weightGrams <= 500) standardFee = 15.95;
    else if (weightGrams <= 750) standardFee = 16.05;
    else if (weightGrams <= 1000) standardFee = 16.45;
    else if (weightGrams <= 1500) standardFee = 16.95;
    else if (weightGrams <= 2000) standardFee = 17.05;
    else standardFee = 18.05;
  } else if (price < 100) {
    if (weightGrams <= 100) standardFee = 10.05;
    else if (weightGrams <= 200) standardFee = 15.45;
    else if (weightGrams <= 300) standardFee = 15.95;
    else if (weightGrams <= 400) standardFee = 16.95;
    else if (weightGrams <= 500) standardFee = 17.05;
    else if (weightGrams <= 750) standardFee = 18.45;
    else if (weightGrams <= 1000) standardFee = 19.05;
    else if (weightGrams <= 1500) standardFee = 19.45;
    else if (weightGrams <= 2000) standardFee = 19.95;
    else standardFee = 20.05;
  } else if (price < 120) {
    if (weightGrams <= 100) standardFee = 12.05;
    else if (weightGrams <= 200) standardFee = 16.05;
    else if (weightGrams <= 300) standardFee = 16.55;
    else if (weightGrams <= 400) standardFee = 17.15;
    else if (weightGrams <= 500) standardFee = 17.85;
    else if (weightGrams <= 750) standardFee = 18.55;
    else if (weightGrams <= 1000) standardFee = 19.25;
    else if (weightGrams <= 1500) standardFee = 20.35;
    else if (weightGrams <= 2000) standardFee = 21.35;
    else standardFee = 22.35;
  } else {
    // >= 120
    if (weightGrams <= 100) standardFee = 14.05;
    else if (weightGrams <= 200) standardFee = 16.55;
    else if (weightGrams <= 300) standardFee = 17.15;
    else if (weightGrams <= 400) standardFee = 17.85;
    else if (weightGrams <= 500) standardFee = 18.55;
    else if (weightGrams <= 750) standardFee = 19.25;
    else if (weightGrams <= 1000) standardFee = 20.35;
    else if (weightGrams <= 1500) standardFee = 21.35;
    else standardFee = 23.35;
  }

  // 2. Avaliação de Benefícios Promocionais
  if (fbaProgram === 'nova_conta_isencao') {
    return {
      standardFee,
      effectiveFee: 0,
      discountApplied: standardFee,
      isEligibleForR6: true,
      ruleExplanation: 'Campanha Experimente FBA: 100% de isenção nos primeiros 30 dias (R$ 0,00)',
    };
  }

  if (fbaProgram === 'experimente_r6') {
    if (price >= 79) {
      const isEligibleAds = adsInvestmentPercent >= 3.5;
      if (isEligibleAds) {
        return {
          standardFee,
          effectiveFee: 6.0,
          discountApplied: standardFee - 6.0,
          isEligibleForR6: true,
          ruleExplanation: `Experimente FBA+: Tarifa única de R$ 6,00 ativa (Preço >= R$ 79 e Ads >= 3,5%). Economia de R$ ${(standardFee - 6.0).toFixed(2)}/unid.`,
        };
      } else {
        return {
          standardFee,
          effectiveFee: standardFee,
          discountApplied: 0,
          isEligibleForR6: false,
          ruleExplanation: `Atenção: Para ativar a tarifa FBA de R$ 6,00, é necessário investir no mínimo 3,5% em Ads (atual: ${(adsInvestmentPercent ?? 0).toFixed(1)}%). Tarifa padrão aplicada: R$ ${(standardFee ?? 0).toFixed(2)}.`,
        };
      }
    } else {
      return {
        standardFee,
        effectiveFee: standardFee,
        discountApplied: 0,
        isEligibleForR6: false,
        ruleExplanation: `Preço abaixo de R$ 79: Tarifa FBA padrão aplicada de R$ ${(standardFee ?? 0).toFixed(2)}.`,
      };
    }
  }

  return {
    standardFee,
    effectiveFee: standardFee,
    discountApplied: 0,
    isEligibleForR6: price >= 79 && adsInvestmentPercent >= 3.5,
    ruleExplanation: `FBA Tabela Padrão: R$ ${(standardFee ?? 0).toFixed(2)} (${weightGrams}g, R$ ${(price ?? 0).toFixed(2)})`,
  };
}
