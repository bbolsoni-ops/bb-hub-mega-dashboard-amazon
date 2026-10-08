import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Package,
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SkuUnitEconomics, BusinessSkuRow, OrderItemRow } from '../types/amazon';

interface AbcCurveViewProps {
  skusSummary: SkuUnitEconomics[];
  businessSkus: BusinessSkuRow[];
  orders: OrderItemRow[];
}

export const AbcCurveView: React.FC<AbcCurveViewProps> = ({
  skusSummary,
  businessSkus,
  orders,
}) => {
  const [criterion, setCriterion] = useState<'faturamento' | 'unidades'>('faturamento');
  const [classFilter, setClassFilter] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNum = (val: number) => {
    return val.toLocaleString('pt-BR');
  };

  // Build aggregate product dataset
  const { classifiedRows, summary, totalRevenue, totalUnits } = useMemo(() => {
    // Map items
    const rawList = skusSummary.map((item) => {
      const bs = businessSkus.find((b) => b.sku === item.sku || b.asin === item.asin);
      const units = item.unitsSold || (bs?.unitsOrdered || 0);
      const revenue = item.grossSales || (bs?.orderedProductSales || 0);

      return {
        sku: item.sku,
        asin: item.asin || bs?.asin || '',
        title: item.title || bs?.title || item.sku,
        faturamento: revenue,
        unidades: units,
        pedidos: units,
        precoMedio: units > 0 ? revenue / units : item.pmv || 0,
      };
    });

    const valKey = criterion === 'faturamento' ? 'faturamento' : 'unidades';
    const sorted = [...rawList].sort((a, b) => b[valKey] - a[valKey]);

    const totalRev = sorted.reduce((acc, curr) => acc + curr.faturamento, 0);
    const totalUn = sorted.reduce((acc, curr) => acc + curr.unidades, 0);
    const totalVal = criterion === 'faturamento' ? totalRev : totalUn;

    let cumulative = 0;
    const classified = sorted.map((row) => {
      cumulative += row[valKey];
      const percentAccum = totalVal > 0 ? (cumulative / totalVal) * 100 : 0;
      let classe: 'A' | 'B' | 'C' = 'C';
      if (percentAccum <= 80) {
        classe = 'A';
      } else if (percentAccum <= 95) {
        classe = 'B';
      } else {
        classe = 'C';
      }

      return {
        ...row,
        acumulado: cumulative,
        percentAccum: Number((percentAccum ?? 0).toFixed(2)),
        percentTotal: totalVal > 0 ? Number(((row[valKey] / totalVal) * 100).toFixed(2)) : 0,
        classe,
      };
    });

    // Summary per class
    const classA = classified.filter((r) => r.classe === 'A');
    const classB = classified.filter((r) => r.classe === 'B');
    const classC = classified.filter((r) => r.classe === 'C');

    const sumA = classA.reduce((acc, r) => acc + r.faturamento, 0);
    const sumB = classB.reduce((acc, r) => acc + r.faturamento, 0);
    const sumC = classC.reduce((acc, r) => acc + r.faturamento, 0);

    const unitsA = classA.reduce((acc, r) => acc + r.unidades, 0);
    const unitsB = classB.reduce((acc, r) => acc + r.unidades, 0);
    const unitsC = classC.reduce((acc, r) => acc + r.unidades, 0);

    const summaryObj = {
      A: {
        qtd: classA.length,
        faturamento: sumA,
        unidades: unitsA,
        percentFaturamento: totalRev > 0 ? (sumA / totalRev) * 100 : 0,
        percentProdutos: classified.length > 0 ? (classA.length / classified.length) * 100 : 0,
      },
      B: {
        qtd: classB.length,
        faturamento: sumB,
        unidades: unitsB,
        percentFaturamento: totalRev > 0 ? (sumB / totalRev) * 100 : 0,
        percentProdutos: classified.length > 0 ? (classB.length / classified.length) * 100 : 0,
      },
      C: {
        qtd: classC.length,
        faturamento: sumC,
        unidades: unitsC,
        percentFaturamento: totalRev > 0 ? (sumC / totalRev) * 100 : 0,
        percentProdutos: classified.length > 0 ? (classC.length / classified.length) * 100 : 0,
      },
    };

    return {
      classifiedRows: classified,
      summary: summaryObj,
      totalRevenue: totalRev,
      totalUnits: totalUn,
    };
  }, [skusSummary, businessSkus, criterion]);

  // Chart data: top 15 SKUs for readability
  const chartData = useMemo(() => {
    return classifiedRows.slice(0, 18).map((r) => ({
      sku: r.sku.length > 14 ? `${r.sku.slice(0, 12)}...` : r.sku,
      fullSku: r.sku,
      faturamento: r.faturamento,
      unidades: r.unidades,
      percentAccum: r.percentAccum,
      classe: r.classe,
    }));
  }, [classifiedRows]);

  // Filtered rows for the table
  const filteredRows = useMemo(() => {
    return classifiedRows.filter((r) => {
      const matchesSearch =
        r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.asin && r.asin.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesClass = classFilter === 'all' || r.classe === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [classifiedRows, searchTerm, classFilter]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            <span>Curva ABC de Produtos (Princípio de Pareto)</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Classificação estratégica 80/15/5 da operação Amazon para priorização de estoque e verba
          </p>
        </div>

        {/* Toggle Criteria */}
        <div className="flex items-center bg-[#0f1a2d] border border-[#243554] rounded-xl p-1 text-xs">
          <button
            onClick={() => setCriterion('faturamento')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              criterion === 'faturamento'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Por Faturamento (R$)
          </button>
          <button
            onClick={() => setCriterion('unidades')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              criterion === 'unidades'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Por Unidades
          </button>
        </div>
      </div>

      {/* Class Summary Cards (A, B, C) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Classe A */}
        <div className="bg-[#152238] border-2 border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Classe A — Núcleo Vital (80%)
            </span>
            <span className="text-xl font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
              {summary.A.qtd} SKUs
            </span>
          </div>

          <div>
            <p className="text-2xl font-black text-white font-mono">
              {formatBRL(summary.A.faturamento)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
              <span>{(summary.A.percentFaturamento ?? 0).toFixed(1)}% da receita total</span>
              <span>{(summary.A.percentProdutos ?? 0).toFixed(1)}% dos produtos</span>
            </div>
          </div>

          <div className="p-3 bg-[#0f1a2d] rounded-xl border border-emerald-500/20 text-xs space-y-1 text-slate-200">
            <strong className="text-emerald-300 block font-bold">🎯 Ação Estratégica:</strong>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Garantir estoque sempre abastecido (FBA/DBA). Ruptura aqui derruba o BSR e fatura da loja.
            </p>
          </div>
        </div>

        {/* Classe B */}
        <div className="bg-[#152238] border-2 border-blue-500/40 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              Classe B — Oportunidade (15%)
            </span>
            <span className="text-xl font-black text-blue-300 bg-blue-950/80 px-2.5 py-0.5 rounded-lg border border-blue-500/40">
              {summary.B.qtd} SKUs
            </span>
          </div>

          <div>
            <p className="text-2xl font-black text-white font-mono">
              {formatBRL(summary.B.faturamento)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
              <span>{(summary.B.percentFaturamento ?? 0).toFixed(1)}% da receita total</span>
              <span>{(summary.B.percentProdutos ?? 0).toFixed(1)}% dos produtos</span>
            </div>
          </div>

          <div className="p-3 bg-[#0f1a2d] rounded-xl border border-blue-500/20 text-xs space-y-1 text-slate-200">
            <strong className="text-blue-300 block font-bold">🎯 Ação Estratégica:</strong>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Investir em Sponsored Products, otimizar títulos/imagens e testar pequenos aumentos de preço.
            </p>
          </div>
        </div>

        {/* Classe C */}
        <div className="bg-[#152238] border-2 border-slate-600/50 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-slate-600/10 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              Classe C — Cauda Longa (5%)
            </span>
            <span className="text-xl font-black text-slate-300 bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-700">
              {summary.C.qtd} SKUs
            </span>
          </div>

          <div>
            <p className="text-2xl font-black text-white font-mono">
              {formatBRL(summary.C.faturamento)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-300 mt-1">
              <span>{(summary.C.percentFaturamento ?? 0).toFixed(1)}% da receita total</span>
              <span>{(summary.C.percentProdutos ?? 0).toFixed(1)}% dos produtos</span>
            </div>
          </div>

          <div className="p-3 bg-[#0f1a2d] rounded-xl border border-slate-700 text-xs space-y-1 text-slate-200">
            <strong className="text-slate-300 block font-bold">🎯 Ação Estratégica:</strong>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Avaliar se vale a pena manter no estoque; liquidar itens de giro lento para evitar taxas FBA.
            </p>
          </div>
        </div>
      </div>

      {/* Pareto Chart Canvas */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Gráfico de Pareto (Faturamento Individual vs. % Acumulado)</span>
          </h3>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Top 18 SKUs líderes de faturamento
          </span>
        </div>

        <div className="h-[360px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid stroke="#1e2f4a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="sku"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                angle={-35}
                textAnchor="end"
                height={50}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f43f5e"
                fontSize={11}
                domain={[0, 100]}
                tickLine={false}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0f172a] border border-[#243554] p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[200px]">
                      <span className="font-bold text-white block border-b border-[#1e2f4a] pb-1">
                        {d.fullSku}
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Classe:</span>
                        <strong className="text-emerald-400 font-bold">Classe {d.classe}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Faturamento:</span>
                        <strong className="text-cyan-300 font-mono">{formatBRL(d.faturamento)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Unidades:</span>
                        <strong className="text-white font-mono">{formatNum(d.unidades)} un</strong>
                      </div>
                      <div className="flex justify-between border-t border-[#1e2f4a] pt-1">
                        <span className="text-rose-400">% Acumulado:</span>
                        <strong className="text-rose-300 font-mono">{d.percentAccum}%</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
              <Bar
                yAxisId="left"
                dataKey="faturamento"
                name="Faturamento (R$)"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentAccum"
                name="% Acumulado"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f43f5e' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Complete Classification Table */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#243554] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">Tabela de Classificação ABC Completa</h3>
            <span className="text-xs text-slate-400">({filteredRows.length} itens)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            <div className="flex items-center bg-[#0f1a2d] border border-[#243554] rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setClassFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  classFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setClassFilter('A')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  classFilter === 'A'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-emerald-400 hover:text-white'
                }`}
              >
                Classe A
              </button>
              <button
                onClick={() => setClassFilter('B')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  classFilter === 'B'
                    ? 'bg-blue-500 text-slate-950'
                    : 'text-blue-400 hover:text-white'
                }`}
              >
                Classe B
              </button>
              <button
                onClick={() => setClassFilter('C')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  classFilter === 'C'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Classe C
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar SKU ou Título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0f1a2d] border border-[#243554] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-52"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0f1a2d] text-slate-400 font-bold border-b border-[#243554]">
              <tr>
                <th className="py-3 px-4">Classe</th>
                <th className="py-3 px-4">SKU / ASIN</th>
                <th className="py-3 px-4 text-right">Faturamento</th>
                <th className="py-3 px-4 text-right">% do Total</th>
                <th className="py-3 px-4 text-right">% Acumulado</th>
                <th className="py-3 px-4 text-right">Unidades</th>
                <th className="py-3 px-4 text-right">Preço Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f4a] text-slate-300">
              {filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#1a2942]/60 transition">
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-md font-black text-xs inline-block ${
                        row.classe === 'A'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : row.classe === 'B'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                      }`}
                    >
                      Classe {row.classe}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-white block">{row.sku}</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                      {row.title}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-cyan-300">
                    {formatBRL(row.faturamento)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{row.percentTotal}%</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-300">
                    {row.percentAccum}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white">
                    {formatNum(row.unidades)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatBRL(row.precoMedio)}
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
