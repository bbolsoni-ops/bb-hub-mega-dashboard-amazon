import React from 'react';
import { SellerSetup, FbaAccountStatus, adsBenefitWarning } from '../config/sellerSetup';
import { DbaRegion } from '../config/amazonFeesConfig';

interface SetupViewProps {
  setup: SellerSetup;
  onChange: (next: SellerSetup) => void;
  accountAdsPercent: number;
}

const FBA_STATUS_LABELS: Record<FbaAccountStatus, string> = {
  nova_conta_isencao: 'Conta nova em FBA (isenção de 30 dias)',
  existente_beneficio_ativo: 'Conta existente com benefício Experimente FBA+ ativo (R$ 6,00 a partir de R$ 79)',
  existente_sem_beneficio: 'Conta existente sem benefício (tabela padrão)',
  sem_fba: 'Não usa FBA',
};

const REGION_LABELS: Record<DbaRegion, string> = {
  sp_capital: 'São Paulo (capital)',
  outras_capitais_s_se: 'Outras capitais do Sul e Sudeste',
  interior_s_se: 'Interior do Sul e Sudeste',
  co_n_ne: 'Centro-Oeste, Norte e Nordeste',
};

const field = 'w-full rounded-lg border border-slate-600/60 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const label = 'block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1';

export function SetupView({ setup, onChange, accountAdsPercent }: SetupViewProps) {
  const set = <K extends keyof SellerSetup>(key: K, value: SellerSetup[K]) => onChange({ ...setup, [key]: value });
  const warning = adsBenefitWarning({ ...setup, adsInvestmentPercentLast30d: setup.adsInvestmentPercentLast30d ?? accountAdsPercent });

  return (
    <section className="max-w-3xl space-y-6">
      <header>
        <h2 className="text-xl font-bold">Setup do cliente</h2>
        <p className="text-sm text-slate-400 mt-1">
          Estas definições mudam o cálculo de tarifas de toda a conta. Confira no Seller Central antes de ajustar.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="setup-client">Cliente</label>
          <input id="setup-client" className={field} value={setup.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Ex.: DMA" />
        </div>
        <div>
          <label className={label} htmlFor="setup-plan">Plano de vendas</label>
          <select id="setup-plan" className={field} value={setup.plan} onChange={(e) => set('plan', e.target.value as SellerSetup['plan'])}>
            <option value="profissional">Profissional</option>
            <option value="individual">Individual</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={setup.usesFba} onChange={(e) => set('usesFba', e.target.checked)} />
          Usa FBA (Fulfillment by Amazon)
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={setup.usesDba} onChange={(e) => set('usesDba', e.target.checked)} />
          Usa DBA (Envio pelo vendedor)
        </label>
      </div>

      <div>
        <label className={label} htmlFor="setup-region">Região de origem do DBA</label>
        <select id="setup-region" className={field} value={setup.dbaOriginRegion} onChange={(e) => set('dbaOriginRegion', e.target.value as DbaRegion)}>
          {(Object.keys(REGION_LABELS) as DbaRegion[]).map((r) => (
            <option key={r} value={r}>{REGION_LABELS[r]}</option>
          ))}
        </select>
        <p className="text-xs text-slate-500 mt-1">Afeta apenas produtos de R$ 200 ou mais.</p>
      </div>

      <div>
        <label className={label} htmlFor="setup-fba">Situação no Experimente FBA+</label>
        <select id="setup-fba" className={field} value={setup.fbaAccountStatus} onChange={(e) => set('fbaAccountStatus', e.target.value as FbaAccountStatus)}>
          {(Object.keys(FBA_STATUS_LABELS) as FbaAccountStatus[]).map((s) => (
            <option key={s} value={s}>{FBA_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="setup-ads">Investimento em Ads (% da receita, últimos 30 dias)</label>
          <input
            id="setup-ads"
            type="number"
            step="0.1"
            min="0"
            className={field}
            value={setup.adsInvestmentPercentLast30d ?? ''}
            placeholder={`Automático: ${accountAdsPercent.toFixed(1)}%`}
            onChange={(e) => set('adsInvestmentPercentLast30d', e.target.value === '' ? null : Number(e.target.value))}
          />
          <p className="text-xs text-slate-500 mt-1">Deixe vazio para usar o gasto dos relatórios sobre a receita total da conta. Mínimo exigido: 3,5%.</p>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={setup.fbaActivatedBeforeApril2026} onChange={(e) => set('fbaActivatedBeforeApril2026', e.target.checked)} />
            FBA ativado antes de 01/04/2026
          </label>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={setup.dbaHalfFeePromoActive} onChange={(e) => set('dbaHalfFeePromoActive', e.target.checked)} />
        Conta participa do desconto de 50% no DBA (campanha encerrada em 30/09/2026)
      </label>

      {warning && (
        <div role="alert" className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {warning}
        </div>
      )}
    </section>
  );
}
