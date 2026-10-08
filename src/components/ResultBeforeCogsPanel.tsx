import React, { useMemo, useState } from 'react';
import { SkuUnitEconomics } from '../types/amazon';
import { calcAllResultsBeforeCogs } from '../utils/profitWithoutCogs';

interface Props {
  skus: SkuUnitEconomics[];
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)}%`);

export const ResultBeforeCogsPanel: React.FC<Props> = ({ skus }) => {
  const [targetMargin, setTargetMargin] = useState<number>(10);

  const rows = useMemo(
    () =>
      calcAllResultsBeforeCogs(skus, targetMargin).sort(
        (a, b) => b.resultBeforeCogsAfterAdsTotal - a.resultBeforeCogsAfterAdsTotal
      ),
    [skus, targetMargin]
  );

  const totals = useMemo(() => {
    const gross = rows.reduce((acc, r) => acc + r.grossSales, 0);
    const result = rows.reduce((acc, r) => acc + r.resultBeforeCogsAfterAdsTotal, 0);
    return { gross, result, margin: gross > 0 ? (result / gross) * 100 : null };
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Resultado antes do COGS</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Preço médio menos tarifas Amazon, frete, impostos e Ads, sem descontar o custo do produto.
            O teto de COGS mostra quanto o produto pode custar sem dar prejuízo.
          </p>
        </div>
        <label className="text-xs text-slate-300 flex items-center gap-2">
          Margem alvo (%)
          <input
            type="number"
            min={0}
            max={90}
            value={targetMargin}
            onChange={(e) => setTargetMargin(Math.max(0, Number(e.target.value) || 0))}
            className="w-16 rounded-lg bg-slate-800 border border-white/10 px-2 py-1 text-right"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-800/50 p-3">
          <p className="text-[11px] text-slate-400">Receita bruta</p>
          <p className="text-lg font-bold text-white">{brl(totals.gross)}</p>
        </div>
        <div className="rounded-xl bg-slate-800/50 p-3">
          <p className="text-[11px] text-slate-400">Resultado antes do COGS</p>
          <p className={`text-lg font-bold ${totals.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{brl(totals.result)}</p>
        </div>
        <div className="rounded-xl bg-slate-800/50 p-3">
          <p className="text-[11px] text-slate-400">Margem antes do COGS</p>
          <p className="text-lg font-bold text-white">{pct(totals.margin)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-slate-400 border-b border-white/10">
            <tr>
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3 text-right">Un.</th>
              <th className="py-2 pr-3 text-right">PMV</th>
              <th className="py-2 pr-3 text-right">Tarifas Amazon/un</th>
              <th className="py-2 pr-3 text-right">Frete + imp./un</th>
              <th className="py-2 pr-3 text-right">Ads/un</th>
              <th className="py-2 pr-3 text-right">Resultado/un</th>
              <th className="py-2 pr-3 text-right">Total</th>
              <th className="py-2 pr-3 text-right">Margem</th>
              <th className="py-2 pr-3 text-right">Teto COGS (equilíbrio)</th>
              <th className="py-2 text-right">Teto COGS ({targetMargin}%)</th>
            </tr>
          </thead>
          <tbody className="text-slate-200">
            {rows.map((r) => (
              <tr key={r.sku} className="border-b border-white/5">
                <td className="py-2 pr-3 font-mono" title={r.title}>
                  {r.sku}
                  {r.hasCogsProvided && <span className="ml-1 text-[10px] text-emerald-400">COGS</span>}
                </td>
                <td className="py-2 pr-3 text-right">{r.unitsSold}</td>
                <td className="py-2 pr-3 text-right">{brl(r.pmv)}</td>
                <td className="py-2 pr-3 text-right">{brl(r.amazonFeeUnit)}</td>
                <td className="py-2 pr-3 text-right">{brl(r.shippingUnit + r.taxUnit)}</td>
                <td className="py-2 pr-3 text-right">{brl(r.adsUnit)}</td>
                <td className={`py-2 pr-3 text-right font-semibold ${r.resultBeforeCogsAfterAdsUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {brl(r.resultBeforeCogsAfterAdsUnit)}
                </td>
                <td className="py-2 pr-3 text-right">{brl(r.resultBeforeCogsAfterAdsTotal)}</td>
                <td className="py-2 pr-3 text-right">{pct(r.marginBeforeCogsPercent)}</td>
                <td className="py-2 pr-3 text-right">{r.maxCogsBreakEvenUnit === null ? 'Sem margem' : brl(r.maxCogsBreakEvenUnit)}</td>
                <td className="py-2 text-right">{r.maxCogsForTargetMarginUnit === null ? 'Sem margem' : brl(r.maxCogsForTargetMarginUnit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
