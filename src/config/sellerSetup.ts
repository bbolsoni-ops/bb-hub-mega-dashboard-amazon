import { DbaRegion } from './amazonFeesConfig';
export type FbaAccountStatus = 'nova_conta_isencao' | 'existente_beneficio_ativo' | 'existente_sem_beneficio' | 'sem_fba';
export interface SellerSetup {
  clientName: string;
  plan: 'profissional' | 'individual';
  usesFba: boolean;
  usesDba: boolean;
  dbaOriginRegion: DbaRegion;
  fbaAccountStatus: FbaAccountStatus;
  fbaActivatedBeforeApril2026: boolean;
  adsInvestmentPercentLast30d: number | null;
  dbaHalfFeePromoActive: boolean;
}
// Valores iniciais: o usuário deve conferir no Seller Central e ajustar na tela de Setup.
export const DEFAULT_SELLER_SETUP: SellerSetup = {
  clientName: '',
  plan: 'profissional',
  usesFba: true,
  usesDba: true,
  dbaOriginRegion: 'sp_capital',
  fbaAccountStatus: 'existente_sem_beneficio',
  fbaActivatedBeforeApril2026: true,
  adsInvestmentPercentLast30d: null,
  dbaHalfFeePromoActive: false,
};
export const DMA_SETUP: SellerSetup = { ...DEFAULT_SELLER_SETUP, clientName: 'DMA' };
export function fbaProgramFromSetup(s: SellerSetup): 'standard' | 'experimente_r6' | 'nova_conta_isencao' {
  if (s.fbaAccountStatus === 'nova_conta_isencao') return 'nova_conta_isencao';
  if (s.fbaAccountStatus === 'existente_beneficio_ativo') return 'experimente_r6';
  return 'standard';
}
export function adsBenefitWarning(s: SellerSetup): string | null {
  if (s.fbaAccountStatus !== 'existente_beneficio_ativo' || s.adsInvestmentPercentLast30d === null) return null;
  return s.adsInvestmentPercentLast30d < 3.5
    ? `Investimento em Ads de ${s.adsInvestmentPercentLast30d.toFixed(1)}% está abaixo de 3,5% da receita: o benefício FBA de R$ 6,00 do mês seguinte está em risco.`
    : null;
}
