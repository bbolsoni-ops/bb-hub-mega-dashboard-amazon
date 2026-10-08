import React, { useState } from 'react';
import {
  Package,
  Search,
  ArrowUpDown,
  AlertCircle,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import { BusinessSkuRow, SkuUnitEconomics } from '../types/amazon';
import { formatPercentage } from '../utils/formatters';

interface ProductsViewProps {
  businessSkus: BusinessSkuRow[];
  skusSummary: SkuUnitEconomics[];
  skuAlerts: any[];
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  businessSkus,
  skusSummary,
  skuAlerts,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('grossSales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Merge information between business report by SKU and summary
  // Associar preferencialmente por Child ASIN; não assumir que um SKU equivale a um ASIN
  const rows = skusSummary.map((item) => {
    const itemAsin = item.asin?.toUpperCase();
    const itemSku = item.sku?.toUpperCase();
    const bs = (itemAsin ? businessSkus.find((b) => b.asin && b.asin.toUpperCase() === itemAsin) : undefined)
      || (itemSku ? businessSkus.find((b) => b.sku && b.sku.toUpperCase() === itemSku) : undefined);
    const sessions = bs?.sessions || 0;
    const buyBox = bs?.buyBoxPercentage !== undefined ? bs.buyBoxPercentage : null;
    const convRate = bs?.unitSessionPercentage !== null && bs?.unitSessionPercentage !== undefined
      ? bs.unitSessionPercentage
      : (sessions > 0 ? (item.unitsSold / sessions) * 100 : null);

    return {
      ...item,
      sessions,
      buyBox,
      convRate,
    };
  });

  const totalGross = rows.reduce((acc, r) => acc + r.grossSales, 0);

  // Compute cumulative Pareto %
  let cumulative = 0;
  const paretoRows = [...rows]
    .sort((a, b) => b.grossSales - a.grossSales)
    .map((r) => {
      cumulative += r.grossSales;
      const cumulativePercent = totalGross > 0 ? (cumulative / totalGross) * 100 : 0;
      let classification: 'A' | 'B' | 'C' = 'C';
      if (cumulativePercent <= 80) classification = 'A';
      else if (cumulativePercent <= 95) classification = 'B';
      return {
        ...r,
        cumulativePercent,
        classification,
      };
    });

  const filtered = paretoRows.filter(
    (r) =>
      r.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.asin && r.asin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.title && r.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sorted = [...filtered].sort((a: any, b: any) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === 'asc' ? Number(valA || 0) - Number(valB || 0) : Number(valB || 0) - Number(valA || 0);
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-cyan-400" />
            <span>Catálogo, SKUs & ASINs — Análise Pareto & PMV</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Curva ABC de faturamento, Preço Médio de Venda e eficiência de tráfego por produto
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por SKU, ASIN ou Título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-2 bg-[#0f1a2d] border border-[#243554] rounded-xl text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-full sm:w-72"
          />
        </div>
      </div>

      {/* SKU Alert Banners: Spend >= 1x PMV without sale */}
      {skuAlerts.length > 0 && (
        <div className="bg-[#152238] border-2 border-rose-500/50 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <h4 className="text-sm font-black text-rose-200 uppercase tracking-wider">
              Alerta Crítico BB Hub Market: SKU Gastou ≥ 1x PMV Sem Venda
            </h4>
          </div>
          <div className="space-y-2">
            {skuAlerts.map((alert, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#0f1a2d] rounded-xl border border-rose-900/40 text-xs md:text-sm"
              >
                <div>
                  <span className="font-mono font-bold text-white text-sm">{alert.sku}</span>
                  <span className="text-slate-300 ml-2">({alert.title})</span>
                </div>
                <div className="text-right">
                  <span className="text-rose-400 font-bold">{alert.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pareto Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 flex items-center gap-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center text-xl border border-emerald-500/30">
            A
          </div>
          <div>
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Curva A (80% da Receita)</span>
            <p className="text-base md:text-lg font-black text-white">
              {paretoRows.filter((r) => r.classification === 'A').length} Produtos Chave
            </p>
            <span className="text-xs text-emerald-400 font-semibold">Líderes de faturamento e BSR</span>
          </div>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 flex items-center gap-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 font-black flex items-center justify-center text-xl border border-blue-500/30">
            B
          </div>
          <div>
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Curva B (Próximos 15%)</span>
            <p className="text-base md:text-lg font-black text-white">
              {paretoRows.filter((r) => r.classification === 'B').length} Produtos Intermediários
            </p>
            <span className="text-xs text-blue-400 font-semibold">Potencial de expansão comercial</span>
          </div>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 flex items-center gap-3.5 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[#0f1a2d] text-slate-300 font-black flex items-center justify-center text-xl border border-[#243554]">
            C
          </div>
          <div>
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Curva C (Últimos 5%)</span>
            <p className="text-base md:text-lg font-black text-white">
              {paretoRows.filter((r) => r.classification === 'C').length} Produtos de Cauda Longa
            </p>
            <span className="text-xs text-slate-400 font-semibold">Atenção a custos de armazenamento</span>
          </div>
        </div>
      </div>

      {/* SKUs Table */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#243554] flex items-center justify-between bg-[#111c30]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Detalhamento por SKU / ASIN ({sorted.length} itens)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm text-slate-200">
            <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-3.5">Curva</th>
                <th
                  onClick={() => {
                    setSortField('sku');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>SKU / ASIN</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('grossSales');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Faturamento</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('unitsSold');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Unidades</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('pmv');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>PMV</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('sessions');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Sessões</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('convRate');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Conversão</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('buyBox');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Buy Box %</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('adsSpend');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Gasto Ads</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f4a] text-xs md:text-sm font-mono">
              {sorted.map((item) => (
                <tr key={item.sku} className="hover:bg-[#1a2b47] transition">
                  <td className="py-3 px-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.classification === 'A'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : item.classification === 'B'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-[#0f1a2d] text-slate-300 border border-[#243554]'
                      }`}
                    >
                      Classe {item.classification}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 max-w-[240px]">
                    <p className="font-bold text-white truncate text-sm" title={item.sku}>
                      {item.sku}
                    </p>
                    <p className="text-xs text-slate-300 truncate font-sans" title={item.title}>
                      {item.asin} • {item.title}
                    </p>
                  </td>
                  <td className="py-3 px-3.5 font-bold text-amber-400">
                    {formatBRL(item.grossSales)}
                  </td>
                  <td className="py-3 px-3.5 text-white font-medium">{item.unitsSold}</td>
                  <td className="py-3 px-3.5 text-slate-200 font-bold">{formatBRL(item.pmv)}</td>
                  <td className="py-3 px-3.5 text-slate-300">{item.sessions.toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-3.5">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-xs ${
                        item.convRate === null
                          ? 'text-slate-500'
                          : item.convRate >= 10
                          ? 'text-emerald-400'
                          : item.convRate >= 5
                          ? 'text-blue-400'
                          : item.convRate > 0
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {formatPercentage(item.convRate)}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">
                    <span
                      className={`font-bold ${
                        item.buyBox === null
                          ? 'text-slate-400'
                          : item.buyBox >= 90
                          ? 'text-emerald-400'
                          : item.buyBox >= 80
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatPercentage(item.buyBox)}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">
                    <span className={item.adsSpend > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                      {formatBRL(item.adsSpend)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
