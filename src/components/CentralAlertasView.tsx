import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Info,
  ShieldCheck,
  TrendingDown,
  X,
  Package,
  TrendingUp,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { ParsedDataset, SkuUnitEconomics } from '../types/amazon';

interface CentralAlertasViewProps {
  dataset: ParsedDataset;
  skusWithEconomics: SkuUnitEconomics[];
}

export const CentralAlertasView: React.FC<CentralAlertasViewProps> = ({
  dataset,
  skusWithEconomics,
}) => {
  const [levelFilter, setLevelFilter] = useState<'all' | 'critico' | 'alto' | 'medio'>('all');

  const alerts = useMemo(() => {
    const list: {
      id: string;
      level: 'critico' | 'alto' | 'medio';
      category: 'margin' | 'logistics' | 'ads' | 'returns' | 'inventory';
      title: string;
      desc: string;
      evidence: string;
      action: string;
    }[] = [];

    // 1. Margem Negativa ou Crítica
    skusWithEconomics.forEach((s) => {
      const isUnderperforming = s.netProfitAfterAds !== null && s.netProfitAfterAds < 0;
      if (s.contributionMarginPercent <= 0) {
        list.push({
          id: `margin-neg-${s.sku}`,
          level: 'critico',
          category: 'margin',
          title: `Margem de Contribuição Negativa no SKU ${s.sku}`,
          desc: `O produto está operando no prejuízo bruto unitário antes dos custos fixos ou publicidade.`,
          evidence: `Margem de Contribuição de ${(s.contributionMarginPercent ?? 0).toFixed(1)}%`,
          action: `Ajuste imediato de preço para R$ ${(s.pmv * 1.15).toFixed(2)} ou renegocie o custo de compra.`,
        });
      } else if (isUnderperforming) {
        list.push({
          id: `netmargin-neg-${s.sku}`,
          level: 'critico',
          category: 'margin',
          title: `Prejuízo Líquido Real pós-Ads no SKU ${s.sku}`,
          desc: `Este SKU está gerando déficit financeiro acumulado após somar os investimentos de anúncios atribuídos.`,
          evidence: `Prejuízo real de R$ ${Math.abs(s.netProfitAfterAds!).toFixed(2)} (Margem líquida de ${s.netMarginPercent?.toFixed(1)}%)`,
          action: `Reduza o orçamento de Ads neste produto ou aumente o preço para reequilibrar o breakeven.`,
        });
      }

      // COGS missing
      if (!s.hasCogsProvided) {
        list.push({
          id: `cogs-miss-${s.sku}`,
          level: 'medio',
          category: 'margin',
          title: `Ausência de COGS no SKU ${s.sku}`,
          desc: `O custo de fabricação/compra do produto não foi preenchido, impossibilitando a auditoria de lucro real.`,
          evidence: `COGS zerado na precificação`,
          action: `Cadastre o custo unitário deste SKU na aba de Precificação.`,
        });
      }

      // High Logistics Channel Filter
      const logRatio = s.pmv > 0 ? (s.logisticsFeeUnit / s.pmv) * 100 : 0;
      if (logRatio > 25) {
        list.push({
          id: `log-high-${s.sku}`,
          level: 'alto',
          category: 'logistics',
          title: `Logística Consome > 25% da Venda no SKU ${s.sku}`,
          desc: `A tarifa logística de frete (FBA/DBA) está desproporcional ao preço médio de venda praticado.`,
          evidence: `Logística consome ${logRatio.toFixed(1)}% do ticket do produto (Frete de R$ ${s.logisticsFeeUnit.toFixed(2)})`,
          action: `Migre o produto para canais mais eficientes ou revise as cubagens cadastradas no Seller Central.`,
        });
      }

      // FBA experiment meta Ads
      if (s.logisticsChannel === 'FBA' && s.fbaProgram === 'experimente_r6' && !s.fbaAdsEligible) {
        list.push({
          id: `fba-ads-risk-${s.sku}`,
          level: 'alto',
          category: 'ads',
          title: `FBA R$ 6,00 sob Risco de Cancelamento no SKU ${s.sku}`,
          desc: `O SKU corre o risco de perder o benefício de R$ 6,00 na apuração mensal pois investe menos de 3.5% em Ads.`,
          evidence: `Gasto Ads representa apenas ${(s.grossSales > 0 ? (s.adsSpend/s.grossSales)*100 : 0).toFixed(1)}% do faturamento comercial`,
          action: `Aumente ligeiramente o orçamento ou lance diário em Sponsored Products para este SKU.`,
        });
      }
    });

    // 2. High Risk Search terms
    const highRiskTerms = (dataset.searchTerms || []).filter(st => st.clicks >= 10 && st.sales === 0 && st.spend > 15);
    highRiskTerms.forEach((st, idx) => {
      list.push({
        id: `ads-waste-${idx}`,
        level: 'critico',
        category: 'ads',
        title: `Dreno de Verba Publicitária (Zero conversão)`,
        desc: `O termo de pesquisa "${st.customerSearchTerm}" na campanha "${st.campaignName}" consome orçamento sem vendas.`,
        evidence: `${st.clicks} cliques acumulados sem nenhuma conversão (Desperdício de R$ ${st.spend.toFixed(2)})`,
        action: `Negativar imediatamente o termo de pesquisa nas configurações da campanha correspondente.`,
      });
    });

    return list;
  }, [skusWithEconomics, dataset]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(al => {
      if (levelFilter !== 'all' && al.level !== levelFilter) return false;
      return true;
    });
  }, [alerts, levelFilter]);

  const levelCounts = useMemo(() => {
    const counts = { all: alerts.length, critico: 0, alto: 0, medio: 0 };
    alerts.forEach(al => {
      if (al.level === 'critico') counts.critico++;
      else if (al.level === 'alto') counts.alto++;
      else if (al.level === 'medio') counts.medio++;
    });
    return counts;
  }, [alerts]);

  return (
    <div className="space-y-6">
      <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span>Central Unificada de Alertas e Vazamento de Margem</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
            Diagnóstico e varredura em tempo real sobre vazamento de lucros, custos fora da curva, pendências cadastrais e drenos em Ads.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0a0f1d] p-1.5 rounded-xl border border-[#243554]">
          {(['all', 'critico', 'alto', 'medio'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer uppercase ${
                levelFilter === lvl
                  ? lvl === 'critico'
                    ? 'bg-rose-500 text-white font-black'
                    : lvl === 'alto'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {lvl === 'all' ? 'Todos' : lvl} ({levelCounts[lvl]})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-bold text-slate-300">ALERTAS CRÍTICOS</span>
          <p className="text-2xl font-black text-rose-400 font-mono mt-1">{levelCounts.critico}</p>
          <span className="text-[10px] text-slate-400 block mt-1">Exigem intervenção imediata de precificação ou anúncios</span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-bold text-slate-300">ALERTAS ALTOS</span>
          <p className="text-2xl font-black text-amber-400 font-mono mt-1">{levelCounts.alto}</p>
          <span className="text-[10px] text-slate-400 block mt-1">Gargalos operacionais ou logísticos severos</span>
        </div>

        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-4 shadow-xl">
          <span className="text-xs font-bold text-slate-300">ALERTAS MÉDIOS</span>
          <p className="text-2xl font-black text-cyan-300 font-mono mt-1">{levelCounts.medio}</p>
          <span className="text-[10px] text-slate-400 block mt-1">Inconsistências ou falhas cadastrais mitigáveis</span>
        </div>
      </div>

      <div className="space-y-3.5">
        {filteredAlerts.length === 0 ? (
          <div className="bg-[#152238] border border-[#243554] p-12 text-center rounded-2xl text-slate-400 flex flex-col items-center justify-center gap-3">
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
            <h4 className="text-base font-bold text-white">Nenhum alerta localizado</h4>
            <p className="text-xs text-slate-300 max-w-sm">Tudo operando dentro dos parâmetros de conformidade do BB Hub Market.</p>
          </div>
        ) : (
          filteredAlerts.map((al) => (
            <div
              key={al.id}
              className={`p-5 rounded-2xl border-2 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all hover:bg-slate-800 ${
                al.level === 'critico'
                  ? 'bg-rose-950/10 border-rose-500/30'
                  : al.level === 'alto'
                  ? 'bg-amber-950/10 border-amber-500/30'
                  : 'bg-[#152238] border-[#243554]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  al.level === 'critico' ? 'bg-rose-500/20 text-rose-400' : al.level === 'alto' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-300'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">{al.title}</h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase font-mono ${
                      al.level === 'critico'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : al.level === 'alto'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}>
                      {al.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">{al.desc}</p>
                  <p className="text-[11px] font-bold text-slate-400 font-mono pt-1">Evidência: {al.evidence}</p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col justify-between items-end border-t md:border-t-0 border-[#243554] pt-3.5 md:pt-0 md:pl-4 md:border-l border-[#243554] max-w-xs font-sans text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Ação Corretiva</span>
                <p className="text-cyan-300 font-semibold text-right leading-relaxed">{al.action}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
