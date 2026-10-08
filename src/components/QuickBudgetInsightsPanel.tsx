import React, { useState, useMemo } from 'react';
import {
  Zap,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Sliders,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { AdsCampaignRow } from '../types/amazon';
import {
  generateBudgetInsights,
  BudgetRecommendation,
  BudgetActionType,
  formatBRL,
  formatPercent,
  formatAcos,
  formatRoas,
} from '../utils/adsBudgetInsights';

interface QuickBudgetInsightsPanelProps {
  campaigns: AdsCampaignRow[];
  onSelectCampaignForFilter?: (campaignName: string) => void;
}

export const QuickBudgetInsightsPanel: React.FC<QuickBudgetInsightsPanelProps> = ({
  campaigns,
  onSelectCampaignForFilter,
}) => {
  const [targetAcos, setTargetAcos] = useState<number>(15.0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Generate automated budget insights based on current campaign performance & target ACoS
  const summary = useMemo(() => {
    return generateBudgetInsights(campaigns, targetAcos);
  }, [campaigns, targetAcos]);

  const handleCopySingle = (rec: BudgetRecommendation) => {
    const text = `[Amazon Ads Insight] Campanha: ${rec.campaignName}
Ação Recomendada: ${rec.actionTitle}
Status Atual: ${rec.status} | Orçamento Atual: ${formatBRL(rec.currentBudget)}/dia -> Sugerido: ${
      rec.suggestedBudget === 0 ? 'Pausar' : `${formatBRL(rec.suggestedBudget)}/dia`
    } (${rec.budgetChangePercent > 0 ? `+${rec.budgetChangePercent}%` : `${rec.budgetChangePercent}%`})
Desempenho: Gasto: ${formatBRL(rec.spend)} | Vendas: ${formatBRL(rec.sales)} | ACoS: ${rec.sales > 0 ? `${(rec.currentAcos ?? 0).toFixed(1)}%` : 'Sem Vendas'} (Meta: ${targetAcos}%) | ROAS: ${(rec.currentRoas ?? 0).toFixed(2)}x
Motivo: ${rec.reason}
Passos:
${rec.actionSteps.map((s, idx) => `  ${idx + 1}. ${s}`).join('\n')}
Impacto: ${rec.estimatedMonthlyImpact}`;

    navigator.clipboard.writeText(text);
    setCopiedId(rec.campaignName);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyAllPlan = () => {
    const pauseRecs = summary.recommendations.filter(
      (r) => r.actionType === 'PAUSE_CRITICAL' || r.category === 'pause_cut'
    );
    const scaleRecs = summary.recommendations.filter((r) => r.category === 'scale');
    const optimizeRecs = summary.recommendations.filter(
      (r) => r.category === 'optimize' && r.actionType !== 'MAINTAIN_MONITOR'
    );

    let report = `===========================================================\n`;
    report += `⚡ PLANO DE AÇÃO RÁPIDA DE ORÇAMENTOS - AMAZON ADS\n`;
    report += `Meta de ACoS Definida: ${(targetAcos ?? 0).toFixed(1)}% | Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    report += `===========================================================\n\n`;

    report += `📊 RESUMO EXECUTIVO:\n`;
    report += `• Campanhas Auditadas: ${summary.totalCampaigns} (${summary.activeCampaigns} Ativas)\n`;
    report += `• 🚨 Campanhas para Pausar/Cortar: ${summary.criticalPauseCount}\n`;
    report += `• 🚀 Oportunidades de Escala: ${summary.scaleOpportunitiesCount}\n`;
    report += `• 💰 Economia Mensal Estimada: ${formatBRL(summary.potentialMonthlySavings)}/mês\n`;
    report += `• 📈 Orçamento Liberado para Crescimento: ${formatBRL(summary.potentialGrowthBudget)}/mês\n\n`;

    if (pauseRecs.length > 0) {
      report += `🚨 AÇÕES CRÍTICAS (PAUSAR OU CORTAR ORÇAMENTO):\n`;
      pauseRecs.forEach((r, idx) => {
        report += `${idx + 1}. [${r.campaignName}] -> ${r.actionTitle}\n`;
        report += `   Orçamento: ${formatBRL(r.currentBudget)}/dia -> ${
          r.suggestedBudget === 0 ? 'PAUSAR' : `${formatBRL(r.suggestedBudget)}/dia`
        }\n`;
        report += `   Métricas: Gasto ${formatBRL(r.spend)} | Vendas ${formatBRL(r.sales)} | ACoS ${
          r.sales > 0 ? `${(r.currentAcos ?? 0).toFixed(1)}%` : 'Sem Vendas'
        } (vs meta ${targetAcos}%)\n`;
        report += `   Diagnóstico: ${r.reason}\n\n`;
      });
    }

    if (scaleRecs.length > 0) {
      report += `🚀 OPORTUNIDADES DE ESCALA (AUMENTAR ORÇAMENTO):\n`;
      scaleRecs.forEach((r, idx) => {
        report += `${idx + 1}. [${r.campaignName}] -> ${r.actionTitle}\n`;
        report += `   Orçamento: ${formatBRL(r.currentBudget)}/dia -> ${formatBRL(r.suggestedBudget)}/dia (+${r.budgetChangePercent}%)\n`;
        report += `   Métricas: Vendas ${formatBRL(r.sales)} | Gasto ${formatBRL(r.spend)} | ACoS ${(r.currentAcos ?? 0).toFixed(1)}% | ROAS ${(r.currentRoas ?? 0).toFixed(2)}x\n`;
        report += `   Diagnóstico: ${r.reason}\n\n`;
      });
    }

    if (optimizeRecs.length > 0) {
      report += `⚠️ AJUSTES DE LANCES & OTIMIZAÇÕES:\n`;
      optimizeRecs.forEach((r, idx) => {
        report += `${idx + 1}. [${r.campaignName}] -> ${r.actionTitle}\n`;
        report += `   Métricas: ACoS ${(r.currentAcos ?? 0).toFixed(1)}% | Gasto ${formatBRL(r.spend)}\n\n`;
      });
    }

    report += `===========================================================\n`;
    report += `Gerado pelo BB Hub | Auditoria & Gestão Amazon Ads\n`;

    navigator.clipboard.writeText(report);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const filteredRecs = useMemo(() => {
    if (selectedCategory === 'all') return summary.recommendations;
    if (selectedCategory === 'critical') {
      return summary.recommendations.filter(
        (r) => r.actionType === 'PAUSE_CRITICAL' || r.urgency === 'critical'
      );
    }
    return summary.recommendations.filter((r) => r.category === selectedCategory);
  }, [summary.recommendations, selectedCategory]);

  const getActionBadgeStyle = (actionType: BudgetActionType, urgency: string) => {
    switch (actionType) {
      case 'PAUSE_CRITICAL':
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500',
          borderCard: 'border-rose-500/30 hover:border-rose-500/60 bg-gradient-to-br from-rose-950/20 to-[#121e33]',
        };
      case 'REDUCE_HEAVY':
        return {
          bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          dot: 'bg-orange-500',
          borderCard: 'border-orange-500/30 hover:border-orange-500/60 bg-gradient-to-br from-orange-950/20 to-[#121e33]',
        };
      case 'REDUCE_LIGHT':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-500',
          borderCard: 'border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-br from-amber-950/20 to-[#121e33]',
        };
      case 'SCALE_AGGRESSIVE':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-500',
          borderCard: 'border-emerald-500/30 hover:border-emerald-500/60 bg-gradient-to-br from-emerald-950/20 to-[#121e33]',
        };
      case 'SCALE_MODERATE':
        return {
          bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          dot: 'bg-cyan-500',
          borderCard: 'border-cyan-500/30 hover:border-cyan-500/60 bg-gradient-to-br from-cyan-950/20 to-[#121e33]',
        };
      case 'REACTIVATE_EVALUATE':
        return {
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          dot: 'bg-purple-500',
          borderCard: 'border-purple-500/30 hover:border-purple-500/60 bg-gradient-to-br from-purple-950/20 to-[#121e33]',
        };
      default:
        return {
          bg: 'bg-slate-700/40 text-slate-300 border-slate-600',
          dot: 'bg-slate-400',
          borderCard: 'border-[#243554] hover:border-slate-500 bg-[#121e33]',
        };
    }
  };

  return (
    <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Top Banner Header */}
      <div className="p-5 bg-gradient-to-r from-[#172742] via-[#152238] to-[#121b2d] border-b border-[#243554] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0 mt-0.5">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <span>Insights Rápidos de Orçamento</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Tempo Real
                </span>
              </h3>
            </div>
            <p className="text-xs md:text-sm text-slate-300 mt-0.5">
              Sugestões prescritivas de realocação diária: pause sangrias com ACoS abusivo e turbine campanhas de alta conversão.
            </p>
          </div>
        </div>

        {/* Right Action Controls: Target ACoS & Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          {/* Target ACoS Selector */}
          <div className="flex items-center gap-1.5 bg-[#0e1726] border border-[#273d63] rounded-xl px-3 py-1.5 shadow-inner">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Meta ACoS:
            </span>
            <input
              type="number"
              min={5}
              max={60}
              step={1}
              value={targetAcos}
              onChange={(e) => setTargetAcos(Math.max(1, Number(e.target.value) || 15))}
              className="w-14 bg-[#152238] border border-[#2b446e] rounded-lg px-1.5 py-0.5 text-xs font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
            <span className="text-xs font-bold text-slate-400">%</span>

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-700">
              {[12, 15, 20].map((p) => (
                <button
                  key={p}
                  onClick={() => setTargetAcos(p)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    targetAcos === p
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`Definir meta para ${p}%`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Copy Full Plan Button */}
          <button
            onClick={handleCopyAllPlan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1b2b48] hover:bg-[#23385e] text-slate-200 border border-[#2b426b] transition shadow-sm active:scale-95 cursor-pointer"
            title="Copiar todas as recomendações formatadas"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Plano Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copiar Plano</span>
              </>
            )}
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-[#0e1726] border border-[#273d63] text-slate-300 hover:text-white transition cursor-pointer"
            title={isExpanded ? 'Recolher painel de insights' : 'Expandir painel de insights'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Body (Visible when expanded) */}
      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* Executive Stats Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0e1726] border border-rose-500/30 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  Pausar / Cortar Urgente
                </span>
                <p className="text-2xl font-black text-rose-400 mt-0.5">
                  {summary.criticalPauseCount}
                </p>
                <span className="text-[10px] text-slate-400">Sangria ou ACoS abusivo</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Economia est.</span>
                <span className="text-xs font-bold text-rose-300">
                  {formatBRL(summary.potentialMonthlySavings)}/mês
                </span>
              </div>
            </div>

            <div className="bg-[#0e1726] border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Escalar Orçamento
                </span>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">
                  {summary.scaleOpportunitiesCount}
                </p>
                <span className="text-[10px] text-slate-400">ACoS &lt; {targetAcos}% com alto ROI</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Verba de escala</span>
                <span className="text-xs font-bold text-emerald-300">
                  +{formatBRL(summary.potentialGrowthBudget)}/mês
                </span>
              </div>
            </div>

            <div className="bg-[#0e1726] border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Ajustar Lances / Bids
                </span>
                <p className="text-2xl font-black text-amber-400 mt-0.5">
                  {summary.optimizeCount}
                </p>
                <span className="text-[10px] text-slate-400">Zona limítrofe de equilíbrio</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Campanhas</span>
                <span className="text-xs font-bold text-amber-300">Em monitoramento</span>
              </div>
            </div>

            <div className="bg-[#0e1726] border border-[#273d63] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  Campanhas Pausadas
                </span>
                <p className="text-2xl font-black text-white mt-0.5">{summary.pausedCount}</p>
                <span className="text-[10px] text-slate-400">Auditadas no relatório</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Total auditado</span>
                <span className="text-xs font-bold text-cyan-400">
                  {summary.totalCampaigns} campanhas
                </span>
              </div>
            </div>
          </div>

          {/* Filter Pills Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1d2d48]">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-[#0e1726] text-slate-300 hover:text-white hover:bg-[#1a2b47]'
                }`}
              >
                <span>Todas as Sugestões</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
                  {summary.recommendations.length}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('critical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'critical'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-[#0e1726] text-rose-300 hover:text-white hover:bg-rose-950/40'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Pausar / Cortar Urgente</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-900/50">
                  {summary.criticalPauseCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('scale')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'scale'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-[#0e1726] text-emerald-300 hover:text-white hover:bg-emerald-950/40'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Escalar Orçamento</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-900/50">
                  {summary.scaleOpportunitiesCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedCategory('optimize')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === 'optimize'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-[#0e1726] text-amber-300 hover:text-white hover:bg-amber-950/40'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Ajustar Lances & Monitorar</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-900/50">
                  {summary.optimizeCount}
                </span>
              </button>

              {summary.pausedCount > 0 && (
                <button
                  onClick={() => setSelectedCategory('paused')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === 'paused'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'bg-[#0e1726] text-purple-300 hover:text-white hover:bg-purple-950/40'
                  }`}
                >
                  <span>Pausadas</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-900/50">
                    {summary.pausedCount}
                  </span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Baseado em ACoS real vs meta de {targetAcos}%</span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredRecs.map((rec) => {
              const styles = getActionBadgeStyle(rec.actionType, rec.urgency);
              const isCopied = copiedId === rec.campaignName;
              const isInactive = rec.action === "ARCHIVED";

              return (
                <div
                  key={rec.campaignName}
                  className={`p-5 rounded-xl border ${styles.borderCard} transition-all shadow-md flex flex-col justify-between space-y-4`}
                >
                  {/* Card Header: Action Badge & Campaign Name */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${styles.bg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`} />
                          {isInactive ? "Campanha Arquivada / Pausada" : rec.actionTitle}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status.toUpperCase() === 'ENABLED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>

                      {/* Copy single recommendation */}
                      <button
                        onClick={() => handleCopySingle(rec)}
                        className="text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg bg-[#0e1726]/60 hover:bg-[#0e1726] border border-slate-700/50 transition cursor-pointer"
                        title="Copiar recomendação desta campanha"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <h4
                      className="text-sm font-bold text-white mt-2 break-words hover:text-cyan-300 transition cursor-pointer flex items-center gap-1.5"
                      onClick={() => onSelectCampaignForFilter && onSelectCampaignForFilter(rec.campaignName)}
                      title="Clique para filtrar na tabela de campanhas abaixo"
                    >
                      <span>{rec.campaignName}</span>
                      <Search className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
                    </h4>
                  </div>

                  {/* Budget Allocation Suggestion Bar */}
                  <div className="bg-[#0a1220]/80 border border-[#1b2b46] rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">
                        {isInactive ? "Orçamento Histórico" : "Orçamento Atual"}
                      </span>
                      <span className="font-bold text-white mt-0.5 block">
                        {rec.currentBudget === null ? "Não informado" : `${formatBRL(rec.currentBudget)}/dia`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">
                        {isInactive ? "Status" : "Ação Sugerida"}
                      </span>
                      {isInactive ? (
                        <span className="font-extrabold text-slate-400 mt-0.5 block">Campanha arquivada</span>
                      ) : (
                        <span
                          className={`font-black mt-0.5 block ${
                            rec.recommendedBudget === 0
                              ? 'text-rose-400'
                              : (rec.changePercent ?? 0) > 0
                              ? 'text-emerald-400'
                              : (rec.changePercent ?? 0) < 0
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {rec.recommendedBudget === null
                            ? "Revisar manualmente"
                            : `${formatBRL(rec.recommendedBudget)}/dia`}
                          {rec.changePercent !== null && rec.changePercent !== 0 && (
                            <span className="text-[10px] ml-1 font-semibold block sm:inline">
                              ({formatPercent(rec.changePercent)})
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">
                        {isInactive ? "ACOS Histórico vs Meta" : "ACoS Real vs Meta"}
                      </span>
                      <span
                        className={`font-bold mt-0.5 block ${
                          rec.sales === 0 && rec.spend > 0
                            ? 'text-rose-400'
                            : rec.currentAcos !== null && rec.currentAcos <= targetAcos
                            ? 'text-emerald-400'
                            : rec.currentAcos !== null && rec.currentAcos > targetAcos * 1.5
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {formatAcos(rec.currentAcos, rec.spend, rec.sales)}
                        <span className="text-[10px] text-slate-400 ml-1 font-normal block">
                          (meta {formatPercent(targetAcos)})
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">
                        Vendas / Gasto
                      </span>
                      <span className="font-bold text-slate-200 mt-0.5 block">
                        {formatBRL(rec.sales)} <span className="text-[10px] text-slate-400 font-normal block sm:inline">/ {formatBRL(rec.spend)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Technical Diagnosis */}
                  <div className="text-xs text-slate-300 space-y-1 bg-[#101b2e] p-3 rounded-lg border border-[#1e2f4a]">
                    <p className="leading-relaxed">
                      <span className="font-bold text-slate-200 block mb-0.5">Diagnóstico do Consultor:</span>
                      {isInactive && rec.currentAcos !== null && rec.currentAcos <= targetAcos * 0.5 && rec.orders >= 2
                        ? "Os dados históricos indicam alta eficiência, mas a campanha está arquivada. Reative-a somente após revisar estoque, preço, página do produto e estratégia."
                        : rec.reason}
                    </p>
                  </div>

                  {/* Step-by-step action guidance */}
                  <div className="bg-[#0b1322]/60 rounded-lg p-3 border border-[#1b2b46]/70 text-[11px] text-slate-300 space-y-1">
                    <span className="font-bold text-cyan-300 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Como aplicar no Amazon Ads Console:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-300 font-normal">
                      {rec.actionSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Footer: Impact and Table filter link */}
                  <div className="pt-2 border-t border-[#1a2b47] flex items-center justify-between text-xs">
                    {!isInactive && rec.estimatedMonthlySavings !== null && rec.estimatedMonthlySavings > 0 ? (
                      <span className="text-[11px] font-semibold text-rose-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>Economia estimada de {formatBRL(rec.estimatedMonthlySavings)}/mês em orçamento não alocado.</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        {rec.estimatedMonthlyImpact}
                      </span>
                    )}

                    {onSelectCampaignForFilter && (
                      <button
                        onClick={() => onSelectCampaignForFilter(rec.campaignName)}
                        className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                      >
                        <span>Ver na tabela</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRecs.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs bg-[#0e1726] rounded-xl border border-slate-800">
              Nenhuma campanha encontrada para a categoria de filtro selecionada.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
