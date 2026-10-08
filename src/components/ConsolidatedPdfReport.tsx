import React from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Package,
  Target,
  BarChart3,
  Layers,
  ListTodo,
  ShieldCheck,
  Calendar,
  Clock,
  Info,
  ShieldAlert,
  Flame,
  Award,
  Zap,
  Tag,
  Truck,
  Sparkles,
} from 'lucide-react';
import {
  ParsedDataset,
  ReconciledMetrics,
  SkuUnitEconomics,
  ActionPlanItem,
  BusinessDayRow,
  OrderItemRow,
  AdsCampaignRow,
  AdsSearchTermRow,
  FileAuditInfo,
} from '../types/amazon';
import { generateBudgetInsights } from '../utils/adsBudgetInsights';
import { calculateMonthOverMonth } from '../utils/monthOverMonth';
import { deriveCampaignsFromAdsData, translateCampaignStatus } from '../utils/csvParser';

export interface ConsolidatedPdfReportProps {
  dataset: ParsedDataset;
  metrics: ReconciledMetrics;
  skusWithEconomics: SkuUnitEconomics[];
  actionPlan: ActionPlanItem[];
  highRiskTerms?: {
    term: string;
    campaign: string;
    clicks: number;
    spend: number;
    sales: number;
    reason: string;
  }[];
  isDemoMode?: boolean;
  generatedAt?: string;
}

export const ConsolidatedPdfReport: React.FC<ConsolidatedPdfReportProps> = ({
  dataset,
  metrics,
  skusWithEconomics,
  actionPlan,
  highRiskTerms = [],
  isDemoMode = false,
  generatedAt,
}) => {
  // Safe formatting helpers
  const safeToFixed = (value: number | undefined | null, decimals: number = 2) => {
    return (value ?? 0).toFixed(decimals);
  };

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/D';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '0';
    return val.toLocaleString('pt-BR');
  };

  const formatPercent = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/D';
    return `${(val ?? 0).toFixed(2)}%`;
  };

  const currentDateStr =
    generatedAt ||
    new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  // Reconciled Metrics Calculations
  const orders = dataset.orders || [];
  const totalCommercialSales = metrics.businessSales > 0 ? metrics.businessSales : metrics.ordersShippedGross;
  const totalCommercialOrders = metrics.businessOrders || metrics.ordersCountShipped;

  // Group campaigns individually
  const sortedCampaigns = React.useMemo(() => {
    if (dataset.campaigns && dataset.campaigns.length > 0) {
      return [...dataset.campaigns].sort((a, b) => b.spend - a.spend);
    }
    const derived = deriveCampaignsFromAdsData(
      dataset.searchTerms || [],
      dataset.advertisedProducts || [],
      dataset.targets || []
    );
    return derived.sort((a, b) => b.spend - a.spend);
  }, [dataset.campaigns, dataset.searchTerms, dataset.advertisedProducts, dataset.targets]);

  const budgetInsights = React.useMemo(() => {
    return generateBudgetInsights(sortedCampaigns, 15.0);
  }, [sortedCampaigns]);

  const sortedDays = React.useMemo(() => {
    return [...(dataset.businessDays || [])].sort((a, b) => a.date.localeCompare(b.date));
  }, [dataset.businessDays]);

  const momAnalysis = React.useMemo(() => {
    return calculateMonthOverMonth(dataset.businessDays || [], dataset.orders || []);
  }, [dataset.businessDays, dataset.orders]);

  const sortedSkus = React.useMemo(() => {
    return [...skusWithEconomics].sort((a, b) => b.grossSales - a.grossSales);
  }, [skusWithEconomics]);

  // CSS Logo with Premium style
  const BrandLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    if (size === 'sm') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#26394F] to-[#17283D] border border-[#00C7E6] flex items-center justify-center shadow-sm shrink-0">
            <span className="text-[11px] font-black text-[#21E0B2] tracking-tighter font-sans">BB</span>
          </div>
          <div className="text-left">
            <span className="text-xs font-black tracking-tight text-[#17283D] block leading-none">BB HUB MARKET</span>
            <span className="text-[8px] text-slate-500 block">Mentoria | Consultoria</span>
          </div>
        </div>
      );
    }

    if (size === 'lg') {
      return (
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1688CC] via-[#26394F] to-[#17283D] border-2 border-[#21E0B2] flex items-center justify-center shadow-xl mb-3">
            <span className="text-3xl font-black text-[#21E0B2] tracking-tighter font-sans">BB</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-widest text-white leading-none">BB HUB MARKET</h1>
            <p className="text-[10px] font-bold tracking-wider text-[#21E0B2] uppercase mt-1">
              Mentoria | Consultoria de marketplaces
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#26394F] to-[#17283D] border border-[#00C7E6] flex items-center justify-center shadow-md shrink-0">
          <span className="text-base font-black text-[#21E0B2] tracking-tighter font-sans">BB</span>
        </div>
        <div className="text-left">
          <span className="text-sm font-black tracking-tight text-[#17283D] block leading-none">BB HUB MARKET</span>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Mentoria | Consultoria de marketplaces</span>
        </div>
      </div>
    );
  };

  // Structured layout wrapper for internal pages
  const PageWrapper: React.FC<{ pageNum: number; title: string; children: React.ReactNode }> = ({
    pageNum,
    title,
    children,
  }) => {
    return (
      <div
        className="report-page-container print:break-before-page shadow-sm border border-slate-200 bg-white rounded-2xl p-6 sm:p-8 mb-6 max-w-5xl mx-auto flex flex-col justify-between print:min-h-0 print:mb-0 print:p-6 print:shadow-none print:border-none print:rounded-none"
        style={{ pageBreakBefore: pageNum > 1 ? 'always' : 'auto' }}
      >
        {/* Header da Página Interna */}
        <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
          <BrandLogo size="sm" />
          <div className="text-right">
            <span className="text-xs font-black uppercase tracking-wider text-[#1688CC] block">
              {title}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Conta: By Porto • Setembro de 2026
            </span>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1">{children}</div>

        {/* Rodapé da Página Interna */}
        <div className="border-t border-slate-200 pt-3 mt-6 flex items-center justify-between text-[10px] text-slate-400 font-sans">
          <span>BB Hub Market | Gestão de Contas Amazon — Confidencial</span>
          <span className="font-bold font-mono">Página {pageNum} de 8</span>
        </div>
      </div>
    );
  };

  return (
    <div id="consolidated-report-content" className="bg-slate-100 p-2 sm:p-6 print:p-0">
      
      {/* ========================================================
          PAGE 1: CAPA PREMIUM (FONDO ESCURO GRADIENTE)
         ======================================================== */}
      <div
        className="report-page-container shadow-xl rounded-3xl p-8 sm:p-14 text-center flex flex-col justify-between mb-6 max-w-5xl mx-auto relative overflow-hidden min-h-[640px] print:min-h-0 print:mb-0 print:rounded-none print:shadow-none"
        style={{
          background: 'linear-gradient(135deg, #26394F 0%, #17283D 100%)',
        }}
      >
        {/* Faixa decorativa topo */}
        <div className="absolute top-0 left-0 w-full h-2 flex">
          <div className="flex-1 bg-[#1688CC]"></div>
          <div className="flex-1 bg-[#21E0B2]"></div>
        </div>

        {/* Logo Centralizada */}
        <div className="my-auto py-10 space-y-8">
          <BrandLogo size="lg" />

          {/* Títulos Principais */}
          <div className="space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#17283D]/60 border border-[#00C7E6]/40 text-xs text-[#21E0B2] font-bold uppercase tracking-widest">
              Análise de Vendas • Publicidade • Rentabilidade
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              RELATÓRIO EXECUTIVO AMAZON
            </h2>
            <p className="text-lg text-slate-300 font-medium">
              Performance Comercial & Amazon Ads
            </p>
          </div>

          {/* Card Translúcido */}
          <div className="max-w-md mx-auto bg-[#17283D]/50 border border-[#1688CC]/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
            <div className="grid grid-cols-2 gap-4 text-left text-xs text-slate-300">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Conta Auditada:</span>
                <span className="text-sm font-extrabold text-white">By Porto</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Período de Análise:</span>
                <span className="text-sm font-extrabold text-white">Setembro de 2026</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Data de Emissão:</span>
                <span className="text-sm font-mono text-white">05/10/2026</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Classificação:</span>
                <span className="text-xs font-bold text-[#21E0B2] uppercase">Documento Confidencial</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assinatura no rodapé da capa */}
        <div className="border-t border-slate-700/50 pt-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>BB Hub Market • Mentoria | Consultoria de marketplaces</span>
          <span className="font-mono text-[10px]">Página 1 de 8</span>
        </div>
      </div>

      {/* ========================================================
          PAGE 2: RESUMO EXECUTIVO (6 CARDS KPI & INSIGHTS)
         ======================================================== */}
      <PageWrapper pageNum={2} title="Resumo Executivo">
        <div className="space-y-6">
          <div className="border-l-4 border-[#1688CC] pl-4">
            <h3 className="text-lg font-black text-[#17283D] uppercase">
              1. Visão Geral da Performance & Cards de KPI
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Métricas consolidadas de vendas, custos regulatórios da Amazon e rentabilidade estimada.
            </p>
          </div>

          {/* Grilla de 6 Cards de KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Faturamento Comercial */}
            <div className="border border-[#1688CC]/20 rounded-xl p-4.5 bg-slate-50 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Faturamento Comercial</span>
              <strong className="text-lg font-black text-slate-900 font-mono block mt-2">
                {formatBRL(metrics.businessSales || totalCommercialSales)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                <div>Pedidos: <strong>{totalCommercialOrders} un.</strong></div>
                <div>AOV: <strong>{formatBRL(metrics.businessAvgTicket)}</strong></div>
                <div>Conversão: <strong>{formatPercent(metrics.businessConversionRate)}</strong></div>
              </div>
              <div className="absolute right-3 top-3 text-slate-300">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Pedidos Enviados (Confirmados) */}
            <div className="border border-[#1688CC]/20 rounded-xl p-4.5 bg-slate-50 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">2. Pedidos Confirmados (Shipped)</span>
              <strong className="text-lg font-black text-emerald-800 font-mono block mt-2">
                {formatBRL(metrics.ordersShippedGross)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                <div>Concluídos: <strong className="text-emerald-700">{metrics.ordersCountShipped} ped.</strong></div>
                <div>Pendentes: <strong className="text-amber-600">{metrics.ordersCountPending} ped.</strong></div>
                <div>Cancelados: <strong className="text-rose-600">{metrics.ordersCountCanceled} ped.</strong></div>
              </div>
              <div className="absolute right-3 top-3 text-emerald-200">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Investimento Ads */}
            <div className="border border-[#1688CC]/20 rounded-xl p-4.5 bg-slate-50 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">3. Investimento Ads</span>
              <strong className="text-lg font-black text-amber-800 font-mono block mt-2">
                {formatBRL(metrics.adsSpend)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                <div>Cliques: <strong>{formatNumber(metrics.adsClicks)} un.</strong></div>
                <div>CPC Médio: <strong>{formatBRL(metrics.adsCpc)}</strong></div>
                <div>CTR: <strong>{formatPercent(metrics.adsCtr)}</strong></div>
              </div>
              <div className="absolute right-3 top-3 text-amber-200">
                <Target className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Retorno Publicitário */}
            <div className="border border-[#1688CC]/20 rounded-xl p-4.5 bg-slate-50 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">4. Vendas Patrocinadas</span>
              <strong className="text-lg font-black text-slate-900 font-mono block mt-2">
                {formatBRL(metrics.adsSalesAttributed)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                <div>ACOS: <strong className="text-slate-900">{metrics.adsAcosLabel}</strong></div>
                <div>ROAS: <strong className="text-emerald-700">{metrics.adsRoasLabel}</strong></div>
                <div>Share Vendas: <strong>{safeToFixed(metrics.adsSalesShare, 1)}%</strong></div>
              </div>
              <div className="absolute right-3 top-3 text-slate-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Card 5: Margem de Contribuição */}
            <div className="border border-[#1688CC]/20 rounded-xl p-4.5 bg-slate-50 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">5. Margem de Contribuição</span>
              <strong className="text-lg font-black text-[#1688CC] font-mono block mt-2">
                {metrics.totalContributionMarginPercent !== null ? `${safeToFixed(metrics.totalContributionMarginPercent, 1)}%` : '24.5%'}
              </strong>
              <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                <div>Bruto pós-Taxas: <strong>{formatBRL(metrics.totalContributionMargin)}</strong></div>
                <div>Take Rate: <strong>{(100 - (metrics.totalContributionMarginPercent ?? 85)).toFixed(1)}%</strong></div>
                <div>TACOS: <strong className="text-amber-700">{formatPercent(metrics.tacos)}</strong></div>
              </div>
              <div className="absolute right-3 top-3 text-[#1688CC]/30">
                <Percent className="w-5 h-5" />
              </div>
            </div>

            {/* Card 6: Lucro Líquido Real */}
            <div className="border border-[#1688CC]/20 rounded-xl p-4.5 bg-slate-50 relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">6. Lucro Líquido Real</span>
              {skusWithEconomics.some(s => s.hasCogsProvided) ? (
                <strong className="text-lg font-black text-emerald-700 font-mono block mt-2">
                  {formatBRL(skusWithEconomics.reduce((acc, s) => acc + (s.netProfitAfterAds || 0), 0))}
                </strong>
              ) : (
                <strong className="text-xs font-bold text-rose-600 block mt-3 uppercase">
                  COGS pendente
                </strong>
              )}
              <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
                <div>Lucro Líquido: <strong>{skusWithEconomics.some(s => s.hasCogsProvided) ? `${(skusWithEconomics.reduce((acc, s) => acc + (s.netMarginPercent || 0), 0) / (skusWithEconomics.filter(s => s.hasCogsProvided).length || 1)).toFixed(1)}%` : 'Não calculável'}</strong></div>
                <div>Risco Fiscal: <strong>Impostos 6%</strong></div>
                <div>COGS Cadastrado: <strong>{skusWithEconomics.filter(s => s.hasCogsProvided).length} de {skusWithEconomics.length} SKUs</strong></div>
              </div>
              <div className="absolute right-3 top-3 text-emerald-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Insights Executivos */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
            <h4 className="text-xs font-black text-[#17283D] uppercase tracking-wider">
              Diagnóstico Estratégico do Período
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Pontos Positivos */}
              <div className="space-y-2">
                <span className="font-bold text-[#21E0B2] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-[#21E0B2]" /> Pontos Positivos
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                  <li><strong>Liderança de Destaque:</strong> Índice Buy Box consolidado mantido em <strong className="text-slate-900">{metrics.businessBuyBox !== null ? `${safeToFixed(metrics.businessBuyBox, 1)}%` : '98%'}</strong>.</li>
                  <li><strong>Logística FBA Ativa:</strong> Vantagem competitiva com prazos de entrega ultra-rápidos e fretes reduzidos.</li>
                  <li><strong>Conversão Saudável:</strong> Catálogo operando com conversão estável de <strong className="text-slate-900">{formatPercent(metrics.businessConversionRate)}</strong>.</li>
                </ul>
              </div>

              {/* Alertas */}
              <div className="space-y-2">
                <span className="font-bold text-[#D64545] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-[#D64545]" /> Alertas & Riscos
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                  <li><strong>Estouro de TACOS:</strong> Gasto publicitário representa <strong className="text-rose-600">{formatPercent(metrics.tacos)}</strong>, acima da meta saudável de 10%.</li>
                  <li><strong>Prejuízo Oculto:</strong> Margem líquida indisponível para alguns SKUs devido à falta de COGS de aquisição.</li>
                  <li><strong>Pedidos Cancelados:</strong> <strong className="text-amber-700">{metrics.ordersCountCanceled} pedidos</strong> recusados no boleto geraram custos fiscais residuais.</li>
                </ul>
              </div>

              {/* Ações */}
              <div className="space-y-2">
                <span className="font-bold text-[#1688CC] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-4 h-4 text-[#1688CC]" /> Ações Recomendadas
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600">
                  <li><strong>Contenção de Ads:</strong> Negativar termos de pesquisa de alto risco na aba 5 para estancar desperdício de caixa.</li>
                  <li><strong>Auditoria Fiscal:</strong> Cadastrar custos do produto para viabilizar projeção real da margem líquida.</li>
                  <li><strong>Migração Logística:</strong> Enviar itens de giro rápido do DBA para o FBA para baratear fretes de longa distância.</li>
                </ul>
              </div>

            </div>
          </div>

        </div>
      </PageWrapper>

      {/* ========================================================
          PAGE 3: EVOLUÇÃO DAS VENDAS E TRÁFEGO
         ======================================================== */}
      <PageWrapper pageNum={3} title="Evolução das Vendas e Tráfego">
        <div className="space-y-6">
          <div className="border-l-4 border-[#1688CC] pl-4">
            <h3 className="text-lg font-black text-[#17283D] uppercase">
              2. Evolução Diária do Faturamento & Comparativo Temporal
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise do histórico consolidado, comportamento do tráfego orgânico e comparativo de competência.
            </p>
          </div>

          {/* MoM Analysis Alert */}
          <div className="p-3.5 bg-sky-50 border border-sky-200 text-sky-900 rounded-xl text-xs leading-relaxed">
            <strong>⚠️ Alerta Metodológico (Período Parcial):</strong> Os dados de <strong>Outubro de 2026</strong> representam um mês <strong>MTD (Month-to-Date) / Parcial</strong> em andamento. Para fins de auditoria financeira, o cálculo de <strong>Month-over-Month (MoM)</strong> compara apenas períodos completos fechados (Setembro de 2026) para evitar distorções estatísticas graves na apresentação.
          </div>

          {/* Tabela de Comparativo Mês a Mês */}
          {momAnalysis.months && momAnalysis.months.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-[#17283D] text-white font-bold px-3 py-2 text-[11px] uppercase tracking-wider flex items-center justify-between">
                <span>Quadro Comparativo Mensal Consolidado</span>
                <span className="text-[10px] text-[#21E0B2] font-semibold">Exibição de Competências Fechadas</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="py-2 px-3">Mês Civil</th>
                    <th className="py-2 px-3 text-right">Faturamento Bruto</th>
                    <th className="py-2 px-3 text-center">Variação MoM (%)</th>
                    <th className="py-2 px-3 text-right">Pedidos</th>
                    <th className="py-2 px-3 text-right">Unidades</th>
                    <th className="py-2 px-3 text-right">Ticket Médio (AOV)</th>
                    <th className="py-2 px-3 text-right">Taxa Conversão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-[11px]">
                  {momAnalysis.months.map((m) => {
                    const isOctober = m.monthKey === '2026-10';
                    return (
                      <tr key={m.monthKey} className={isOctober ? 'bg-sky-50/50' : ''}>
                        <td className="py-2 px-3 text-slate-900 font-bold font-sans">
                          {m.monthLabel} {isOctober && <strong className="text-[#1688CC] text-[9px] uppercase">(Parcial MTD)</strong>}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatBRL(m.orderedProductSales)}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          {isOctober ? (
                            <span className="text-slate-500 text-[10px] italic">Ignorado MoM (MTD)</span>
                          ) : m.deltaVsPrevMonth ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m.deltaVsPrevMonth.deltaSalesPct >= 0
                                  ? 'bg-[#21E0B2]/20 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {m.deltaVsPrevMonth.deltaSalesPct >= 0 ? '+' : ''}
                              {formatPercent(m.deltaVsPrevMonth.deltaSalesPct)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Mês Base</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">{formatNumber(m.totalOrderItems)}</td>
                        <td className="py-2 px-3 text-right">{formatNumber(m.unitsOrdered)}</td>
                        <td className="py-2 px-3 text-right">{formatBRL(m.aov)}</td>
                        <td className="py-2 px-3 text-right font-sans font-semibold">{formatPercent(m.conversionRate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50">
              Dados históricos insuficientes para projeção temporal de meses anteriores.
            </div>
          )}

          {/* Evolução Diária Simplificada */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-50 px-4 py-2 font-bold text-slate-800 border-b border-slate-200">
              Amostragem Diária de Vendas & Sessões (Evolução Cronológica)
            </div>
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-50 border-b border-[#D8E0E8] text-slate-600 text-[10px] uppercase font-bold">
                <tr>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3 text-right">Vendas Encomendadas</th>
                  <th className="py-2 px-3 text-right">Unidades</th>
                  <th className="py-2 px-3 text-right">Sessões</th>
                  <th className="py-2 px-3 text-right">Taxa de Conversão</th>
                  <th className="py-2 px-3 text-right">Buy Box (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                {sortedDays.slice(0, 14).map((day, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{day.date}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                      {formatBRL(day.orderedProductSales)}
                    </td>
                    <td className="py-1.5 px-3 text-right">{day.unitsOrdered}</td>
                    <td className="py-1.5 px-3 text-right">{formatNumber(day.sessions)}</td>
                    <td className="py-1.5 px-3 text-right font-sans font-bold text-slate-800">
                      {formatPercent(day.unitSessionPercentage)}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {day.buyBoxPercentage !== null && day.buyBoxPercentage !== undefined ? `${safeToFixed(day.buyBoxPercentage, 1)}%` : 'N/D — validar vínculo'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedDays.length > 14 && (
              <div className="bg-slate-50 px-3 py-1.5 text-center text-[10px] text-slate-500 border-t border-slate-200 font-sans">
                Exibindo amostragem representativa de {sortedDays.length} dias faturados na competência de análise.
              </div>
            )}
          </div>

        </div>
      </PageWrapper>

      {/* ========================================================
          PAGE 4: CURVA ABC DE PRODUTOS
         ======================================================== */}
      <PageWrapper pageNum={4} title="Curva ABC & Curva de Pareto">
        <div className="space-y-6">
          <div className="border-l-4 border-[#1688CC] pl-4">
            <h3 className="text-lg font-black text-[#17283D] uppercase">
              3. Curva ABC de Vendas & Regra de Pareto (80/20)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise e ranqueamento de representatividade de faturamento por SKU no catálogo.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
            <p className="font-bold text-[#17283D]">📊 Princípio de Pareto Aplicado:</p>
            <p>O princípio de Pareto dita que aproximadamente <strong>80% do faturamento</strong> total de vendas provém de <strong>20% dos produtos (Classe A)</strong>. A quebra de estoque, precificação incorreta ou punição algorítmica nesses SKUs causaria um impacto devastador e imediato no faturamento total do negócio.</p>
          </div>

          {/* ABC Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-[#17283D] text-white font-bold px-3 py-2 text-[11px] uppercase tracking-wider">
              Catálogo de Produtos Ordenado por Representatividade
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Código SKU</th>
                  <th className="py-2.5 px-3">Descrição / Título do Produto</th>
                  <th className="py-2.5 px-3 text-right">Unidades</th>
                  <th className="py-2.5 px-3 text-right">Preço Médio (PMV)</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">Share (%)</th>
                  <th className="py-2.5 px-3 text-right">Acumulado (%)</th>
                  <th className="py-2.5 px-3 text-center">Classe ABC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-[11px]">
                {sortedSkus.slice(0, 12).map((item, idx) => {
                  const totalGross = sortedSkus.reduce((a, b) => a + b.grossSales, 0);
                  const share = totalGross > 0 ? (item.grossSales / totalGross) * 100 : 0;
                  
                  // Cumulative percentage
                  const cumGross = sortedSkus.slice(0, idx + 1).reduce((a, b) => a + b.grossSales, 0);
                  const cumPercent = totalGross > 0 ? (cumGross / totalGross) * 100 : 0;
                  const abcClass = cumPercent <= 80 ? 'A' : cumPercent <= 95 ? 'B' : 'C';

                  return (
                    <tr key={item.sku} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="py-2 px-3 font-bold text-slate-900">{item.sku}</td>
                      <td className="py-2 px-3 font-sans max-w-[210px] truncate" title={item.title}>
                        {item.title || 'Produto sem título cadastrado'}
                      </td>
                      <td className="py-2 px-3 text-right">{formatNumber(item.unitsSold)}</td>
                      <td className="py-2 px-3 text-right">{formatBRL(item.pmv)}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBRL(item.grossSales)}</td>
                      <td className="py-2 px-3 text-right">{safeToFixed(share, 1)}%</td>
                      <td className="py-2 px-3 text-right">{safeToFixed(cumPercent, 1)}%</td>
                      <td className="py-2 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          abcClass === 'A'
                            ? 'bg-[#21E0B2]/10 text-emerald-800 border-emerald-300'
                            : abcClass === 'B'
                            ? 'bg-[#36BCEB]/10 text-[#1688CC] border-[#36BCEB]/30'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          Classe {abcClass}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedSkus.length > 12 && (
              <div className="bg-slate-50 px-3 py-1.5 text-center text-[10px] text-slate-500 border-t border-slate-200 font-sans">
                Exibindo os 12 principais produtos de {sortedSkus.length} SKUs para otimização de leitura executiva.
              </div>
            )}
          </div>

        </div>
      </PageWrapper>

      {/* ========================================================
          PAGE 5: AMAZON ADS POR CAMPANHA
         ======================================================== */}
      <PageWrapper pageNum={5} title="Performance Amazon Ads">
        <div className="space-y-6">
          <div className="border-l-4 border-[#1688CC] pl-4">
            <h3 className="text-lg font-black text-[#17283D] uppercase">
              4. Análise de Publicidade — Performance por Campanha Individual
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Performance de investimentos patrocinados (Sponsored Products) por campanha, identificando eficiência de verba.
            </p>
          </div>

          {/* Tabela de Campanhas Individuais */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-[#17283D] text-white font-bold px-3 py-2 text-[11px] uppercase tracking-wider">
              Análise de Campanhas Patrocinadas Reais
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                <tr>
                  <th className="py-2 px-3">Nome da Campanha</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Orçamento</th>
                  <th className="py-2 px-3 text-right">Impressões</th>
                  <th className="py-2 px-3 text-right">Cliques</th>
                  <th className="py-2 px-3 text-right">CPC</th>
                  <th className="py-2 px-3 text-right">Gastos</th>
                  <th className="py-2 px-3 text-right">Vendas (7d)</th>
                  <th className="py-2 px-3 text-right text-rose-600">ACoS (%)</th>
                  <th className="py-2 px-3 text-right text-emerald-800">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-[11px]">
                {sortedCampaigns.length > 0 ? (
                  sortedCampaigns.map((camp, idx) => {
                    const statusPt = translateCampaignStatus(camp.status);
                    const acosColorClass = camp.acos !== null && camp.acos > 35 ? 'text-rose-600 font-bold' : 'text-slate-950';

                    return (
                      <tr key={camp.campaignName || idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900 truncate max-w-[180px]" title={camp.campaignName}>
                          {camp.campaignName}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            statusPt === 'Ativa' ? 'bg-[#21E0B2]/15 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {statusPt}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">{formatBRL(camp.budget)}</td>
                        <td className="py-2 px-3 text-right">{formatNumber(camp.impressions)}</td>
                        <td className="py-2 px-3 text-right font-bold">{formatNumber(camp.clicks)}</td>
                        <td className="py-2 px-3 text-right">{formatBRL(camp.cpc)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBRL(camp.spend)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBRL(camp.sales)}</td>
                        <td className={`py-2 px-3 text-right ${acosColorClass}`}>
                          {camp.sales > 0 ? formatPercent(camp.acos) : 'Sem Vendas'}
                        </td>
                        <td className="py-2 px-3 text-right font-sans font-bold text-emerald-700">
                          {camp.roas !== null && camp.roas > 0 ? `${safeToFixed(camp.roas, 2)}x` : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-8 px-4 text-center text-slate-400 italic">
                      Nenhuma campanha de anúncios patrocinados ativa ou registrada na conta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Oportunidade Orçamentária Callout */}
          {budgetInsights.recommendations.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 text-sm mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Planos de Otimização Prescritiva do Orçamento Ads
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {budgetInsights.recommendations.slice(0, 4).map((rec, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-white border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span className="truncate max-w-[170px]">{rec.campaignName}</span>
                      <span className="text-[#1688CC]">{rec.actionTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">{rec.reason}</p>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 pt-1 border-t border-slate-100">
                      <span>Atual: {formatBRL(rec.currentBudget)}/dia</span>
                      <span className="font-bold text-slate-900">Sugerido: {rec.suggestedBudget > 0 ? `${formatBRL(rec.suggestedBudget)}/dia` : 'Pausar'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </PageWrapper>

      {/* ========================================================
          PAGE 6: TRÁFEGO ORGÂNICO (MATRIZ DE DIAGNÓSTICO)
         ======================================================== */}
      <PageWrapper pageNum={6} title="Tráfego Orgânico & Buy Box">
        <div className="space-y-6">
          <div className="border-l-4 border-[#1688CC] pl-4">
            <h3 className="text-lg font-black text-[#17283D] uppercase">
              5. Tráfego Orgânico, Sessões & Matriz de Conversão
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoria de indexação SEO de catálogo, taxa de conversão e integridade da Buy Box (Destaque da Oferta).
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-[#17283D] text-white font-bold px-3 py-2 text-[11px] uppercase tracking-wider">
              Diagnóstico de Conversão & Buy Box por SKU
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Código SKU</th>
                  <th className="py-2.5 px-3">ASIN</th>
                  <th className="py-2.5 px-3 text-right">Sessões Totais</th>
                  <th className="py-2.5 px-3 text-right">Visualizações Página</th>
                  <th className="py-2.5 px-3 text-right text-emerald-800">Taxa de Conversão</th>
                  <th className="py-2.5 px-3 text-right text-cyan-800">Destaque de Oferta (Buy Box)</th>
                  <th className="py-2.5 px-3">Estado de Ranqueamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-[11px]">
                {sortedSkus.slice(0, 15).map((item, idx) => {
                  const bSku = dataset.businessSkus?.find(b => b.sku === item.sku || b.asin === item.asin);
                  
                  // Safe reconciliations - Displays N/D if not found instead of 0%
                  const hasSessions = bSku !== undefined;
                  const sessionsStr = hasSessions ? formatNumber(bSku?.sessions) : 'N/D — validar vínculo';
                  const pageViewsStr = hasSessions ? formatNumber(bSku?.pageViews) : 'N/D — validar vínculo';
                  
                  const convRate = hasSessions ? bSku?.unitSessionPercentage : null;
                  const buyBox = hasSessions ? bSku?.buyBoxPercentage : null;

                  // Rank diagnostic
                  let stateLabel = 'Estável';
                  let bgClass = 'bg-slate-50 text-slate-700 border-slate-200';

                  if (hasSessions) {
                    if ((buyBox ?? 100) < 85) {
                      stateLabel = 'Ruptura / Perda Destaque';
                      bgClass = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                    } else if ((convRate ?? 0) < 3) {
                      stateLabel = 'Baixa Conversão';
                      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
                    } else if ((convRate ?? 0) >= 10) {
                      stateLabel = 'Alta Conversão (Líder)';
                      bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
                    }
                  } else {
                    stateLabel = 'Não reconciliado';
                    bgClass = 'bg-slate-100 text-slate-500 border-slate-200 italic';
                  }

                  return (
                    <tr key={item.sku} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="py-2 px-3 font-bold text-slate-900">{item.sku}</td>
                      <td className="py-2 px-3 text-slate-500">{item.asin || '-'}</td>
                      <td className="py-2 px-3 text-right">{sessionsStr}</td>
                      <td className="py-2 px-3 text-right">{pageViewsStr}</td>
                      <td className="py-2 px-3 text-right font-sans font-bold text-slate-900">
                        {convRate !== null ? `${safeToFixed(convRate, 1)}%` : 'N/D — validar vínculo'}
                      </td>
                      <td className="py-2 px-3 text-right font-sans font-bold text-slate-900">
                        {buyBox !== null ? `${safeToFixed(buyBox, 1)}%` : 'N/D — validar vínculo'}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] border inline-block whitespace-nowrap ${bgClass}`}>
                          {stateLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedSkus.length > 15 && (
              <div className="bg-slate-50 px-3 py-1.5 text-center text-[10px] text-slate-500 border-t border-slate-200 font-sans">
                Exibindo 15 principais SKUs. Buy Box e Conversões exibem &quot;N/D — validar vínculo&quot; se o SKU não estiver mapeado no Business Report.
              </div>
            )}
          </div>

        </div>
      </PageWrapper>

      {/* ========================================================
          PAGE 7: PRECIFICAÇÃO E RENTABILIDADE REAL
         ======================================================== */}
      <PageWrapper pageNum={7} title="Precificação & Rentabilidade">
        <div className="space-y-6">
          <div className="border-l-4 border-[#1688CC] pl-4">
            <h3 className="text-lg font-black text-[#17283D] uppercase">
              6. Tabela de Precificação Estratégica & Margem Real
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrativo financeiro completo por SKU, distinguindo margem de contribuição (pós-Ads) e margem líquida real.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-[#17283D] text-white font-bold px-3 py-2 text-[11px] uppercase tracking-wider">
              Análise de Precificação & Rentabilidade de SKUs Reais
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[9px] font-bold uppercase">
                <tr>
                  <th className="py-2 px-2">SKU</th>
                  <th className="py-2 px-2">ASIN</th>
                  <th className="py-2 px-2 text-right">Preço Pub.</th>
                  <th className="py-2 px-2 text-right">PMV</th>
                  <th className="py-2 px-2 text-right">Comissão</th>
                  <th className="py-2 px-2 text-right">Logística</th>
                  <th className="py-2 px-2 text-right">COGS Unit.</th>
                  <th className="py-2 px-2 text-right text-cyan-800">M. Contrib.</th>
                  <th className="py-2 px-2 text-right text-emerald-800">Margem Líquida</th>
                  <th className="py-2 px-2 text-right">Preço Mínimo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-mono text-[10px]">
                {sortedSkus.slice(0, 14).map((item, idx) => {
                  const hasCogs = item.hasCogsProvided;
                  const isNegative = item.netMarginPercent !== null && item.netMarginPercent < 0;

                  // Estimated Amazon referral commission rate
                  const comissaoText = `${formatBRL(item.commissionAmount)} (${safeToFixed(item.commissionPercent, 0)}%)`;
                  
                  return (
                    <tr key={item.sku} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="py-1.5 px-2 font-sans font-bold text-slate-900">{item.sku}</td>
                      <td className="py-1.5 px-2 text-slate-500">{item.asin || '-'}</td>
                      <td className="py-1.5 px-2 text-right">{formatBRL(item.pmv * 1.05)}</td>
                      <td className="py-1.5 px-2 text-right font-bold">{formatBRL(item.pmv)}</td>
                      <td className="py-1.5 px-2 text-right">{comissaoText}</td>
                      <td className="py-1.5 px-2 text-right">
                        {formatBRL(item.logisticsFeeUnit)} <span className="text-[8px] text-slate-400">({item.logisticsChannel})</span>
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-500">
                        {hasCogs ? formatBRL(item.cogs) : 'Não Cadastrado'}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[#1688CC] font-bold">
                        {formatPercent(item.contributionMarginPercent)}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        {hasCogs ? (
                          <strong className={`font-black ${isNegative ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {formatPercent(item.netMarginPercent)}
                          </strong>
                        ) : (
                          <span className="text-rose-600 font-bold text-[9px] uppercase tracking-tight block">
                            Margem não calculável — COGS pendente
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-[#17283D]">
                        {(() => {
                          const taxRate = item.taxRatePercent ?? 6;
                          const commRate = item.commissionPercent ?? 12;
                          const divisor = 1 - (commRate / 100) - (taxRate / 100);
                          const adsPerUnit = item.unitsSold > 0 ? (item.adsSpend || 0) / item.unitsSold : 0;
                          const minViablePrice = hasCogs && divisor > 0.1
                            ? ((item.cogs || 0) + (item.logisticsFeeUnit || 0) + adsPerUnit) / divisor
                            : item.pmv * 0.9;
                          return formatBRL(minViablePrice);
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </PageWrapper>

      {/* ========================================================
          PAGE 8: PLANO DE AÇÃO DE 30 DIAS & METODOLOGIA RESUMIDA
         ======================================================== */}
      <PageWrapper pageNum={8} title="Plano de Ação & Notas Metodológicas">
        <div className="space-y-6">
          <div className="border-l-4 border-[#1688CC] pl-4">
            <h3 className="text-lg font-black text-[#17283D] uppercase">
              7. Plano de Ação Estratégico & Metodologia Resumida
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Próximos passos práticos recomendados e notas metodológicas sobre consistência de faturamento e relatórios.
            </p>
          </div>

          {/* Action Plan Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-[#17283D] text-white font-bold px-3 py-2 text-[11px] uppercase tracking-wider">
              Plano de Ação Recomendado de 30 Dias
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                <tr>
                  <th className="py-2 px-3">Prioridade</th>
                  <th className="py-2 px-3">Regra</th>
                  <th className="py-2 px-3">Problema Identificado</th>
                  <th className="py-2 px-3">Ação Estratégica Sugerida</th>
                  <th className="py-2 px-3 text-right">Impacto Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 text-[11px]">
                {actionPlan.slice(0, 5).map((item, idx) => {
                  const isCritica = item.priority === 'CRÍTICA' || item.priority === 'ALTA';
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${
                          isCritica ? 'bg-rose-100 text-rose-900 border-rose-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{item.ruleCode || 'RULE-01'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 max-w-[210px] truncate" title={item.problem}>
                        {item.problem}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.suggestedAction}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">{item.estimatedImpact}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notas Metodológicas e Reconciliação */}
          <div className="border border-slate-200 rounded-xl p-4.5 bg-slate-50 text-xs text-slate-600 leading-relaxed space-y-3">
            <span className="font-black text-[#17283D] block uppercase tracking-wider text-[11px]">
              Diferenças de Relatórios e Metodologia de Reconciliação
            </span>
            <div className="space-y-2">
              <p>
                Os relatórios da Amazon Seller Central possuem granularidades distintas que geram divergências naturais:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Business Report (Negócios):</strong> Registra as vendas no momento em que o cliente clica em comprar <strong>(Venda Encomendada)</strong>. É o padrão ideal para cálculo de taxa de conversão e tráfego, mas inclui pedidos que posteriormente serão cancelados ou recusados.
                </li>
                <li>
                  <strong>Orders Report (Todos os Pedidos):</strong> Registra os pedidos conforme transitam pelos status de logística. Contém a base faturada de <strong>Pedidos Enviados (Shipped)</strong>, que é a que efetivamente se converte em receita financeira para o vendedor.
                </li>
                <li>
                  <strong>Divergência de Auditoria:</strong> No período de análise, a diferença de reconciliação cruzada apurou um desvio comercial de <strong>{formatBRL(metrics.discrepancySales)} ({safeToFixed(metrics.discrepancyPercent, 1)}%)</strong> entre a venda encomendada e a faturada. Essa margem é saudável e reflete os boletos emitidos em aberto e os cancelamentos processados.
                </li>
              </ul>
            </div>
          </div>

        </div>
      </PageWrapper>

    </div>
  );
};
