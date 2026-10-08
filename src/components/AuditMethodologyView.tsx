import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  FileSpreadsheet,
  BookOpen,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Target,
  DollarSign,
  TrendingUp,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  ListChecks,
  ArrowRight,
  PieChart,
} from 'lucide-react';
import { FileAuditInfo, ReconciledMetrics } from '../types/amazon';
import { safeToFixed } from '../utils/formatters';

interface AuditMethodologyViewProps {
  auditFiles: FileAuditInfo[];
  metrics: ReconciledMetrics;
}

type SubTab = 'overview' | 'checklist' | 'ads_calc' | 'pricing_calc' | 'playbook';

interface CheckItem {
  id: string;
  group: string;
  weight: number;
  label: string;
  explanation: string;
}

const CHECKLIST_GROUPS: { name: string; weight: number; items: [string, string][] }[] = [
  {
    name: '1. Integridade dos Dados & Fontes',
    weight: 20,
    items: [
      ['Períodos, moeda (BRL) e fuso horário padronizados', 'Evita comparar bases com janelas desalinhadas ou conversões de câmbio indevidas.'],
      ['Chaves de deduplicação Order ID + Item ID validadas', 'Impede contagem dupla de pedidos com múltiplos itens ou reenvios.'],
      ['Cancelamentos, devoluções e reembolsos devidamente segregados', 'Impede que pedidos pendentes ou cancelados sejam computados como faturamento realizado.'],
      ['Fontes de Venda Comercial, Pedidos e Ads tratadas em raias separadas', 'Reconcilia divergências conceituais sem somar bases heterogêneas.'],
    ],
  },
  {
    name: '2. Unit Economics & Margem Real',
    weight: 25,
    items: [
      ['CMV / Custo de Aquisição unitário auditado por SKU', 'Sem custo do produto, qualquer cálculo de lucro líquido ou breakeven é ilusório.'],
      ['Custos variáveis completos mapeados (Comissão, Impostos, Frete, Embalagem)', 'Permite calcular a margem de contribuição pré-Ads com precisão centesimal.'],
      ['ACoS de Breakeven e ACoS Meta calculados por produto', 'Determina matematicamente o teto máximo de publicidade aceitável antes de entrar no prejuízo.'],
      ['Rateio de despesas operacionais fixas e capital de giro considerado', 'Garante que o resultado final reflita o lucro operacional real da empresa.'],
    ],
  },
  {
    name: '3. Eficiência de Amazon Ads',
    weight: 20,
    items: [
      ['ACoS, ROAS e TACoS monitorados em conjunto com vendas totais', 'Garante que campanhas sejam avaliadas pelo impacto na loja inteira e não só na mídia paga.'],
      ['Termos de pesquisa auditados para estancar cliques sem conversão', 'Identifica e negativa termos com mais de 10-15 cliques e zero pedidos.'],
      ['Campanhas estruturadas por objetivo (Rentabilidade, Crescimento, Lançamento, Defesa)', 'Evita cobrar a mesma meta de ACoS para produtos maduros e lançamentos recentes.'],
      ['Análise de produtos comprados vs produtos anunciados (Efeito Halo)', 'Mede o tráfego gerado que converteu em outros ASINs do catálogo.'],
    ],
  },
  {
    name: '4. Catálogo, Buy Box & Conversão',
    weight: 15,
    items: [
      ['Sessões, CTR e Taxa de Conversão (CVR) auditados por ASIN', 'Permite identificar se o gargalo está na atração (CTR) ou na oferta (CVR).'],
      ['Percentual de Buy Box (Oferta em Destaque) monitorado', 'Anunciar produtos sem a Buy Box garantida joga orçamento fora.'],
      ['Títulos, imagens principais, bullet points e avaliações otimizados', 'A página de detalhes (PDP) é o fator determinante para a conversão do tráfego pago.'],
    ],
  },
  {
    name: '5. Estoque, Logística & Ruptura',
    weight: 10,
    items: [
      ['Cobertura de estoque e prevenção de ruptura em SKUs líderes', 'Ficar sem estoque derruba o ranking orgânico (BSR) e invalida investimento prévio em Ads.'],
      ['Estoque antigo, reservado e tarifas de armazenagem auditados', 'Evita erosão de caixa com produtos de giro lento e taxas de permanência.'],
      ['Canais de envio comparados (FBA vs DBA vs FBM)', 'Avalia elegibilidade ao selo Prime e descontos regionais (ex: SP 50% DBA).'],
    ],
  },
  {
    name: '6. Governança, Rotinas & Metas',
    weight: 10,
    items: [
      ['Plano de ação formal com responsáveis, prazos e métricas de acompanhamento', 'Cada oportunidade de melhoria deve possuir dono e prazo definido.'],
      ['Fechamento mensal reconciliado com Relatórios de Pagamentos', 'Confronta repasse líquido bancário da Amazon com faturamento contábil.'],
      ['Priorização baseada no impacto financeiro estimado vs esforço', 'Foca as energias nos 20% das ações que geram 80% do retorno em caixa.'],
    ],
  },
];

export const AuditMethodologyView: React.FC<AuditMethodologyViewProps> = ({
  auditFiles,
  metrics,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');

  // ================= 1. CHECKLIST STATE =================
  const initialCheckedState = useMemo(() => {
    const saved = localStorage.getItem('bb_hub_maturity_checklist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Auto-check some items if real data files exist
    const autoChecked: Record<string, boolean> = {};
    if (auditFiles.length > 0) {
      autoChecked['c-0-0'] = true;
      autoChecked['c-0-1'] = true;
      autoChecked['c-0-2'] = true;
      autoChecked['c-0-3'] = true;
    }
    if (metrics.adsSpend > 0) {
      autoChecked['c-2-0'] = true;
    }
    return autoChecked;
  }, [auditFiles.length, metrics.adsSpend]);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(initialCheckedState);

  const flatChecklist = useMemo<CheckItem[]>(() => {
    const list: CheckItem[] = [];
    CHECKLIST_GROUPS.forEach((g, gIdx) => {
      const itemWeight = g.weight / g.items.length;
      g.items.forEach((it, iIdx) => {
        list.push({
          id: `c-${gIdx}-${iIdx}`,
          group: g.name,
          weight: itemWeight,
          label: it[0],
          explanation: it[1],
        });
      });
    });
    return list;
  }, []);

  const maturityScore = useMemo(() => {
    const raw = flatChecklist.reduce((sum, item) => {
      return sum + (checkedItems[item.id] ? item.weight : 0);
    }, 0);
    return Math.round(raw);
  }, [flatChecklist, checkedItems]);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('bb_hub_maturity_checklist', JSON.stringify(next));
      return next;
    });
  };

  const maturityClassification = useMemo(() => {
    if (maturityScore >= 80) {
      return {
        label: 'Operação Governada & Alta Performance',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        hint: 'Sua operação possui bases sólidas. O foco agora é testes incrementais, expansão de catálogo e ganho de escala.',
      };
    }
    if (maturityScore >= 60) {
      return {
        label: 'Boa Base com Lacunas Críticas',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/30',
        hint: 'A estrutura básica funciona, mas lacunas em unit economics ou governança limitam a previsibilidade do lucro.',
      };
    }
    if (maturityScore >= 35) {
      return {
        label: 'Gestão Reativa / Risco de Margem',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        hint: 'Há risco iminente de crescer faturamento sacrificando margem de lucro por falta de controles analíticos.',
      };
    }
    return {
      label: 'Diagnóstico Inicial Insuficiente',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/30',
      hint: 'A conta opera no escuro. Comece imediatamente pela integridade dos dados e mapeamento de CMV por SKU.',
    };
  }, [maturityScore]);

  const topPriorityActions = useMemo(() => {
    return CHECKLIST_GROUPS.map((g, gIdx) => {
      const groupItems = g.items.map((_, iIdx) => `c-${gIdx}-${iIdx}`);
      const checkedCount = groupItems.filter((id) => checkedItems[id]).length;
      const total = groupItems.length;
      const completion = checkedCount / total;
      return {
        name: g.name,
        checkedCount,
        total,
        completion,
      };
    })
      .filter((x) => x.checkedCount < x.total)
      .sort((a, b) => a.completion - b.completion)
      .slice(0, 3);
  }, [checkedItems]);

  const handleExportChecklistCsv = () => {
    const rows = [
      ['Grupo Metodológico', 'Critério de Auditoria', 'Explicação Técnica', 'Status'],
      ...flatChecklist.map((item) => [
        item.group,
        item.label,
        item.explanation,
        checkedItems[item.id] ? 'CONFORME (OK)' : 'PENDENTE / LACUNA',
      ]),
    ];
    const csvContent =
      '\ufeff' +
      rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bb_hub_checklist_maturidade_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ================= 2. ADS METAS CALCULATOR STATE =================
  const [adSpend, setAdSpend] = useState<number>(metrics.adsSpend > 0 ? metrics.adsSpend : 1200);
  const [adSales, setAdSales] = useState<number>(metrics.adsSalesAttributed > 0 ? metrics.adsSalesAttributed : 6000);
  const [totalSales, setTotalSales] = useState<number>(
    (metrics.businessSales || metrics.ordersShippedGross) > 0
      ? metrics.businessSales || metrics.ordersShippedGross
      : 12000
  );
  const [preAdMargin, setPreAdMargin] = useState<number>(32);
  const [targetMargin, setTargetMargin] = useState<number>(12);
  const [skuObjective, setSkuObjective] = useState<'profit' | 'growth' | 'launch' | 'defense'>('profit');

  const handlePullAccountData = () => {
    if (metrics.adsSpend > 0) setAdSpend(metrics.adsSpend);
    if (metrics.adsSalesAttributed > 0) setAdSales(metrics.adsSalesAttributed);
    const storeSales = metrics.businessSales || metrics.ordersShippedGross;
    if (storeSales > 0) setTotalSales(storeSales);
    if (metrics.totalContributionMarginPercent && metrics.totalContributionMarginPercent > 0) {
      setPreAdMargin(Number(safeToFixed(metrics.totalContributionMarginPercent, 1)));
    }
  };

  const adsCalculations = useMemo(() => {
    const acos = adSales > 0 ? (adSpend / adSales) * 100 : null;
    const roas = adSpend > 0 ? adSales / adSpend : null;
    const tacos = totalSales > 0 ? (adSpend / totalSales) * 100 : null;
    const adShare = totalSales > 0 ? (adSales / totalSales) * 100 : null;
    const acosBreakeven = preAdMargin; // Breakeven ACOS = Margem pré-Ads
    const acosTarget = Math.max(0, preAdMargin - targetMargin); // Meta de ACoS para sobrar targetMargin
    const roasMinimum = acosTarget > 0 ? 100 / acosTarget : null;

    let status: 'Rentável' | 'No Limite' | 'Acima do Equilíbrio' | 'Sem Dados' = 'Sem Dados';
    let statusClass = 'text-slate-400';

    if (acos !== null) {
      if (acos <= acosTarget) {
        status = 'Rentável';
        statusClass = 'text-emerald-400';
      } else if (acos <= acosBreakeven) {
        status = 'No Limite';
        statusClass = 'text-amber-400';
      } else {
        status = 'Acima do Equilíbrio';
        statusClass = 'text-rose-400';
      }
    }

    let recommendation = '';
    if (acos !== null) {
      if (acos <= acosTarget) {
        recommendation = `Excelente! O ACoS atual (${safeToFixed(acos, 1)}%) está abaixo da meta (${safeToFixed(acosTarget, 1)}%). Você tem folga de margem. Escale gradualmente lances e orçamentos enquanto o CPC marginal continuar gerando conversões rentáveis.`;
      } else if (acos <= acosBreakeven) {
        recommendation = `Atenção: O ACoS atual (${safeToFixed(acos, 1)}%) cobre os custos variáveis da operação, mas não entrega a margem líquida desejada de ${targetMargin}%. Priorize colheita de palavras-chave vencedoras, negativação de termos desperdiçadores e otimização da Buy Box antes de elevar orçamentos.`;
      } else {
        recommendation = `Alerta Crítico: O ACoS (${safeToFixed(acos, 1)}%) superou o Breakeven (${safeToFixed(acosBreakeven, 1)}%). Cada venda atribuída consome mais em Ads do que a margem gerada. Reduza lances em termos não lucrativos imediatamente, a menos que haja um orçamento de lançamento explicitamente provisionado.`;
      }
    }
    if (skuObjective === 'launch') {
      recommendation += ' (Nota: Em fase de lançamento, aceita-se temporariamente ACoS acima do breakeven com orçamento travado e prazo de maturação para aquisição de Buy Box e BSR).';
    }

    return {
      acos,
      roas,
      tacos,
      adShare,
      acosBreakeven,
      acosTarget,
      roasMinimum,
      status,
      statusClass,
      recommendation,
    };
  }, [adSpend, adSales, totalSales, preAdMargin, targetMargin, skuObjective]);

  // ================= 3. PRICING CALCULATOR STATE =================
  const [cogs, setCogs] = useState<number>(32);
  const [pack, setPack] = useState<number>(3);
  const [logistics, setLogistics] = useState<number>(8);
  const [fixedAlloc, setFixedAlloc] = useState<number>(4);

  const [commissionRate, setCommissionRate] = useState<number>(12);
  const [taxRate, setTaxRate] = useState<number>(8);
  const [returnsRate, setReturnsRate] = useState<number>(3);
  const [promoRate, setPromoRate] = useState<number>(2);
  const [plannedTacos, setPlannedTacos] = useState<number>(10);
  const [profitTargetRate, setProfitTargetRate] = useState<number>(15);
  const [marketCompPrice, setMarketCompPrice] = useState<number>(110);

  const pricingResults = useMemo(() => {
    const totalUnitFixed = cogs + pack + logistics + fixedAlloc;
    const totalVariableRates =
      commissionRate + taxRate + returnsRate + promoRate + plannedTacos + profitTargetRate;
    const denominator = 1 - totalVariableRates / 100;

    const suggestedPrice = denominator > 0 ? totalUnitFixed / denominator : null;
    const markup = suggestedPrice && cogs > 0 ? suggestedPrice / cogs : null;

    // Se praticar o preço de mercado:
    const variableRatesWithoutProfit =
      commissionRate + taxRate + returnsRate + promoRate + plannedTacos;
    const marginAtMarketPrice =
      marketCompPrice > 0
        ? ((marketCompPrice - totalUnitFixed - (marketCompPrice * variableRatesWithoutProfit) / 100) /
            marketCompPrice) *
          100
        : null;

    const priceGap = suggestedPrice !== null ? suggestedPrice - marketCompPrice : null;

    let advice = '';
    if (suggestedPrice === null) {
      advice =
        'A soma dos percentuais variáveis atingiu 100% ou mais. Estrutura matematicamente inviável: reduza custos unitários ou reduza a meta de lucro/Ads.';
    } else if (marketCompPrice >= suggestedPrice) {
      advice = `Excelente viabilidade! O preço praticado pelo mercado (R$ ${safeToFixed(marketCompPrice, 2)}) é suficiente para cobrir todos os custos, impostos, 10% de Ads e ainda entregar a margem líquida de ${profitTargetRate}%. Há folga de ${safeToFixed(Math.abs(priceGap ?? 0), 2)} por unidade.`;
    } else {
      advice = `Alerta de Competitividade: Para entregar sua margem-alvo (${profitTargetRate}%), o preço mínimo deveria ser R$ ${safeToFixed(suggestedPrice, 2)}, mas o mercado cobra R$ ${safeToFixed(marketCompPrice, 2)} (Gap de R$ ${safeToFixed(priceGap, 2)}). Se você igualar o preço de mercado, sua margem líquida real cairá para ${safeToFixed(marginAtMarketPrice, 1)}%. Negocie CMV, mude para FBA ou ajuste custos operacionais.`;
    }

    return {
      totalUnitFixed,
      totalVariableRates,
      suggestedPrice,
      markup,
      marginAtMarketPrice,
      priceGap,
      advice,
    };
  }, [
    cogs,
    pack,
    logistics,
    fixedAlloc,
    commissionRate,
    taxRate,
    returnsRate,
    promoRate,
    plannedTacos,
    profitTargetRate,
    marketCompPrice,
  ]);

  // ================= 4. COPY 30-DAY PLAN =================
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);
  const handleCopy30DayPlan = async () => {
    const text = `PLAYBOOK DE AUDITORIA & PLANO DE 30 DIAS — BB HUB MARKET
---------------------------------------------------------------------
Fase 1 (Dias 1 a 3): Saneamento de Dados e Conciliação
- Validar fontes oficiais: Business Reports por Data e por SKU, All Orders e Relatório de Campanhas Ads.
- Neutralizar discrepâncias temporais (last-updated-date fora do mês não é venda nova).
- Deduplicar pedidos por order-id + order-item-id.

Fase 2 (Dias 4 a 7): Reconstrução de Unit Economics & Breakeven ACoS
- Mapear CMV de reposição e tarifas Amazon (Comissão por categoria, DBA regional SP 50% ou FBA).
- Calcular Margem de Contribuição pré-Ads e travar ACoS de Breakeven para os 20 produtos líderes.
- Estabelecer teto gerencial de TACoS global (6% a 10%).

Fase 3 (Dias 8 a 12): Estancamento de Desperdício em Amazon Ads
- Auditar termos de busca: identificar e negativar em correspondência exata termos com >10-15 cliques e 0 vendas.
- Isolar produtos líderes com conversão comprovada em campanhas dedicadas.
- Reduzir lances em 15% em alvos que operem acima do Breakeven ACoS.

Fase 4 (Dias 13 a 17): Otimização de Catálogo, Buy Box e Conversão (CVR)
- Auditar perda de Buy Box nos SKUs heróis e checar concorrência ou frete desfavorável.
- Enriquecer imagens principais, títulos e pontos de destaque para elevar CTR e CVR.
- Separar gargalo de anúncio (CTR) de gargalo de produto/preço (CVR).

Fase 5 (Dias 18 a 21): Governança de Estoque & Ruptura
- Checar cobertura de dias de estoque nos 10 SKUs que representam 80% do faturamento.
- Pausar imediatamente campanhas de produtos com menos de 7 dias de estoque para evitar ruptura severa e queda de BSR.
- Liquidar estoque antigo ou parado para liberar capital de giro e estancar tarifas de armazenagem prolongada.

Fase 6 (Dias 22 a 25): Priorização das 5 Ações de Maior Impacto em Caixa
- Matriz Impacto Financeiro (R$) x Esforço x Confiança.
- Selecionar 5 ações executáveis com dono e indicador de sucesso.

Fase 7 (Dias 26 a 30): Implementação, Medição e Governança Mensal
- Implementar ajustes, registrar baseline métrico e agendar ciclo quinzenal de revisão de TACoS.
`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Navigation Sub-Tabs */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Laboratório de Auditoria, Precificação & Governança Marketplace</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              <span>Auditoria Metodológica & Simuladores de Decisão</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
              Checklist de maturidade, calculadoras de equilíbrio de Ads, formação de preço por margem-alvo e playbook
            </p>
          </div>

          {/* Sub-Tabs Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#0f1a2d] border border-[#243554] rounded-xl self-start lg:self-auto">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSubTab === 'overview'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e2f4a]'
              }`}
            >
              1. Fontes & Dicionário
            </button>
            <button
              onClick={() => setActiveSubTab('checklist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'checklist'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e2f4a]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>2. Checklist de Maturidade ({maturityScore}/100)</span>
            </button>
            <button
              onClick={() => setActiveSubTab('ads_calc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'ads_calc'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e2f4a]'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>3. Metas de Ads & Equilíbrio</span>
            </button>
            <button
              onClick={() => setActiveSubTab('pricing_calc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'pricing_calc'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e2f4a]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>4. Precificação por Margem</span>
            </button>
            <button
              onClick={() => setActiveSubTab('playbook')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'playbook'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e2f4a]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>5. Árvore & Playbook 30D</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: OVERVIEW & INVENTÁRIO ================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Tabela de 7 Blocos de Dados do Seller Central */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#243554] flex flex-wrap items-center justify-between gap-3 bg-[#111c30]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Mapa Mestre dos 7 Blocos de Dados Necessários (Seller Central + Ads)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Relação de relatórios oficiais para auditoria completa sem lacunas contábeis ou comerciais
                </p>
              </div>
              <span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/40">
                Padrão Auditoria Amazon BR
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Bloco</th>
                    <th className="py-3 px-3.5">Relatório Oficial / Caminho</th>
                    <th className="py-3 px-3.5">Diagnóstico Fornecido</th>
                    <th className="py-3 px-3.5">Chave de Junção</th>
                    <th className="py-3 px-3.5">Periodicidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a]">
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">1. Vendas & Tráfego</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">Business Reports (por data e por ASIN)</td>
                    <td className="py-3 px-3.5">Sessões, conversão (CVR), unidades pedidas, vendas e % de Buy Box</td>
                    <td className="py-3 px-3.5 font-mono text-slate-300">ASIN / SKU + Data</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-bold">Diário / Semanal</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">2. Publicidade (Ads)</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">Campanhas, Termos de Pesquisa e Produtos Anunciados</td>
                    <td className="py-3 px-3.5">Impressões, CTR, CPC, gasto, ACoS, ROAS e termos sem conversão</td>
                    <td className="py-3 px-3.5 font-mono text-slate-300">Campanha / Termo</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-bold">Semanal (7-14 dias)</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">3. Financeiro & Repasse</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">Relatórios de Pagamento (Transações por intervalo)</td>
                    <td className="py-3 px-3.5">Comissão líquida, taxas FBA/DBA, reembolsos reais e saldo bancário</td>
                    <td className="py-3 px-3.5 font-mono text-slate-300">Order ID + SKU</td>
                    <td className="py-3 px-3.5 text-amber-400 font-bold">Quinzenal / Mensal</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">4. Pedidos & Status</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">Todos os Pedidos (Data da Compra)</td>
                    <td className="py-3 px-3.5">Receita realizada (Shipped), não realizada (Pending), canal FBA/DBA</td>
                    <td className="py-3 px-3.5 font-mono text-slate-300">Amazon Order ID</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-bold">Semanal / Mensal</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">5. Estoque & FBA</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">Gerenciar Estoque FBA / Estado do Inventário</td>
                    <td className="py-3 px-3.5">Dias de cobertura, risco de ruptura, estoque parado e tarifas extras</td>
                    <td className="py-3 px-3.5 font-mono text-slate-300">FNSKU / SKU / ASIN</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-bold">Semanal</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">6. Devoluções & Avarias</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">Relatório de Devoluções de Clientes FBA/FBM</td>
                    <td className="py-3 px-3.5">Taxa de devolução por SKU, motivos do comprador e condição do item</td>
                    <td className="py-3 px-3.5 font-mono text-slate-300">Order ID + SKU</td>
                    <td className="py-3 px-3.5 text-amber-400 font-bold">Mensal</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">7. Custos Internos (Fora Amazon)</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">ERP do Seller / Planilha Fiscal</td>
                    <td className="py-3 px-3.5">CMV unitário, tributos (Simples/Lucro Presumido), embalagem e rateio fixo</td>
                    <td className="py-3 px-3.5 font-mono text-slate-300">Seller SKU</td>
                    <td className="py-3 px-3.5 text-cyan-400 font-bold">Mensal / Reposição</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Arquivos Auditados na Sessão Atual */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#243554] flex items-center justify-between bg-[#111c30]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Inventário da Sessão Atual: Arquivos Reconciliados
              </h3>
              <span className="text-xs text-cyan-300 font-bold bg-[#0f1a2d] px-3 py-1 rounded-lg border border-[#1e2f4a]">
                {auditFiles.length} Arquivos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Fonte / Arquivo</th>
                    <th className="py-3 px-3.5">Tipo Detectado</th>
                    <th className="py-3 px-3.5">Granularidade</th>
                    <th className="py-3 px-3.5">Uso Oficial no Dashboard</th>
                    <th className="py-3 px-3.5">Limitações Técnicas & Cuidados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a]">
                  {auditFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Nenhum arquivo carregado na sessão atual. Inicie uma nova análise ou ative o modo demonstração.
                      </td>
                    </tr>
                  ) : (
                    auditFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-[#1a2b47] transition">
                        <td className="py-3 px-3.5 font-bold text-white">
                          <p className="truncate max-w-[200px]" title={file.name}>{file.name}</p>
                          <span className="text-xs text-slate-400 font-mono font-normal">{file.rowCount} linhas</span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0f1a2d] text-amber-300 border border-[#1e2f4a]">
                            {file.typeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-300 font-mono text-xs">{file.granularity}</td>
                        <td className="py-3 px-3.5 text-emerald-400 font-bold max-w-xs">{file.officialUse}</td>
                        <td className="py-3 px-3.5 text-slate-300 text-xs max-w-xs leading-relaxed">{file.limitations}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dicionário Oficial */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Dicionário Oficial de Fórmulas e Regras BB Hub Market</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
              <div className="p-4 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a] space-y-1.5 shadow-inner">
                <span className="font-bold text-amber-300 text-sm">TACOS (Total Advertising Cost of Sales)</span>
                <p className="font-mono text-xs text-slate-200">Gasto Ads ÷ Faturamento Total da Loja × 100</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Faixas gerenciais: 6% a 10% (Desejado/Excelente); 10% a 12% (Atenção); Acima de 12% (Acima do teto gerencial).
                </p>
              </div>

              <div className="p-4 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a] space-y-1.5 shadow-inner">
                <span className="font-bold text-emerald-400 text-sm">ACOS vs ROAS (Relação Inversa)</span>
                <p className="font-mono text-xs text-slate-200">ACOS = Gasto ÷ Vendas Ads × 100 | ROAS = Vendas Ads ÷ Gasto</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  São duas leituras do mesmo par numérico. Sempre condicionado à margem real e estritamente abaixo do ACOS de Breakeven.
                </p>
              </div>

              <div className="p-4 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a] space-y-1.5 shadow-inner">
                <span className="font-bold text-cyan-300 text-sm">ACOS de Breakeven por SKU</span>
                <p className="font-mono text-xs text-slate-200">Margem de Contribuição antes de Ads ÷ Preço (PMV) × 100</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ponto em que o lucro da publicidade empata com o custo variável. Se o ACOS ultrapassar essa marca, o produto dá prejuízo.
                </p>
              </div>

              <div className="p-4 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a] space-y-1.5 shadow-inner">
                <span className="font-bold text-rose-300 text-sm">Gasto sob Investigação (10 a 15 cliques)</span>
                <p className="font-mono text-xs text-slate-200">Termos com 10-15 cliques e 0 conversão atribuída</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Colocado em revisão semanal. Não classificar precipitadamente como desperdício garantido sem checar janela de 7-14 dias da Amazon.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CHECKLIST DE MATURIDADE ================= */}
      {activeSubTab === 'checklist' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Score Ring & Ações Prioritárias */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <div className={`p-6 rounded-2xl border shadow-xl ${maturityClassification.bg}`}>
              <div className="text-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Pontuação de Maturidade da Conta
                </span>

                {/* SVG Progress Ring */}
                <div className="relative w-40 h-40 mx-auto my-4 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-[#1e2f4a]"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-cyan-400 transition-all duration-700 ease-out"
                      strokeWidth="10"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * maturityScore) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-white">{maturityScore}</span>
                    <span className="text-xs text-slate-400 font-bold">/ 100 pts</span>
                  </div>
                </div>

                <h3 className={`text-base font-black ${maturityClassification.color}`}>
                  {maturityClassification.label}
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {maturityClassification.hint}
                </p>
              </div>

              {/* Ações Prioritárias */}
              <div className="mt-5 pt-4 border-t border-[#243554] space-y-2">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                  Top 3 Frentes de Menor Maturidade:
                </span>
                {topPriorityActions.length === 0 ? (
                  <p className="text-xs text-emerald-300 font-bold">
                    ✓ Parabéns! Todos os 24 critérios foram atendidos na conta.
                  </p>
                ) : (
                  topPriorityActions.map((act, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-bold text-white truncate max-w-[190px]">
                        {act.name}
                      </span>
                      <span className="text-amber-400 font-mono font-black text-[11px] shrink-0">
                        {act.checkedCount}/{act.total} ({Math.round(act.completion * 100)}%)
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 pt-2">
                <button
                  onClick={handleExportChecklistCsv}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0f1a2d] hover:bg-[#1a2b47] border border-cyan-500/40 text-cyan-300 font-bold text-xs transition cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Checklist em CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Grupos de Auditoria com Checkboxes */}
          <div className="lg:col-span-8 space-y-5">
            {CHECKLIST_GROUPS.map((group, gIdx) => {
              const groupTotalItems = group.items.length;
              const groupCheckedCount = group.items.filter(
                (_, iIdx) => checkedItems[`c-${gIdx}-${iIdx}`]
              ).length;
              const groupDone = groupCheckedCount === groupTotalItems;

              return (
                <div
                  key={gIdx}
                  className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#243554]">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        {group.name}
                      </h3>
                      <span className="text-xs text-slate-400">
                        Peso: {group.weight} pontos • Concluído: {groupCheckedCount}/{groupTotalItems}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        groupDone
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-[#0f1a2d] text-slate-400 border-[#1e2f4a]'
                      }`}
                    >
                      {groupDone ? '100% Concluído' : `${Math.round((groupCheckedCount / groupTotalItems) * 100)}%`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((it, iIdx) => {
                      const id = `c-${gIdx}-${iIdx}`;
                      const isChecked = !!checkedItems[id];
                      return (
                        <label
                          key={id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                              : 'bg-[#0f1a2d] border-[#1e2f4a] hover:bg-[#182740] text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(id)}
                            className="mt-0.5 w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-slate-700 cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-white block">
                              {it[0]}
                            </span>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {it[1]}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: CALCULADORA DE METAS ADS ================= */}
      {activeSubTab === 'ads_calc' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Painel de Inputs da Simulação */}
            <div className="lg:col-span-7 bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#243554]">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-400" />
                    <span>Calculadora de Equilíbrio & Metas Econômicas</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    O ACoS aceitável nasce exclusivamente da margem disponível e da meta de lucro
                  </p>
                </div>

                <button
                  onClick={handlePullAccountData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs transition cursor-pointer"
                  title="Carregar métricas reais da conta auditada na sessão atual"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Puxar Dados da Conta Atual</span>
                </button>
              </div>

              {/* Grid de Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Investimento em Ads no Período (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adSpend}
                    onChange={(e) => setAdSpend(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Gasto consolidado em publicidade</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Vendas Atribuídas de Ads (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adSales}
                    onChange={(e) => setAdSales(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Receita atribuída (janela 7-14 dias)</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Vendas Totais da Loja / SKU (R$):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={totalSales}
                    onChange={(e) => setTotalSales(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Base para o cálculo do TACoS</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Margem de Contribuição pré-Ads (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={preAdMargin}
                    onChange={(e) => setPreAdMargin(Number(e.target.value))}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold text-amber-300"
                  />
                  <span className="text-[10px] text-slate-400">Define o Breakeven ACoS (Ponto de Empate)</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Margem Líquida Desejada (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold text-emerald-400"
                  />
                  <span className="text-[10px] text-slate-400">Lucro limpo desejado após todas as despesas</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Objetivo Estratégico do SKU:
                  </label>
                  <select
                    value={skuObjective}
                    onChange={(e) => setSkuObjective(e.target.value as any)}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="profit">Rentabilidade (SKU Maduro / Foco em Caixa)</option>
                    <option value="growth">Crescimento Controlado (Ganho de Posição)</option>
                    <option value="launch">Lançamento (Ganho de Relevância / BSR)</option>
                    <option value="defense">Defesa de Marca (Proteger Buy Box)</option>
                  </select>
                  <span className="text-[10px] text-slate-400">Orienta a interpretação da meta</span>
                </div>
              </div>

              {/* Grid de Resultados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#243554]">
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-[#1e2f4a]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">ACoS Atual</span>
                  <span className="text-xl font-black text-white font-mono">
                    {adsCalculations.acos !== null ? `${safeToFixed(adsCalculations.acos, 1)}%` : 'N/D'}
                  </span>
                </div>
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-[#1e2f4a]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">ROAS Atual</span>
                  <span className="text-xl font-black text-white font-mono">
                    {adsCalculations.roas !== null ? `${safeToFixed(adsCalculations.roas, 2)}x` : 'N/D'}
                  </span>
                </div>
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-[#1e2f4a]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">TACoS Atual</span>
                  <span className="text-xl font-black text-cyan-300 font-mono">
                    {adsCalculations.tacos !== null ? `${safeToFixed(adsCalculations.tacos, 1)}%` : 'N/D'}
                  </span>
                </div>
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-[#1e2f4a]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Vendas via Ads</span>
                  <span className="text-xl font-black text-white font-mono">
                    {adsCalculations.adShare !== null ? `${safeToFixed(adsCalculations.adShare, 1)}%` : 'N/D'}
                  </span>
                </div>
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-amber-500/30">
                  <span className="text-[10px] text-amber-300 uppercase font-bold block">ACoS Equilíbrio</span>
                  <span className="text-xl font-black text-amber-300 font-mono">
                    {safeToFixed(adsCalculations.acosBreakeven, 1)}%
                  </span>
                </div>
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">ACoS Meta</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {safeToFixed(adsCalculations.acosTarget, 1)}%
                  </span>
                </div>
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-[#1e2f4a]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">ROAS Mínimo</span>
                  <span className="text-xl font-black text-white font-mono">
                    {adsCalculations.roasMinimum !== null ? `${safeToFixed(adsCalculations.roasMinimum, 2)}x` : 'N/D'}
                  </span>
                </div>
                <div className="bg-[#0f1a2d] p-3 rounded-xl border border-[#1e2f4a]">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Operacional</span>
                  <span className={`text-base font-black ${adsCalculations.statusClass}`}>
                    {adsCalculations.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Painel Gráfico Comparativo & Recomendação */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                  Comparação Visual: Atual vs Meta vs Breakeven
                </h4>

                {/* SVG Bar Chart */}
                <div className="bg-[#0f1a2d] p-4 rounded-xl border border-[#1e2f4a] space-y-3">
                  {/* Barra ACoS Atual */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-300">ACoS Atual</span>
                      <span className="text-white font-mono">{adsCalculations.acos?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="h-5 bg-[#152238] rounded-full overflow-hidden border border-[#243554]">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (adsCalculations.acos || 0) <= adsCalculations.acosTarget
                            ? 'bg-emerald-500'
                            : (adsCalculations.acos || 0) <= adsCalculations.acosBreakeven
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, ((adsCalculations.acos || 0) / Math.max(50, adsCalculations.acosBreakeven * 1.3)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Barra ACoS Meta */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-emerald-400">ACoS Meta (com {targetMargin}% Lucro)</span>
                      <span className="text-emerald-400 font-mono">{safeToFixed(adsCalculations.acosTarget, 1)}%</span>
                    </div>
                    <div className="h-5 bg-[#152238] rounded-full overflow-hidden border border-[#243554]">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (adsCalculations.acosTarget / Math.max(50, adsCalculations.acosBreakeven * 1.3)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Barra ACoS Breakeven */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-amber-300">ACoS Breakeven (Teto de Empate)</span>
                      <span className="text-amber-300 font-mono">{safeToFixed(adsCalculations.acosBreakeven, 1)}%</span>
                    </div>
                    <div className="h-5 bg-[#152238] rounded-full overflow-hidden border border-[#243554]">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (adsCalculations.acosBreakeven / Math.max(50, adsCalculations.acosBreakeven * 1.3)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-xs text-slate-200 space-y-1.5">
                  <span className="font-bold text-cyan-300 text-sm block">Diagnóstico do Consultor:</span>
                  <p className="leading-relaxed">{adsCalculations.recommendation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Régua Gerencial de Políticas Internas */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#243554] bg-[#111c30]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Régua Gerencial de Decisão por Estágio do Produto
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Diretrizes de consultoria para tomada de decisão entre volume e preservação de caixa
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Contexto / Estágio</th>
                    <th className="py-3 px-3.5">ACoS Aceitável</th>
                    <th className="py-3 px-3.5">TACoS Operacional</th>
                    <th className="py-3 px-3.5">Margem Líquida Esperada</th>
                    <th className="py-3 px-3.5">Decisão Estratégica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a]">
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">SKU Maduro / Rentabilidade</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-bold">60% a 80% do Breakeven</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">5% a 10%</td>
                    <td className="py-3 px-3.5 text-emerald-300">15% a 20% como meta saudável</td>
                    <td className="py-3 px-3.5 text-slate-300">Escalar apenas enquanto o lucro marginal continuar crescente.</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">Crescimento Controlado</td>
                    <td className="py-3 px-3.5 text-amber-300 font-bold">80% a 100% do Breakeven</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">10% a 15%</td>
                    <td className="py-3 px-3.5 text-slate-300">10% a 12% como piso gerencial</td>
                    <td className="py-3 px-3.5 text-slate-300">Aceitar lucro menor com prazo definido em troca de tração orgânica.</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white">Lançamento de Produto</td>
                    <td className="py-3 px-3.5 text-rose-300 font-bold">Pode superar o Breakeven (temporário)</td>
                    <td className="py-3 px-3.5 text-cyan-300 font-mono">15% a 25%+</td>
                    <td className="py-3 px-3.5 text-slate-300">Pode ser nula/negativa por prazo fixo</td>
                    <td className="py-3 px-3.5 text-slate-300">Exige orçamento provisionado, prazo de 30-45 dias e ganho de BSR.</td>
                  </tr>
                  <tr className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-rose-400">Zona de Risco / Erosão</td>
                    <td className="py-3 px-3.5 text-rose-400 font-bold">Acima do Breakeven sem justificativa</td>
                    <td className="py-3 px-3.5 text-rose-400 font-mono">Crescente com vendas estagnadas</td>
                    <td className="py-3 px-3.5 text-rose-300">Abaixo de 5% ou negativo</td>
                    <td className="py-3 px-3.5 text-rose-300">Estancar imediatamente: negativar termos, revisar preço e PDP.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CALCULADORA DE PRECIFICAÇÃO ================= */}
      {activeSubTab === 'pricing_calc' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Inputs de Custos e Alíquotas */}
            <div className="lg:col-span-7 bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-5">
              <div className="pb-3 border-b border-[#243554]">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-cyan-400" />
                  <span>Precificação por Margem-Alvo (Markup Divisor)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Calcula o preço necessário para cobrir custos fixos e alíquotas percentuais sobre a venda final
                </p>
              </div>

              {/* Custos Fixos Unitários */}
              <div>
                <span className="text-xs font-black uppercase text-cyan-400 tracking-wider block mb-2">
                  1. Custos Unitários Fixos em Moeda (R$):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">CMV / Produto (R$):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cogs}
                      onChange={(e) => setCogs(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Embalagem (R$):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pack}
                      onChange={(e) => setPack(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Logística / Frete (R$):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={logistics}
                      onChange={(e) => setLogistics(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Rateio Fixo (R$):</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={fixedAlloc}
                      onChange={(e) => setFixedAlloc(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Alíquotas Percentuais sobre a Venda */}
              <div>
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider block mb-2">
                  2. Alíquotas Variáveis sobre o Preço Final (%):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Comissão Amazon (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Imposto Venda (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Provisão Devoluções (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={returnsRate}
                      onChange={(e) => setReturnsRate(Number(e.target.value))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Cupons / Promoções (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={promoRate}
                      onChange={(e) => setPromoRate(Number(e.target.value))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">TACoS Planejado (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={plannedTacos}
                      onChange={(e) => setPlannedTacos(Number(e.target.value))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold text-cyan-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Lucro Líquido Alvo (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={profitTargetRate}
                      onChange={(e) => setProfitTargetRate(Number(e.target.value))}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Preço de Mercado / Concorrentes */}
              <div className="pt-2 border-t border-[#243554]">
                <label className="block text-slate-300 font-bold mb-1 text-xs">
                  Preço Praticado pelo Mercado / Concorrência (R$):
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={marketCompPrice}
                  onChange={(e) => setMarketCompPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full sm:w-1/2 bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Utilize para confrontar se a estrutura de custos do seller cabe no preço do Buy Box
                </span>
              </div>
            </div>

            {/* Painel de Resultados do Preço */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-5">
                <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                  Resultado da Precificação
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0f1a2d] border border-emerald-500/40 col-span-2">
                    <span className="text-[11px] text-emerald-400 uppercase font-black block">
                      Preço Mínimo Sugerido
                    </span>
                    <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                      {pricingResults.suggestedPrice !== null
                        ? `R$ ${safeToFixed(pricingResults.suggestedPrice, 2)}`
                        : 'Inviável'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Garante todos os custos + {plannedTacos}% Ads + {profitTargetRate}% Lucro Limpo
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Markup Multiplicador
                    </span>
                    <span className="text-lg font-black text-cyan-300 font-mono">
                      {pricingResults.markup !== null ? `${safeToFixed(pricingResults.markup, 2)}x` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Preço ÷ CMV</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a]">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Margem no Preço Mercado
                    </span>
                    <span
                      className={`text-lg font-black font-mono ${
                        (pricingResults.marginAtMarketPrice || 0) >= profitTargetRate
                          ? 'text-emerald-400'
                          : (pricingResults.marginAtMarketPrice || 0) > 0
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {pricingResults.marginAtMarketPrice !== null
                        ? `${safeToFixed(pricingResults.marginAtMarketPrice, 1)}%`
                        : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Se cobrar R$ {safeToFixed(marketCompPrice, 2)}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Gap Competitivo frente ao Mercado
                    </span>
                    <span
                      className={`text-lg font-black font-mono ${
                        (pricingResults.priceGap || 0) <= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pricingResults.priceGap !== null
                        ? `${(pricingResults.priceGap ?? 0) > 0 ? '+' : ''}R$ ${safeToFixed(pricingResults.priceGap, 2)}`
                        : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {(pricingResults.priceGap || 0) <= 0
                        ? 'Seu preço necessário é menor ou igual ao mercado (Vantagem competitiva)'
                        : 'Seu preço necessário está acima do mercado (Risco de Buy Box)'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0f1a2d] border border-cyan-500/30 text-xs text-slate-200 leading-relaxed">
                  <strong className="text-cyan-300 block mb-1">Análise de Viabilidade:</strong>
                  {pricingResults.advice}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: ÁRVORE & PLAYBOOK 30D ================= */}
      {activeSubTab === 'playbook' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Árvore de Diagnóstico de Causa Raiz */}
            <div className="lg:col-span-7 bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-[#243554] bg-[#111c30]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Árvore de Diagnóstico de Causa Raiz (Funil Amazon)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Separe causa de efeito antes de realizar qualquer alteração em campanhas ou preços
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">Sintoma Observado</th>
                      <th className="py-3 px-3.5">Causa Raiz Mais Provável</th>
                      <th className="py-3 px-3.5">Ação Corretiva Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2f4a]">
                    <tr className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-amber-300">1. Impressões Baixas</td>
                      <td className="py-3 px-3.5 text-slate-300">
                        Perda da Buy Box, indexação fraca no catálogo ou lances abaixo do leilão competitivo.
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">
                        Checar elegibilidade da Buy Box, enriquecer termos no backend e testar aumento gradual de lances (+10%).
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-amber-300">2. CTR Baixo (&lt; 0,3%)</td>
                      <td className="py-3 px-3.5 text-slate-300">
                        Imagem principal pouco atraente, título confuso, preço desalinhado ou poucas avaliações.
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">
                        Otimizar foto principal, revisar título nos primeiros 60 caracteres e segmentar apenas termos de alta intenção.
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-amber-300">3. Conversão Baixa (CVR)</td>
                      <td className="py-3 px-3.5 text-slate-300">
                        Página do produto (PDP) incompleta, frete longo/caro (sem Prime), fotos secundárias fracas ou avaliações negativas.
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">
                        Migrar para FBA/DBA com frete rápido, enriquecer descrição/A+ e nunca aumentar lances em anúncio que não converte.
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-rose-300">4. ACoS Elevado</td>
                      <td className="py-3 px-3.5 text-slate-300">
                        CPC inflacionado em palavras genéricas ou termos que acumulam cliques sem vendas.
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">
                        Negativar termos com mais de 10-15 cliques e zero vendas em correspondência exata e reduzir lances em alvos com ACoS &gt; Breakeven.
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-rose-300">5. ACoS Cai, mas TACoS Sobe</td>
                      <td className="py-3 px-3.5 text-slate-300">
                        Erosão de vendas orgânicas. A loja está ficando excessivamente dependente de mídia paga para sustentar volume.
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">
                        Revisar posicionamento orgânico (BSR), ruptura de estoque prévia, preço relativo e recomprar tráfego orgânico com SEO.
                      </td>
                    </tr>
                    <tr className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-rose-300">6. Venda Sobe, Lucro Cai</td>
                      <td className="py-3 px-3.5 text-slate-300">
                        Canibalização por produtos de baixa margem, cupons excessivos, tarifas extras de armazenagem ou gasto descontrolado em Ads.
                      </td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">
                        Auditar P&L individual por SKU, desativar promoções que destroem a margem de contribuição e focar nos produtos líderes.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Playbook de 30 Dias */}
            <div className="lg:col-span-5 bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#243554]">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    <span>Playbook de Auditoria em 30 Dias</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cronograma de execução profissional para diagnóstico e recuperação de conta
                  </p>
                </div>

                <button
                  onClick={handleCopy30DayPlan}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow"
                >
                  {copiedPlan ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPlan ? 'Copiado!' : 'Copiar Plano'}</span>
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">Dias 1 a 3: Saneamento de Dados</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fase 1</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Reconciliar relatórios oficiais, validar integridade temporal e deduplicar pedidos por Item ID.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">Dias 4 a 7: Reconstrução de Unit Economics</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fase 2</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mapear CMV, tarifas Amazon e fixar Breakeven ACoS e teto de TACoS global para a conta.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">Dias 8 a 12: Estancamento de Desperdício em Ads</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fase 3</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Negativar termos com &gt;10 cliques sem conversão e reduzir lances em campanhas que operam no prejuízo.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">Dias 13 a 17: Otimização de Catálogo & Buy Box</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fase 4</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Auditar perda de Buy Box nos heróis e melhorar imagens principais e títulos para elevar CTR e CVR.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">Dias 18 a 21: Governança de Estoque & FBA</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fase 5</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pausar anúncios de SKUs com menos de 7 dias de cobertura para prevenir ruptura severa de ranking.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300">Dias 22 a 25: Priorização de 5 Ações de Caixa</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fase 6</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Matriz Impacto x Esforço: selecionar 5 iniciativas com maior retorno financeiro comprovado.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#0f1a2d] border border-[#1e2f4a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">Dias 26 a 30: Implementação & Rotina Mensal</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fase 7</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Documentar baseline, rodar auditoria quinzenal e apresentar P&L gerencial ao cliente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
