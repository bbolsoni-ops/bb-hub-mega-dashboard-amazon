export type ReportType =
  | 'business_date'
  | 'business_sku'
  | 'orders_purchase_date'
  | 'orders_last_updated'
  | 'ads_campaigns'
  | 'ads_budgets'
  | 'ads_advertised_products'
  | 'ads_targeting'
  | 'ads_search_terms'
  | 'settlement_cogs'
  | 'commission_preview'
  | 'rentabilidade_real'
  | 'unknown';

export interface ColumnRuleStatus {
  groupName: string;
  fieldLabel: string;
  isMandatory: boolean; // true = error (blocking); false = warning
  satisfied: boolean;
  matchedHeader?: string;
  synonymsExpected: string[];
  explanation: string;
}

export interface ColumnValidationResult {
  isValid: boolean;
  hasBlockingErrors: boolean;
  criticalMissingCount: number;
  warningsMissingCount: number;
  criticalMissing: string[];
  warningsMissing: string[];
  rules: ColumnRuleStatus[];
  summaryMessage: string;
}

export interface FileAuditInfo {
  id: string;
  name: string;
  sizeBytes?: number;
  type: ReportType;
  typeLabel: string;
  rowCount: number;
  colCount?: number;
  dateMin?: string;
  dateMax?: string;
  extractionDate?: string;
  extractionDateIsEstimated?: boolean;
  delimiter: string;
  encoding: string;
  detectedColumns: string[];
  missingCrucialColumns: string[];
  columnValidation?: ColumnValidationResult;
  status: 'valid' | 'warning' | 'error';
  statusMessage: string;
  granularity: string;
  officialUse: string;
  limitations: string;
  nullCountSummary?: Record<string, number>;
  duplicateRows?: number;
  hasDateColumn?: boolean;
  userSpecifiedPeriod?: { startDate: string; endDate: string } | null;
  importStrategy?: 'replace' | 'append';
}

export interface BusinessDayRow {
  date: string;
  orderedProductSales: number;
  unitsOrdered: number;
  totalOrderItems: number;
  sessions: number;
  pageViews: number;
  buyBoxPercentage: number | null;
  unitSessionPercentage: number | null; // Conversion rate
}

export interface BusinessSkuRow {
  sku: string;
  asin: string;
  parentAsin?: string;
  isParent?: boolean;
  title: string;
  sessions: number;
  pageViews: number;
  buyBoxPercentage: number | null;
  unitsOrdered: number;
  orderedProductSales: number;
  unitSessionPercentage: number | null;
}

export interface OrderItemRow {
  amazonOrderId: string;
  orderItemId: string;
  purchaseDate: string;
  lastUpdatedDate?: string;
  orderStatus: 'Pending' | 'Shipped' | 'Canceled' | 'Unshipped' | 'PartiallyShipped' | 'Unknown';
  fulfillmentChannel: 'Amazon' | 'Merchant' | 'AFN' | 'MFN' | 'DBA' | 'FBA (Full)' | 'FBM (Próprio)' | 'Unknown' | string;
  tipoEnvio?: 'FBA (Full)' | 'DBA' | 'FBM (Próprio)' | string;
  fulfilledBy?: string;
  salesChannel: string;
  sku: string;
  asin: string;
  productName: string;
  quantity: number;
  itemPrice: number;
  itemTax: number;
  shippingPrice: number;
  shippingTax: number;
  itemPromoDiscount: number;
  shipCity?: string;
  shipState?: string;
  isBusinessOrder: boolean;
  sourceFile?: string;
  isCollisionRisk?: boolean; // True if orderItemId was missing and composite key was used
}

export interface AdsCampaignRow {
  campaignName: string;
  status: string;
  budget: number | null;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  ctr: number;
  cpc: number;
  acos: number | null;
  roas: number | null;
  budgetUtilization?: number;
}

export interface AdsSearchTermRow {
  campaignName: string;
  adGroupName: string;
  customerSearchTerm: string;
  targeting: string;
  matchType: string;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
  conversionRate: number;
}

export interface AdsTargetRow {
  campaignName: string;
  target: string;
  matchType: string;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
}

export interface AdsAdvertisedProductRow {
  campaignName: string;
  sku: string;
  asin: string;
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  acos: number;
}

export interface SkuUnitEconomics {
  sku: string;
  asin?: string;
  title?: string;
  pmv: number; // Preço médio de venda
  unitsSold: number;
  grossSales: number;
  cogs: number; // Custo do produto vendido (unitário)
  hasCogsProvided?: boolean; // Whether user entered or provided real COGS
  categoryId?: string;
  categoryName?: string;
  weightGrams?: number;
  commissionPercent: number;
  commissionAmount: number;
  precoPublicado?: number;
  comissaoEstimadaUnidade?: number;
  percentualComissaoEfetivo?: number;
  categoriaAmazon?: string;
  comissaoMinima?: number;
  origemComissao?: string; // 'Comissão oficial estimada da Amazon' | 'Comissão estimada por categoria' | 'Comissão do Relatório de Pagamentos'
  statusComissao?: string; // 'Comissão oficial estimada' | 'Estimativa por categoria — validar comissão'
  alertaDivergenciaComissao?: string;
  logisticsChannel: 'FBA' | 'DBA' | 'FBM';
  dbaFee: number;
  hasSp50Discount?: boolean;
  fbaFee: number;
  fbaProgram?: 'standard' | 'experimente_r6' | 'nova_conta_isencao';
  standardLogisticsFeeUnit?: number;
  programSavingsUnit?: number;
  totalProgramSavings?: number;
  fbaAdsEligible?: boolean;
  logisticsFeeUnit: number;
  amazonTotalFeeUnit: number;
  amazonTakeRatePercent: number;
  taxRatePercent: number;
  fixedFee: number;
  shippingCost: number;
  amazonFeePercent: number;
  totalVariableCosts: number;
  contributionMarginBeforeAds: number;
  contributionMarginPercent: number;
  breakevenAcos: number | null; // null if costs incomplete
  adsSpend: number;
  adsSales: number;
  netProfitAfterAds: number | null; // null if costs incomplete
  netMarginPercent: number | null;
  costsComplete: boolean; // Flag to verify if full variable costs are present
}

export interface ActionPlanItem {
  id: string;
  ruleCode: string; // e.g. "RULE-ADS-WASTE", "RULE-TACOS-CEILING", "RULE-BREAKEVEN-EXCEEDED", "RULE-LOW-CONV", "RULE-MISSING-COSTS"
  priority: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
  targetType: 'Campanha' | 'Termo de Pesquisa' | 'SKU / ASIN' | 'Operacional / Estoque' | 'Catálogo' | 'Custos & Margens';
  targetIdentifier: string;
  problem: string;
  numericalEvidence: string;
  suggestedAction: string;
  actionRisk: string; // Explicit risk & controlled test hypothesis (never guarantees causality)
  estimatedImpact: string; // "Economia estimada de até R$..." or "Não estimável sem custos"
  impactFormulaExplanation: string;
  confidence: 'Alta' | 'Média' | 'Baixa';
  effort: 'Baixo' | 'Médio' | 'Alto';
  timeframe: 'Imediato (24h-48h)' | 'Semanal (7 dias)' | 'Quinzenal' | 'Mensal';
  trackingMetric: string;
  source: string;
  period: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Ignorado';
}

export interface KpiDescriptor {
  key: string;
  label: string;
  value: number | string | null;
  formatted: string;
  unit: 'BRL' | '%' | 'x' | 'qtd' | 'decimal';
  formula: string;
  sources: string[];
  columns: string[];
  period: string;
  scope: string;
  status: 'calculado' | 'estimado' | 'indisponivel' | 'aguardando';
  coverageNote: string;
  updatedAt: string;
}

export interface ReconciledMetrics {
  // Faturamento Comercial (Business Report)
  businessSales: number;
  businessUnits: number;
  businessOrders: number;
  businessSessions: number;
  businessConversionRate: number | null; // null if sessions == 0
  businessBuyBox?: number | null;
  businessAvgTicket: number;

  // Pedidos (Orders Report)
  ordersTotalGross: number;
  ordersShippedGross: number; // Receita realizada elegível
  ordersPendingGross: number; // Receita não realizada (pendente)
  ordersCanceledGross: number;
  ordersCountTotal: number;
  ordersCountShipped: number;
  ordersCountPending: number;
  ordersCountCanceled: number;
  ordersUnitsShipped: number;
  ordersAvgTicket: number;

  // Discrepância de fontes oficiais
  discrepancySales: number;
  discrepancyPercent: number;
  discrepancyExplanation: string[];

  // Ads consolidado (fonte oficial de gasto: Campanhas)
  adsSpend: number;
  adsSalesAttributed: number;
  adsOrdersAttributed: number;
  adsClicks: number;
  adsImpressions: number;
  adsCtr: number | null; // null if impressions == 0
  adsCpc: number | null; // null if clicks == 0
  adsAcos: number | null; // null if sales == 0 and spend == 0, or special label
  adsAcosLabel: string; // e.g. "15.4%", "Sem venda — requer avaliação", "N/D"
  adsRoas: number | null; // null if spend == 0
  adsRoasLabel: string;

  // Cross-metrics
  tacos: number | null; // Ads spend / Store gross sales (null if store sales == 0)
  adsSalesShare: number | null; // Ads sales / Store gross sales
  unattributedSalesApprox: number;

  // Lucro e margem
  hasCompleteCosts: boolean;
  totalContributionMargin: number | null;
  totalContributionMarginPercent: number | null;
  totalNetProfit: number | null;
  totalNetMarginPercent: number | null;

  // Visual Health status
  tacosStatus: 'excelente' | 'atencao' | 'critico' | 'nd';
  acosStatus: 'excelente' | 'aceitavel' | 'razoavel' | 'ruim' | 'sem_vendas' | 'nd';
  roasStatus: 'ruim' | 'ok' | 'bom' | 'excelente' | 'nd';

  // Audit alerts (Comprovados vs Hipóteses sob investigação)
  alerts: {
    type: 'comprovado' | 'investigacao' | 'aviso';
    title: string;
    description: string;
    metric?: string;
  }[];

  // Structured KPIs list
  kpiList: KpiDescriptor[];
}

export interface AnalysisSessionConfig {
  accountName: string;
  timezone: string; // Default: 'America/Sao_Paulo'
  startDate: string;
  endDate: string;
  currency: string;
  primaryAdsSource: 'campaigns' | 'search_terms';
  recalculatedAt: string;
  consentSavePreferences: boolean;
}

export interface FilterState {
  startDate: string;
  endDate: string;
  sku: string;
  campaign: string;
  orderStatus: string;
  fulfillmentChannel: string;
  searchQuery: string;
}

export interface AmazonCommissionPreviewRow {
  sku: string;
  asin: string;
  precoPublicado: number;
  comissaoEstimadaUnidade: number;
  percentualComissaoEfetivo: number;
  categoriaAmazon: string;
  comissaoMinima: number;
}

export interface RentabilidadeRealRow {
  sku: string;
  asin: string;
  nomeProduto: string;
  marca: string;

  receitaLiquidaTotal: number;
  receitaLiquidaUnitaria: number;
  vendasBrutasTotal: number;
  vendasBrutasUnitaria: number;
  precoMedioVenda: number;
  unidadesCobradas: number;
  unidadesVendidas: number;
  unidadesReembolsadas: number;
  unidadesLiquidasVendidas: number;
  indiceDevolucao: number;

  custoLogisticaTotal: number;
  custoLogisticaUnitario: number;
  tarifaFbaTotal: number;
  tarifaFbaUnitaria: number;
  tarifaDbaTotal: number;
  tarifaDbaUnitaria: number;
  comissaoTotal: number;
  comissaoUnitaria: number;
  tarifaVendaTotal: number;
  tarifaVendaUnitaria: number;
  tarifaItemTotal: number;
  tarifaArmazenagemTotal: number;
  tarifaBaixoInventarioTotal: number;
  tarifaRemocaoTotal: number;
  tarifaDescarteTotal: number;
  tarifaReembolsoTotal: number;
  tarifaCupomTotal: number;
  tarifaPromocaoTotal: number;
  custoAdsTotal: number;
  custoAdsUnitario: number;
  custoAdsSponsoredProductsTotal: number;
  outrosAjustesTotal: number;

  cogsTotal: number;
  cogsUnitario: number;
  custoEmbalagemTotal: number;
  custoEmbalagemUnitario: number;
  impostosTotal: number;
  impostosUnitario: number;
  freteAbastecimentoTotal?: number;
  custosExternosTotal?: number;

  custoAmazonTotal: number;
  resultadoAntesCogs: number;
  lucroLiquidoEstimado: number;
  margemContribuicao: number;
  margemLiquida: number;
  breakEvenAcos: number | null;
  statusConfiabilidade: string;
  arquivoOrigem: string;
  periodoInicio: string;
  periodoFim: string;
}

export interface ParsedDataset {
  sessionConfig: AnalysisSessionConfig;
  businessDays: BusinessDayRow[];
  businessSkus: BusinessSkuRow[];
  orders: OrderItemRow[];
  campaigns: AdsCampaignRow[];
  searchTerms: AdsSearchTermRow[];
  targets: AdsTargetRow[];
  advertisedProducts: AdsAdvertisedProductRow[];
  cogsList: any[];
  commissionPreview?: AmazonCommissionPreviewRow[];
  rentabilidadeReal?: RentabilidadeRealRow[];
  auditFiles: FileAuditInfo[];
}
