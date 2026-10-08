import { AdsCampaignRow } from '../types/amazon';
import { parseAmazonNumber } from './formatters';

export type BudgetActionType =
  | 'PAUSE_CRITICAL'
  | 'REDUCE_HEAVY'
  | 'REDUCE_LIGHT'
  | 'SCALE_AGGRESSIVE'
  | 'SCALE_MODERATE'
  | 'MAINTAIN_MONITOR'
  | 'REACTIVATE_EVALUATE';

export type CampaignAction =
  | "INCREASE"
  | "REDUCE"
  | "PAUSE"
  | "MAINTAIN"
  | "ARCHIVED"
  | "REVIEW";

export type CampaignMetrics = {
  name: string;
  status: string;
  currentBudget: number | null;
  spend: number;
  sales: number;
  orders: number;
  clicks: number;
  acos: number | null;
  roas: number | null;
  ctr: number | null;
  cpc: number | null;
};

export type BudgetRecommendation = {
  action: CampaignAction;
  currentBudget: number | null;
  recommendedBudget: number | null;
  changePercent: number | null;
  estimatedMonthlySavings: number | null;
  title: string;
  reason: string;
  
  // Legacy fields for complete backward compatibility
  campaignName: string;
  status: string;
  spend: number;
  sales: number;
  orders: number;
  actionType: BudgetActionType;
  actionTitle: string;
  urgency: 'critical' | 'high' | 'medium' | 'info';
  category: 'pause_cut' | 'scale' | 'optimize' | 'paused';
  suggestedBudget: number;
  budgetChangePercent: number;
  spendLegacy?: number;
  salesLegacy?: number;
  ordersLegacy?: number;
  clicksLegacy?: number;
  cpcLegacy?: number;
  currentAcos: number | null;
  targetAcos: number;
  acosDifference: number | null;
  currentRoas: number | null;
  actionSteps: string[];
  estimatedMonthlyImpact: string;
};

export interface BudgetInsightsSummary {
  targetAcos: number;
  totalCampaigns: number;
  activeCampaigns: number;
  criticalPauseCount: number;
  scaleOpportunitiesCount: number;
  optimizeCount: number;
  pausedCount: number;
  potentialMonthlySavings: number;
  potentialGrowthBudget: number;
  recommendations: BudgetRecommendation[];
}

export function parseCurrency(value: unknown): number | null {
  return parseAmazonNumber(value, 'currency');
}

export function parseNumber(value: unknown): number | null {
  return parseAmazonNumber(value, 'decimal');
}

export function calculateAcos(spend: number, sales: number): number | null {
  if (!Number.isFinite(spend) || !Number.isFinite(sales) || sales <= 0) {
    return null;
  }
  return (spend / sales) * 100;
}

export function calculateRoas(spend: number, sales: number): number | null {
  if (!Number.isFinite(spend) || spend <= 0 || !Number.isFinite(sales)) {
    return null;
  }
  return sales / spend;
}

export function calculateBudgetChangePercent(
  currentBudget: number | null,
  recommendedBudget: number | null
): number | null {
  if (
    currentBudget === null ||
    recommendedBudget === null ||
    currentBudget <= 0
  ) {
    return null;
  }

  return ((recommendedBudget - currentBudget) / currentBudget) * 100;
}

export function calculateMonthlySavings(
  currentBudget: number | null,
  recommendedBudget: number | null
): number | null {
  if (currentBudget === null || recommendedBudget === null) {
    return null;
  }

  return Math.max(0, currentBudget - recommendedBudget) * 30;
}

export function isInactiveCampaign(status: string): boolean {
  const normalizedStatus = status.trim().toUpperCase();

  return [
    "ARCHIVED",
    "ARCHIVE",
    "ARQUIVADA",
    "PAUSED",
    "PAUSADA"
  ].includes(normalizedStatus);
}

export function getBudgetRecommendation(
  campaign: CampaignMetrics,
  targetAcos = 15
): BudgetRecommendation {
  const {
    status,
    currentBudget,
    spend,
    sales,
    orders,
    clicks,
    acos,
    roas
  } = campaign;

  const campaignName = campaign.name;

  if (isInactiveCampaign(status)) {
    return {
      action: "ARCHIVED",
      currentBudget,
      recommendedBudget: null,
      changePercent: null,
      estimatedMonthlySavings: null,
      title: "Campanha arquivada/pausada",
      reason:
        "Os dados históricos foram analisados, mas não há ação de orçamento a aplicar enquanto a campanha estiver inativa.",
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'MAINTAIN_MONITOR',
      actionTitle: "Campanha arquivada/pausada",
      urgency: 'info',
      category: 'paused',
      suggestedBudget: 0,
      budgetChangePercent: 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: acos !== null ? acos - targetAcos : null,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("ARCHIVED", null, currentBudget),
      estimatedMonthlyImpact: getEstimatedMonthlyImpact("ARCHIVED", null, sales, roas)
    };
  }

  if (currentBudget === null) {
    return {
      action: "REVIEW",
      currentBudget: null,
      recommendedBudget: null,
      changePercent: null,
      estimatedMonthlySavings: null,
      title: "Revisar orçamento",
      reason:
        "O orçamento atual não foi identificado no relatório. Revise o mapeamento da coluna “Quantia do Orçamento”.",
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'MAINTAIN_MONITOR',
      actionTitle: "Revisar orçamento",
      urgency: 'medium',
      category: 'optimize',
      suggestedBudget: 0,
      budgetChangePercent: 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: acos !== null ? acos - targetAcos : null,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("REVIEW", null, currentBudget),
      estimatedMonthlyImpact: getEstimatedMonthlyImpact("REVIEW", null, sales, roas)
    };
  }

  if (spend > 0 && sales <= 0) {
    if (clicks >= 5) {
      const recommendedBudget = 0;
      const changePercent = calculateBudgetChangePercent(currentBudget, recommendedBudget);
      const savings = calculateMonthlySavings(currentBudget, recommendedBudget);

      return {
        action: "PAUSE",
        currentBudget,
        recommendedBudget,
        changePercent,
        estimatedMonthlySavings: savings,
        title: "Pausar campanha",
        reason: `Sem vendas após ${clicks} cliques e ${formatBRL(spend)} em gastos.`,
        
        campaignName,
        status,
        spend,
        sales,
        orders,
        actionType: 'PAUSE_CRITICAL',
        actionTitle: "Pausar campanha",
        urgency: 'critical',
        category: 'pause_cut',
        suggestedBudget: recommendedBudget,
        budgetChangePercent: changePercent ?? 0,
        currentAcos: acos,
        targetAcos,
        acosDifference: null,
        currentRoas: roas,
        actionSteps: getActionStepsForAction("PAUSE", recommendedBudget, currentBudget),
        estimatedMonthlyImpact: getEstimatedMonthlyImpact("PAUSE", savings, sales, roas)
      };
    }

    return {
      action: "REVIEW",
      currentBudget,
      recommendedBudget: currentBudget,
      changePercent: 0,
      estimatedMonthlySavings: 0,
      title: "Monitorar campanha",
      reason: `A campanha tem ${clicks} clique(s), ${formatBRL(spend)} em gastos e ainda não gerou vendas. Ainda não há volume suficiente para pausa automática.`,
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'MAINTAIN_MONITOR',
      actionTitle: "Monitorar campanha",
      urgency: 'medium',
      category: 'optimize',
      suggestedBudget: currentBudget,
      budgetChangePercent: 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: null,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("REVIEW", currentBudget, currentBudget),
      estimatedMonthlyImpact: "Monitoramento contínuo recomendado."
    };
  }

  if (acos === null) {
    return {
      action: "REVIEW",
      currentBudget,
      recommendedBudget: currentBudget,
      changePercent: 0,
      estimatedMonthlySavings: 0,
      title: "Revisar dados",
      reason:
        "Não foi possível calcular ACOS com segurança. Verifique gastos e vendas atribuídas.",
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'MAINTAIN_MONITOR',
      actionTitle: "Revisar dados",
      urgency: 'medium',
      category: 'optimize',
      suggestedBudget: currentBudget,
      budgetChangePercent: 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: null,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("REVIEW", currentBudget, currentBudget),
      estimatedMonthlyImpact: "Não foi possível calcular impacto sem dados de ACOS."
    };
  }

  if (acos > targetAcos * 3) {
    const recommendedBudget = currentBudget * 0.3;
    const changePercent = calculateBudgetChangePercent(currentBudget, recommendedBudget);
    const savings = calculateMonthlySavings(currentBudget, recommendedBudget);

    return {
      action: "REDUCE",
      currentBudget,
      recommendedBudget,
      changePercent,
      estimatedMonthlySavings: savings,
      title: "Cortar orçamento (Sangria crítica)",
      reason: `ACoS de ${formatPercent(acos)} está extremamente abusivo (mais de 3x a meta de ${formatPercent(targetAcos)}). Redução drástica imediata necessária.`,
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'PAUSE_CRITICAL',
      actionTitle: "Cortar orçamento (Crítico)",
      urgency: 'critical',
      category: 'pause_cut',
      suggestedBudget: recommendedBudget,
      budgetChangePercent: changePercent ?? 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: acos - targetAcos,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("REDUCE", recommendedBudget, currentBudget),
      estimatedMonthlyImpact: getEstimatedMonthlyImpact("REDUCE", savings, sales, roas)
    };
  }

  if (acos > targetAcos * 2) {
    const recommendedBudget = currentBudget * 0.5;
    const changePercent = calculateBudgetChangePercent(currentBudget, recommendedBudget);
    const savings = calculateMonthlySavings(currentBudget, recommendedBudget);

    return {
      action: "REDUCE",
      currentBudget,
      recommendedBudget,
      changePercent,
      estimatedMonthlySavings: savings,
      title: "Reduzir orçamento e otimizar",
      reason: `ACOS de ${formatPercent(acos)} está muito acima da meta de ${formatPercent(targetAcos)}.`,
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'REDUCE_HEAVY',
      actionTitle: "Reduzir orçamento e otimizar",
      urgency: 'critical',
      category: 'pause_cut',
      suggestedBudget: recommendedBudget,
      budgetChangePercent: changePercent ?? 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: acos - targetAcos,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("REDUCE", recommendedBudget, currentBudget),
      estimatedMonthlyImpact: getEstimatedMonthlyImpact("REDUCE", savings, sales, roas)
    };
  }

  if (acos > targetAcos) {
    const recommendedBudget = currentBudget * 0.8;
    const changePercent = calculateBudgetChangePercent(currentBudget, recommendedBudget);
    const savings = calculateMonthlySavings(currentBudget, recommendedBudget);

    return {
      action: "REDUCE",
      currentBudget,
      recommendedBudget,
      changePercent,
      estimatedMonthlySavings: savings,
      title: "Reduzir orçamento e monitorar",
      reason: `ACOS de ${formatPercent(acos)} está acima da meta de ${formatPercent(targetAcos)}.`,
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'REDUCE_LIGHT',
      actionTitle: "Reduzir orçamento e monitorar",
      urgency: 'high',
      category: 'pause_cut',
      suggestedBudget: recommendedBudget,
      budgetChangePercent: changePercent ?? 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: acos - targetAcos,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("REDUCE", recommendedBudget, currentBudget),
      estimatedMonthlyImpact: getEstimatedMonthlyImpact("REDUCE", savings, sales, roas)
    };
  }

  if (acos <= targetAcos * 0.5 && orders >= 2) {
    const recommendedBudget = currentBudget * 1.5;
    const changePercent = calculateBudgetChangePercent(currentBudget, recommendedBudget);

    return {
      action: "INCREASE",
      currentBudget,
      recommendedBudget,
      changePercent,
      estimatedMonthlySavings: 0,
      title: "Aumentar orçamento",
      reason: `ACOS de ${formatPercent(acos)} está muito abaixo da meta, com ${orders} pedido(s) atribuído(s).`,
      
      campaignName,
      status,
      spend,
      sales,
      orders,
      actionType: 'SCALE_AGGRESSIVE',
      actionTitle: "Aumentar orçamento",
      urgency: 'high',
      category: 'scale',
      suggestedBudget: recommendedBudget,
      budgetChangePercent: changePercent ?? 0,
      currentAcos: acos,
      targetAcos,
      acosDifference: acos - targetAcos,
      currentRoas: roas,
      actionSteps: getActionStepsForAction("INCREASE", recommendedBudget, currentBudget),
      estimatedMonthlyImpact: getEstimatedMonthlyImpact("INCREASE", 0, sales, roas)
    };
  }

  return {
    action: "MAINTAIN",
    currentBudget,
    recommendedBudget: currentBudget,
    changePercent: 0,
    estimatedMonthlySavings: 0,
    title: "Manter orçamento e monitorar",
    reason: `ACOS de ${formatPercent(acos)} está dentro da meta de ${formatPercent(targetAcos)}.`,
    
    campaignName,
    status,
    spend,
    sales,
    orders,
    actionType: 'MAINTAIN_MONITOR',
    actionTitle: "Manter orçamento e monitorar",
    urgency: 'info',
    category: 'optimize',
    suggestedBudget: currentBudget,
    budgetChangePercent: 0,
    currentAcos: acos,
    targetAcos,
    acosDifference: acos !== null ? acos - targetAcos : null,
    currentRoas: roas,
    actionSteps: getActionStepsForAction("MAINTAIN", currentBudget, currentBudget),
    estimatedMonthlyImpact: getEstimatedMonthlyImpact("MAINTAIN", 0, sales, roas)
  };
}

function getActionStepsForAction(action: CampaignAction, recommendedBudget: number | null, currentBudget: number | null): string[] {
  const current = currentBudget ?? 0;
  const recommended = recommendedBudget ?? 0;
  switch (action) {
    case "ARCHIVED":
      return [
        "Manter inativa/arquivada.",
        "Se for relançar, revisar estrutura de palavras-chave e ofertas dos produtos anunciados.",
      ];
    case "PAUSE":
      return [
        "Pausar campanha imediatamente no Amazon Ads Console.",
        "Verificar se o produto anunciado possui Buy Box, estoque ativo e avaliação mínima (4.0+ estrelas).",
        "Avaliar se o tráfego gerado é irrelevante antes de qualquer reativação.",
      ];
    case "REDUCE":
      return [
        `Reduzir orçamento diário de R$ ${current.toFixed(2)} para R$ ${recommended.toFixed(2)}.`,
        "Acessar os termos de pesquisa da campanha e negativar correspondências com cliques e zero conversão.",
        "Reduzir os lances (bids) de palavras-chave genéricas.",
      ];
    case "INCREASE":
      return [
        `Aumentar orçamento diário de R$ ${current.toFixed(2)} para R$ ${recommended.toFixed(2)} (+50%).`,
        "Acompanhar a taxa de perda de impressões por orçamento.",
        "Isolar as palavras-chave campeãs desta campanha em correspondência Exata.",
      ];
    case "MAINTAIN":
      return [
        "Manter o orçamento diário atual.",
        "Realizar limpezas quinzenais de termos de busca não correlatos.",
      ];
    case "REVIEW":
    default:
      return [
        "Revisar o orçamento manualmente.",
        "Monitorar cliques e gastos sem conversão.",
      ];
  }
}

function getEstimatedMonthlyImpact(action: CampaignAction, savings: number | null, sales: number, roas: number | null): string {
  if (action === "ARCHIVED") return "Sem impacto enquanto inativa.";
  if (action === "PAUSE" || action === "REDUCE") {
    const monthlySavings = savings ?? 0;
    return `Economia estimada de ~R$ ${monthlySavings.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês.`;
  }
  if (action === "INCREASE") {
    return `Potencial de alavancar +R$ ${Math.round(sales * 0.4).toLocaleString('pt-BR')} em vendas com margem líquida protegida.`;
  }
  return "Manutenção da velocidade de vendas dentro da meta comercial.";
}

export function generateBudgetInsights(
  campaigns: AdsCampaignRow[],
  targetAcos: number = 15.0
): BudgetInsightsSummary {
  const recommendations: BudgetRecommendation[] = [];

  let criticalPauseCount = 0;
  let scaleOpportunitiesCount = 0;
  let optimizeCount = 0;
  let pausedCount = 0;
  let potentialMonthlySavings = 0;
  let potentialGrowthBudget = 0;

  for (const c of campaigns) {
    const budgetVal = typeof c.budget === 'number' ? c.budget : parseCurrency(c.budget);
    const campaignMetric: CampaignMetrics = {
      name: c.campaignName,
      status: c.status,
      currentBudget: budgetVal,
      spend: c.spend,
      sales: c.sales,
      orders: c.orders,
      clicks: c.clicks,
      acos: calculateAcos(c.spend, c.sales),
      roas: calculateRoas(c.spend, c.sales),
      ctr: c.ctr,
      cpc: c.cpc
    };

    const rec = getBudgetRecommendation(campaignMetric, targetAcos);

    if (rec.action === "ARCHIVED") {
      pausedCount++;
    } else if (rec.action === "PAUSE") {
      criticalPauseCount++;
      potentialMonthlySavings += rec.estimatedMonthlySavings ?? 0;
    } else if (rec.action === "REDUCE") {
      if (rec.actionType === 'REDUCE_HEAVY' || rec.actionType === 'PAUSE_CRITICAL') {
        criticalPauseCount++;
      } else {
        optimizeCount++;
      }
      potentialMonthlySavings += rec.estimatedMonthlySavings ?? 0;
    } else if (rec.action === "INCREASE") {
      scaleOpportunitiesCount++;
      const current = rec.currentBudget ?? 0;
      const recommended = rec.recommendedBudget ?? 0;
      potentialGrowthBudget += Math.max(0, recommended - current) * 30;
    } else if (rec.action === "MAINTAIN") {
      optimizeCount++;
    } else {
      optimizeCount++;
    }

    recommendations.push(rec);
  }

  // Sort recommendations by urgency: critical first, then high, medium, info
  const urgencyWeight: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    info: 1,
  };

  recommendations.sort((a, b) => {
    const diff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    if (diff !== 0) return diff;
    if (b.category === 'pause_cut') return b.spend - a.spend;
    return b.sales - a.sales;
  });

  const activeCampaigns = campaigns.filter((c) => !isInactiveCampaign(c.status)).length;

  return {
    targetAcos,
    totalCampaigns: campaigns.length,
    activeCampaigns,
    criticalPauseCount,
    scaleOpportunitiesCount,
    optimizeCount,
    pausedCount,
    potentialMonthlySavings,
    potentialGrowthBudget,
    recommendations,
  };
}

export const formatBRL = (
  value: number | null | undefined
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercent = (
  value: number | null | undefined
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
};

export const formatAcos = (
  acos: number | null,
  spend: number,
  sales: number
): string => {
  if (spend > 0 && sales <= 0) {
    return "Sem vendas";
  }

  if (acos === null) {
    return "—";
  }

  return `${acos.toFixed(1).replace(".", ",")}%`;
};

export const formatRoas = (
  roas: number | null,
  spend: number,
  sales: number
): string => {
  if (spend > 0 && sales <= 0) {
    return "0,00x";
  }

  if (roas === null) {
    return "—";
  }

  return `${roas.toFixed(2).replace(".", ",")}x`;
};
