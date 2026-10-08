import React from 'react';
import { SellerSetup, FbaAccountStatus, adsBenefitWarning } from '../config/sellerSetup';
import { DbaRegion } from '../config/amazonFeesConfig';

type Props = {
  sellerSetup: SellerSetup;
  onChange: (next: SellerSetup) => void;
};

const dbaRegions: { value: DbaRegion; label: string }[] = [
  { value: 'sp_capital', label: 'São Paulo — Capital' },
  { value: 'outras_capitais_s_se', label: 'Outras capitais Sul/Sudeste' },
  { value: 'interior_s_se', label: 'Interior Sul/Sudeste' },
  { value: 'co_n_ne', label: 'Centro-Oeste, Norte e Nordeste' },
];

const fbaStatuses: { value: FbaAccountStatus; label: string }[] = [
  { value: 'nova_conta_isencao', label: 'Nova conta — isenção FBA' },
  { value: 'existente_beneficio_ativo', label: 'Conta existente — benefício Experimente FBA+' },
  { value: 'existente_sem_beneficio', label: 'Conta existente — tarifa padrão FBA' },
  { value: 'sem_fba', label: 'Não utiliza FBA' },
];

export function SetupView({ sellerSetup, onChange }: Props) {
  const update = <K extends keyof SellerSetup>(key: K, value: SellerSetup[K]) => {
    onChange({ ...sellerSetup, [key]: value });
  };
  const warning = adsBenefitWarning(sellerSetup);
  const fieldClass = 'mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 dark:bg-slate-900';
  const labelClass = 'block text-sm font-medium text-slate-200';

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">Configuração da conta</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Parâmetros de tarifas Amazon</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">Informe os parâmetros reais da conta para que as estimativas de FBA, DBA, comissão, margem e breakeven sejam calculadas com o contexto correto.</p>
      </header>

      <div className="grid gap-5 rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-sm md:grid-cols-2">
        <label className={labelClass}>
          Nome da conta ou cliente
          <input className={fieldClass} value={sellerSetup.clientName} onChange={(e) => update('clientName', e.target.value)} placeholder="Ex.: DMA" />
        </label>

        <label className={labelClass}>
          Plano Amazon
          <select className={fieldClass} value={sellerSetup.plan} onChange={(e) => update('plan', e.target.value as SellerSetup['plan'])}>
            <option value="profissional">Profissional</option>
            <option value="individual">Individual</option>
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-100">
          <input type="checkbox" checked={sellerSetup.usesFba} onChange={(e) => update('usesFba', e.target.checked)} className="h-4 w-4 accent-blue-500" />
          A conta utiliza FBA
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-100">
          <input type="checkbox" checked={sellerSetup.usesDba} onChange={(e) => update('usesDba', e.target.checked)} className="h-4 w-4 accent-blue-500" />
          A conta utiliza DBA
        </label>

        {sellerSetup.usesDba && (
          <label className={labelClass}>
            Região de origem do DBA
            <select className={fieldClass} value={sellerSetup.dbaOriginRegion} onChange={(e) => update('dbaOriginRegion', e.target.value as DbaRegion)}>
              {dbaRegions.map((region) => <option key={region.value} value={region.value}>{region.label}</option>)}
            </select>
          </label>
        )}

        {sellerSetup.usesFba && (
          <label className={labelClass}>
            Situação da conta FBA
            <select className={fieldClass} value={sellerSetup.fbaAccountStatus} onChange={(e) => update('fbaAccountStatus', e.target.value as FbaAccountStatus)}>
              {fbaStatuses.filter((item) => item.value !== 'sem_fba').map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
        )}

        {sellerSetup.usesFba && sellerSetup.fbaAccountStatus === 'existente_beneficio_ativo' && (
          <>
            <label className={labelClass}>
              Investimento em Ads nos últimos 30 dias (% da receita)
              <input className={fieldClass} type="number" min="0" step="0.1" value={sellerSetup.adsInvestmentPercentLast30d ?? ''} onChange={(e) => update('adsInvestmentPercentLast30d', e.target.value === '' ? null : Number(e.target.value))} placeholder="Ex.: 4,0" />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-100">
              <input type="checkbox" checked={sellerSetup.fbaActivatedBeforeApril2026} onChange={(e) => update('fbaActivatedBeforeApril2026', e.target.checked)} className="h-4 w-4 accent-blue-500" />
              FBA ativado antes de abril de 2026
            </label>
          </>
        )}

        {sellerSetup.usesDba && (
          <label className="flex items-center gap-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-100 md:col-span-2">
            <input type="checkbox" checked={sellerSetup.dbaHalfFeePromoActive} onChange={(e) => update('dbaHalfFeePromoActive', e.target.checked)} className="h-4 w-4 accent-blue-500" />
            Aplicar promoção de 50% na tarifa DBA (somente se vigente e elegível)
          </label>
        )}
      </div>

      {warning && <div role="alert" className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">{warning}</div>}

      <p className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100">As configurações ficam somente nesta sessão do navegador. Revise as condições e tarifas no Seller Central antes de tomar decisões financeiras.</p>
    </section>
  );
}
