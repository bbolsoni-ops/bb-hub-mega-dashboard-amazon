import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  BookOpen,
  Calendar,
  Sparkles,
  ShoppingBag,
  Scale,
  ArrowRight,
  BarChart3,
  BarChart2,
  Trophy,
  Activity,
  Layers,
  PieChart,
  Package,
  Megaphone,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { BusinessDayRow, OrderItemRow, ReconciledMetrics, SkuUnitEconomics } from '../types/amazon';
import { calculateMonthOverMonth } from '../utils/monthOverMonth';
import { formatPercentage } from '../utils/formatters';

interface ExecutiveViewProps {
  metrics: ReconciledMetrics;
  isDemoMode: boolean;
  onOpenUpload: () => void;
  onNavigateTab: (tab: string, subTab?: string) => void;
  businessDays?: BusinessDayRow[];
  orders?: OrderItemRow[];
  skusSummary?: SkuUnitEconomics[];
}

export const ExecutiveView: React.FC<ExecutiveViewProps> = ({
  metrics,
  isDemoMode,
  onOpenUpload,
  onNavigateTab,
  businessDays = [],
  orders = [],
  skusSummary = [],
}) => {
  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNum = (val: number | null | undefined) => {
    return (val || 0).toLocaleString('pt-BR');
  };

  const formatPct = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '0,00%';
    return `${(val ?? 0).toFixed(2).replace('.', ',')}%`;
  };

  const safeToFixed = (val: number | null | undefined, decimals: number = 2) => {
    return (val ?? 0).toFixed(decimals);
  };

  // Month-over-Month calculation
  const momAnalysis = useMemo(() => {
    return calculateMonthOverMonth(businessDays, orders);
  }, [businessDays, orders]);

  // Champion weekday calculation
  const championDay = useMemo(() => {
    if (!businessDays || businessDays.length === 0) return null;
    const agg: Record<number, { sales: number; count: number }> = {};
    for (let i = 0; i < 7; i++) agg[i] = { sales: 0, count: 0 };
    businessDays.forEach((d) => {
      const dateObj = new Date(d.date + 'T12:00:00');
      const dayIndex = dateObj.getDay();
      if (!isNaN(dayIndex)) {
        agg[dayIndex].sales += d.orderedProductSales;
        agg[dayIndex].count += 1;
      }
    });
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    let bestIdx = 0;
    let maxAvg = 0;
    for (let i = 0; i < 7; i++) {
      const avg = agg[i].count > 0 ? agg[i].sales / agg[i].count : 0;
      if (avg > maxAvg) {
        maxAvg = avg;
        bestIdx = i;
      }
    }
    return { name: dayNames[bestIdx], avgSales: maxAvg };
  }, [businessDays]);

  // Top 5 Products Calculation for Side-by-Side Panel
  const topProducts = useMemo(() => {
    if (skusSummary && skusSummary.length > 0) {
      return [...skusSummary].sort((a, b) => b.grossSales - a.grossSales).slice(0, 5);
    }
    if (orders && orders.length > 0) {
      const map: Record<string, { sku: string; title: string; grossSales: number; unitsSold: number; pmv: number; adsSpend: number }> = {};
      orders.forEach((o) => {
        if (o.orderStatus === 'Canceled') return;
        const key = o.sku || o.asin || 'Desconhecido';
        if (!map[key]) {
          map[key] = {
            sku: key,
            title: o.productName || key,
            grossSales: 0,
            unitsSold: 0,
            pmv: 0,
            adsSpend: 0,
          };
        }
        map[key].grossSales += (o.itemPrice || 0) * (o.quantity || 1);
        map[key].unitsSold += (o.quantity || 1);
      });
      return Object.values(map)
        .map((p) => ({
          ...p,
          pmv: p.unitsSold > 0 ? p.grossSales / p.unitsSold : 0,
          adsSales: 0,
        }))
        .sort((a, b) => b.grossSales - a.grossSales)
        .slice(0, 5);
    }
    return [];
  }, [skusSummary, orders]);

  // Dynamic Chart States
  const [chartMode, setChartMode] = useState<'combined' | 'sales' | 'profit' | 'breakdown'>('combined');
  const [timeRange, setTimeRange] = useState<'30d' | '14d' | '7d'>('30d');
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);

  // Raw daily series: from businessDays, or orders aggregated, or realistic baseline
  const sortedRawDays = useMemo(() => {
    if (businessDays && businessDays.length > 0) {
      return [...businessDays].sort((a, b) => a.date.localeCompare(b.date));
    }
    if (orders && orders.length > 0) {
      const dayMap: Record<string, { sales: number; units: number; orders: number }> = {};
      orders.forEach((o) => {
        if (o.orderStatus === 'Canceled') return;
        const rawDate = o.purchaseDate ? o.purchaseDate.split('T')[0] : '';
        if (!rawDate) return;
        if (!dayMap[rawDate]) dayMap[rawDate] = { sales: 0, units: 0, orders: 0 };
        dayMap[rawDate].sales += (o.itemPrice || 0) * (o.quantity || 1);
        dayMap[rawDate].units += o.quantity || 1;
        dayMap[rawDate].orders += 1;
      });
      return Object.entries(dayMap)
        .map(([date, val]) => ({
          date,
          orderedProductSales: val.sales,
          unitsOrdered: val.units,
          totalOrderItems: val.orders,
          sessions: Math.round(val.units * 12),
          pageViews: Math.round(val.units * 18),
          buyBoxPercentage: 95,
          unitSessionPercentage: 8.3,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return [];
  }, [businessDays, orders]);

  // Selected time slice
  const daysSlice = useMemo(() => {
    const limit = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    return sortedRawDays.slice(-limit);
  }, [sortedRawDays, timeRange]);

  // Mapped data for Recharts with dynamic profitability
  const chartData = useMemo(() => {
    const tacosRate = metrics.tacos ? metrics.tacos / 100 : 0.11;
    const amazonCommissionRate = 0.14; // ~14% standard commission
    const cogsRate = 0.38; // ~38% standard COGS
    const fbaFeeEstimate = 12.5; // Average logistics cost per order item

    return daysSlice.map((d, index, arr) => {
      const dateObj = new Date(d.date + 'T12:00:00');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const shortLabel = !isNaN(dateObj.getDate()) ? `${day}/${month}` : d.date;
      const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weekday = !isNaN(dateObj.getDay()) ? weekdayNames[dateObj.getDay()] : '';

      const sales = d.orderedProductSales || 0;
      const units = d.unitsOrdered || 0;
      const ordersCount = d.totalOrderItems || units || 0;

      // Estimated ad spend for the day
      const adsSpend = Math.round(sales * tacosRate);
      // Estimated Amazon fees (commission + logistics)
      const amazonFees = Math.round(sales * amazonCommissionRate + ordersCount * fbaFeeEstimate);
      // Estimated COGS
      const cogs = Math.round(sales * cogsRate);
      // Net Profit
      const netProfit = Math.round(sales - adsSpend - amazonFees - cogs);
      const profitMargin = sales > 0 ? Number(safeToFixed((netProfit / sales) * 100, 1)) : 0;

      // 7-day Moving Average
      const windowStart = Math.max(0, index - 6);
      const windowDays = arr.slice(windowStart, index + 1);
      const movingAvgSales = Math.round(
        windowDays.reduce((acc, curr) => acc + (curr.orderedProductSales || 0), 0) / windowDays.length
      );

      return {
        date: d.date,
        shortLabel,
        weekday,
        displayLabel: `${shortLabel} (${weekday})`,
        vendas: sales,
        lucroLiquido: netProfit,
        margem: profitMargin,
        gastoAds: adsSpend,
        taxasAmazon: amazonFees,
        cogs,
        pedidos: ordersCount,
        unidades: units,
        mediaMovel: movingAvgSales,
      };
    });
  }, [daysSlice, metrics]);

  // Statistics over the 30-day (or chosen) period
  const stats30d = useMemo(() => {
    if (chartData.length === 0) return null;
    const totalSales = chartData.reduce((acc, curr) => acc + curr.vendas, 0);
    const totalProfit = chartData.reduce((acc, curr) => acc + curr.lucroLiquido, 0);
    const totalAds = chartData.reduce((acc, curr) => acc + curr.gastoAds, 0);
    const totalOrders = chartData.reduce((acc, curr) => acc + curr.pedidos, 0);
    const totalUnits = chartData.reduce((acc, curr) => acc + curr.unidades, 0);
    const avgDailySales = totalSales / chartData.length;
    const avgDailyProfit = totalProfit / chartData.length;
    const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    let bestDay = chartData[0];
    chartData.forEach((d) => {
      if (d.vendas > bestDay.vendas) bestDay = d;
    });

    const startDate = chartData[0]?.shortLabel || '';
    const endDate = chartData[chartData.length - 1]?.shortLabel || '';

    return {
      totalSales,
      totalProfit,
      totalAds,
      totalOrders,
      totalUnits,
      avgDailySales,
      avgDailyProfit,
      avgMargin,
      bestDay,
      startDate,
      endDate,
      daysCount: chartData.length,
    };
  }, [chartData]);

  // Visual rule helpers - Benchmarks Oficiais Amazon Brasil 2026
  const getAcosBenchmark = (acos: number | null) => {
    if (acos === null || isNaN(acos)) return { label: 'N/D', status: 'nd', textClass: 'text-slate-400', desc: 'Sem vendas atribuídas' };
    if (acos < 20) return { label: 'Excelente (< 20%)', status: 'excelente', textClass: 'text-emerald-500 dark:text-emerald-400', desc: 'Altamente lucrativo' };
    if (acos <= 30) return { label: 'Bom (20-30%)', status: 'bom', textClass: 'text-blue-500 dark:text-blue-400', desc: 'Faixa saudável de escala' };
    if (acos <= 40) return { label: 'Regular (30-40%)', status: 'regular', textClass: 'text-amber-500 dark:text-amber-400', desc: 'Revisar lances e termos' };
    return { label: 'Ruim (> 40%)', status: 'ruim', textClass: 'text-rose-500 dark:text-rose-400', desc: 'Campanha ineficiente, risco de perda' };
  };

  const getRoasBenchmark = (roas: number | null) => {
    if (roas === null || isNaN(roas)) return { label: 'N/D', status: 'nd', textClass: 'text-slate-400', desc: 'Sem dados' };
    if (roas > 5) return { label: 'Excelente (> 5x)', status: 'excelente', textClass: 'text-emerald-500 dark:text-emerald-400', desc: 'Retorno excepcional' };
    if (roas >= 3) return { label: 'Bom (3-5x)', status: 'bom', textClass: 'text-blue-500 dark:text-blue-400', desc: 'Retorno sólido' };
    if (roas >= 2) return { label: 'Regular (2-3x)', status: 'regular', textClass: 'text-amber-500 dark:text-amber-400', desc: 'Retorno no limiar' };
    return { label: 'Ruim (< 2x)', status: 'ruim', textClass: 'text-rose-500 dark:text-rose-400', desc: 'Abaixo do ideal, reotimizar' };
  };

  const getConversionBenchmark = (rate: number | null) => {
    if (rate === null || isNaN(rate)) return { label: 'N/D', status: 'nd', textClass: 'text-slate-400', desc: 'Sem sessões' };
    if (rate > 10) return { label: 'Excelente (> 10%)', status: 'excelente', textClass: 'text-emerald-500 dark:text-emerald-400', desc: 'Conversão acima da média' };
    if (rate >= 5) return { label: 'Bom (5-10%)', status: 'bom', textClass: 'text-blue-500 dark:text-blue-400', desc: 'Padrão saudável' };
    if (rate >= 3) return { label: 'Regular (3-5%)', status: 'regular', textClass: 'text-amber-500 dark:text-amber-400', desc: 'Oportunidade de melhoria' };
    return { label: 'Ruim (< 3%)', status: 'ruim', textClass: 'text-rose-500 dark:text-rose-400', desc: 'Problema de preço, fotos ou estoque' };
  };

  const getBuyBoxBenchmark = (buyBox: number | null) => {
    if (buyBox === null || isNaN(buyBox)) return { label: 'N/D', status: 'nd', textClass: 'text-slate-400', desc: 'Sem Buy Box' };
    if (buyBox >= 95) return { label: 'Ideal (> 95%)', status: 'excelente', textClass: 'text-emerald-500 dark:text-emerald-400', desc: 'Domínio da oferta' };
    if (buyBox >= 80) return { label: 'Aceitável (80-95%)', status: 'regular', textClass: 'text-amber-500 dark:text-amber-400', desc: 'Atenção a concorrentes' };
    return { label: 'Problema (< 80%)', status: 'ruim', textClass: 'text-rose-500 dark:text-rose-400', desc: 'Perda crítica de vendas' };
  };

  const getNetMarginBenchmark = (margin: number | null) => {
    if (margin === null || isNaN(margin)) return { label: 'N/D', status: 'nd', textClass: 'text-slate-400', desc: 'Sem custos informados' };
    if (margin > 25) return { label: 'Excelente (> 25%)', status: 'excelente', textClass: 'text-emerald-500 dark:text-emerald-400', desc: 'Margem saudável' };
    if (margin >= 15) return { label: 'Bom (15-25%)', status: 'bom', textClass: 'text-blue-500 dark:text-blue-400', desc: 'Lucratividade sustentável' };
    if (margin >= 10) return { label: 'Regular (10-15%)', status: 'regular', textClass: 'text-amber-500 dark:text-amber-400', desc: 'Alerta amarelo, revisar custos' };
    return { label: 'Ruim (< 10%)', status: 'ruim', textClass: 'text-rose-500 dark:text-rose-400', desc: 'Alerta vermelho: operando no limite' };
  };

  const getTacosBadge = (status: ReconciledMetrics['tacosStatus']) => {
    switch (status) {
      case 'excelente':
        return { label: 'Meta Atingida (6% a 10%)', textClass: 'text-emerald-500 dark:text-emerald-400' };
      case 'atencao':
        return { label: 'Faixa de Atenção (10% a 12%)', textClass: 'text-amber-500 dark:text-amber-400' };
      case 'critico':
        return { label: 'Acima do Teto (> 12%)', textClass: 'text-rose-500 dark:text-rose-400' };
      default:
        return { label: 'N/D', textClass: 'text-slate-400' };
    }
  };

  const acosBench = getAcosBenchmark(metrics.adsAcos);
  const roasBench = getRoasBenchmark(metrics.adsRoas);
  const convBench = getConversionBenchmark(metrics.businessConversionRate);
  const avgBuyBoxValue = metrics.businessBuyBox ?? null;
  const buyBoxBench = getBuyBoxBenchmark(avgBuyBoxValue);
  const marginBench = getNetMarginBenchmark(stats30d?.avgMargin ?? null);
  const tacosBadge = getTacosBadge(metrics.tacosStatus);

  return (
    <div className="space-y-6">
      {/* Executive Senior Consultant Diagnosis Card - Clean & Editorial */}
      <div className="bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl p-6 md:p-8 shadow-xs transition-colors relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-[#243554]">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">Auditoria Executiva</span>
              <span aria-hidden="true">·</span>
              <span>Amazon Brasil 2026</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% Client-Side</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
              1. Diagnóstico Executivo da Operação Amazon Brasil
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('action_plan')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-gradient-to-r dark:from-cyan-400 dark:to-emerald-400 dark:hover:from-cyan-300 dark:hover:to-emerald-300 text-white dark:text-slate-950 font-bold text-xs md:text-sm transition shadow-xs cursor-pointer"
            >
              Ver Plano de Ação Priorizado →
            </button>
          </div>
        </div>

        {/* 3 Core Analytical Insights - Ultra-Clean */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-4.5 rounded-xl border border-slate-100 dark:border-[#1e2f4a]">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>O que Aconteceu no Período</span>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300 text-xs md:text-sm">
              A loja movimentou{' '}
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {metrics.businessSales > 0 ? formatBRL(metrics.businessSales) : formatBRL(metrics.ordersShippedGross)}
              </strong>{' '}
              em vendas com{' '}
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {metrics.businessOrders || metrics.ordersCountShipped} pedidos
              </strong>{' '}
              faturados e taxa média de conversão comercial de{' '}
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {metrics.businessConversionRate !== null ? `${safeToFixed(metrics.businessConversionRate, 2)}%` : 'N/D'}
              </strong>.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-4.5 rounded-xl border border-slate-100 dark:border-[#1e2f4a]">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Eficiência de Publicidade & TACoS</span>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300 text-xs md:text-sm">
              Gasto consolidado de anúncios:{' '}
              <strong className="text-slate-900 dark:text-white font-extrabold">{formatBRL(metrics.adsSpend)}</strong>, gerando um TACoS de{' '}
              <strong className={`font-extrabold ${metrics.tacos && metrics.tacos > 12 ? 'text-rose-600 dark:text-rose-400' : metrics.tacos && metrics.tacos > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {metrics.tacos !== null ? `${safeToFixed(metrics.tacos, 2)}%` : 'N/D'}
              </strong>{' '}
              (meta de mercado: 6% a 10%). Ads representou{' '}
              <strong className="text-slate-900 dark:text-white font-extrabold">
                {metrics.adsSalesShare !== null ? `${safeToFixed(metrics.adsSalesShare, 1)}%` : 'N/D'}
              </strong> da receita comercial.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-4.5 rounded-xl border border-slate-100 dark:border-[#1e2f4a]">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-2 text-sm">
              <AlertCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Ação Imediata Recomendada</span>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300 text-xs md:text-sm">
              Conter termos de busca com 10-15 cliques e zero conversão identificados e revisar SKUs com gasto Ads superior a 1x seu Preço Médio de Venda (PMV) sem vendas geradas.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Premium SaaS Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Comercial */}
        <div className="dashboard-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span>Faturamento</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/20">
                Oficial
              </span>
            </div>
            <p className="metric-value tabular-nums">
              {metrics.businessSales > 0 ? formatBRL(metrics.businessSales) : formatBRL(metrics.ordersShippedGross)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Ticket Médio:</span>
            <strong className="text-white font-bold tabular-nums">
              {formatBRL(metrics.businessAvgTicket || metrics.ordersAvgTicket)}
            </strong>
          </div>
        </div>

        {/* Gasto Ads Consolidado */}
        <div className="dashboard-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Megaphone className="w-4 h-4" />
                </div>
                <span>Investimento Ads</span>
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                metrics.tacos && metrics.tacos > 12
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                TACoS {metrics.tacos !== null ? `${safeToFixed(metrics.tacos, 1)}%` : 'N/D'}
              </span>
            </div>
            <p className="metric-value text-amber-300 tabular-nums">
              {formatBRL(metrics.adsSpend)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Cliques / CPC:</span>
            <strong className="text-white font-bold tabular-nums">
              {metrics.adsClicks.toLocaleString('pt-BR')} · {formatBRL(metrics.adsCpc || 0)}
            </strong>
          </div>
        </div>

        {/* Vendas Atribuídas ao Ads */}
        <div className="dashboard-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>Vendas Ads (7-14d)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/20">
                {metrics.adsSalesShare !== null ? `${safeToFixed(metrics.adsSalesShare, 1)}% Loja` : 'N/D'}
              </span>
            </div>
            <p className="metric-value text-cyan-300 tabular-nums">
              {formatBRL(metrics.adsSalesAttributed)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>ROAS Médio:</span>
            <strong className="text-cyan-300 font-bold">
              {metrics.adsRoasLabel}
            </strong>
          </div>
        </div>

        {/* Pedidos & Conversão */}
        <div className="dashboard-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span>Pedidos & Conversão</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                {metrics.businessConversionRate !== null ? `${safeToFixed(metrics.businessConversionRate, 2)}% conv.` : 'N/D'}
              </span>
            </div>
            <p className="metric-value text-emerald-300 tabular-nums">
              {formatNum(metrics.businessOrders || metrics.ordersCountShipped)}{' '}
              <span className="text-sm font-normal text-slate-400">pedidos</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Sessões Totais:</span>
            <strong className="text-white font-bold tabular-nums">
              {metrics.businessSessions.toLocaleString('pt-BR')}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================
          BENCHMARKS DE MERCADO (AMAZON BRASIL 2026) - CLEAN MATRIX
         ======================================================== */}
      <div className="bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#243554]">
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>KPIs de Referência do Mercado Amazon Brasil (2026)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Confronto direto dos indicadores da conta com as metas oficiais de rentabilidade e eficiência
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            TACoS Atual: <strong className={tacosBadge.textClass}>{metrics.tacos !== null ? `${safeToFixed(metrics.tacos, 2)}%` : 'N/D'}</strong> (Meta: 6% a 10%)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {/* 1. ACOS */}
          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">ACOS Médio</span>
              <span className={`font-bold ${acosBench.textClass}`}>{acosBench.label}</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {metrics.adsAcosLabel}
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>&lt; 20% Excelente · 20-30% Bom</div>
              <div>30-40% Regular · &gt; 40% Ruim</div>
            </div>
          </div>

          {/* 2. ROAS */}
          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">ROAS Médio</span>
              <span className={`font-bold ${roasBench.textClass}`}>{roasBench.label}</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {metrics.adsRoasLabel}
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>&gt; 5 Excelente · 3-5 Bom</div>
              <div>2-3 Regular · &lt; 2 Ruim</div>
            </div>
          </div>

          {/* 3. Conversão */}
          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Conversão</span>
              <span className={`font-bold ${convBench.textClass}`}>{convBench.label}</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {metrics.businessConversionRate !== null ? `${safeToFixed(metrics.businessConversionRate, 2)}%` : 'N/D'}
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>&gt; 10% Excelente · 5-10% Bom</div>
              <div>3-5% Regular · &lt; 3% Ruim</div>
            </div>
          </div>

          {/* 4. Buy Box */}
          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Buy Box Média</span>
              <span className={`font-bold ${buyBoxBench.textClass}`}>{buyBoxBench.label}</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {formatPercentage(avgBuyBoxValue)}
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>&gt; 95% Ideal · 80-95% Aceitável</div>
              <div>&lt; 80% Problema</div>
            </div>
          </div>

          {/* 5. Margem Líquida */}
          <div className="bg-slate-50 dark:bg-[#0f1a2d] p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Margem Líquida</span>
              <span className={`font-bold ${marginBench.textClass}`}>{marginBench.label}</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {stats30d?.avgMargin ? `${(stats30d.avgMargin ?? 0).toFixed(1)}%` : '18.5% est.'}
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <div>&gt; 25% Excelente · 15-25% Bom</div>
              <div>10-15% Regular · &lt; 10% Ruim</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          EXECUTIVE MONTH-OVER-MONTH (MoM) COMPARISON CARD
         ======================================================== */}
      {(momAnalysis.months.length > 0 || (businessDays && businessDays.length > 0)) && (
        <div className="bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl p-6 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#243554]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/20 dark:border-cyan-400/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                    Comparativo Mês a Mês (Month-over-Month MoM)
                  </h3>
                  {momAnalysis.totalMonths > 1 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      · {momAnalysis.totalMonths} meses auditados
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confronto de crescimento entre períodos civis, evolução de volume e taxa de conversão
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onNavigateTab('commercial', 'mom')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#0f1a2d] dark:hover:bg-[#1a2b47] border border-slate-200 dark:border-[#243554] text-slate-700 dark:text-cyan-300 text-xs font-semibold transition cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Comparativo MoM</span>
              </button>

              <button
                onClick={() => onNavigateTab('commercial', 'daily')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#0f1a2d] dark:hover:bg-[#1a2b47] border border-slate-200 dark:border-[#243554] text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-500" />
                <span>Relatório Diário</span>
              </button>

              <button
                onClick={() => onNavigateTab('commercial', 'weekdays')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold transition cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>{championDay ? `Pico: ${championDay.name}` : 'Dias que Mais Vendem'}</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </div>

          {momAnalysis.months.length >= 2 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {/* Card 1: Faturamento Recente vs Anterior */}
              <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#243554] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                      Faturamento MoM
                    </span>
                    {momAnalysis.latestMonth?.deltaVsPrevMonth && (
                      <span
                        className={`text-xs font-bold flex items-center gap-0.5 ${
                          momAnalysis.latestMonth.deltaVsPrevMonth.deltaSalesPct >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {momAnalysis.latestMonth.deltaVsPrevMonth.deltaSalesPct >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {formatPct(Math.abs(momAnalysis.latestMonth.deltaVsPrevMonth.deltaSalesPct))} MoM
                      </span>
                    )}
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                    {formatBRL(momAnalysis.latestMonth?.orderedProductSales)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Mês: <strong className="text-slate-800 dark:text-cyan-300">{momAnalysis.latestMonth?.shortLabel}</strong></span>
                  {momAnalysis.previousMonth && (
                    <span className="text-slate-500">
                      Ant.: {formatBRL(momAnalysis.previousMonth.orderedProductSales)}
                    </span>
                  )}
                </div>
              </div>

              {/* Card 2: Pedidos & Unidades */}
              <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#243554] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-cyan-500" />
                      Volume de Pedidos
                    </span>
                    {momAnalysis.latestMonth?.deltaVsPrevMonth && (
                      <span
                        className={`text-xs font-bold flex items-center gap-0.5 ${
                          momAnalysis.latestMonth.deltaVsPrevMonth.deltaOrdersPct >= 0
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {momAnalysis.latestMonth.deltaVsPrevMonth.deltaOrdersPct >= 0 ? '+' : ''}
                        {formatPct(momAnalysis.latestMonth.deltaVsPrevMonth.deltaOrdersPct)}
                      </span>
                    )}
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                    {formatNum(momAnalysis.latestMonth?.totalOrderItems)}{' '}
                    <span className="text-xs font-normal text-slate-500">pedidos</span>
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{formatNum(momAnalysis.latestMonth?.unitsOrdered)} un</span>
                  <span className="text-slate-700 dark:text-cyan-300 font-semibold">
                    Ticket: {formatBRL(momAnalysis.latestMonth?.aov)}
                  </span>
                </div>
              </div>

              {/* Card 3: Taxa de Conversão */}
              <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#243554] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-purple-500" />
                      Conversão MoM
                    </span>
                    {momAnalysis.latestMonth?.deltaVsPrevMonth && (
                      <span
                        className={`text-xs font-bold flex items-center gap-0.5 ${
                          momAnalysis.latestMonth.deltaVsPrevMonth.deltaConversionRatePoints >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {momAnalysis.latestMonth.deltaVsPrevMonth.deltaConversionRatePoints >= 0 ? '+' : ''}
                        {safeToFixed(momAnalysis.latestMonth.deltaVsPrevMonth.deltaConversionRatePoints, 2)} p.p.
                      </span>
                    )}
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                    {formatPct(momAnalysis.latestMonth?.conversionRate)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{formatNum(momAnalysis.latestMonth?.sessions)} sessões</span>
                  <span>BuyBox: {formatPct(momAnalysis.latestMonth?.buyBoxPercentage)}</span>
                </div>
              </div>

              {/* Card 4: Melhor Mês da Série */}
              <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Melhor Mês Registrado
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Pico</span>
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-300 mt-1 tabular-nums">
                    {formatBRL(momAnalysis.bestMonth?.orderedProductSales)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-[#1e2f4a] text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{momAnalysis.bestMonth?.monthLabel}</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {formatNum(momAnalysis.bestMonth?.totalOrderItems)} pedidos
                  </span>
                </div>
              </div>
            </div>
          ) : momAnalysis.biweeklyBreakdown ? (
            <div className="mt-4 bg-slate-50 dark:bg-[#0b1320] border border-slate-200 dark:border-[#243554] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Evolução Quinzenal do Mês Civil ({momAnalysis.latestMonth?.monthLabel || 'Mês Atual'})
                </span>
                <span className={`text-xs font-bold ${momAnalysis.biweeklyBreakdown.deltaSalesPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {momAnalysis.biweeklyBreakdown.deltaSalesPct >= 0 ? '+' : ''}{formatPct(momAnalysis.biweeklyBreakdown.deltaSalesPct)} na 2ª Quinzena
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-[#0f1a2d] p-3 rounded-lg border border-slate-200 dark:border-[#1e2f4a]">
                  <span className="text-slate-500 block text-[11px] font-medium">{momAnalysis.biweeklyBreakdown.firstHalf.label}</span>
                  <strong className="text-slate-900 dark:text-white text-base font-extrabold block mt-0.5 tabular-nums">
                    {formatBRL(momAnalysis.biweeklyBreakdown.firstHalf.orderedProductSales)}
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    {formatNum(momAnalysis.biweeklyBreakdown.firstHalf.totalOrderItems)} pedidos · Ticket: {formatBRL(momAnalysis.biweeklyBreakdown.firstHalf.aov)}
                  </span>
                </div>
                <div className="bg-white dark:bg-[#0f1a2d] p-3 rounded-lg border border-slate-200 dark:border-[#1e2f4a]">
                  <span className="text-slate-500 block text-[11px] font-medium">{momAnalysis.biweeklyBreakdown.secondHalf.label}</span>
                  <strong className="text-slate-900 dark:text-white text-base font-extrabold block mt-0.5 tabular-nums">
                    {formatBRL(momAnalysis.biweeklyBreakdown.secondHalf.orderedProductSales)}
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    {formatNum(momAnalysis.biweeklyBreakdown.secondHalf.totalOrderItems)} pedidos · Ticket: {formatBRL(momAnalysis.biweeklyBreakdown.secondHalf.aov)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              Carregue os relatórios de Pedidos ou Business Report para apurar a evolução temporal mês a mês.
            </p>
          )}
        </div>
      )}

      {/* ========================================================
          SEÇÃO 2: GRÁFICOS DINÂMICOS & TOP PRODUTOS (LADO A LADO)
         ======================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Painel do Gráfico Principal (8 colunas em telas grandes) */}
        <div className="xl:col-span-8 glass-panel p-6 md:p-8 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-[#243554]">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" />
                Gráficos Dinâmicos
              </span>
              <span aria-hidden="true">·</span>
              <span>Vendas Diárias, Lucratividade & Margem</span>
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight flex items-center gap-2.5">
              <span>Evolução das Vendas Diárias & Lucratividade</span>
              {stats30d && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0f1a2d] text-slate-600 dark:text-cyan-300 border border-slate-200 dark:border-[#1e2f4a]">
                  {stats30d.daysCount} Dias ({stats30d.startDate} a {stats30d.endDate})
                </span>
              )}
            </h3>
          </div>

          {/* Controls: Period and Moving Average */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-[#0f1a2d] p-1 rounded-xl border border-slate-200 dark:border-[#1e2f4a] text-xs font-semibold">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  timeRange === '7d'
                    ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setTimeRange('14d')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  timeRange === '14d'
                    ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                14 Dias
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  timeRange === '30d'
                    ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                30 Dias
              </button>
            </div>

            <button
              onClick={() => setShowMovingAverage(!showMovingAverage)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                showMovingAverage
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-xs'
                  : 'bg-slate-100 dark:bg-[#0f1a2d] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#1e2f4a]'
              }`}
              title="Alternar exibição da linha de média móvel de 7 dias"
            >
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span>Média Móvel 7d</span>
            </button>
          </div>
        </div>

        {/* 5 Period KPI Summary Badges */}
        {stats30d && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Faturamento */}
            <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#1e2f4a] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Faturamento ({stats30d.daysCount}d)
              </span>
              <p className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatBRL(stats30d.totalSales)}
              </p>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-300 block mt-1">
                Média: <strong>{formatBRL(stats30d.avgDailySales)}</strong>/dia
              </span>
            </div>

            {/* 2. Lucro Líquido */}
            <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-emerald-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Lucro Líquido Est.
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                  {safeToFixed(stats30d.avgMargin, 1)}%
                </span>
              </div>
              <p className="text-lg md:text-xl font-extrabold text-emerald-600 dark:text-emerald-300 tabular-nums mt-0.5">
                {formatBRL(stats30d.totalProfit)}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                Média: <strong className="text-emerald-600 dark:text-emerald-400">{formatBRL(stats30d.avgDailyProfit)}</strong>/dia
              </span>
            </div>

            {/* 3. Pedidos & Unidades */}
            <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#1e2f4a] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Volume de Pedidos
              </span>
              <p className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatNum(stats30d.totalOrders)}{' '}
                <span className="text-xs font-normal text-slate-500">pedidos</span>
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                {formatNum(stats30d.totalUnits)} unidades vendidas
              </span>
            </div>

            {/* 4. Investimento Ads */}
            <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#1e2f4a] rounded-xl p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Investimento Ads ({stats30d.daysCount}d)
              </span>
              <p className="text-lg md:text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                {formatBRL(stats30d.totalAds)}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                TACoS do período:{' '}
                <strong className="text-amber-600 dark:text-amber-300">
                  {stats30d.totalSales > 0
                    ? safeToFixed((stats30d.totalAds / stats30d.totalSales) * 100, 1)
                    : 0}
                  %
                </strong>
              </span>
            </div>

            {/* 5. Melhor Dia de Vendas */}
            <div className="bg-slate-50 dark:bg-[#0f1a2d] border border-cyan-500/30 rounded-xl p-3.5 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                  Melhor Dia (Pico)
                </span>
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {formatBRL(stats30d.bestDay?.vendas)}
              </p>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-300 block mt-1">
                {stats30d.bestDay?.shortLabel} ({stats30d.bestDay?.weekday}) · {stats30d.bestDay?.pedidos} pedidos
              </span>
            </div>
          </div>
        )}

        {/* Chart View Modes Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold border-b border-slate-200 dark:border-[#1e2f4a]">
          <button
            onClick={() => setChartMode('combined')}
            className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              chartMode === 'combined'
                ? 'bg-slate-900 text-white dark:bg-[#0f1a2d] dark:text-cyan-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-500" />
            <span>Visão Integrada (Vendas & Lucro)</span>
          </button>

          <button
            onClick={() => setChartMode('sales')}
            className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              chartMode === 'sales'
                ? 'bg-slate-900 text-white dark:bg-[#0f1a2d] dark:text-cyan-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-cyan-500" />
            <span>Evolução de Vendas & Pedidos</span>
          </button>

          <button
            onClick={() => setChartMode('profit')}
            className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              chartMode === 'profit'
                ? 'bg-slate-900 text-white dark:bg-[#0f1a2d] dark:text-emerald-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Lucro Líquido & Margem (%)</span>
          </button>

          <button
            onClick={() => setChartMode('breakdown')}
            className={`px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              chartMode === 'breakdown'
                ? 'bg-slate-900 text-white dark:bg-[#0f1a2d] dark:text-purple-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-500" />
            <span>DRE Diária (Receita x Custos)</span>
          </button>
        </div>

        {/* Dynamic Recharts Canvas */}
        <div id="executive-main-chart" className="h-[340px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'combined' ? (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="currentColor" opacity={0.08} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `R$ ${safeToFixed(val / 1000, 0)}k` : `R$ ${val}`)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#243554] p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[210px]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-[#1e2f4a]">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                            {d.date} ({d.weekday})
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-cyan-300">
                            {d.pedidos} pedidos
                          </span>
                        </div>
                        <div className="space-y-1 pt-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Faturamento:</span>
                            <strong className="text-slate-900 dark:text-white tabular-nums">{formatBRL(d.vendas)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Lucro Líquido:</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{formatBRL(d.lucroLiquido)}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Margem:</span>
                            <strong className="text-purple-600 dark:text-purple-300 tabular-nums">{safeToFixed(d.margem, 1)}%</strong>
                          </div>
                          {d.mediaMovel > 0 && showMovingAverage && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Média 7d:</span>
                              <span className="text-amber-600 dark:text-amber-300 tabular-nums">{formatBRL(d.mediaMovel)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="vendas" name="Faturamento Bruto (R$)" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="lucroLiquido" name="Lucro Líquido (R$)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                {showMovingAverage && (
                  <Line type="monotone" dataKey="mediaMovel" name="Média Móvel (7d)" stroke="#f59e0b" strokeWidth={1.75} strokeDasharray="4 4" dot={false} />
                )}
              </ComposedChart>
            ) : chartMode === 'sales' ? (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSalesOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="currentColor" opacity={0.08} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#94a3b8" fontSize={11} tickLine={false} dy={6} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => (val >= 1000 ? `R$ ${safeToFixed(val / 1000, 0)}k` : `R$ ${val}`)} />
                <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={11} tickLine={false} tickFormatter={(val) => `${val} un`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#243554] p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[190px]">
                        <span className="font-bold text-slate-900 dark:text-white block pb-1 border-b border-slate-100 dark:border-[#1e2f4a]">
                          {d.date} ({d.weekday})
                        </span>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vendas:</span>
                          <strong className="text-cyan-600 dark:text-cyan-300 tabular-nums">{formatBRL(d.vendas)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pedidos:</span>
                          <strong className="text-slate-900 dark:text-white tabular-nums">{d.pedidos} pedidos</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Unidades:</span>
                          <strong className="text-sky-600 dark:text-sky-300 tabular-nums">{d.unidades} un</strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
                <Bar yAxisId="right" dataKey="unidades" name="Unidades Vendidas" fill="#0284c7" opacity={0.6} radius={[4, 4, 0, 0]} />
                <Area yAxisId="left" type="monotone" dataKey="vendas" name="Faturamento (R$)" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorSalesOnly)" />
                {showMovingAverage && (
                  <Line yAxisId="left" type="monotone" dataKey="mediaMovel" name="Média Móvel (7d)" stroke="#f59e0b" strokeWidth={1.75} strokeDasharray="4 4" dot={false} />
                )}
              </ComposedChart>
            ) : chartMode === 'profit' ? (
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfitOnly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="currentColor" opacity={0.08} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#94a3b8" fontSize={11} tickLine={false} dy={6} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => (val >= 1000 ? `R$ ${safeToFixed(val / 1000, 0)}k` : `R$ ${val}`)} />
                <YAxis yAxisId="right" orientation="right" stroke="#a855f7" fontSize={11} domain={[0, 45]} tickLine={false} tickFormatter={(val) => `${val}%`} />
                <ReferenceLine yAxisId="right" y={20} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Meta Margem 20%', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#243554] p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[200px]">
                        <span className="font-bold text-slate-900 dark:text-white block pb-1 border-b border-slate-100 dark:border-[#1e2f4a]">
                          {d.date} ({d.weekday})
                        </span>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Lucro Líquido:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{formatBRL(d.lucroLiquido)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Margem Líquida:</span>
                          <strong className="text-purple-600 dark:text-purple-300 tabular-nums">{safeToFixed(d.margem, 1)}%</strong>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
                <Area yAxisId="left" type="monotone" dataKey="lucroLiquido" name="Lucro Líquido (R$)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfitOnly)" />
                <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem Líquida (%)" stroke="#c084fc" strokeWidth={2} dot={{ r: 2.5, fill: '#c084fc' }} />
              </ComposedChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="currentColor" opacity={0.08} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#94a3b8" fontSize={11} tickLine={false} dy={6} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => (val >= 1000 ? `R$ ${safeToFixed(val / 1000, 0)}k` : `R$ ${val}`)} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#243554] p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[210px]">
                        <span className="font-bold text-slate-900 dark:text-white block pb-1 border-b border-slate-100 dark:border-[#1e2f4a]">
                          DRE Diária: {d.date} ({d.weekday})
                        </span>
                        <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                          <span>Receita Bruta:</span>
                          <span className="tabular-nums text-cyan-600 dark:text-cyan-300">{formatBRL(d.vendas)}</span>
                        </div>
                        <div className="space-y-1 text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-[#1e2f4a] text-[11px]">
                          <div className="flex justify-between">
                            <span>(-) Custo Produto (CMV):</span>
                            <span className="tabular-nums">{formatBRL(d.cogs)}</span>
                          </div>
                          <div className="flex justify-between text-amber-600 dark:text-amber-400">
                            <span>(-) Taxas Amazon:</span>
                            <span className="tabular-nums">{formatBRL(d.taxasAmazon)}</span>
                          </div>
                          <div className="flex justify-between text-rose-600 dark:text-rose-400">
                            <span>(-) Gasto com Ads:</span>
                            <span className="tabular-nums">{formatBRL(d.gastoAds)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-100 dark:border-[#1e2f4a]">
                            <span>(=) Lucro Líquido:</span>
                            <span className="tabular-nums">{formatBRL(d.lucroLiquido)} ({safeToFixed(d.margem, 1)}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }} />
                <Bar dataKey="cogs" name="CMV Produtos" stackId="a" fill="#94a3b8" />
                <Bar dataKey="taxasAmazon" name="Taxas Amazon" stackId="a" fill="#f59e0b" />
                <Bar dataKey="gastoAds" name="Investimento Ads" stackId="a" fill="#f43f5e" />
                <Bar dataKey="lucroLiquido" name="Lucro Líquido" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Analytical Insights Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#1e2f4a] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Margem operacional média no período:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{safeToFixed(stats30d?.avgMargin, 1)}%</strong>
              {stats30d && stats30d.avgMargin >= 18 ? ' (Saudável frente à meta de 15-25%)' : ' (Abaixo do patamar de segurança)'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>
              Pico de Faturamento: <strong className="text-slate-900 dark:text-cyan-300 font-semibold">{stats30d?.bestDay?.shortLabel} ({formatBRL(stats30d?.bestDay?.vendas)})</strong>
            </span>
            <span>
              Conversão: <strong className="text-slate-900 dark:text-amber-300 font-semibold">{metrics.businessConversionRate !== null ? `${safeToFixed(metrics.businessConversionRate, 2)}%` : 'N/D'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Painel da Tabela / Lista de Top 5 Produtos (4 colunas em telas grandes) */}
      <div className="xl:col-span-4 glass-panel p-6 flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Top 5 Produtos em Vendas</h4>
                <p className="text-[11px] text-slate-400">Líderes de faturamento no período</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              Curva A
            </span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Carregue o Relatório de Pedidos ou Curva ABC para apurar os Top 5 produtos.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, idx) => {
                const maxSales = topProducts[0]?.grossSales || 1;
                const pctOfTop = Math.min(100, Math.max(5, Math.round((p.grossSales / maxSales) * 100)));
                return (
                  <div
                    key={p.sku || idx}
                    className="p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:border-blue-400/25 transition-all space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-950'
                              : idx === 2
                              ? 'bg-amber-700 text-amber-100'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span
                          className="text-xs font-semibold text-white truncate max-w-[150px] sm:max-w-[210px]"
                          title={p.title || p.sku}
                        >
                          {p.title || p.sku}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-blue-300 tabular-nums shrink-0">
                        {formatBRL(p.grossSales)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono text-[10px] truncate max-w-[130px]">{p.sku}</span>
                      <span>{formatNum(p.unitsSold)} un vendidas</span>
                    </div>

                    {/* Mini visual revenue bar */}
                    <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${pctOfTop}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-white/10">
          <button
            onClick={() => onNavigateTab('abc_curve')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-xs font-bold text-blue-300 hover:text-white transition cursor-pointer"
          >
            <span>Ver Catálogo Completo & Curva ABC</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

      {/* Alert Banners: Distinguishing Proven Issues vs Hypotheses under Investigation */}
      <div className="bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Alertas da Auditoria (Problemas Comprovados vs Hipóteses sob Investigação)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Proven Issues */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400">
                Problema Comprovado
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {metrics.tacos && metrics.tacos > 12 ? 'Compressão Severa da Margem pelo Ads' : 'Alocação de Verba Ads'}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              O TACoS consolidado está em <strong className="text-slate-900 dark:text-white font-extrabold">{metrics.tacos !== null ? `${safeToFixed(metrics.tacos, 2)}%` : 'N/D'}</strong>. O valor investido em publicidade ({formatBRL(metrics.adsSpend)}) reduz diretamente o lucro líquido da operação. Recomendada revisão de lances e orçamentos em campanhas acima da margem.
            </p>
          </div>

          {/* Hypotheses under Investigation */}
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400">
                Hipótese sob Investigação
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Possível Canibalização de Marca & Termos Genéricos
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              A participação atribuída ao Ads de <strong className="text-slate-900 dark:text-white font-extrabold">{metrics.adsSalesShare !== null ? `${safeToFixed(metrics.adsSalesShare, 1)}%` : 'N/D'}</strong> indica que parte das conversões pode estar ocorrendo em buscas de clientes que já conhecem a marca. Não corte anúncios de defesa sem testar o impacto na Buy Box e tráfego orgânico.
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliation Box between Business Report & All Orders */}
      <div className="bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#243554]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-500" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Conciliação Entre Fontes: Relatório Comercial vs Todos os Pedidos
            </h4>
          </div>
          <span className="text-xs text-slate-600 dark:text-cyan-300 font-mono font-semibold">
            Diferença: {formatBRL(metrics.discrepancySales)} ({safeToFixed(metrics.discrepancyPercent, 1)}%)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs md:text-sm">
          <div className="p-4 bg-slate-50 dark:bg-[#0f1a2d] rounded-xl border border-slate-200 dark:border-[#1e2f4a]">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Relatório Comercial (Business Report)</span>
            <p className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">{formatBRL(metrics.businessSales)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {metrics.businessOrders} pedidos encomendados · Base oficial comercial
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#0f1a2d] rounded-xl border border-slate-200 dark:border-[#1e2f4a]">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Pedidos Enviados / Faturados (Shipped)</span>
            <p className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{formatBRL(metrics.ordersShippedGross)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {metrics.ordersCountShipped} pedidos concluídos · Base operacional real
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#0f1a2d] rounded-xl border border-slate-200 dark:border-[#1e2f4a]">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Pedidos Pendentes & Cancelados</span>
            <p className="text-xl md:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {formatBRL(metrics.ordersPendingGross + metrics.ordersCanceledGross)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Pendentes: {formatBRL(metrics.ordersPendingGross)} · Cancelados: {formatBRL(metrics.ordersCanceledGross)}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-[#0f1a2d] p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a]">
          <p className="font-bold text-slate-900 dark:text-cyan-300">Regra de Ouro da Auditoria:</p>
          <p className="leading-relaxed">
            O faturamento do Relatório Comercial NÃO deve ser somado ao de Todos os Pedidos. São duas perspectivas do mesmo negócio: o Comercial foca em visualizações e pedidos encomendados no instante da compra; Todos os Pedidos detalha a logística de faturamento, frete e status de envio.
          </p>
        </div>
      </div>

      {/* Structured Descriptors Table: Fonte x Fórmula x Período x Status */}
      {metrics.kpiList && metrics.kpiList.length > 0 && (
        <div className="bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#243554]">
            <BookOpen className="w-4 h-4 text-cyan-500" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Matriz Analítica de Governança dos KPIs (Fórmulas & Trilha de Origem)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-[#0f1a2d] text-slate-700 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-[#243554] text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Métrica / KPI</th>
                  <th className="py-2.5 px-3">Valor Apurado</th>
                  <th className="py-2.5 px-3">Fórmula Oficial</th>
                  <th className="py-2.5 px-3">Fonte(s) & Colunas</th>
                  <th className="py-2.5 px-3">Escopo & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1e2f4a]">
                {metrics.kpiList.map((kpi) => (
                  <tr key={kpi.key} className="hover:bg-slate-50 dark:hover:bg-[#1a2b47]/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{kpi.label}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-cyan-300 tabular-nums">{kpi.formatted}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{kpi.formula}</td>
                    <td className="py-2.5 px-3 text-[11px]">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{kpi.sources.join(', ')}</div>
                      <div className="text-slate-500 text-[10px]">{kpi.columns.join(' | ')}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-semibold ${
                        kpi.status === 'calculado'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : kpi.status === 'estimado'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500'
                      }`}>
                        {kpi.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

