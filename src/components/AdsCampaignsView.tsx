import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Search,
  ArrowUpDown,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  UploadCloud,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { AdsCampaignRow, AdsSearchTermRow, AdsAdvertisedProductRow, AdsTargetRow } from '../types/amazon';
import { QuickBudgetInsightsPanel } from './QuickBudgetInsightsPanel';
import { generateBudgetInsights } from '../utils/adsBudgetInsights';
import { consolidateCampaigns, deriveCampaignsFromAdsData, translateCampaignStatus } from '../utils/csvParser';

interface AdsCampaignsViewProps {
  campaigns: AdsCampaignRow[];
  searchTerms?: AdsSearchTermRow[];
  advertisedProducts?: AdsAdvertisedProductRow[];
  targets?: AdsTargetRow[];
  onOpenUpload?: () => void;
  searchTermsCount?: number;
  advertisedProductsCount?: number;
}

export const AdsCampaignsView: React.FC<AdsCampaignsViewProps> = ({
  campaigns: rawCampaigns,
  searchTerms = [],
  advertisedProducts = [],
  targets = [],
  onOpenUpload,
  searchTermsCount = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof AdsCampaignRow>('spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const isDerivedFromOtherAds =
    (!rawCampaigns || rawCampaigns.length === 0) &&
    (searchTerms.length > 0 || advertisedProducts.length > 0 || targets.length > 0);

  // Ensure campaigns are cleanly consolidated by campaignName (avoiding duplicate rows or multi-day key collisions)
  const campaigns = useMemo(() => {
    if (rawCampaigns && rawCampaigns.length > 0) {
      return consolidateCampaigns(rawCampaigns);
    }
    if (isDerivedFromOtherAds) {
      return deriveCampaignsFromAdsData(searchTerms, advertisedProducts, targets);
    }
    return [];
  }, [rawCampaigns, isDerivedFromOtherAds, searchTerms, advertisedProducts, targets]);

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) {
      return 'Não informado';
    }
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatAcos = (acos: number | null | undefined, spend: number, sales: number) => {
    if (spend > 0 && sales <= 0) {
      return 'Sem vendas';
    }
    if (acos === null || acos === undefined || isNaN(acos)) {
      return '—';
    }
    return `${acos.toFixed(1).replace('.', ',')}%`;
  };

  const formatRoas = (roas: number | null | undefined, spend: number, sales: number) => {
    if (spend > 0 && sales <= 0) {
      return '0,00x';
    }
    if (roas === null || roas === undefined || isNaN(roas)) {
      return '—';
    }
    return `${roas.toFixed(2).replace('.', ',')}x`;
  };

  // Pre-calculate recommendations map for table display
  const insightsMap = useMemo(() => {
    const summary = generateBudgetInsights(campaigns, 15.0);
    const map = new Map<string, (typeof summary.recommendations)[0]>();
    for (const rec of summary.recommendations) {
      map.set(rec.campaignName, rec);
    }
    return map;
  }, [campaigns]);

  const getAcosBadge = (acos: number | null, sales: number) => {
    if (sales === 0) {
      return { label: 'Sem Venda', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    if (acos === null) return { label: 'N/D', bg: 'bg-slate-800 text-slate-400' };
    if (acos < 10) return { label: 'Excelente (<10%)', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (acos <= 15) return { label: 'Aceitável (10-15%)', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (acos <= 20) return { label: 'Razoável (15-20%)', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    return { label: 'Ruim (>20%)', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  };

  const getRoasBadge = (roas: number | null, spend: number) => {
    if (spend === 0) return { label: 'N/D', bg: 'bg-slate-800 text-slate-400' };
    if (roas === null) return { label: 'N/D', bg: 'bg-slate-800 text-slate-400' };
    if (roas > 10) return { label: 'Excelente (>10)', bg: 'bg-emerald-500/10 text-emerald-400' };
    if (roas >= 8) return { label: 'Bom (8-10)', bg: 'bg-blue-500/10 text-blue-400' };
    if (roas > 3) return { label: 'Ok (3-8)', bg: 'bg-amber-500/10 text-amber-400' };
    return { label: 'Ruim (≤3)', bg: 'bg-rose-500/10 text-rose-400' };
  };

  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);
  const totalSales = campaigns.reduce((acc, c) => acc + c.sales, 0);
  const totalOrders = campaigns.reduce((acc, c) => acc + c.orders, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const overallAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
  const overallRoas = totalSpend > 0 ? totalSales / totalSpend : 0;

  const filtered = campaigns.filter((c) => {
    const matchesSearch = c.campaignName.toLowerCase().includes(searchTerm.toLowerCase());
    const ptStatus = translateCampaignStatus(c.status);
    const matchesStatus =
      statusFilter === 'all' ||
      c.status.toUpperCase() === statusFilter.toUpperCase() ||
      ptStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === 'asc' ? Number(valA || 0) - Number(valB || 0) : Number(valB || 0) - Number(valA || 0);
  });

  const handleSelectCampaignForFilter = (campaignName: string) => {
    setSearchTerm(campaignName);
    // Smooth scroll down to table
    const tableEl = document.getElementById('campaigns-table-container');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-cyan-400" />
            <span>5. Amazon Ads — Campanhas & Orçamentos</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Fonte Oficial de Gasto Publicitário Consolidado (evita dupla contagem com termos e alvos)
          </p>
        </div>

        {campaigns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0f1a2d] border border-[#243554] rounded-xl px-3.5 py-2 text-xs md:text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="all">Todos os Status</option>
              <option value="Ativa">Ativas</option>
              <option value="Pausada">Pausadas</option>
              <option value="Arquivada">Arquivadas</option>
            </select>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar campanha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 bg-[#0f1a2d] border border-[#243554] rounded-xl text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-52"
              />
            </div>
          </div>
        )}
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-[#152238] border border-[#243554] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
            <Megaphone className="w-8 h-8" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-xl font-black text-white">
              Nenhum relatório de Campanhas ou Orçamentos carregado ainda
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Para carregar o <strong>Item 5 (Ads Campanhas & Orçamento)</strong> com cálculo de gasto consolidado, ACOS, ROAS e diagnóstico prescritivo de verba, importe uma das seguintes planilhas geradas no Amazon Advertising:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left text-xs">
            <div className="bg-[#0f1a2d] p-4 rounded-xl border border-[#243554] space-y-1">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                Relatório de Campanhas (Principal)
              </span>
              <p className="text-slate-400 text-[11px]">
                Contém nome da campanha, status, orçamento, gastos, vendas em 7 dias, pedidos e cliques (formatos Excel .xlsx ou CSV/TSV).
              </p>
            </div>
            <div className="bg-[#0f1a2d] p-4 rounded-xl border border-[#243554] space-y-1">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Relatório de Orçamentos (Budgets)
              </span>
              <p className="text-slate-400 text-[11px]">
                Contém tetos de orçamento diário, tempo médio dentro do orçamento (%) e projeção de impressões/vendas perdidas.
              </p>
            </div>
          </div>
          {searchTermsCount > 0 && (
            <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-xl max-w-xl mx-auto text-xs text-amber-200 text-left flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                Detectamos <strong>{searchTermsCount} termos de pesquisa</strong> carregados na aba <em>6. Ads: Termos & Alvos</em>. Para alimentar este painel de campanhas e auditar o orçamento consolidado, importe também o relatório de campanhas do console.
              </div>
            </div>
          )}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            {onOpenUpload && (
              <button
                onClick={onOpenUpload}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs md:text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Carregar Planilhas de Ads (.xlsx / .csv)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Informative Banner when campaigns are synthesized from other ads reports */}
          {isDerivedFromOtherAds && (
            <div className="bg-[#0f2438] border border-cyan-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0 mt-0.5 sm:mt-0">
                  <CheckCircle className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm flex items-center gap-2">
                    <span>Campanhas consolidadas a partir dos dados de Ads ({campaigns.length} campanhas)</span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded-full font-bold">
                      Auto-Sintetizado
                    </span>
                  </p>
                  <p className="text-slate-300 text-xs mt-0.5">
                    Todas as métricas de Gastos, Vendas, Cliques, ACOS e ROAS foram agrupadas por campanha automaticamente. Para incluir os tetos de orçamento diário oficial e tempo dentro da verba, você também pode importar a planilha de Campanhas ou Orçamentos (.xlsx / .csv).
                  </p>
                </div>
              </div>
              {onOpenUpload && (
                <button
                  onClick={onOpenUpload}
                  className="px-4 py-2 rounded-xl bg-[#1e2f4a] hover:bg-[#283e60] text-cyan-300 font-bold border border-cyan-500/30 text-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Importar Planilha de Campanhas</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Budget Insights Prescriptive Panel */}
          <QuickBudgetInsightsPanel
            campaigns={campaigns}
            onSelectCampaignForFilter={handleSelectCampaignForFilter}
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
              <span className="text-xs md:text-sm font-semibold text-slate-300">Gasto Total Ads</span>
              <p className="text-2xl md:text-3xl font-black text-amber-400 mt-1">{formatBRL(totalSpend)}</p>
              <span className="text-xs text-slate-400 mt-1 block font-medium">{totalClicks.toLocaleString('pt-BR')} cliques</span>
            </div>

            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
              <span className="text-xs md:text-sm font-semibold text-slate-300">Vendas Atribuídas</span>
              <p className="text-2xl md:text-3xl font-black text-white mt-1">{formatBRL(totalSales)}</p>
              <span className="text-xs text-emerald-400 mt-1 block font-bold">{totalOrders} pedidos gerados</span>
            </div>

            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
              <span className="text-xs md:text-sm font-semibold text-slate-300">ACOS Médio</span>
              <p className="text-2xl md:text-3xl font-black text-white mt-1">
                {totalSales > 0 ? `${overallAcos.toFixed(2).replace('.', ',')}%` : (totalSpend > 0 ? 'Sem vendas' : '0,00%')}
              </p>
              <span className="text-xs text-slate-300 mt-1 block font-bold">{getAcosBadge(overallAcos, totalSales).label}</span>
            </div>

            <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
              <span className="text-xs md:text-sm font-semibold text-slate-300">ROAS Médio</span>
              <p className="text-2xl md:text-3xl font-black text-white mt-1">
                {totalSpend > 0 ? `${overallRoas.toFixed(2).replace('.', ',')}x` : '—'}
              </p>
              <span className="text-xs text-slate-300 mt-1 block font-bold">{getRoasBadge(overallRoas, totalSpend).label}</span>
            </div>
          </div>

          {/* Campaigns Table */}
          <div id="campaigns-table-container" className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#243554] flex items-center justify-between bg-[#111c30]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Campanhas Auditadas ({sorted.length} campanhas)
              </h3>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer"
                >
                  Limpar filtro de busca ("{searchTerm}")
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-3.5">Status</th>
                    <th
                      onClick={() => {
                        setSortField('campaignName');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Nome da Campanha</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th className="py-3.5 px-3.5">Ação Orçamento</th>
                    <th
                      onClick={() => {
                        setSortField('spend');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Gasto (R$)</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('sales');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Vendas Ads</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('acos');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>ACOS</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortField('roas');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-3.5 px-3.5 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>ROAS</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </th>
                    <th className="py-3.5 px-3.5">Pedidos</th>
                    <th className="py-3.5 px-3.5">Cliques / CPC</th>
                    <th className="py-3.5 px-3.5">Orçamento Diário</th>
                    <th className="py-3.5 px-3.5">Tempo no Orçamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                  {sorted.map((c) => {
                    const acosBadge = getAcosBadge(c.acos, c.sales);
                    const roasBadge = getRoasBadge(c.roas, c.spend);
                    const rec = insightsMap.get(c.campaignName);

                    const ptStatus = translateCampaignStatus(c.status);
                    const isAtiva = ptStatus === 'Ativa';

                    return (
                      <tr key={c.campaignName} className="hover:bg-[#1a2b47] transition">
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isAtiva
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-[#0f1a2d] text-slate-400 border border-[#1e2f4a]'
                            }`}
                          >
                            {ptStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-white max-w-[240px] truncate font-sans text-sm" title={c.campaignName}>
                          {c.campaignName}
                        </td>
                        <td className="py-3 px-3.5 font-sans">
                          {rec ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block whitespace-nowrap ${
                                rec.actionType === 'PAUSE_CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : rec.actionType === 'REDUCE_HEAVY'
                                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                  : rec.actionType === 'REDUCE_LIGHT'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : rec.actionType === 'SCALE_AGGRESSIVE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : rec.actionType === 'SCALE_MODERATE'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                              title={rec.reason}
                            >
                              {rec.actionType === 'PAUSE_CRITICAL'
                                ? '🚨 Pausar / Cortar'
                                : rec.actionType === 'REDUCE_HEAVY'
                                ? '⚠️ Reduzir (-40%)'
                                : rec.actionType === 'REDUCE_LIGHT'
                                ? '📉 Ajustar Bids (-20%)'
                                : rec.actionType === 'SCALE_AGGRESSIVE'
                                ? '🚀 Escalar (+50%)'
                                : rec.actionType === 'SCALE_MODERATE'
                                ? '📈 Expandir (+25%)'
                                : '✅ Manter'}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-amber-400">{formatBRL(c.spend)}</td>
                        <td className="py-3 px-3.5 font-bold text-white">{formatBRL(c.sales)}</td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{formatAcos(c.acos, c.spend, c.sales)}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${acosBadge.bg}`}>
                              {acosBadge.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-semibold text-slate-200">
                            {formatRoas(c.roas, c.spend, c.sales)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-white font-medium">{c.orders}</td>
                        <td className="py-3 px-3.5 text-slate-300">
                          {c.clicks} • {formatBRL(c.cpc)}
                        </td>
                        <td className="py-3 px-3.5 text-slate-200 font-bold">
                          {c.budget !== null && c.budget !== undefined ? formatBRL(c.budget) : <span className="text-slate-500 font-normal">Não informado</span>}
                        </td>
                        <td className="py-3 px-3.5">
                          {c.budgetUtilization !== undefined && c.budgetUtilization > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block ${
                                c.budgetUtilization >= 90
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : c.budgetUtilization >= 70
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                              title={
                                c.budgetUtilization < 90
                                  ? `Campanha atinge teto orçamentário e fica sem orçamento em parte do dia.`
                                  : `Orçamento suficiente para o dia.`
                              }
                            >
                              {(c.budgetUtilization ?? 0).toFixed(0)}% ativo
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
