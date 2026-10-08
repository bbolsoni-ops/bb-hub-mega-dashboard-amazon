import React, { useState, useMemo } from 'react';
import {
  Coins,
  Calculator,
  AlertCircle,
  HelpCircle,
  ArrowUpDown,
  CheckCircle2,
  TrendingDown,
  Info,
  Sliders,
  UploadCloud,
  Truck,
  PackageCheck,
  Percent,
  DollarSign,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Zap,
  Tag,
  Scale,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { SkuUnitEconomics } from '../types/amazon';
import {
  AMAZON_BR_CATEGORIES,
  calculateAmazonCommission,
  calculateDbaFee,
  calculateFbaFee,
  FbaProgramMode,
} from '../utils/amazonFeesCalculator';
import { parseAmazonNumber } from '../utils/formatters';

interface ProfitabilityViewProps {
  skusSummary: SkuUnitEconomics[];
  onUpdateSkuEconomics: (sku: string, updates: Partial<SkuUnitEconomics>) => void;
}

export const ProfitabilityView: React.FC<ProfitabilityViewProps> = ({
  skusSummary,
  onUpdateSkuEconomics,
}) => {
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<'all' | 'FBA' | 'DBA' | 'FBM'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'fees_audit' | 'campaign_simulator' | 'overview' | 'commission_preview'>('fees_audit');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof SkuUnitEconomics>('grossSales');
  const [sortAsc, setSortAsc] = useState(false);

  // Simulator State (Exemplo oficial fornecido: Produto de R$ 100 / R$ 120,80, Peso 450g)
  const [simPrice, setSimPrice] = useState<number>(120.8);
  const [simWeight, setSimWeight] = useState<number>(450);
  const [simCogs, setSimCogs] = useState<number>(45.0);
  const [simTax, setSimTax] = useState<number>(8.0);
  const [simCategory, setSimCategory] = useState<string>('casa_cozinha');
  const [simAdsSpendPercent, setSimAdsSpendPercent] = useState<number>(4.0);

  // Batch config state
  const [batchCategory, setBatchCategory] = useState<string>('casa_cozinha');
  const [batchWeight, setBatchWeight] = useState<string>('450');
  const [batchSpDiscount, setBatchSpDiscount] = useState<boolean>(true);
  const [batchFbaProgram, setBatchFbaProgram] = useState<FbaProgramMode>('experimente_r6');
  const [batchTaxRate, setBatchTaxRate] = useState<string>('8');
  const [batchChannel, setBatchChannel] = useState<'keep' | 'FBA' | 'DBA' | 'FBM'>('keep');

  // CSV Paste state
  const [pasteData, setPasteData] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Channel count distribution for quick filter chips
  const channelCounts = useMemo(() => {
    const counts = { all: skusSummary.length, FBA: 0, DBA: 0, FBM: 0 };
    for (const s of skusSummary) {
      if (s.logisticsChannel === 'FBA') counts.FBA++;
      else if (s.logisticsChannel === 'DBA') counts.DBA++;
      else if (s.logisticsChannel === 'FBM') counts.FBM++;
    }
    return counts;
  }, [skusSummary]);

  // Filtered SKUs by search term (code, description/title, ASIN) and channel
  const filteredSkus = useMemo(() => {
    const rawQuery = searchTerm.trim().toLowerCase();
    const queryWords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

    return skusSummary.filter((sku) => {
      if (selectedChannelFilter !== 'all' && sku.logisticsChannel !== selectedChannelFilter) {
        return false;
      }
      if (queryWords.length > 0) {
        const targetString = `${sku.sku} ${sku.title || ''} ${sku.asin || ''} ${sku.categoryName || ''}`.toLowerCase();
        return queryWords.every((word) => targetString.includes(word));
      }
      return true;
    });
  }, [skusSummary, selectedChannelFilter, searchTerm]);

  // Sorted SKUs
  const sortedSkus = useMemo(() => {
    return [...filteredSkus].sort((a, b) => {
      const aVal = (a[sortField] ?? 0) as number;
      const bVal = (b[sortField] ?? 0) as number;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [filteredSkus, sortField, sortAsc]);

  // Global financial totals
  const totalSales = skusSummary.reduce((acc, s) => acc + s.grossSales, 0);
  const totalUnits = skusSummary.reduce((acc, s) => acc + s.unitsSold, 0);
  const totalCogs = skusSummary.reduce((acc, s) => acc + s.cogs * s.unitsSold, 0);
  const totalCommission = skusSummary.reduce((acc, s) => acc + s.commissionAmount * s.unitsSold, 0);
  const totalLogisticsFees = skusSummary.reduce((acc, s) => acc + s.logisticsFeeUnit * s.unitsSold, 0);
  const totalDbaFees = skusSummary.reduce(
    (acc, s) => acc + (s.logisticsChannel === 'DBA' ? s.dbaFee * s.unitsSold : 0),
    0
  );
  const totalFbaFees = skusSummary.reduce(
    (acc, s) => acc + (s.logisticsChannel === 'FBA' ? s.fbaFee * s.unitsSold : 0),
    0
  );
  const totalAmazonFees = totalCommission + totalLogisticsFees;
  const overallTakeRate = totalSales > 0 ? (totalAmazonFees / totalSales) * 100 : 0;
  const totalProgramSavings = skusSummary.reduce((acc, s) => acc + (s.totalProgramSavings || 0), 0);

  const totalTaxes = skusSummary.reduce((acc, s) => acc + ((s.pmv * s.taxRatePercent) / 100) * s.unitsSold, 0);
  const totalMarginBeforeAds = skusSummary.reduce((acc, s) => acc + s.contributionMarginBeforeAds, 0);
  const totalAdsSpend = skusSummary.reduce((acc, s) => acc + s.adsSpend, 0);
  const totalNetProfit = totalMarginBeforeAds - totalAdsSpend;
  const overallBreakevenAcos = totalSales > 0 ? (totalMarginBeforeAds / totalSales) * 100 : 0;

  // Simulator calculations
  const simComm = calculateAmazonCommission(simPrice, simCategory);
  const simDbaStandard = calculateDbaFee(simPrice, simWeight, false);
  const simDbaSpPromo = calculateDbaFee(simPrice, simWeight, true);
  const simFbaStandard = calculateFbaFee(simPrice, simWeight, 'standard', simAdsSpendPercent);
  const simFbaR6 = calculateFbaFee(simPrice, simWeight, 'experimente_r6', simAdsSpendPercent);
  const simFbaExempt = calculateFbaFee(simPrice, simWeight, 'nova_conta_isencao', simAdsSpendPercent);

  // Critical operational alerts
  const negativeMarginSkus = skusSummary.filter((s) => s.contributionMarginPercent <= 0);
  const fbaAdsRiskSkus = skusSummary.filter(
    (s) => s.logisticsChannel === 'FBA' && s.fbaProgram === 'experimente_r6' && !s.fbaAdsEligible
  );

  const handleApplyBatch = () => {
    const weight = parseFloat(batchWeight) || 450;
    const tax = parseFloat(batchTaxRate) || 8;

    skusSummary.forEach((s) => {
      const updates: Partial<SkuUnitEconomics> = {
        categoryId: batchCategory,
        weightGrams: weight,
        taxRatePercent: tax,
        hasSp50Discount: batchSpDiscount,
        fbaProgram: batchFbaProgram,
      };
      if (batchChannel !== 'keep') {
        updates.logisticsChannel = batchChannel;
      }
      onUpdateSkuEconomics(s.sku, updates);
    });

    setIsBatchModalOpen(false);
  };

  const handleProcessPastedData = () => {
    if (!pasteData.trim()) return;

    const lines = pasteData.trim().split('\n');
    let updatedCount = 0;

    for (const line of lines) {
      const parts = line.split(/[\t;,]+/).map((p) => p.trim().replace(/"/g, ''));
      if (parts.length < 2) continue;

      const sku = parts[0];
      const match = skusSummary.find((s) => s.sku.toLowerCase() === sku.toLowerCase());
      if (match) {
        const updates: Partial<SkuUnitEconomics> = {};
        // Possible columns: SKU | COGS | PESO_G | CATEGORIA_ID | CANAL
        const parsedCogs = parseAmazonNumber(parts[1], 'currency');
        if (parsedCogs !== null) {
          updates.cogs = parsedCogs;
        }
        const parsedWeight = parseAmazonNumber(parts[2], 'decimal');
        if (parsedWeight !== null) {
          updates.weightGrams = parsedWeight;
        }
        if (parts[3]) {
          const cat = parts[3].toLowerCase();
          const matchedCat = AMAZON_BR_CATEGORIES.find((c) => c.id === cat || c.name.toLowerCase().includes(cat));
          if (matchedCat) updates.categoryId = matchedCat.id;
        }
        if (parts[4]) {
          const ch = parts[4].toUpperCase();
          if (ch.includes('FBA')) updates.logisticsChannel = 'FBA';
          else if (ch.includes('DBA')) updates.logisticsChannel = 'DBA';
          else if (ch.includes('FBM')) updates.logisticsChannel = 'FBM';
        }

        onUpdateSkuEconomics(match.sku, updates);
        updatedCount++;
      }
    }

    setImportSuccessMsg(`${updatedCount} SKUs atualizados com sucesso com tarifas oficiais!`);
    setTimeout(() => {
      setImportSuccessMsg(null);
      setIsImportModalOpen(false);
      setPasteData('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-cyan-400" />
            <span>Auditoria de Custos, Tarifas Oficiais Amazon BR & Campanhas 2026/2027</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Conferência exata: Comissões por Categoria (mín. R$ 1,00), Tarifas DBA (Promoção SP 50%) e Experimente FBA (Tarifa Fixa R$ 6,00)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveSubTab('campaign_simulator')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-bold rounded-xl transition border ${
              activeSubTab === 'campaign_simulator'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                : 'bg-[#0f1a2d] hover:bg-[#1a2b47] text-white border-[#243554]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Simulador DBA vs FBA</span>
          </button>

          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#0f1a2d] hover:bg-[#1a2b47] text-white border border-[#243554] text-xs md:text-sm font-bold rounded-xl transition"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Regras em Lote</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#0f1a2d] hover:bg-[#1a2b47] text-white border border-[#243554] text-xs md:text-sm font-bold rounded-xl transition"
          >
            <UploadCloud className="w-4 h-4 text-blue-400" />
            <span>Colar Tabela</span>
          </button>
        </div>
      </div>

      {/* Program Callouts / Official Terms Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DBA Callout */}
        <div className="bg-[#152238] border-2 border-amber-500/40 rounded-2xl p-5 text-xs md:text-sm space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 flex items-center gap-2 text-sm md:text-base">
              <Truck className="w-5 h-5 text-amber-400" />
              Economia com DBA (São Paulo)
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
              50% OFF em Frete
            </span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            Para vendedores CNPJ com coleta em SP e produtos &ge; R$ 79: a Amazon aplica{' '}
            <strong className="text-amber-300">50% de desconto automático</strong> na tarifa de envio DBA.
            Produtos até R$ 79 possuem tarifa fixa tabelada (<strong className="text-white">&lt;R$30: R$4,50</strong>;{' '}
            <strong className="text-white">R$30-49,99: R$6,50</strong>; <strong className="text-white">R$50-78,99: R$6,75</strong>).
          </p>
        </div>

        {/* FBA Callout */}
        <div className="bg-[#152238] border-2 border-indigo-500/40 rounded-2xl p-5 text-xs md:text-sm space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-300 flex items-center gap-2 text-sm md:text-base">
              <PackageCheck className="w-5 h-5 text-indigo-400" />
              Campanha Experimente FBA+ (2026/2027)
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Tarifa Fixa R$ 6,00
            </span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            Contas existentes pagam <strong className="text-indigo-300">apenas R$ 6,00 de logística</strong> para produtos &ge; R$ 79{' '}
            (com coleta e armazenagem R$ 0) se investirem no mínimo <strong className="text-amber-400">3,5% da receita em Amazon Ads</strong>.
            Contas novas têm <strong className="text-emerald-300">isenção total (100%) por 30 dias</strong>.
          </p>
        </div>
      </div>

      {/* KPI Cards: Auditoria Global de Tarifas & Economia dos Programas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-semibold text-slate-300">Faturamento da Loja</span>
          <p className="text-xl md:text-2xl font-black text-white mt-1">{formatBRL(totalSales)}</p>
          <span className="text-xs text-slate-400 mt-1 block">{totalUnits} unidades apuradas</span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Total Tarifas Amazon</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {(overallTakeRate ?? 0).toFixed(1)}% Take Rate
            </span>
          </div>
          <p className="text-xl md:text-2xl font-black text-amber-400 mt-1">{formatBRL(totalAmazonFees)}</p>
          <div className="text-xs text-slate-300 flex flex-col mt-1 font-medium">
            <span>Comissão: {formatBRL(totalCommission)}</span>
            <span>DBA/FBA: {formatBRL(totalLogisticsFees)}</span>
          </div>
        </div>

        <div className="bg-[#152238] border-2 border-emerald-500/40 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">Economia Campanhas</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl md:text-2xl font-black text-emerald-400 mt-1">{formatBRL(totalProgramSavings)}</p>
          <span className="text-xs text-slate-300 mt-1 block">
            Gerado via FBA R$ 6,00 e DBA SP 50%
          </span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-semibold text-slate-300">Margem Pré-Ads (Breakeven)</span>
          <p className="text-xl md:text-2xl font-black text-white mt-1">{formatBRL(totalMarginBeforeAds)}</p>
          <span className="text-xs font-bold text-amber-400 mt-1 block">
            ACOS Breakeven Médio: {(overallBreakevenAcos ?? 0).toFixed(1)}%
          </span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-semibold text-slate-300">Lucro Líquido Real</span>
          <p className={`text-xl md:text-2xl font-black mt-1 ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatBRL(totalNetProfit)}
          </p>
          <span className="text-xs text-slate-300 mt-1 block font-medium">
            {totalSales > 0 ? `${((totalNetProfit / totalSales) * 100).toFixed(1)}% margem líquida pós-Ads` : 'N/D'}
          </span>
        </div>
      </div>

      {/* Critical Operational Warnings */}
      {fbaAdsRiskSkus.length > 0 && (
        <div className="p-4 bg-[#152238] border-2 border-amber-500/50 rounded-2xl text-xs md:text-sm flex items-start gap-3 shadow-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 text-sm md:text-base">
              {fbaAdsRiskSkus.length} SKU(s) em FBA com Risco de Perder a Tarifa de R$ 6,00:
            </span>
            <p className="text-slate-200 mt-1 leading-relaxed">
              O programa 'Experimente FBA+' exige investimento mínimo de <strong className="text-amber-400">3,5% da receita em Amazon Ads</strong>.
              Nestes produtos, o investimento atual está abaixo do requisito, sujeitando o SKU a retornar à tarifa padrão cheia na apuração mensal do dia 20.
            </p>
          </div>
        </div>
      )}

      {/* Subtab Switcher */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveSubTab('fees_audit')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition ${
              activeSubTab === 'fees_audit'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-[#0f1a2d] text-slate-200 hover:text-white border border-[#243554]'
            }`}
          >
            Conferência das Tarifas Oficiais por SKU
          </button>

          <button
            onClick={() => setActiveSubTab('campaign_simulator')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeSubTab === 'campaign_simulator'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-[#0f1a2d] text-slate-200 hover:text-white border border-[#243554]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Simulador de Economia (DBA vs FBA)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition ${
              activeSubTab === 'overview'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-[#0f1a2d] text-slate-200 hover:text-white border border-[#243554]'
            }`}
          >
            Unit Economics & Lucro Real
          </button>

          <button
            onClick={() => setActiveSubTab('commission_preview')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeSubTab === 'commission_preview'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'bg-[#0f1a2d] text-slate-200 hover:text-white border border-[#243554]'
            }`}
          >
            <Coins className="w-4 h-4 text-cyan-400" />
            <span>Comissões Amazon & Precificação</span>
          </button>
        </div>

        {activeSubTab !== 'campaign_simulator' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 bg-[#0f1a2d] p-1 rounded-xl border border-[#243554] text-xs">
              <span className="text-xs text-slate-400 uppercase font-bold px-1.5 hidden sm:inline">Canal:</span>
              {(['all', 'FBA', 'DBA', 'FBM'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannelFilter(ch)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedChannelFilter === ch
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#1a2b47]'
                  }`}
                >
                  {ch === 'all' ? 'Todos' : ch}
                  <span className="ml-1 opacity-70 text-[10px]">
                    ({channelCounts[ch]})
                  </span>
                </button>
              ))}
            </div>

            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar SKU, Descrição ou ASIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchTerm('');
                }}
                className="bg-[#0f1a2d] border border-[#243554] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 rounded-xl pl-9 pr-8 py-2 text-xs md:text-sm text-white placeholder-slate-400 transition w-60 sm:w-72 font-sans"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  title="Limpar busca (Esc)"
                  className="absolute right-2 text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONTENT FOR TAB: SIMULADOR DBA VS FBA */}
      {activeSubTab === 'campaign_simulator' && (
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Simulador Interativo: Economia com DBA e Experimente FBA+</span>
            </h3>
            <p className="text-xs md:text-sm text-slate-300 mt-1 font-medium">
              Simule qualquer preço e peso do catálogo para comparar exatamente as tarifas, economia e lucro em cada modalidade logística da Amazon Brasil.
            </p>
          </div>

          {/* Simulator Inputs */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5 bg-[#0f1a2d] p-5 rounded-2xl border border-[#243554]">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Preço de Venda (PMV)
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="1"
                  value={simPrice}
                  onChange={(e) => setSimPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#152238] border border-[#243554] rounded-xl px-2.5 py-1.5 text-xs md:text-sm text-amber-300 font-black focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Peso Unitário (g)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="50"
                  value={simWeight}
                  onChange={(e) => setSimWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#152238] border border-[#243554] rounded-xl px-2.5 py-1.5 text-xs md:text-sm text-white font-bold focus:ring-2 focus:ring-cyan-400 font-mono"
                />
                <span className="text-xs font-bold text-slate-400">g</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Categoria Oficial
              </label>
              <select
                value={simCategory}
                onChange={(e) => setSimCategory(e.target.value)}
                className="w-full bg-[#152238] border border-[#243554] rounded-xl px-2 py-1.5 text-xs text-white font-bold focus:ring-2 focus:ring-cyan-400"
              >
                {AMAZON_BR_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.defaultPercent}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Custo Produto (COGS)
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="1"
                  value={simCogs}
                  onChange={(e) => setSimCogs(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#152238] border border-[#243554] rounded-xl px-2.5 py-1.5 text-xs md:text-sm text-white font-bold focus:ring-2 focus:ring-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Imposto (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={simTax}
                onChange={(e) => setSimTax(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#152238] border border-[#243554] rounded-xl px-2.5 py-1.5 text-xs md:text-sm text-white font-bold focus:ring-2 focus:ring-cyan-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Investimento Ads (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={simAdsSpendPercent}
                onChange={(e) => setSimAdsSpendPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#152238] border border-[#243554] rounded-xl px-2.5 py-1.5 text-xs md:text-sm text-amber-300 font-black focus:ring-2 focus:ring-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Scenario Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Scenario 1: DBA Padrão Sem Benefício */}
            {(() => {
              const comm = simComm.amount;
              const logFee = simDbaStandard.effectiveFee;
              const tax = (simPrice * simTax) / 100;
              const totalCost = simCogs + comm + logFee + tax;
              const margin = simPrice - totalCost;
              const marginPercent = simPrice > 0 ? (margin / simPrice) * 100 : 0;

              return (
                <div className="bg-[#0f1a2d] border border-[#243554] rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#243554]">
                      <span className="font-bold text-sm text-white">1. DBA Tabela Padrão</span>
                      <span className="text-xs text-slate-400 font-semibold">Sem promoção</span>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs md:text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span>Preço de Venda:</span>
                        <span className="font-bold text-white font-mono">{formatBRL(simPrice)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300">
                        <span>Comissão ({(simComm.effectivePercent ?? 0).toFixed(1)}%):</span>
                        <span className="font-mono font-semibold">{formatBRL(comm)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300">
                        <span>Tarifa DBA:</span>
                        <span className="font-mono font-bold text-amber-400">{formatBRL(logFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COGS + Impostos:</span>
                        <span className="font-mono">{formatBRL(simCogs + tax)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#243554] text-xs md:text-sm">
                    <div className="flex justify-between text-slate-200 font-bold">
                      <span>Margem Pré-Ads:</span>
                      <span className={`font-mono ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatBRL(margin)} ({(marginPercent ?? 0).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-black mt-1.5 text-sm">
                      <span>ACOS Breakeven:</span>
                      <span className="font-mono">{(Math.max(0, marginPercent) ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Scenario 2: DBA com 50% de Desconto SP */}
            {(() => {
              const comm = simComm.amount;
              const logFee = simDbaSpPromo.effectiveFee;
              const tax = (simPrice * simTax) / 100;
              const totalCost = simCogs + comm + logFee + tax;
              const margin = simPrice - totalCost;
              const marginPercent = simPrice > 0 ? (margin / simPrice) * 100 : 0;
              const savings = simDbaStandard.effectiveFee - logFee;

              return (
                <div className="bg-[#0f1a2d] border border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
                      <span className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-amber-400" />
                        2. Economia DBA (SP 50%)
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Ativo
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs md:text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span>Preço de Venda:</span>
                        <span className="font-bold text-white font-mono">{formatBRL(simPrice)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300">
                        <span>Comissão:</span>
                        <span className="font-mono font-semibold">{formatBRL(comm)}</span>
                      </div>
                      <div className="flex justify-between text-amber-300">
                        <span>Tarifa DBA (50% OFF):</span>
                        <span className="font-mono font-black text-amber-400">{formatBRL(logFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COGS + Impostos:</span>
                        <span className="font-mono">{formatBRL(simCogs + tax)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-500/30 text-xs md:text-sm">
                    <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs md:text-sm mb-2.5 flex items-center justify-between font-bold">
                      <span>Economia no Frete:</span>
                      <strong className="text-emerald-400 font-black">+{formatBRL(savings)}/unid</strong>
                    </div>
                    <div className="flex justify-between text-slate-200 font-bold">
                      <span>Margem Pré-Ads:</span>
                      <span className="text-emerald-400 font-mono font-black">
                        {formatBRL(margin)} ({(marginPercent ?? 0).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-black mt-1.5 text-sm">
                      <span>ACOS Breakeven:</span>
                      <span className="font-mono">{(Math.max(0, marginPercent) ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Scenario 3: Experimente FBA+ (Tarifa Fixa R$ 6,00) */}
            {(() => {
              const comm = simComm.amount;
              const logFee = simFbaR6.effectiveFee;
              const tax = (simPrice * simTax) / 100;
              const totalCost = simCogs + comm + logFee + tax;
              const margin = simPrice - totalCost;
              const marginPercent = simPrice > 0 ? (margin / simPrice) * 100 : 0;
              const savings = simFbaStandard.effectiveFee - logFee;

              return (
                <div className="bg-[#0f1a2d] border-2 border-indigo-500/60 rounded-2xl p-5 flex flex-col justify-between shadow-xl ring-2 ring-indigo-500/20">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-indigo-500/30">
                      <span className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4 text-indigo-400" />
                        3. Experimente FBA+ (R$ 6)
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        Recomendado
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs md:text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span>Preço de Venda:</span>
                        <span className="font-bold text-white font-mono">{formatBRL(simPrice)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-300">
                        <span>Comissão:</span>
                        <span className="font-mono font-semibold">{formatBRL(comm)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-300">
                        <span>Tarifa FBA Fixa:</span>
                        <span className="font-mono font-black text-emerald-400">{formatBRL(logFee)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Coleta & Armazenagem:</span>
                        <span className="text-emerald-400 font-bold">R$ 0,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COGS + Impostos:</span>
                        <span className="font-mono">{formatBRL(simCogs + tax)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-indigo-500/30 text-xs md:text-sm">
                    <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs md:text-sm mb-2.5 flex items-center justify-between font-bold">
                      <span>Economia vs FBA Cheio:</span>
                      <strong className="text-emerald-400 font-black">+{formatBRL(savings)}/unid</strong>
                    </div>
                    <div className="flex justify-between text-slate-200 font-bold">
                      <span>Margem Pré-Ads:</span>
                      <span className="text-emerald-400 font-mono font-black">
                        {formatBRL(margin)} ({(marginPercent ?? 0).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-indigo-300 font-black mt-1.5 text-sm">
                      <span>ACOS Breakeven:</span>
                      <span className="font-mono">{(Math.max(0, marginPercent) ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Scenario 4: FBA Conta Nova (100% Isenção nos 30 dias) */}
            {(() => {
              const comm = simComm.amount;
              const logFee = simFbaExempt.effectiveFee;
              const tax = (simPrice * simTax) / 100;
              const totalCost = simCogs + comm + logFee + tax;
              const margin = simPrice - totalCost;
              const marginPercent = simPrice > 0 ? (margin / simPrice) * 100 : 0;
              const savings = simFbaStandard.effectiveFee;

              return (
                <div className="bg-[#0f1a2d] border border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
                      <span className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        4. FBA Conta Nova (30 dias)
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        100% Isenção
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2 text-xs md:text-sm text-slate-300">
                      <div className="flex justify-between">
                        <span>Preço de Venda:</span>
                        <span className="font-bold text-white font-mono">{formatBRL(simPrice)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-300">
                        <span>Comissão:</span>
                        <span className="font-mono font-semibold">{formatBRL(comm)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-300">
                        <span>Tarifa Logística FBA:</span>
                        <span className="font-mono font-black text-emerald-400">R$ 0,00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COGS + Impostos:</span>
                        <span className="font-mono">{formatBRL(simCogs + tax)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-500/30 text-xs md:text-sm">
                    <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs md:text-sm mb-2.5 flex items-center justify-between font-bold">
                      <span>Economia no Envio:</span>
                      <strong className="text-emerald-400 font-black">+{formatBRL(savings)}/unid</strong>
                    </div>
                    <div className="flex justify-between text-slate-200 font-bold">
                      <span>Margem Pré-Ads:</span>
                      <span className="text-emerald-400 font-mono font-black">
                        {formatBRL(margin)} ({(marginPercent ?? 0).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-300 font-black mt-1.5 text-sm">
                      <span>ACOS Breakeven:</span>
                      <span className="font-mono">{(Math.max(0, marginPercent) ?? 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* DETAILED TABLE: CONFERÊNCIA DAS TARIFAS OFICIAIS */}
      {activeSubTab === 'fees_audit' && (
        <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-[#243554] bg-[#111c30] flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Conferência de Tarifas Oficiais por SKU</span>
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                  {searchTerm.trim() || selectedChannelFilter !== 'all'
                    ? `${sortedSkus.length} de ${skusSummary.length} SKUs`
                    : `${sortedSkus.length} SKUs`}
                </span>
                {(searchTerm.trim() || selectedChannelFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedChannelFilter('all');
                    }}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Filtre por descrição ou código do SKU para editar COGS, categoria, peso e canais em tempo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Dedicated Search Input */}
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, SKU ou ASIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchTerm('');
                  }}
                  className="w-full bg-[#0b1320] border border-[#2d4368] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 rounded-xl pl-9 pr-8 py-2 text-xs md:text-sm text-white placeholder-slate-400 transition shadow-inner font-sans"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    title="Limpar busca (Esc)"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Channel Filter Chips */}
              <div className="flex items-center gap-1 bg-[#0b1320] p-1 rounded-xl border border-[#243554] text-xs">
                {(['all', 'FBA', 'DBA', 'FBM'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannelFilter(ch)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedChannelFilter === ch
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-[#1a2b47]'
                    }`}
                  >
                    {ch === 'all' ? 'Todos' : ch}
                    <span className="ml-1 opacity-70 text-[10px]">
                      ({channelCounts[ch]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm text-slate-200">
              <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">SKU & Canal</th>
                  <th className="py-3 px-3.5">PMV</th>
                  <th className="py-3 px-3.5">Categoria Oficial</th>
                  <th className="py-3 px-3.5">Peso (g)</th>
                  <th className="py-3 px-3.5">Comissão Amazon</th>
                  <th className="py-3 px-3.5">Tarifa Logística Ativa</th>
                  <th className="py-3 px-3.5">Programa / Benefício</th>
                  <th className="py-3 px-3.5">COGS (Custo)</th>
                  <th className="py-3 px-3.5">Margem Líq. Pré-Ads</th>
                  <th className="py-3 px-3.5">ACOS Breakeven</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                {sortedSkus.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 px-4 text-center">
                      <div className="max-w-md mx-auto space-y-3 font-sans">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center mx-auto text-cyan-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-white">
                          Nenhum SKU encontrado {searchTerm.trim() ? `para "${searchTerm}"` : ''}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Não encontramos nenhum produto que coincida com a pesquisa na descrição, no código SKU ou no ASIN.
                        </p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedChannelFilter('all');
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Limpar Filtros e Ver Todos</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedSkus.map((sku) => {
                  const isNegative = sku.contributionMarginPercent <= 0;
                  const hasSavings = (sku.programSavingsUnit || 0) > 0;

                  return (
                    <tr key={sku.sku} className="hover:bg-[#1a2b47] transition">
                      {/* SKU & Canal */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white truncate max-w-[160px] font-sans text-sm" title={sku.title || sku.sku}>
                            {sku.sku}
                          </p>
                          <button
                            onClick={() => {
                              const nextChannel: 'FBA' | 'DBA' | 'FBM' =
                                sku.logisticsChannel === 'DBA' ? 'FBA' : sku.logisticsChannel === 'FBA' ? 'FBM' : 'DBA';
                              onUpdateSkuEconomics(sku.sku, { logisticsChannel: nextChannel });
                            }}
                            title="Clique para alternar modalidade logística"
                            className={`px-2 py-0.5 rounded text-xs font-bold border transition ${
                              sku.logisticsChannel === 'FBA'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
                                : sku.logisticsChannel === 'DBA'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                : 'bg-[#0f1a2d] text-slate-300 border-[#243554] hover:bg-slate-750'
                            }`}
                          >
                            {sku.logisticsChannel}
                          </button>
                        </div>
                        <span className="text-xs text-slate-400 font-sans block mt-0.5">{sku.unitsSold} unid.</span>
                      </td>

                      {/* PMV */}
                      <td className="py-3 px-3.5 font-bold text-white">{formatBRL(sku.pmv)}</td>

                      {/* Categoria Oficial Amazon BR */}
                      <td className="py-3 px-3.5">
                        <select
                          value={sku.categoryId || 'casa_cozinha'}
                          onChange={(e) => {
                            onUpdateSkuEconomics(sku.sku, { categoryId: e.target.value });
                          }}
                          className="w-40 bg-[#0f1a2d] border border-[#243554] rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-cyan-400 font-sans"
                        >
                          {AMAZON_BR_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name.slice(0, 22)} ({cat.defaultPercent}%)
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Peso em gramas */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="50"
                            value={sku.weightGrams || 450}
                            onChange={(e) => {
                              onUpdateSkuEconomics(sku.sku, { weightGrams: parseFloat(e.target.value) || 0 });
                            }}
                            className="w-16 bg-[#0f1a2d] border border-[#243554] rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-cyan-400 font-mono font-bold"
                          />
                          <span className="text-slate-400 text-xs">g</span>
                        </div>
                      </td>

                      {/* Comissão Amazon (R$ e %) */}
                      <td className="py-3 px-3.5">
                        <span className="text-slate-100 font-semibold">{formatBRL(sku.commissionAmount)}</span>
                        <p className="text-xs text-slate-400">{(sku.commissionPercent ?? 0).toFixed(1)}%</p>
                      </td>

                      {/* Tarifa Logística Ativa (DBA ou FBA) */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-300">{formatBRL(sku.logisticsFeeUnit)}</span>
                          {hasSavings && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                              title={`Economia de ${formatBRL(sku.programSavingsUnit || 0)} por unidade`}
                            >
                              -{formatBRL(sku.programSavingsUnit || 0)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {sku.logisticsChannel === 'FBA' ? 'Tarifa FBA' : sku.logisticsChannel === 'DBA' ? 'Tarifa DBA' : 'Frete Próprio'}
                        </p>
                      </td>

                      {/* Programa / Benefício Ativo */}
                      <td className="py-3 px-3.5">
                        {sku.logisticsChannel === 'FBA' ? (
                          <div>
                            <select
                              value={sku.fbaProgram || 'experimente_r6'}
                              onChange={(e) => {
                                onUpdateSkuEconomics(sku.sku, { fbaProgram: e.target.value as any });
                              }}
                              className="bg-[#0f1a2d] border border-indigo-500/40 text-indigo-300 rounded-lg px-2 py-1 text-xs font-bold font-sans"
                            >
                              <option value="experimente_r6">Experimente R$ 6,00</option>
                              <option value="nova_conta_isencao">Conta Nova (Isenção 100%)</option>
                              <option value="standard">FBA Padrão</option>
                            </select>
                            {sku.fbaProgram === 'experimente_r6' && (
                              <p
                                className={`text-[10px] mt-0.5 font-bold ${
                                  sku.fbaAdsEligible ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                {sku.fbaAdsEligible ? '✓ Meta Ads 3,5% OK' : '⚠ Ads < 3,5%'}
                              </p>
                            )}
                          </div>
                        ) : sku.logisticsChannel === 'DBA' ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              id={`sp50_${sku.sku}`}
                              checked={sku.hasSp50Discount !== false}
                              onChange={(e) => {
                                onUpdateSkuEconomics(sku.sku, { hasSp50Discount: e.target.checked });
                              }}
                              className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                            />
                            <label htmlFor={`sp50_${sku.sku}`} className="text-xs text-amber-300 cursor-pointer font-bold font-sans">
                              DBA 50% SP
                            </label>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-sans">Envio próprio</span>
                        )}
                      </td>

                      {/* COGS (Custo do Produto) */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-xs">R$</span>
                          <input
                            type="number"
                            step="1"
                            value={Math.round(sku.cogs)}
                            onChange={(e) => {
                              onUpdateSkuEconomics(sku.sku, { cogs: parseFloat(e.target.value) || 0 });
                            }}
                            className="w-16 bg-[#0f1a2d] border border-[#243554] rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-cyan-400 font-mono font-bold"
                          />
                        </div>
                      </td>

                      {/* Margem Unitária Pré-Ads */}
                      <td className="py-3 px-3.5">
                        <span className={`font-bold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatBRL(sku.contributionMarginBeforeAds / (sku.unitsSold || 1))}
                        </span>
                        <p className="text-xs text-slate-300 font-sans">
                          {(sku.contributionMarginPercent ?? 0).toFixed(1)}% margem
                        </p>
                      </td>

                      {/* ACOS Breakeven */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                            isNegative
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {sku.breakevenAcos !== null ? `${(sku.breakevenAcos ?? 0).toFixed(1)}%` : 'N/D'}
                        </span>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OVERVIEW TAB: UNIT ECONOMICS & ADS PROFIT */}
      {activeSubTab === 'overview' && (
        <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-[#243554] bg-[#111c30] flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-white">
                  Unit Economics Consolidado & Lucro Líquido pós-Ads
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                  {searchTerm.trim() || selectedChannelFilter !== 'all'
                    ? `${sortedSkus.length} de ${skusSummary.length} SKUs`
                    : `${sortedSkus.length} SKUs`}
                </span>
                {(searchTerm.trim() || selectedChannelFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedChannelFilter('all');
                    }}
                    className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Auditoria financeira de margem de contribuição pré-Ads, ACoS breakeven e lucro líquido consolidado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-80">
                <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, SKU ou ASIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchTerm('');
                  }}
                  className="w-full bg-[#0b1320] border border-[#2d4368] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 rounded-xl pl-9 pr-8 py-2 text-xs md:text-sm text-white placeholder-slate-400 transition shadow-inner font-sans"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    title="Limpar busca (Esc)"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Channel Filter Chips */}
              <div className="flex items-center gap-1 bg-[#0b1320] p-1 rounded-xl border border-[#243554] text-xs">
                {(['all', 'FBA', 'DBA', 'FBM'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannelFilter(ch)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedChannelFilter === ch
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-[#1a2b47]'
                    }`}
                  >
                    {ch === 'all' ? 'Todos' : ch}
                    <span className="ml-1 opacity-70 text-[10px]">
                      ({channelCounts[ch]})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm text-slate-200">
              <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">SKU</th>
                  <th className="py-3 px-3.5">Receita Bruta</th>
                  <th className="py-3 px-3.5">Custos Variáveis</th>
                  <th className="py-3 px-3.5">Tarifas Amazon</th>
                  <th className="py-3 px-3.5">Margem Pré-Ads</th>
                  <th className="py-3 px-3.5">ACOS Breakeven</th>
                  <th className="py-3 px-3.5">Gasto Ads</th>
                  <th className="py-3 px-3.5">Vendas Ads</th>
                  <th className="py-3 px-3.5">Lucro Líquido Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                {sortedSkus.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 px-4 text-center">
                      <div className="max-w-md mx-auto space-y-3 font-sans">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center mx-auto text-cyan-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-white">
                          Nenhum SKU encontrado {searchTerm.trim() ? `para "${searchTerm}"` : ''}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Não encontramos nenhum produto que coincida com a pesquisa. Verifique os termos ou limpe os filtros para visualizar todo o catálogo.
                        </p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedChannelFilter('all');
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Limpar Filtros e Ver Todos</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedSkus.map((sku) => {
                  const isUnderperforming = sku.netProfitAfterAds !== null && sku.netProfitAfterAds < 0;

                  return (
                    <tr key={sku.sku} className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-white max-w-[180px] truncate font-sans text-sm" title={sku.sku}>
                        {sku.sku}
                      </td>
                      <td className="py-3 px-3.5 text-white font-bold">{formatBRL(sku.grossSales)}</td>
                      <td className="py-3 px-3.5 text-slate-300">{formatBRL(sku.totalVariableCosts)}</td>
                      <td className="py-3 px-3.5 text-amber-400 font-bold">
                        {formatBRL(sku.amazonTotalFeeUnit * sku.unitsSold)}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-emerald-400">
                          {formatBRL(sku.contributionMarginBeforeAds)} ({(sku.contributionMarginPercent ?? 0).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {sku.breakevenAcos !== null ? `${(sku.breakevenAcos ?? 0).toFixed(1)}%` : 'N/D'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-amber-400 font-bold">{formatBRL(sku.adsSpend)}</td>
                      <td className="py-3 px-3.5 text-slate-200">{formatBRL(sku.adsSales)}</td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`font-bold ${
                            isUnderperforming ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {sku.netProfitAfterAds !== null ? `${formatBRL(sku.netProfitAfterAds)} (${sku.netMarginPercent?.toFixed(1) || '0'}%)` : 'N/D (Sem COGS)'}
                        </span>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT FOR TAB: COMMISSION PREVIEW & PRICING */}
      {activeSubTab === 'commission_preview' && (
        <div className="space-y-6">
          {/* Status and Summary Bar */}
          {(() => {
            const hasCommReport = sortedSkus.some((s) => s.origemComissao === 'Comissão oficial estimada da Amazon');
            return hasCommReport ? (
              <div className="p-4 bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl text-xs md:text-sm flex items-start gap-3 shadow-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300 text-sm md:text-base font-sans">
                    Relatório de Visualização da Comissão Ativo e Mapeado
                  </span>
                  <p className="text-slate-200 mt-1 leading-relaxed">
                    O sistema identificou e integrou com sucesso a planilha oficial de Visualização de Tarifa/Comissão da Amazon Brasil. As comissões estimadas unitárias foram priorizadas sobre as tabelas genéricas para cada oferta publicada, provendo o cálculo mais seguro de margem e precificação de breakeven.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-950/40 border-2 border-amber-500/40 rounded-2xl text-xs md:text-sm flex items-start gap-3 shadow-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 text-sm md:text-base font-sans">
                    Operação em Contingência: Relatório de Comissão Pendente
                  </span>
                  <p className="text-slate-200 mt-1 leading-relaxed">
                    Nenhum Relatório de Visualização da Comissão foi importado nesta sessão. As tarifas de comissão exibidas abaixo estão operando como <strong className="text-amber-400">"Estimativa por categoria"</strong> baseada na alíquota oficial padrão da Amazon Brasil (mínimo de R$ 1,00). Importe o arquivo oficial de tarifa para garantir total exatidão operacional e auditar sangrias fiscais.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Pricing & Commission Table Card */}
          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-[#243554] bg-[#111c30] flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-white">
                    Tabela Consolidada de Precificação & Comissão Estimada
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-mono">
                    {sortedSkus.length} SKUs analisados
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Cruzamento completo entre preços de oferta, custos logísticos ativos, COGS e publicidade por SKU para simulação do preço mínimo.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider font-sans">
                  <tr>
                    <th className="py-3 px-3">SKU & ASIN</th>
                    <th className="py-3 px-3">Preço Publicado</th>
                    <th className="py-3 px-3">Preço Médio Vendido</th>
                    <th className="py-3 px-3">Comissão Estimada</th>
                    <th className="py-3 px-3">Comissão Efetiva</th>
                    <th className="py-3 px-3">Logística</th>
                    <th className="py-3 px-3">Ads por Unidade</th>
                    <th className="py-3 px-3">COGS</th>
                    <th className="py-3 px-3">Margem de Contribuição</th>
                    <th className="py-3 px-3">Margem Líquida</th>
                    <th className="py-3 px-3 text-cyan-300 font-black">Preço Mínimo</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs">
                  {sortedSkus.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-14 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3 font-sans">
                          <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center mx-auto text-cyan-400">
                            <Search className="w-6 h-6" />
                          </div>
                          <h4 className="text-base font-bold text-white">Nenhum SKU encontrado</h4>
                          <p className="text-xs text-slate-300">Não há dados de SKU para exibir neste quadrante.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedSkus.map((sku) => {
                      const adsPerUnit = sku.unitsSold > 0 ? (sku.adsSpend / sku.unitsSold) : 0;
                      
                      // Preço Mínimo Breakeven Formula:
                      // Preço Mínimo = (COGS + Logística + Ads + Embalagem + fixedFee) / (1 - Comissão - Imposto)
                      const taxDiv = (sku.taxRatePercent || 6.0) / 100;
                      const commDiv = (sku.commissionPercent || 12.0) / 100;
                      const divFactor = 1 - commDiv - taxDiv;
                      const numFactor = (sku.cogs || 0) + (sku.logisticsFeeUnit || 0) + adsPerUnit + (sku.shippingCost || 0) + (sku.fixedFee || 0);
                      const precoMinimoBreakeven = divFactor > 0 ? numFactor / divFactor : (sku.cogs || 0);

                      const isNegative = sku.contributionMarginPercent <= 0;
                      const hasCogs = !!sku.hasCogsProvided;

                      let statusColorClass = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                      if (sku.statusComissao?.includes('contingencia') || sku.statusComissao?.includes('Estimativa')) {
                        statusColorClass = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                      }
                      if (sku.alertaDivergenciaComissao) {
                        statusColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
                      }

                      return (
                        <tr key={sku.sku} className="hover:bg-[#1a2b47] transition">
                          {/* SKU & ASIN */}
                          <td className="py-2.5 px-3">
                            <div className="font-sans">
                              <p className="font-bold text-white max-w-[140px] truncate" title={sku.title || sku.sku}>
                                {sku.sku}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono block">ASIN: {sku.asin || 'N/D'}</span>
                            </div>
                          </td>

                          {/* Preço Publicado */}
                          <td className="py-2.5 px-3 text-slate-200">
                            {sku.precoPublicado !== undefined && sku.precoPublicado > 0 ? formatBRL(sku.precoPublicado) : 'N/D — validar'}
                          </td>

                          {/* Preço Médio Vendido */}
                          <td className="py-2.5 px-3 text-white font-bold">
                            {formatBRL(sku.pmv)}
                          </td>

                          {/* Comissão Estimada (preview unitária) */}
                          <td className="py-2.5 px-3 text-amber-300 font-bold">
                            {sku.comissaoEstimadaUnidade !== undefined && sku.comissaoEstimadaUnidade > 0
                              ? `${formatBRL(sku.comissaoEstimadaUnidade)} (${(sku.percentualComissaoEfetivo ?? 12).toFixed(1)}%)`
                              : `${formatBRL(sku.commissionAmount)} (${(sku.commissionPercent ?? 12).toFixed(1)}%)`
                            }
                          </td>

                          {/* Comissão Efetiva */}
                          <td className="py-2.5 px-3 text-amber-400 font-bold">
                            {formatBRL(sku.commissionAmount)}
                          </td>

                          {/* Logística */}
                          <td className="py-2.5 px-3 text-slate-300">
                            {formatBRL(sku.logisticsFeeUnit)}
                          </td>

                          {/* Ads por Unidade */}
                          <td className="py-2.5 px-3 text-rose-300 font-bold">
                            {formatBRL(adsPerUnit)}
                          </td>

                          {/* COGS */}
                          <td className="py-2.5 px-3 text-slate-200">
                            {hasCogs ? formatBRL(sku.cogs) : <span className="text-rose-400 italic">Pendente</span>}
                          </td>

                          {/* Margem de Contribuição */}
                          <td className="py-2.5 px-3">
                            <span className={`font-bold ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {formatBRL(sku.contributionMarginBeforeAds)} ({(sku.contributionMarginPercent ?? 0).toFixed(1)}%)
                            </span>
                          </td>

                          {/* Margem Líquida */}
                          <td className="py-2.5 px-3">
                            {hasCogs && sku.netProfitAfterAds !== null ? (
                              <span className={`font-black ${sku.netProfitAfterAds < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {formatBRL(sku.netProfitAfterAds)} ({(sku.netMarginPercent ?? 0).toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="text-rose-400/90 text-[10px] font-sans">COGS pendente</span>
                            )}
                          </td>

                          {/* Preço Mínimo Breakeven */}
                          <td className="py-2.5 px-3 text-cyan-300 font-black text-sm">
                            {formatBRL(precoMinimoBreakeven)}
                          </td>

                          {/* Origem e Status */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-1 font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${statusColorClass}`}>
                                {sku.alertaDivergenciaComissao ? 'DIVERGÊNCIA ATIVA' : sku.statusComissao}
                              </span>
                              <span className="text-[10px] text-slate-400 block max-w-[180px] leading-tight" title={sku.alertaDivergenciaComissao || sku.origemComissao}>
                                {sku.alertaDivergenciaComissao || sku.origemComissao}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Regras em Lote */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#152238] border border-[#243554] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#243554] pb-3.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>Aplicar Regras e Campanhas em Lote</span>
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs md:text-sm">
              <div>
                <label className="block text-slate-200 font-bold mb-1">
                  Categoria Padrão Amazon Brasil
                </label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  {AMAZON_BR_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.defaultPercent}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-200 font-bold mb-1">
                    Peso Padrão (gramas)
                  </label>
                  <input
                    type="number"
                    value={batchWeight}
                    onChange={(e) => setBatchWeight(e.target.value)}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Ex: 450"
                  />
                </div>

                <div>
                  <label className="block text-slate-200 font-bold mb-1">
                    Alíquota Imposto (%)
                  </label>
                  <input
                    type="number"
                    value={batchTaxRate}
                    onChange={(e) => setBatchTaxRate(e.target.value)}
                    className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Ex: 8"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-200 font-bold mb-1">
                  Canal Logístico
                </label>
                <select
                  value={batchChannel}
                  onChange={(e) => setBatchChannel(e.target.value as any)}
                  className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="keep">Manter canais atuais</option>
                  <option value="DBA">Definir todos como DBA</option>
                  <option value="FBA">Definir todos como FBA</option>
                  <option value="FBM">Definir todos como FBM</option>
                </select>
              </div>

              <div className="p-3.5 bg-[#0f1a2d] border border-[#243554] rounded-xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="batchSpDisc"
                    checked={batchSpDiscount}
                    onChange={(e) => setBatchSpDiscount(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="batchSpDisc" className="text-white cursor-pointer font-bold">
                    Ativar Desconto de 50% no DBA (Campanha SP)
                  </label>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">
                    Programa FBA Ativo:
                  </label>
                  <select
                    value={batchFbaProgram}
                    onChange={(e) => setBatchFbaProgram(e.target.value as any)}
                    className="w-full bg-[#152238] border border-[#243554] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-bold"
                  >
                    <option value="experimente_r6">Experimente FBA+ (Tarifa R$ 6,00 para &ge; R$ 79)</option>
                    <option value="nova_conta_isencao">Conta Nova em FBA (100% isenção nos 30 dias)</option>
                    <option value="standard">FBA Tabela Padrão</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyBatch}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
              >
                Aplicar a Todos os SKUs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Colar Tabela de Custos */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#152238] border border-[#243554] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#243554] pb-3.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Colar Tabela de Custos (Excel / Planilhas)</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5">
              <p className="font-semibold text-white">Copie e cole as colunas no seguinte formato:</p>
              <div className="bg-[#0f1a2d] border border-[#243554] p-2.5 rounded-xl text-xs font-mono text-amber-300 font-bold">
                SKU [tab] COGS [tab] PESO_GRAMAS [tab] CATEGORIA [tab] CANAL
              </div>
              <p className="text-xs text-slate-400">
                Exemplo: <span className="font-mono text-slate-200">SKU-CAFE-1KG 28.00 450 casa_cozinha DBA</span>
              </p>
            </div>

            <textarea
              rows={6}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Cole as linhas aqui..."
              className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Fechar
              </button>
              <button
                onClick={handleProcessPastedData}
                disabled={!pasteData.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
              >
                Importar e Atualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
