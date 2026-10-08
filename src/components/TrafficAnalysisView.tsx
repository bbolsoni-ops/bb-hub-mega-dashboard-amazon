import React, { useState, useMemo } from 'react';
import {
  Compass,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Eye,
  Users,
  Percent,
  Search,
  ArrowUpRight,
  TrendingDown,
  ShoppingBag,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BusinessSkuRow, SkuUnitEconomics } from '../types/amazon';
import { formatPercentage } from '../utils/formatters';

interface TrafficAnalysisViewProps {
  businessSkus: BusinessSkuRow[];
  skusSummary: SkuUnitEconomics[];
}

export const TrafficAnalysisView: React.FC<TrafficAnalysisViewProps> = ({
  businessSkus,
  skusSummary,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'alta' | 'media'>('all');

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNum = (val: number) => {
    return val.toLocaleString('pt-BR');
  };

  // Merge SKUs with traffic
  // Associar preferencialmente por Child ASIN; não assumir que um SKU equivale a um ASIN
  const trafficRows = useMemo(() => {
    return businessSkus.map((bs) => {
      const eco = (bs.asin ? skusSummary.find((s) => s.asin && s.asin.toUpperCase() === bs.asin.toUpperCase()) : undefined)
        || (bs.sku ? skusSummary.find((s) => s.sku && s.sku.toUpperCase() === bs.sku.toUpperCase()) : undefined);
      const units = bs.unitsOrdered || (eco?.unitsSold || 0);
      const sales = bs.orderedProductSales || (eco?.grossSales || 0);
      const sessions = bs.sessions || 0;
      const pageViews = bs.pageViews || (sessions > 0 ? Math.round(sessions * 1.4) : 0);
      const buyBox = bs.buyBoxPercentage !== undefined ? bs.buyBoxPercentage : null;
      const convRate = bs.unitSessionPercentage !== null && bs.unitSessionPercentage !== undefined
        ? bs.unitSessionPercentage
        : (sessions > 0 ? (units / sessions) * 100 : null);

      return {
        sku: bs.sku,
        asin: bs.asin || eco?.asin || '',
        title: bs.title || eco?.title || bs.sku,
        sessions,
        pageViews,
        units,
        sales,
        buyBox,
        convRate: convRate !== null ? Number(convRate.toFixed(2)) : null,
      };
    });
  }, [businessSkus, skusSummary]);

  // Overall KPIs
  const totalSessions = trafficRows.reduce((acc, r) => acc + r.sessions, 0);
  const totalPageViews = trafficRows.reduce((acc, r) => acc + r.pageViews, 0);
  const totalUnits = trafficRows.reduce((acc, r) => acc + r.units, 0);
  const avgConvRate = totalSessions > 0 ? (totalUnits / totalSessions) * 100 : 0;

  // Buy Box consolidado: média ponderada por sessões quando sessions estiver disponível
  // soma(buyBoxPercent * sessions) / soma(sessions)
  const rowsWithBuyBoxAndSessions = trafficRows.filter((r) => r.buyBox !== null && r.sessions > 0);
  const totalSessionsWithBuyBox = rowsWithBuyBoxAndSessions.reduce((acc, r) => acc + r.sessions, 0);
  const avgBuyBox: number | null = totalSessionsWithBuyBox > 0
    ? rowsWithBuyBoxAndSessions.reduce((acc, r) => acc + (r.buyBox! * r.sessions), 0) / totalSessionsWithBuyBox
    : null;

  // Identify traffic issues based on rules
  const detectedProblems = useMemo(() => {
    const list: {
      sku: string;
      title: string;
      problema: string;
      valor: string;
      severidade: 'alta' | 'media';
      acao: string;
    }[] = [];

    trafficRows.forEach((r) => {
      // 1. Buy Box Baixo (<95%)
      if (r.buyBox !== null && r.buyBox < 95 && r.sessions > 10) {
        list.push({
          sku: r.sku,
          title: r.title,
          problema: 'Buy Box Baixo (Oferta em Destaque)',
          valor: formatPercentage(r.buyBox),
          severidade: r.buyBox < 80 ? 'alta' : 'media',
          acao: 'Revisar preço de venda, prazos de entrega e estoque DBA/FBA',
        });
      }

      // 2. Conversão Baixa (<3% com sessões relevantes >100)
      if (r.sessions >= 80 && r.convRate !== null && r.convRate < 3.0) {
        list.push({
          sku: r.sku,
          title: r.title,
          problema: 'Conversão Baixa (<3%)',
          valor: `${(r.convRate ?? 0).toFixed(1)}% (${r.sessions} sessões)`,
          severidade: (r.convRate ?? 0) < 1.5 ? 'alta' : 'media',
          acao: 'Otimizar imagens principais, título, descrição, avaliações e preço',
        });
      }

      // 3. Tráfego sem conversão (>300 sessões e <5 unidades)
      if (r.sessions > 300 && r.units < 5) {
        list.push({
          sku: r.sku,
          title: r.title,
          problema: 'Tráfego sem Conversão',
          valor: `${r.sessions} sessões, apenas ${r.units} vendas`,
          severidade: 'alta',
          acao: 'Verificar competitividade de preço, estoque e qualidade do listing',
        });
      }
    });

    return list.sort((a, b) => (a.severidade === 'alta' ? -1 : 1));
  }, [trafficRows]);

  // Scatter chart data: Sessions vs Conversion
  const scatterData = useMemo(() => {
    return trafficRows
      .filter((r) => r.sessions > 0)
      .slice(0, 30)
      .map((r) => ({
        sku: r.sku,
        sessions: r.sessions,
        convRate: r.convRate,
        sales: r.sales,
        units: r.units,
      }));
  }, [trafficRows]);

  const filteredProblems = useMemo(() => {
    return detectedProblems.filter((p) => {
      const matchesSearch =
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSev = severityFilter === 'all' || p.severidade === severityFilter;
      return matchesSearch && matchesSev;
    });
  }, [detectedProblems, searchTerm, severityFilter]);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-cyan-400" />
            <span>Auditoria de Tráfego Orgânico & Buy Box</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Diagnóstico de sessões, taxa de conversão orgânica e perda de Buy Box por produto
          </p>
        </div>
      </div>

      {/* 4 KPIs Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sessões Totais
            </span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {formatNum(totalSessions)}
          </p>
          <span className="text-[11px] text-slate-400">Visitas únicas ao catálogo</span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Visualizações de Página
            </span>
            <Eye className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {formatNum(totalPageViews)}
          </p>
          <span className="text-[11px] text-slate-400">Page Views registradas</span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Conversão Média
            </span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {(avgConvRate ?? 0).toFixed(2)}%
          </p>
          <span className="text-[11px] text-slate-400">
            {avgConvRate >= 5.0 ? '🟢 Saudável (>5%)' : '🟡 Abaixo da média ideal'}
          </span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Buy Box Médio
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono mt-1">
            {formatPercentage(avgBuyBox)}
          </p>
          <span className="text-[11px] text-slate-400">
            {avgBuyBox === null ? 'Ponderado por sessões (N/D)' : avgBuyBox >= 95 ? '🟢 Excelente (≥95%)' : '🔴 Perda de destaque'}
          </span>
        </div>
      </div>

      {/* Problems Table */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243554] pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">
              Problemas Identificados no Tráfego Orgânico
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {detectedProblems.length} alertas
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#0f1a2d] border border-[#243554] rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  severityFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSeverityFilter('alta')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  severityFilter === 'alta'
                    ? 'bg-rose-500 text-white'
                    : 'text-rose-400 hover:text-white'
                }`}
              >
                🔴 Alta Severidade
              </button>
              <button
                onClick={() => setSeverityFilter('media')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  severityFilter === 'media'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                🟡 Média
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-[#0f1a2d] border border-[#243554] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-44"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0f1a2d] text-slate-400 font-bold border-b border-[#243554]">
              <tr>
                <th className="py-2.5 px-3">Severidade</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Problema Detectado</th>
                <th className="py-2.5 px-3">Métrica</th>
                <th className="py-2.5 px-3">Ação Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f4a] text-slate-300">
              {filteredProblems.map((p, idx) => (
                <tr key={idx} className="hover:bg-[#1a2942]/60 transition">
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded font-black text-[11px] inline-flex items-center gap-1 ${
                        p.severidade === 'alta'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {p.severidade === 'alta' ? '🔴 ALTA' : '🟡 MÉDIA'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-white">{p.sku}</td>
                  <td className="py-2.5 px-3 font-semibold text-amber-200">{p.problema}</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-300">{p.valor}</td>
                  <td className="py-2.5 px-3 text-slate-300 text-[11px]">{p.acao}</td>
                </tr>
              ))}
              {filteredProblems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    Nenhum problema crítico de tráfego detectado com os filtros atuais!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scatter Chart: Sessions vs Conversion */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-cyan-400" />
            <span>Dispersão: Sessões vs. Taxa de Conversão por SKU</span>
          </h3>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Tamanho da esfera proporcional ao faturamento
          </span>
        </div>

        <div className="h-[340px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid stroke="#1e2f4a" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="sessions"
                name="Sessões"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                unit=" sessões"
              />
              <YAxis
                type="number"
                dataKey="convRate"
                name="Conversão"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                unit="%"
              />
              <ZAxis type="number" dataKey="sales" range={[60, 400]} name="Vendas" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0f172a] border border-[#243554] p-3 rounded-xl shadow-2xl text-xs space-y-1 min-w-[190px]">
                      <span className="font-bold text-white block border-b border-[#1e2f4a] pb-1 font-mono">
                        {d.sku}
                      </span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sessões:</span>
                        <strong className="text-white font-mono">{d.sessions}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Conversão:</span>
                        <strong className="text-emerald-400 font-mono font-bold">
                          {d.convRate}%
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Faturamento:</span>
                        <strong className="text-cyan-300 font-mono">{formatBRL(d.sales)}</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter name="SKUs" data={scatterData} fill="#06b6d4" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
