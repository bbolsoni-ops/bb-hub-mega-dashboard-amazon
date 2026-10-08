import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Percent,
  DollarSign,
  ArrowUpDown,
  Filter,
  BarChart3,
  Layers,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  Scale,
  ShoppingBag,
  Package,
  Clock,
  Truck,
  Minus,
  Trophy,
  Award,
  Crown,
} from 'lucide-react';
import { BusinessDayRow, OrderItemRow } from '../types/amazon';
import { formatPercentage } from '../utils/formatters';
import {
  calculateMonthOverMonth,
  MonthOverMonthAnalysis,
  MonthlyMetrics,
} from '../utils/monthOverMonth';

interface CommercialViewProps {
  businessDays: BusinessDayRow[];
  orders: OrderItemRow[];
  initialSubTab?: 'mom' | 'daily' | 'weekdays';
}

export const CommercialView: React.FC<CommercialViewProps> = ({
  businessDays,
  orders,
  initialSubTab,
}) => {
  // Navigation between MoM, Daily, and Weekdays
  const [activeSubTab, setActiveSubTab] = useState<'mom' | 'daily' | 'weekdays'>(initialSubTab || 'mom');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Daily table state
  const [sortField, setSortField] = useState<keyof BusinessDayRow>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate MoM analysis
  const momAnalysis: MonthOverMonthAnalysis = useMemo(() => {
    return calculateMonthOverMonth(businessDays, orders);
  }, [businessDays, orders]);

  // Direct confrontation month selection
  const [selectedMonthA, setSelectedMonthA] = useState<string>(() => {
    if (momAnalysis.months.length >= 1) {
      return momAnalysis.months[momAnalysis.months.length - 1].monthKey;
    }
    return '';
  });

  const [selectedMonthB, setSelectedMonthB] = useState<string>(() => {
    if (momAnalysis.months.length >= 2) {
      return momAnalysis.months[momAnalysis.months.length - 2].monthKey;
    }
    if (momAnalysis.months.length === 1) {
      return momAnalysis.months[0].monthKey;
    }
    return '';
  });

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNum = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return val.toLocaleString('pt-BR');
  };

  const formatPct = (val: number | null | undefined) => {
    return formatPercentage(val);
  };

  // Sort daily rows
  const sortedDays = useMemo(() => {
    return [...businessDays].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [businessDays, sortField, sortOrder]);

  const filteredDays = sortedDays.filter((d) => d.date.includes(searchTerm));

  // Max value for SVG daily chart scaling
  const maxDailySales = Math.max(...businessDays.map((d) => d.orderedProductSales), 1);

  // Group by day of week
  const dayOfWeekAgg = useMemo(() => {
    const agg: { [key: number]: { sales: number; count: number; sessions: number; units: number } } = {};
    for (let i = 0; i < 7; i++) agg[i] = { sales: 0, count: 0, sessions: 0, units: 0 };

    businessDays.forEach((d) => {
      const dateObj = new Date(d.date + 'T12:00:00');
      const dayIndex = dateObj.getDay();
      if (!isNaN(dayIndex)) {
        agg[dayIndex].sales += d.orderedProductSales;
        agg[dayIndex].sessions += d.sessions;
        agg[dayIndex].units += d.unitsOrdered;
        agg[dayIndex].count += 1;
      }
    });
    return agg;
  }, [businessDays]);

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Ranked weekdays from highest selling to lowest selling (Sazonalidade Semanal)
  const rankedWeekdays = useMemo(() => {
    const list = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
      const data = dayOfWeekAgg[dayIdx] || { sales: 0, count: 0, sessions: 0, units: 0 };
      const avgSales = data.count > 0 ? data.sales / data.count : 0;
      const avgSessions = data.count > 0 ? Math.round(data.sessions / data.count) : 0;
      const avgUnits = data.count > 0 ? Math.round((data.units / data.count) * 10) / 10 : 0;
      const conversionRate = data.sessions > 0 ? (data.units / data.sessions) * 100 : 0;
      const aov = data.units > 0 ? data.sales / data.units : 0;
      return {
        dayIndex: dayIdx,
        name: dayNames[dayIdx],
        totalSales: data.sales,
        avgSales,
        totalSessions: data.sessions,
        avgSessions,
        totalUnits: data.units,
        avgUnits,
        conversionRate,
        aov,
        daysCount: data.count,
      };
    });

    const totalAllSales = list.reduce((acc, d) => acc + d.totalSales, 0);
    const withShare = list.map((item) => ({
      ...item,
      salesSharePct: totalAllSales > 0 ? (item.totalSales / totalAllSales) * 100 : 0,
    }));

    return withShare.sort((a, b) => b.avgSales - a.avgSales);
  }, [dayOfWeekAgg]);

  // Month A and Month B metrics for confrontation
  const monthAMetrics = momAnalysis.months.find((m) => m.monthKey === selectedMonthA);
  const monthBMetrics = momAnalysis.months.find((m) => m.monthKey === selectedMonthB);

  // Confrontation calculation helper
  const getConfrontationDelta = (valA: number, valB: number) => {
    const diff = valA - valB;
    const pct = valB > 0 ? (diff / valB) * 100 : 0;
    return { diff, pct };
  };

  return (
    <div className="space-y-6">
      {/* View Header with Subtab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-cyan-400" />
            <span>Comercial, Mês a Mês (MoM), Dia a Dia & Dias da Semana</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Visão temporal 360°: comparativo mensal MoM, relatório diário detalhado e ranking dos dias da semana que mais vendem
          </p>
        </div>

        {/* Subtab Toggle Buttons */}
        <div className="flex items-center gap-1.5 bg-[#0b1320] p-1.5 rounded-xl border border-[#243554] overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('mom')}
            className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'mom'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1a2b47]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>1. Mês a Mês (MoM)</span>
            {momAnalysis.totalMonths > 1 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-cyan-200 font-extrabold">
                {momAnalysis.totalMonths} meses
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('daily')}
            className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'daily'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1a2b47]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>2. Relatório Dia a Dia</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-cyan-200 font-extrabold">
              {businessDays.length} dias
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('weekdays')}
            className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'weekdays'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-[#1a2b47]'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>3. Dias que Mais Vendem</span>
            {rankedWeekdays[0] && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                Top: {rankedWeekdays[0].name}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: COMPARATIVO MÊS A MÊS (MoM)
         ======================================================== */}
      {activeSubTab === 'mom' && (
        <div className="space-y-6">
          {/* MoM Executive Ribbon Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Faturamento MoM */}
            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Faturamento do Mês Recente
                  </span>
                  {momAnalysis.latestMonth?.deltaVsPrevMonth ? (
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                        momAnalysis.latestMonth.deltaVsPrevMonth.deltaSalesPct >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {momAnalysis.latestMonth.deltaVsPrevMonth.deltaSalesPct >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {formatPct(Math.abs(momAnalysis.latestMonth.deltaVsPrevMonth.deltaSalesPct))} MoM
                    </span>
                  ) : null}
                </div>
                <p className="text-2xl font-black text-white mt-2">
                  {formatBRL(momAnalysis.latestMonth?.orderedProductSales)}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#243554] text-xs text-slate-300 flex items-center justify-between">
                <span>Mês: <strong className="text-cyan-300">{momAnalysis.latestMonth?.monthLabel || 'N/D'}</strong></span>
                {momAnalysis.previousMonth && (
                  <span className="text-slate-400">
                    Ant.: {formatBRL(momAnalysis.previousMonth.orderedProductSales)}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Pedidos & Unidades */}
            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    Pedidos & Unidades MoM
                  </span>
                  {momAnalysis.latestMonth?.deltaVsPrevMonth ? (
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                        momAnalysis.latestMonth.deltaVsPrevMonth.deltaOrdersPct >= 0
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {momAnalysis.latestMonth.deltaVsPrevMonth.deltaOrdersPct >= 0 ? '+' : ''}
                      {formatPct(momAnalysis.latestMonth.deltaVsPrevMonth.deltaOrdersPct)}
                    </span>
                  ) : null}
                </div>
                <p className="text-2xl font-black text-white mt-2">
                  {formatNum(momAnalysis.latestMonth?.totalOrderItems)} <span className="text-sm font-bold text-slate-400">pedidos</span>
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#243554] text-xs text-slate-300 flex items-center justify-between">
                <span>{formatNum(momAnalysis.latestMonth?.unitsOrdered)} unidades vendidas</span>
                <span className="text-cyan-400 font-bold">
                  AOV: {formatBRL(momAnalysis.latestMonth?.aov)}
                </span>
              </div>
            </div>

            {/* Card 3: Tráfego & Conversão MoM */}
            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Tráfego & Conversão MoM
                  </span>
                  {momAnalysis.latestMonth?.deltaVsPrevMonth ? (
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                        momAnalysis.latestMonth.deltaVsPrevMonth.deltaConversionRatePoints >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {momAnalysis.latestMonth.deltaVsPrevMonth.deltaConversionRatePoints >= 0 ? '+' : ''}
                      {(momAnalysis.latestMonth.deltaVsPrevMonth.deltaConversionRatePoints ?? 0).toFixed(2)} p.p.
                    </span>
                  ) : null}
                </div>
                <p className="text-2xl font-black text-white mt-2">
                  {formatPct(momAnalysis.latestMonth?.conversionRate)} <span className="text-sm font-bold text-slate-400">conversão</span>
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#243554] text-xs text-slate-300 flex items-center justify-between">
                <span>{formatNum(momAnalysis.latestMonth?.sessions)} sessões de tráfego</span>
                <span className="text-slate-400">
                  BuyBox: {formatPct(momAnalysis.latestMonth?.buyBoxPercentage)}
                </span>
              </div>
            </div>

            {/* Card 4: FBA Share & Média Diária */}
            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-400" />
                    Logística FBA & Média Diária
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Prime
                  </span>
                </div>
                <p className="text-2xl font-black text-white mt-2">
                  {formatPct(momAnalysis.latestMonth?.fbaSalesShare)} <span className="text-sm font-bold text-slate-400">em FBA</span>
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#243554] text-xs text-slate-300 flex items-center justify-between">
                <span>Média Diária: <strong className="text-emerald-400">{formatBRL(momAnalysis.latestMonth?.dailyAverageSales)}/dia</strong></span>
                <span className="text-slate-400">
                  Canc.: {formatPct(momAnalysis.latestMonth?.cancelRate)}
                </span>
              </div>
            </div>
          </div>

          {/* MoM Month-by-Month Side-by-Side Chart */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Comparativo Visual de Faturamento Mês a Mês</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Confronto de receita bruta (R$) e pedidos realizados entre os meses disponíveis
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gradient-to-t from-cyan-600 to-emerald-400" />
                  <span className="text-slate-200">Faturamento Bruto (R$)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-400" />
                  <span className="text-slate-200">Pedidos Faturados</span>
                </div>
              </div>
            </div>

            {/* SVG Bars Visualizer */}
            <div className="w-full pt-4 pb-2">
              {momAnalysis.months.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Nenhum dado mensal disponível para exibição.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {momAnalysis.months.map((m, idx) => {
                      const maxMonthSales = momAnalysis.bestMonth?.orderedProductSales || 1;
                      const heightPercent = Math.max(15, Math.round((m.orderedProductSales / maxMonthSales) * 100));
                      const isBest = momAnalysis.bestMonth?.monthKey === m.monthKey && momAnalysis.months.length > 1;

                      return (
                        <div
                          key={m.monthKey}
                          className={`bg-[#0f1a2d] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                            isBest
                              ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                              : 'border-[#243554] hover:border-cyan-500/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-[#243554]">
                              <span className="font-bold text-sm text-white font-general-sans">
                                {m.monthLabel}
                              </span>
                              {isBest && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                                  Melhor Mês
                                </span>
                              )}
                              {m.deltaVsPrevMonth && !isBest && (
                                <span
                                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                    m.deltaVsPrevMonth.deltaSalesPct >= 0
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {m.deltaVsPrevMonth.deltaSalesPct >= 0 ? '+' : ''}
                                  {(m.deltaVsPrevMonth.deltaSalesPct ?? 0).toFixed(1)}% MoM
                                </span>
                              )}
                            </div>

                            {/* Relative Progress / Bar */}
                            <div className="mt-3 space-y-1.5">
                              <div className="flex justify-between text-xs text-slate-300">
                                <span>Vendas:</span>
                                <strong className="text-white text-sm font-black font-mono">
                                  {formatBRL(m.orderedProductSales)}
                                </strong>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                                  style={{ width: `${heightPercent}%` }}
                                />
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-[#1e2f4a]">
                              <div>
                                <span className="text-slate-400 block text-[11px]">Pedidos:</span>
                                <strong className="text-white font-mono">{formatNum(m.totalOrderItems)}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Ticket Médio:</span>
                                <strong className="text-amber-300 font-mono">{formatBRL(m.aov)}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Conversão:</span>
                                <strong className="text-cyan-300 font-mono">{formatPct(m.conversionRate)}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[11px]">Média Diária:</span>
                                <strong className="text-emerald-400 font-mono">{formatBRL(m.dailyAverageSales)}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              DIRECT CONFRONTATION MATRIX: MONTH A vs MONTH B
             ======================================================== */}
          {momAnalysis.months.length >= 2 && (
            <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 sm:p-5 border-b border-[#243554] bg-[#111c30] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Scale className="w-5 h-5 text-cyan-400" />
                    <span>Matriz de Confronto Direto (Mês Base vs Mês de Confronto)</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Compare qualquer par de meses da sua conta para diagnosticar expansão comercial ou desvios
                  </p>
                </div>

                {/* Period Selectors */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-300">Mês Principal:</span>
                    <select
                      value={selectedMonthA}
                      onChange={(e) => setSelectedMonthA(e.target.value)}
                      className="bg-[#0b1320] border border-[#243554] text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                    >
                      {momAnalysis.months.map((m) => (
                        <option key={m.monthKey} value={m.monthKey}>
                          {m.monthLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs text-slate-400 font-bold">vs</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-300">Mês Comparado:</span>
                    <select
                      value={selectedMonthB}
                      onChange={(e) => setSelectedMonthB(e.target.value)}
                      className="bg-[#0b1320] border border-[#243554] text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                    >
                      {momAnalysis.months.map((m) => (
                        <option key={m.monthKey} value={m.monthKey}>
                          {m.monthLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Confrontation Table */}
              {monthAMetrics && monthBMetrics && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm text-slate-200">
                    <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Indicador de Performance</th>
                        <th className="py-3 px-4 text-cyan-300">{monthAMetrics.monthLabel}</th>
                        <th className="py-3 px-4 text-slate-300">{monthBMetrics.monthLabel}</th>
                        <th className="py-3 px-4">Variação Absoluta (Δ)</th>
                        <th className="py-3 px-4">Variação % (Δ %)</th>
                        <th className="py-3 px-4">Diagnóstico Operacional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                      {/* Metric 1: Vendas Brutas */}
                      {(() => {
                        const d = getConfrontationDelta(monthAMetrics.orderedProductSales, monthBMetrics.orderedProductSales);
                        const isUp = d.diff >= 0;
                        return (
                          <tr className="hover:bg-[#1a2b47] transition">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-emerald-400" />
                              <span>Faturamento Bruto (Gross Sales)</span>
                            </td>
                            <td className="py-3 px-4 text-white font-bold">{formatBRL(monthAMetrics.orderedProductSales)}</td>
                            <td className="py-3 px-4 text-slate-300">{formatBRL(monthBMetrics.orderedProductSales)}</td>
                            <td className={`py-3 px-4 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}{formatBRL(d.diff)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {isUp ? '+' : ''}{formatPct(d.pct)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans text-xs text-slate-300">
                              {isUp ? 'Expansão de receita comprovada no período confrontado.' : 'Retração de faturamento — requer análise de preço e Buy Box.'}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Metric 2: Pedidos Faturados */}
                      {(() => {
                        const d = getConfrontationDelta(monthAMetrics.totalOrderItems, monthBMetrics.totalOrderItems);
                        const isUp = d.diff >= 0;
                        return (
                          <tr className="hover:bg-[#1a2b47] transition">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <ShoppingBag className="w-4 h-4 text-cyan-400" />
                              <span>Volume de Pedidos</span>
                            </td>
                            <td className="py-3 px-4 text-white font-bold">{formatNum(monthAMetrics.totalOrderItems)} ped.</td>
                            <td className="py-3 px-4 text-slate-300">{formatNum(monthBMetrics.totalOrderItems)} ped.</td>
                            <td className={`py-3 px-4 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}{formatNum(d.diff)} pedidos
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {isUp ? '+' : ''}{formatPct(d.pct)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans text-xs text-slate-300">
                              {isUp ? 'Ganho de tração e frequência de compras.' : 'Queda no volume de transações concluídas.'}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Metric 3: Unidades Vendidas */}
                      {(() => {
                        const d = getConfrontationDelta(monthAMetrics.unitsOrdered, monthBMetrics.unitsOrdered);
                        const isUp = d.diff >= 0;
                        return (
                          <tr className="hover:bg-[#1a2b47] transition">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <Package className="w-4 h-4 text-indigo-400" />
                              <span>Unidades Vendidas</span>
                            </td>
                            <td className="py-3 px-4 text-white font-bold">{formatNum(monthAMetrics.unitsOrdered)} un.</td>
                            <td className="py-3 px-4 text-slate-300">{formatNum(monthBMetrics.unitsOrdered)} un.</td>
                            <td className={`py-3 px-4 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}{formatNum(d.diff)} un.
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {isUp ? '+' : ''}{formatPct(d.pct)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans text-xs text-slate-300">
                              {d.diff >= 0 ? 'Ritmo positivo de escoamento de inventário.' : 'Redução no giro de unidades.'}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Metric 4: Ticket Médio (AOV) */}
                      {(() => {
                        const d = getConfrontationDelta(monthAMetrics.aov, monthBMetrics.aov);
                        const isUp = d.diff >= 0;
                        return (
                          <tr className="hover:bg-[#1a2b47] transition">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-400" />
                              <span>Ticket Médio por Pedido (AOV)</span>
                            </td>
                            <td className="py-3 px-4 text-white font-bold">{formatBRL(monthAMetrics.aov)}</td>
                            <td className="py-3 px-4 text-slate-300">{formatBRL(monthBMetrics.aov)}</td>
                            <td className={`py-3 px-4 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}{formatBRL(d.diff)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {isUp ? '+' : ''}{formatPct(d.pct)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans text-xs text-slate-300">
                              {isUp ? 'Estratégia de kits/produtos premium valorizando a cesta média.' : 'Cesta média menor ou mix de produtos mais baratos.'}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Metric 5: Média Diária de Vendas */}
                      {(() => {
                        const d = getConfrontationDelta(monthAMetrics.dailyAverageSales, monthBMetrics.dailyAverageSales);
                        const isUp = d.diff >= 0;
                        return (
                          <tr className="hover:bg-[#1a2b47] transition">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <Clock className="w-4 h-4 text-cyan-400" />
                              <span>Média Diária de Vendas</span>
                            </td>
                            <td className="py-3 px-4 text-white font-bold">{formatBRL(monthAMetrics.dailyAverageSales)}/dia</td>
                            <td className="py-3 px-4 text-slate-300">{formatBRL(monthBMetrics.dailyAverageSales)}/dia</td>
                            <td className={`py-3 px-4 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}{formatBRL(d.diff)}/dia
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {isUp ? '+' : ''}{formatPct(d.pct)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans text-xs text-slate-300">
                              Normalizado pelos dias do mês ({monthAMetrics.daysCount}d vs {monthBMetrics.daysCount}d).
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Metric 6: Taxa de Conversão */}
                      {(() => {
                        const diffPoints = monthAMetrics.conversionRate - monthBMetrics.conversionRate;
                        const isUp = diffPoints >= 0;
                        return (
                          <tr className="hover:bg-[#1a2b47] transition">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <Percent className="w-4 h-4 text-purple-400" />
                              <span>Taxa de Conversão (Unit Session %)</span>
                            </td>
                            <td className="py-3 px-4 text-white font-bold">{formatPct(monthAMetrics.conversionRate)}</td>
                            <td className="py-3 px-4 text-slate-300">{formatPct(monthBMetrics.conversionRate)}</td>
                            <td className={`py-3 px-4 font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}{(diffPoints ?? 0).toFixed(2)} p.p.
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${isUp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {isUp ? '+' : ''}{monthBMetrics.conversionRate > 0 ? formatPct((diffPoints / monthBMetrics.conversionRate) * 100) : '0%'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans text-xs text-slate-300">
                              {isUp ? 'Páginas de produto retendo mais tráfego comprador.' : 'Verificar Buy Box, avaliações ou preço de anúncio.'}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Metric 7: Participação FBA */}
                      {(() => {
                        const diffPoints = monthAMetrics.fbaSalesShare - monthBMetrics.fbaSalesShare;
                        const isUp = diffPoints >= 0;
                        return (
                          <tr className="hover:bg-[#1a2b47] transition">
                            <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-2">
                              <Truck className="w-4 h-4 text-amber-400" />
                              <span>Participação FBA / DBA (Prime)</span>
                            </td>
                            <td className="py-3 px-4 text-white font-bold">{formatPct(monthAMetrics.fbaSalesShare)}</td>
                            <td className="py-3 px-4 text-slate-300">{formatPct(monthBMetrics.fbaSalesShare)}</td>
                            <td className={`py-3 px-4 font-bold ${isUp ? 'text-emerald-400' : 'text-slate-400'}`}>
                              {isUp ? '+' : ''}{(diffPoints ?? 0).toFixed(2)} p.p.
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-[#0b1320] text-slate-300">
                                {formatPct(monthAMetrics.fbaSalesShare)} FBA
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans text-xs text-slate-300">
                              Produtos em logística própria vs logística Amazon.
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              FULL HISTORICAL TABLE: MÊS A MÊS CONSOLIDADO
             ======================================================== */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-[#243554] bg-[#111c30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>Série Histórica Consolidada Mês a Mês ({momAnalysis.totalMonths} meses apurados)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tabela analítica com consolidação de faturamento, pedidos, conversão e variação MoM
                </p>
              </div>

              <div className="text-xs text-slate-300 font-medium">
                Variações calculadas contra o mês anterior cronológico
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Mês / Ano</th>
                    <th className="py-3 px-3.5">Dias Ativos</th>
                    <th className="py-3 px-3.5">Vendas Brutas (R$)</th>
                    <th className="py-3 px-3.5">Variação MoM</th>
                    <th className="py-3 px-3.5">Pedidos</th>
                    <th className="py-3 px-3.5">Unidades</th>
                    <th className="py-3 px-3.5">Ticket Médio (AOV)</th>
                    <th className="py-3 px-3.5">Média Diária</th>
                    <th className="py-3 px-3.5">Sessões</th>
                    <th className="py-3 px-3.5">Conversão</th>
                    <th className="py-3 px-3.5">Buy Box %</th>
                    <th className="py-3 px-3.5">FBA Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                  {momAnalysis.months.map((m) => {
                    const delta = m.deltaVsPrevMonth;
                    return (
                      <tr key={m.monthKey} className="hover:bg-[#1a2b47] transition">
                        <td className="py-3 px-3.5 font-bold text-white font-sans text-sm">
                          {m.monthLabel}
                        </td>
                        <td className="py-3 px-3.5 text-slate-300">{m.daysCount} dias</td>
                        <td className="py-3 px-3.5 font-black text-white text-sm">
                          {formatBRL(m.orderedProductSales)}
                        </td>
                        <td className="py-3 px-3.5">
                          {delta ? (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold inline-flex items-center gap-0.5 ${
                                delta.deltaSalesPct >= 0
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {delta.deltaSalesPct >= 0 ? '+' : ''}
                              {formatPct(delta.deltaSalesPct)}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">— (Mês Base)</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-cyan-300 font-semibold">{formatNum(m.totalOrderItems)}</td>
                        <td className="py-3 px-3.5 text-slate-200">{formatNum(m.unitsOrdered)}</td>
                        <td className="py-3 px-3.5 text-amber-300 font-bold">{formatBRL(m.aov)}</td>
                        <td className="py-3 px-3.5 text-emerald-400 font-bold">{formatBRL(m.dailyAverageSales)}</td>
                        <td className="py-3 px-3.5 text-slate-300">{formatNum(m.sessions)}</td>
                        <td className="py-3 px-3.5 text-indigo-300 font-bold">{formatPct(m.conversionRate)}</td>
                        <td className="py-3 px-3.5">
                          <span className={`font-bold ${m.buyBoxPercentage >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {formatPct(m.buyBoxPercentage)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#0b1320] text-slate-300 border border-[#243554]">
                            {formatPct(m.fbaSalesShare)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Biweekly breakdown banner if single month */}
          {momAnalysis.isSingleMonth && momAnalysis.biweeklyBreakdown && (
            <div className="bg-[#152238] border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Comparativo Quinzenal do Mês Atual (1ª vs 2ª Quinzena)</span>
              </div>
              <p className="text-xs text-slate-300">
                Seu relatório cobre apenas 1 mês civil. Abaixo, dividimos o faturamento entre a primeira e segunda metade do mês para você visualizar a evolução do período:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-[#0f1a2d] border border-[#243554] rounded-xl p-4">
                  <span className="text-xs font-bold text-slate-400">{momAnalysis.biweeklyBreakdown.firstHalf.label}</span>
                  <p className="text-xl font-black text-white mt-1 font-mono">
                    {formatBRL(momAnalysis.biweeklyBreakdown.firstHalf.orderedProductSales)}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {formatNum(momAnalysis.biweeklyBreakdown.firstHalf.totalOrderItems)} pedidos • AOV: {formatBRL(momAnalysis.biweeklyBreakdown.firstHalf.aov)}
                  </p>
                </div>
                <div className="bg-[#0f1a2d] border border-[#243554] rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">{momAnalysis.biweeklyBreakdown.secondHalf.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${momAnalysis.biweeklyBreakdown.deltaSalesPct >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {momAnalysis.biweeklyBreakdown.deltaSalesPct >= 0 ? '+' : ''}{formatPct(momAnalysis.biweeklyBreakdown.deltaSalesPct)}
                    </span>
                  </div>
                  <p className="text-xl font-black text-white mt-1 font-mono">
                    {formatBRL(momAnalysis.biweeklyBreakdown.secondHalf.orderedProductSales)}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {formatNum(momAnalysis.biweeklyBreakdown.secondHalf.totalOrderItems)} pedidos • AOV: {formatBRL(momAnalysis.biweeklyBreakdown.secondHalf.aov)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: EVOLUÇÃO DIÁRIA & SEMANAL (VISÃO ORIGINAL DETALHADA)
         ======================================================== */}
      {activeSubTab === 'daily' && (
        <div className="space-y-6">
          {/* Daily Evolution Chart (Faturamento & Sessões) */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Evolução Diária de Vendas (R$) e Tráfego (Sessões)
                </h3>
                <p className="text-xs text-slate-300">
                  Colunas em âmbar representam Faturamento Diário; linha pontilhada azul representa Sessões de Tráfego
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs md:text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-amber-400" />
                  <span className="text-slate-200">Vendas (R$)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-1 bg-cyan-400" />
                  <span className="text-slate-200">Sessões</span>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="w-full h-64 pt-4">
              {businessDays.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Nenhum dado diário carregado para exibição do gráfico.
                </div>
              ) : (
                <div className="h-full flex items-end gap-1 md:gap-1.5 overflow-x-auto pb-2">
                  {businessDays.map((d, i) => {
                    const heightPercent = Math.max(8, (d.orderedProductSales / maxDailySales) * 100);
                    return (
                      <div
                        key={d.date}
                        className="flex-1 min-w-[20px] max-w-[40px] flex flex-col items-center gap-1 group relative h-full justify-end"
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] p-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg border border-slate-700">
                          <p className="font-bold">{d.date}</p>
                          <p className="text-amber-400 font-extrabold">{formatBRL(d.orderedProductSales)}</p>
                          <p className="text-cyan-300 font-mono">{d.sessions} sessões ({d.unitSessionPercentage}%)</p>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t group-hover:from-cyan-500 group-hover:to-cyan-300 transition-all duration-200"
                        />

                        {/* Date Label */}
                        <span className="text-[10px] text-slate-400 font-mono rotate-45 sm:rotate-0 mt-1">
                          {d.date.slice(-2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Banner to Weekdays Analysis */}
          <div className="bg-gradient-to-r from-[#152238] via-[#1a2b47] to-[#152238] border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Sazonalidade Semanal Detectada
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {rankedWeekdays[0] ? (
                    <>
                      <strong>{rankedWeekdays[0].name}</strong> é o dia com maior faturamento da semana (média de{' '}
                      <span className="text-emerald-400 font-mono">{formatBRL(rankedWeekdays[0].avgSales)}/dia</span> •{' '}
                      <span className="text-cyan-300">{formatPct(rankedWeekdays[0].salesSharePct)}</span> das vendas semanais).
                    </>
                  ) : (
                    'Descubra quais dias da semana geram mais receita para ajustar orçamentos de Ads.'
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('weekdays')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 shadow-md active:scale-95"
            >
              <span>Ver Ranking dos 7 Dias</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sazonalidade por Dia da Semana (Cards Resumo) */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>Sazonalidade e Concentração por Dia da Semana</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Média diária de vendas e sessões apurada para cada dia de Domingo a Sábado
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('weekdays')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer self-start sm:self-auto"
              >
                Abrir Ranking Detalhado →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {dayNames.map((name, idx) => {
                const data = dayOfWeekAgg[idx];
                const avgDaySales = data.count > 0 ? data.sales / data.count : 0;
                const avgSessions = data.count > 0 ? Math.round(data.sessions / data.count) : 0;
                const isChampion = rankedWeekdays[0]?.name === name;

                return (
                  <div
                    key={name}
                    className={`border rounded-xl p-3.5 flex flex-col justify-between transition ${
                      isChampion
                        ? 'bg-[#152844] border-amber-400/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30'
                        : 'bg-[#0f1a2d] border-[#243554]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        {name.slice(0, 3)}
                      </span>
                      {isChampion && (
                        <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          🏆 Top 1
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className={`text-sm md:text-base font-extrabold font-mono ${isChampion ? 'text-amber-300 font-black' : 'text-white'}`}>
                        {formatBRL(avgDaySales)}
                      </p>
                      <p className="text-xs text-cyan-400 font-mono">{avgSessions} sessões/dia</p>
                      <p className="text-[11px] text-slate-400 font-sans">
                        {data.count} {data.count === 1 ? 'dia' : 'dias'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Daily Table */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-[#243554] bg-[#111c30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Detalhamento Diário ({filteredDays.length} registros)
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filtrar por data (ex: 2026-08)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#0b1320] border border-[#243554] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                  <tr>
                    <th
                      onClick={() => {
                        setSortField('date');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Data</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('orderedProductSales');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Vendas Encomendadas</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('unitsOrdered');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Unidades</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('sessions');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Sessões</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('unitSessionPercentage');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Taxa Conversão</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('buyBoxPercentage');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Buy Box %</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                  {filteredDays.map((d) => (
                    <tr key={d.date} className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-4 font-bold text-white">{d.date}</td>
                      <td className="py-3 px-4 text-amber-400 font-extrabold">
                        {formatBRL(d.orderedProductSales)}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{d.unitsOrdered}</td>
                      <td className="py-3 px-4 text-slate-200">{d.sessions.toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            d.unitSessionPercentage === null
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : d.unitSessionPercentage >= 10
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : d.unitSessionPercentage >= 5
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {formatPercentage(d.unitSessionPercentage)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            d.buyBoxPercentage === null
                              ? 'text-slate-500'
                              : d.buyBoxPercentage >= 90
                              ? 'text-emerald-400'
                              : d.buyBoxPercentage >= 80
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {formatPercentage(d.buyBoxPercentage)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: DIAS DA SEMANA QUE MAIS VENDEM (SAZONALIDADE)
         ======================================================== */}
      {activeSubTab === 'weekdays' && (
        <div className="space-y-6">
          {/* Executive Champion Banner */}
          <div className="bg-gradient-to-r from-[#17253d] via-[#1a2f50] to-[#152238] border-2 border-amber-400/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-amber-400 shadow-lg shrink-0">
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                      Dia Campeão de Vendas da Semana
                    </span>
                    <span className="text-xs text-amber-200 font-semibold">
                      Sazonalidade Comercial Apurada
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white mt-1">
                    {rankedWeekdays[0]?.name || 'N/D'} é o dia mais forte da sua loja
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    Em média, cada <strong className="text-white">{rankedWeekdays[0]?.name}</strong> gera{' '}
                    <strong className="text-amber-300 font-mono">{formatBRL(rankedWeekdays[0]?.avgSales)}</strong> em vendas (
                    <strong className="text-emerald-400">{formatPct(rankedWeekdays[0]?.salesSharePct)}</strong> de todo o faturamento da semana), com{' '}
                    <strong className="text-cyan-300 font-mono">{rankedWeekdays[0]?.avgSessions} sessões/dia</strong> e taxa média de conversão de{' '}
                    <strong className="text-white font-mono">{formatPct(rankedWeekdays[0]?.conversionRate)}</strong>.
                  </p>
                </div>
              </div>

              {rankedWeekdays[rankedWeekdays.length - 1] && (
                <div className="bg-[#0b1320] border border-[#243554] rounded-xl p-4 shrink-0 text-xs text-slate-300 space-y-1 lg:max-w-[280px]">
                  <span className="text-slate-400 text-[11px] block font-semibold">Dia de Menor Volume:</span>
                  <p className="text-sm font-bold text-rose-300">
                    {rankedWeekdays[rankedWeekdays.length - 1].name} ({formatBRL(rankedWeekdays[rankedWeekdays.length - 1].avgSales)}/dia)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Diferença de{' '}
                    <strong className="text-white">
                      {rankedWeekdays[0]?.avgSales && rankedWeekdays[rankedWeekdays.length - 1].avgSales > 0
                        ? `${((rankedWeekdays[0].avgSales / rankedWeekdays[rankedWeekdays.length - 1].avgSales) * 100 - 100).toFixed(0)}% a mais`
                        : 'relevante'}
                    </strong>{' '}
                    no dia de pico vs dia mais fraco.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Podium / Ranking Grid (1º ao 7º lugar) */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Ranking Completo dos Dias da Semana (Do Mais Forte ao Menor Faturamento)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Classificação ordenada pela média diária de faturamento bruto encomendado
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rankedWeekdays.map((item, idx) => {
                const rankNum = idx + 1;
                const isFirst = rankNum === 1;
                const isSecond = rankNum === 2;
                const isThird = rankNum === 3;
                const maxAvg = rankedWeekdays[0]?.avgSales || 1;
                const barWidth = Math.max(12, Math.round((item.avgSales / maxAvg) * 100));

                let rankBadgeBg = 'bg-[#0b1320] text-slate-300 border-[#243554]';
                let rankLabel = `${rankNum}º Lugar`;
                if (isFirst) {
                  rankBadgeBg = 'bg-amber-400 text-slate-950 font-black border-amber-300 shadow-sm';
                  rankLabel = '🥇 1º Lugar (Campeão)';
                } else if (isSecond) {
                  rankBadgeBg = 'bg-slate-200 text-slate-950 font-black border-slate-300 shadow-sm';
                  rankLabel = '🥈 2º Lugar (Vice)';
                } else if (isThird) {
                  rankBadgeBg = 'bg-amber-700/80 text-amber-100 font-bold border-amber-600 shadow-sm';
                  rankLabel = '🥉 3º Lugar';
                }

                return (
                  <div
                    key={item.dayIndex}
                    className={`border rounded-2xl p-4.5 flex flex-col justify-between transition ${
                      isFirst
                        ? 'bg-gradient-to-b from-[#182845] to-[#0f1a2d] border-amber-400/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30'
                        : isSecond
                        ? 'bg-[#111f36] border-slate-400/40'
                        : isThird
                        ? 'bg-[#101b30] border-amber-700/40'
                        : 'bg-[#0f1a2d] border-[#243554]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#243554]">
                        <span className="font-extrabold text-white text-base">
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rankBadgeBg}`}>
                          {rankLabel}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1">
                        <span className="text-[11px] text-slate-400 font-semibold block">Média por Dia:</span>
                        <p className={`text-xl font-black font-mono ${isFirst ? 'text-amber-300' : 'text-white'}`}>
                          {formatBRL(item.avgSales)}
                        </p>
                      </div>

                      {/* Relative Bar */}
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Força vs Campeão:</span>
                          <span className="font-bold text-white font-mono">{barWidth}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFirst
                                ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                : isSecond
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-400'
                                : 'bg-gradient-to-r from-slate-500 to-cyan-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-[#1e2f4a] text-slate-300">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Share Semanal:</span>
                          <strong className="text-emerald-400 font-mono">{formatPct(item.salesSharePct)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Conversão:</span>
                          <strong className="text-cyan-300 font-mono">{formatPct(item.conversionRate)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Sessões / Dia:</span>
                          <span className="text-white font-mono">{item.avgSessions}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Unidades / Dia:</span>
                          <span className="text-white font-mono">{item.avgUnits}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#1e2f4a] text-[11px] text-slate-400 flex justify-between">
                      <span>Total apurado:</span>
                      <strong className="text-slate-200 font-mono">{formatBRL(item.totalSales)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategy Matrix Table for Days of the Week */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-[#243554] bg-[#111c30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span>Matriz de Decisão Estratégica por Dia da Semana</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Recomendações práticas para alocação de orçamento de Amazon Ads e planejamento de estoque
                </p>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                7 dias ordenados por performance
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 text-center">Posição</th>
                    <th className="py-3.5 px-4">Dia da Semana</th>
                    <th className="py-3.5 px-4 text-right">Média / Dia (R$)</th>
                    <th className="py-3.5 px-4 text-right">Total Acumulado</th>
                    <th className="py-3.5 px-4 text-right">Sessões / Dia</th>
                    <th className="py-3.5 px-4 text-right">Unidades / Dia</th>
                    <th className="py-3.5 px-4 text-right">Conversão (%)</th>
                    <th className="py-3.5 px-4 text-right">Share Semanal</th>
                    <th className="py-3.5 px-4">Diretriz Estratégica (Ads & Operação)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                  {rankedWeekdays.map((item, idx) => {
                    const rankNum = idx + 1;
                    const isTop1 = rankNum === 1;
                    const isTop2 = rankNum === 2;
                    const isBottom = rankNum >= 6;

                    let guideline = 'Manter orçamento e lances regulares de campanhas.';
                    if (isTop1) {
                      guideline = '🔥 Dia de Pico Máximo: Aumentar orçamento diário de Sponsored Products em +20% a +30% para não pausar à tarde.';
                    } else if (isTop2) {
                      guideline = '⚡ Dia de Alto Volume: Priorizar palavras-chave exatas de alta conversão e monitorar esgotamento de budget.';
                    } else if (isBottom) {
                      guideline = '🛡️ Dia de Menor Tração: Evitar lances agressivos de topo de busca; manter campanhas em modo conservador.';
                    } else if (item.conversionRate >= 10) {
                      guideline = '🎯 Alta Eficiência: Taxa de conversão acima de 10% — excelente dia para ativar promoções e cupons.';
                    }

                    return (
                      <tr
                        key={item.dayIndex}
                        className={`transition ${isTop1 ? 'bg-amber-500/10 font-semibold' : 'hover:bg-[#1a2b47]'}`}
                      >
                        <td className="py-3 px-4 text-center font-bold">
                          {rankNum === 1 ? '🥇 1º' : rankNum === 2 ? '🥈 2º' : rankNum === 3 ? '🥉 3º' : `${rankNum}º`}
                        </td>
                        <td className="py-3 px-4 font-bold text-white font-sans flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {isTop1 && (
                            <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                              Campeão
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-amber-400 font-mono">
                          {formatBRL(item.avgSales)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatBRL(item.totalSales)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-cyan-300">
                          {item.avgSessions.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white">
                          {item.avgUnits} un.
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              item.conversionRate >= 10
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {formatPct(item.conversionRate)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                          {formatPct(item.salesSharePct)}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-slate-300">
                          {guideline}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
