import {
  ParsedDataset,
  ReconciledMetrics,
  SkuUnitEconomics,
  ActionPlanItem,
  FilterState,
  BusinessDayRow,
  BusinessSkuRow,
  OrderItemRow,
  AdsCampaignRow,
  KpiDescriptor,
} from '../types/amazon';
import {
  calculateAmazonCommission,
  calculateDbaFee,
  calculateFbaFee,
  AMAZON_BR_CATEGORIES,
} from './amazonFeesCalculator';
import { standardizeDate } from './csvParser';
import { DEFAULT_SELLER_SETUP, SellerSetup, fbaProgramFromSetup } from '../config/sellerSetup';
export function reconcileAmazonData(
  dataset: ParsedDataset,
  filters?: Partial<FilterState>,
  skuEconomicsMap: Record<string, Partial<SkuUnitEconomics>> = {},
  sellerSetup: SellerSetup = DEFAULT_SELLER_SETUP
): {
  metrics: ReconciledMetrics;
  skusSummary: SkuUnitEconomics[];
  actionPlan: ActionPlanItem[];
  highRiskTerms: {
    term: string;
    campaign: string;
    clicks: number;
    spend: number;
    sales: number;
    reason: string;
  }[];
  skuAlerts: {
    sku: string;
    title: string;
    pmv: number;
    spend: number;
    sales: number;
    ratio: number;
    recommendation: string;
  }[];
} {
  const isFilteringBySku = Boolean(filters?.sku && filters.sku.trim() !== '');
  const isFilteringByCampaign = Boolean(filters?.campaign && filters.campaign.trim() !== '');

  // 1. Business Report Metrics
  let businessDays = dataset.businessDays || [];
  if (filters?.startDate && filters?.endDate) {
    businessDays = businessDays.filter((d: BusinessDayRow) => {
      const std = standardizeDate(d.date);
      return std >= filters.startDate! && std <= filters.endDate!;
    });
  }

  const businessSkuSales = (dataset.businessSkus || []).reduce((acc: number, s) => acc + (s.orderedProductSales || 0), 0);
  const businessSkuUnits = (dataset.businessSkus || []).reduce((acc: number, s) => acc + (s.unitsOrdered || 0), 0);
  const businessSkuSessions = (dataset.businessSkus || []).reduce((acc: number, s) => acc + (s.sessions || 0), 0);

  const businessSales = businessDays.length > 0
    ? businessDays.reduce((acc: number, d: BusinessDayRow) => acc + (d.orderedProductSales || 0), 0)
    : businessSkuSales;
  const businessUnits = businessDays.length > 0
    ? businessDays.reduce((acc: number, d: BusinessDayRow) => acc + (d.unitsOrdered || 0), 0)
    : businessSkuUnits;
  const businessOrders = businessDays.length > 0
    ? businessDays.reduce((acc: number, d: BusinessDayRow) => acc + (d.totalOrderItems || 0), 0)
    : businessSkuUnits;
  const businessSessions = businessDays.length > 0
    ? businessDays.reduce((acc: number, d: BusinessDayRow) => acc + (d.sessions || 0), 0)
    : businessSkuSessions;

  const businessConversionRate = businessSessions > 0 ? (businessUnits / businessSessions) * 100 : null;
  const businessAvgTicket = businessOrders > 0 ? businessSales / businessOrders : 0;

  // 1.1 Consolidated Buy Box Calculation (Weighted by sessions)
  // Regra obrigatória:
  // - Não calcular média simples do Buy Box entre produtos.
  // - Buy Box consolidado deve ser uma média ponderada por sessões quando sessions estiver disponível:
  //   soma(buyBoxPercent * sessions) / soma(sessions).
  // - Se sessions não existir, exibir “N/D” (retornar null).
  let businessBuyBox: number | null = null;

  const skusWithBuyBox = (dataset.businessSkus || []).filter(
    (b: BusinessSkuRow) => b.buyBoxPercentage !== null && typeof b.buyBoxPercentage === 'number' && !isNaN(b.buyBoxPercentage)
  );

  if (skusWithBuyBox.length > 0) {
    const skusWithSessions = skusWithBuyBox.filter(
      (b: BusinessSkuRow) => typeof b.sessions === 'number' && b.sessions > 0
    );
    const totalSessions = skusWithSessions.reduce((acc: number, b) => acc + (b.sessions || 0), 0);
    if (totalSessions > 0) {
      const weightedSum = skusWithSessions.reduce(
        (acc: number, b) => acc + (b.buyBoxPercentage! * b.sessions),
        0
      );
      businessBuyBox = Number((weightedSum / totalSessions).toFixed(2));
    } else {
      businessBuyBox = null;
    }
  } else if (businessDays.length > 0) {
    const daysWithBuyBox = businessDays.filter(
      (d: BusinessDayRow) => d.buyBoxPercentage !== null && typeof d.buyBoxPercentage === 'number' && !isNaN(d.buyBoxPercentage)
    );
    const totalDaysSessions = daysWithBuyBox.reduce((acc: number, d) => acc + (d.sessions || 0), 0);
    if (totalDaysSessions > 0) {
      const weightedSum = daysWithBuyBox.reduce(
        (acc: number, d) => acc + (d.buyBoxPercentage! * (d.sessions || 0)),
        0
      );
      businessBuyBox = Number((weightedSum / totalDaysSessions).toFixed(2));
    } else {
      businessBuyBox = null;
    }
  }

  // 2. Orders Deduplication & Enrichment
  let rawOrders = dataset.orders || [];

  if (filters?.startDate && filters?.endDate) {
    rawOrders = rawOrders.filter((o: OrderItemRow) => {
      const d = standardizeDate(o.purchaseDate);
      return d >= filters.startDate! && d <= filters.endDate!;
    });
  }
  if (filters?.orderStatus && filters.orderStatus !== 'all') {
    rawOrders = rawOrders.filter((o: OrderItemRow) => o.orderStatus === filters.orderStatus);
  }
  if (filters?.fulfillmentChannel && filters.fulfillmentChannel !== 'all') {
    rawOrders = rawOrders.filter((o: OrderItemRow) => o.fulfillmentChannel === filters.fulfillmentChannel);
  }
  if (filters?.sku) {
    rawOrders = rawOrders.filter((o: OrderItemRow) => o.sku.toLowerCase().includes(filters.sku!.toLowerCase()));
  }

  // Deduplicate orders by composite key: amazonOrderId + (orderItemId || sku + price + qty)
  const uniqueItemsMap = new Map<string, OrderItemRow>();
  for (const o of rawOrders) {
    const key = `${o.amazonOrderId}_${o.orderItemId || `${o.sku}_${o.itemPrice}_${o.quantity}`}`;
    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, o);
    } else {
      // If we have a newer lastUpdatedDate, enrich status
      const existing = uniqueItemsMap.get(key)!;
      if (o.lastUpdatedDate && (!existing.lastUpdatedDate || o.lastUpdatedDate > existing.lastUpdatedDate)) {
        uniqueItemsMap.set(key, { ...existing, orderStatus: o.orderStatus, lastUpdatedDate: o.lastUpdatedDate });
      }
    }
  }
  const deduplicatedItems = Array.from(uniqueItemsMap.values());

  // Distinct order IDs count
  const uniqueOrderIds = new Set(deduplicatedItems.map((o) => o.amazonOrderId));
  const ordersCountTotal = uniqueOrderIds.size;

  let ordersTotalGross = 0;
  let ordersShippedGross = 0;
  let ordersPendingGross = 0;
  let ordersCanceledGross = 0;
  let ordersUnitsShipped = 0;

  const shippedOrderIds = new Set<string>();
  const pendingOrderIds = new Set<string>();
  const canceledOrderIds = new Set<string>();

  for (const item of deduplicatedItems) {
    const grossVal = (item.itemPrice || 0) * (item.quantity || 1);
    ordersTotalGross += grossVal;

    if (item.orderStatus === 'Shipped') {
      ordersShippedGross += grossVal;
      ordersUnitsShipped += item.quantity || 1;
      shippedOrderIds.add(item.amazonOrderId);
    } else if (item.orderStatus === 'Pending') {
      ordersPendingGross += grossVal;
      pendingOrderIds.add(item.amazonOrderId);
    } else if (item.orderStatus === 'Canceled') {
      ordersCanceledGross += grossVal;
      canceledOrderIds.add(item.amazonOrderId);
    }
  }

  const ordersCountShipped = shippedOrderIds.size;
  const ordersCountPending = pendingOrderIds.size;
  const ordersCountCanceled = canceledOrderIds.size;
  const ordersAvgTicket = ordersCountShipped > 0 ? ordersShippedGross / ordersCountShipped : 0;

  // Primary store sales: prefer Business Report if present, else Shipped Orders
  const officialStoreSales = businessSales > 0 ? businessSales : ordersShippedGross;

  // 3. Amazon Ads Consolidation (Campaigns is the ONLY primary source)
  let campaigns = dataset.campaigns || [];
  if (filters?.campaign) {
    campaigns = campaigns.filter((c: AdsCampaignRow) => c.campaignName.toLowerCase().includes(filters.campaign!.toLowerCase()));
  }

  let adsSpend = 0;
  let adsSalesAttributed = 0;
  let adsOrdersAttributed = 0;
  let adsClicks = 0;
  let adsImpressions = 0;

  if (campaigns.length > 0) {
    for (const c of campaigns) {
      adsSpend += c.spend || 0;
      adsSalesAttributed += c.sales || 0;
      adsOrdersAttributed += c.orders || 0;
      adsClicks += c.clicks || 0;
      adsImpressions += c.impressions || 0;
    }
  } else if ((dataset.searchTerms || []).length > 0) {
    // Explicit secondary fallback if campaigns report was not uploaded
    for (const st of dataset.searchTerms) {
      adsSpend += st.spend || 0;
      adsSalesAttributed += st.sales || 0;
      adsOrdersAttributed += st.orders || 0;
      adsClicks += st.clicks || 0;
      adsImpressions += st.impressions || 0;
    }
  }

  // Cross-metrics
  const adsCtr = adsImpressions > 0 ? (adsClicks / adsImpressions) * 100 : null;
  const adsCpc = adsClicks > 0 ? adsSpend / adsClicks : null;

  // ACOS calculation rules:
  // If spend > 0 and sales == 0 => ACOS = null, label = "Sem venda — requer avaliação"
  // If spend == 0 => ACOS = null, label = "N/D"
  let adsAcos: number | null = null;
  let adsAcosLabel = 'N/D';
  if (adsSalesAttributed > 0) {
    adsAcos = (adsSpend / adsSalesAttributed) * 100;
    adsAcosLabel = `${(adsAcos ?? 0).toFixed(2)}%`;
  } else if (adsSpend > 0) {
    adsAcos = null;
    adsAcosLabel = 'Sem venda — requer avaliação';
  }

  // ROAS calculation rules:
  // If spend > 0 and sales > 0 => sales / spend
  // If spend > 0 and sales == 0 => 0.00x
  // If spend == 0 => null, "N/D"
  let adsRoas: number | null = null;
  let adsRoasLabel = 'N/D';
  if (adsSpend > 0 && adsSalesAttributed > 0) {
    adsRoas = adsSalesAttributed / adsSpend;
    adsRoasLabel = `${(adsRoas ?? 0).toFixed(2)}x`;
  } else if (adsSpend > 0) {
    adsRoas = 0;
    adsRoasLabel = '0.00x (Sem vendas no período)';
  }

  // TACOS calculation rules:
  // Ads spend / Total commercial sales * 100
  // Note: If filtering by campaign, store sales is NOT filtered (since orders have no campaign id).
  let tacos: number | null = null;
  if (officialStoreSales > 0) {
    tacos = (adsSpend / officialStoreSales) * 100;
  }

  let adsSalesShare: number | null = null;
  if (officialStoreSales > 0 && adsSalesAttributed > 0) {
    adsSalesShare = (adsSalesAttributed / officialStoreSales) * 100;
  }

  const unattributedSalesApprox = Math.max(0, officialStoreSales - adsSalesAttributed);

  // Status semaphores
  let tacosStatus: ReconciledMetrics['tacosStatus'] = 'nd';
  if (tacos !== null) {
    if (tacos <= 10) tacosStatus = 'excelente';
    else if (tacos <= 12) tacosStatus = 'atencao';
    else tacosStatus = 'critico';
  }

  let acosStatus: ReconciledMetrics['acosStatus'] = 'nd';
  if (adsAcos !== null) {
    if (adsAcos < 10) acosStatus = 'excelente';
    else if (adsAcos <= 15) acosStatus = 'aceitavel';
    else if (adsAcos <= 20) acosStatus = 'razoavel';
    else acosStatus = 'ruim';
  } else if (adsSpend > 0 && adsSalesAttributed === 0) {
    acosStatus = 'sem_vendas';
  }

  let roasStatus: ReconciledMetrics['roasStatus'] = 'nd';
  if (adsRoas !== null) {
    if (adsRoas > 10) roasStatus = 'excelente';
    else if (adsRoas >= 8) roasStatus = 'bom';
    else if (adsRoas > 3) roasStatus = 'ok';
    else roasStatus = 'ruim';
  }

  // Divergence between sources
  const discrepancySales = Math.abs(businessSales - ordersShippedGross);
  const discrepancyPercent = officialStoreSales > 0 ? (discrepancySales / officialStoreSales) * 100 : 0;
  const discrepancyExplanation = [
    'O Relatório Comercial (Business Report) computa vendas e sessões no momento da encomenda (data de clique/compra).',
    'O Relatório de Todos os Pedidos (All Orders) detalha o faturamento operacional e fiscal no momento do envio (Shipped).',
    'Pedidos pendentes (boletos em compensação) e cancelamentos criam a divergência natural entre faturamento encomendado e realizado.',
  ];

  // 4. SKU Unit Economics & Profitability
  // Build SKU aggregations from both BusinessSkus and Orders
  const skuMap = new Map<string, {
    sku: string;
    asin?: string;
    title?: string;
    unitsSold: number;
    grossSales: number;
    adsSpend: number;
    adsSales: number;
  }>();

  // From Business SKUs
  for (const bs of dataset.businessSkus || []) {
    if (!skuMap.has(bs.sku)) {
      skuMap.set(bs.sku, {
        sku: bs.sku,
        asin: bs.asin,
        title: bs.title,
        unitsSold: bs.unitsOrdered || 0,
        grossSales: bs.orderedProductSales || 0,
        adsSpend: 0,
        adsSales: 0,
      });
    } else {
      const cur = skuMap.get(bs.sku)!;
      cur.unitsSold += bs.unitsOrdered || 0;
      cur.grossSales += bs.orderedProductSales || 0;
    }
  }

  // From Shipped Orders (if businessSkus absent or supplementing)
  if ((dataset.businessSkus || []).length === 0) {
    for (const ord of deduplicatedItems) {
      if (ord.orderStatus === 'Shipped' && ord.sku) {
        if (!skuMap.has(ord.sku)) {
          skuMap.set(ord.sku, {
            sku: ord.sku,
            asin: ord.asin,
            title: ord.productName,
            unitsSold: ord.quantity || 1,
            grossSales: (ord.itemPrice || 0) * (ord.quantity || 1),
            adsSpend: 0,
            adsSales: 0,
          });
        } else {
          const cur = skuMap.get(ord.sku)!;
          cur.unitsSold += ord.quantity || 1;
          cur.grossSales += (ord.itemPrice || 0) * (ord.quantity || 1);
        }
      }
    }
  }

  // Add Ads spend from advertised products if available
  for (const ap of dataset.advertisedProducts || []) {
    const targetSku = ap.sku || ap.asin;
    if (targetSku && skuMap.has(targetSku)) {
      const cur = skuMap.get(targetSku)!;
      cur.adsSpend += ap.spend || 0;
      cur.adsSales += ap.sales || 0;
    }
  }

  // Check if COGS is provided in dataset.cogsList
  const cogsBySku = new Map<string, number>();
  for (const c of dataset.cogsList || []) {
    if (c.sku) cogsBySku.set(c.sku, c.cogs || 0);
  }
const allSkuRows = Array.from(skuMap.values());
  const accountGross = allSkuRows.reduce((sum, r) => sum + r.grossSales, 0);
  const accountAds = allSkuRows.reduce((sum, r) => sum + r.adsSpend, 0);
  const accountAdsPercent = accountGross > 0 ? (accountAds / accountGross) * 100 : 0;
  const adsPercentForRule = sellerSetup.adsInvestmentPercentLast30d ?? accountAdsPercent;
  let totalStoreCogs = 0;
  let totalStoreContribMargin = 0;
  let hasAnyMissingCogs = false;

  const skusSummary: SkuUnitEconomics[] = Array.from(skuMap.values()).map((item) => {
    const overrides = skuEconomicsMap[item.sku] || {};
    const pmv = item.unitsSold > 0 ? item.grossSales / item.unitsSold : 0;

    const providedCogs = overrides.cogs !== undefined
      ? overrides.cogs
      : cogsBySku.has(item.sku)
      ? cogsBySku.get(item.sku)!
      : 0;

    const hasCogsProvided = overrides.hasCogsProvided ?? (providedCogs > 0);
    if (!hasCogsProvided) hasAnyMissingCogs = true;

    const categoryId = overrides.categoryId || 'casa_cozinha';
    const categoryObj = AMAZON_BR_CATEGORIES.find((c) => c.id === categoryId);
    const categoryName = categoryObj ? categoryObj.name : 'Casa & Cozinha';
    const weightGrams = overrides.weightGrams ?? 450;
    const logisticsChannel = overrides.logisticsChannel || 'DBA';
    const hasSp50Discount = overrides.hasSp50Discount ?? sellerSetup.dbaHalfFeePromoActive;
    const fbaProgram = overrides.fbaProgram || fbaProgramFromSetup(sellerSetup);

    // Retrieve commission preview from official report if uploaded (preferencialmente por Child ASIN)
    const commPreviewRow = (dataset.commissionPreview || []).find(
      (cp) => (cp.asin && item.asin && cp.asin.toUpperCase() === item.asin.toUpperCase())
    ) || (dataset.commissionPreview || []).find(
      (cp) => (cp.sku && item.sku && cp.sku.toUpperCase() === item.sku.toUpperCase())
    );

    let commissionPercent = 12;
    let commissionAmount = 0;
    let origemComissao = 'Comissão estimada por categoria';
    let statusComissao = 'Estimativa por categoria — validar comissão';
    let precoPublicado = pmv;
    let comissaoEstimadaUnidade = 0;
    let comissaoMinima = 1.0;
    const categoriaAmazon = commPreviewRow?.categoriaAmazon || categoryName;

    if (commPreviewRow) {
      precoPublicado = commPreviewRow.precoPublicado || pmv;
      comissaoEstimadaUnidade = commPreviewRow.comissaoEstimadaUnidade;
      commissionPercent = commPreviewRow.percentualComissaoEfetivo > 0 ? commPreviewRow.percentualComissaoEfetivo : 12;
      comissaoMinima = commPreviewRow.comissaoMinima || 1.0;
      commissionAmount = comissaoEstimadaUnidade > 0 ? comissaoEstimadaUnidade : (precoPublicado * commissionPercent) / 100;
      origemComissao = 'Comissão oficial estimada da Amazon';
      statusComissao = 'Comissão oficial estimada';
    } else {
      const commCalc = calculateAmazonCommission(pmv, categoryId, overrides.commissionPercent);
      commissionPercent = overrides.commissionPercent ?? commCalc.effectivePercent;
      commissionAmount = (pmv * commissionPercent) / 100;
      comissaoEstimadaUnidade = commissionAmount;
      origemComissao = 'Comissão estimada por categoria';
      statusComissao = 'Estimativa por categoria — validar comissão';
    }

    if (overrides.commissionPercent !== undefined) {
      commissionPercent = overrides.commissionPercent;
      commissionAmount = (pmv * commissionPercent) / 100;
      comissaoEstimadaUnidade = commissionAmount;
      origemComissao = 'Comissão definida pelo usuário';
      statusComissao = 'Configuração manual';
    }

    let alertaDivergenciaComissao = undefined;
    if (commPreviewRow) {
      const diffPreco = Math.abs(precoPublicado - pmv);
      const diffComissao = Math.abs(comissaoEstimadaUnidade - commissionAmount);
      if (diffPreco > 2.0 || diffComissao > 0.5) {
        alertaDivergenciaComissao = `Divergência: Preço publicado R$ ${precoPublicado.toFixed(2)} vs Preço médio vendido R$ ${pmv.toFixed(2)}. Comissão estimada Amazon R$ ${comissaoEstimadaUnidade.toFixed(2)} vs Comissão baseada em vendas R$ ${commissionAmount.toFixed(2)}.`;
      }
    }

    
    const dbaCalc = calculateDbaFee(   pmv,   weightGrams,   hasSp50Discount,   sellerSetup.dbaOriginRegion );
    const dbaFee = overrides.dbaFee ?? dbaCalc.effectiveFee;

    const fbaCalc = calculateFbaFee(pmv, weightGrams, fbaProgram, adsPercentForRule);
    const fbaFee = overrides.fbaFee ?? fbaCalc.effectiveFee;

    const logisticsFeeUnit = logisticsChannel === 'FBA' ? fbaFee : logisticsChannel === 'DBA' ? dbaFee : 0;
    const standardLogisticsFeeUnit = logisticsChannel === 'FBA' ? fbaCalc.standardFee : logisticsChannel === 'DBA' ? dbaCalc.standardFee : 0;
    const programSavingsUnit = Math.max(0, standardLogisticsFeeUnit - logisticsFeeUnit);
    const totalProgramSavings = programSavingsUnit * item.unitsSold;

    const fixedFee = overrides.fixedFee ?? 0;
    const shippingCost = overrides.shippingCost ?? 0;
    const taxRatePercent = overrides.taxRatePercent ?? 6.0;

    const amazonTotalFeeUnit = commissionAmount + logisticsFeeUnit + fixedFee;
    const amazonTakeRatePercent = pmv > 0 ? (amazonTotalFeeUnit / pmv) * 100 : 0;

    const unitVariableCost = providedCogs + amazonTotalFeeUnit + shippingCost + (pmv * taxRatePercent) / 100;
    const totalVariableCosts = unitVariableCost * item.unitsSold;
    const contributionMarginBeforeAds = item.grossSales - totalVariableCosts;
    const contributionMarginPercent = item.grossSales > 0 ? (contributionMarginBeforeAds / item.grossSales) * 100 : 0;

    // Strict breakeven & profit rule: ONLY calculate when COGS is confirmed provided
    const breakevenAcos = hasCogsProvided ? Math.max(0, contributionMarginPercent) : null;
    const netProfitAfterAds = hasCogsProvided ? contributionMarginBeforeAds - item.adsSpend : null;
    const netMarginPercent = (hasCogsProvided && item.grossSales > 0)
      ? (netProfitAfterAds! / item.grossSales) * 100
      : null;

    if (hasCogsProvided) {
      totalStoreCogs += providedCogs * item.unitsSold;
      totalStoreContribMargin += contributionMarginBeforeAds;
    }

    return {
      sku: item.sku,
      asin: item.asin,
      title: item.title,
      pmv,
      unitsSold: item.unitsSold,
      grossSales: item.grossSales,
      cogs: providedCogs,
      hasCogsProvided,
      categoryId,
      categoryName,
      weightGrams,
      commissionPercent,
      commissionAmount,
      precoPublicado,
      comissaoEstimadaUnidade,
      percentualComissaoEfetivo: commissionPercent,
      categoriaAmazon,
      comissaoMinima,
      origemComissao,
      statusComissao,
      alertaDivergenciaComissao,
      logisticsChannel,
      dbaFee,
      hasSp50Discount,
      fbaFee,
      fbaProgram,
      standardLogisticsFeeUnit,
      programSavingsUnit,
      totalProgramSavings,
      fbaAdsEligible: fbaCalc.isEligibleForR6,
      logisticsFeeUnit,
      amazonTotalFeeUnit,
      amazonTakeRatePercent,
      taxRatePercent,
      fixedFee,
      shippingCost,
      amazonFeePercent: commissionPercent,
      totalVariableCosts,
      contributionMarginBeforeAds,
      contributionMarginPercent,
      breakevenAcos,
      adsSpend: item.adsSpend,
      adsSales: item.adsSales,
      netProfitAfterAds,
      netMarginPercent,
      costsComplete: hasCogsProvided,
    };
  });

  const hasCompleteCosts = !hasAnyMissingCogs && skusSummary.length > 0;
  const totalContributionMargin = hasCompleteCosts ? totalStoreContribMargin : null;
  const totalContributionMarginPercent = (hasCompleteCosts && officialStoreSales > 0)
    ? (totalStoreContribMargin / officialStoreSales) * 100
    : null;
  const totalNetProfit = hasCompleteCosts ? totalStoreContribMargin - adsSpend : null;
  const totalNetMarginPercent = (hasCompleteCosts && officialStoreSales > 0)
    ? (totalNetProfit! / officialStoreSales) * 100
    : null;

  // 5. High-Risk Search Terms Detection (Waste / Dreno de Verba)
  const highRiskTerms: {
    term: string;
    campaign: string;
    clicks: number;
    spend: number;
    sales: number;
    reason: string;
  }[] = [];

  for (const st of dataset.searchTerms || []) {
    if (st.clicks >= 10 && st.sales === 0 && st.spend > 15) {
      highRiskTerms.push({
        term: st.customerSearchTerm,
        campaign: st.campaignName || 'Campanha SP',
        clicks: st.clicks,
        spend: st.spend,
        sales: 0,
        reason: `${st.clicks} cliques sem conversão (gasto sob investigação de R$ ${(st.spend ?? 0).toFixed(2)})`,
      });
    } else if (st.spend > 50 && st.sales > 0 && st.acos > 50) {
      highRiskTerms.push({
        term: st.customerSearchTerm,
        campaign: st.campaignName || 'Campanha SP',
        clicks: st.clicks,
        spend: st.spend,
        sales: st.sales,
        reason: `ACOS crítico de ${(st.acos ?? 0).toFixed(1)}% superando teto de margem`,
      });
    }
  }

  // 6. SKU Alerts (Excess Ads Spend vs PMV or Conversion issues)
  const skuAlerts: {
    sku: string;
    title: string;
    pmv: number;
    spend: number;
    sales: number;
    ratio: number;
    recommendation: string;
  }[] = [];

  for (const s of skusSummary) {
    if (s.adsSpend > 0 && s.grossSales === 0 && s.adsSpend >= s.pmv && s.pmv > 0) {
      skuAlerts.push({
        sku: s.sku,
        title: s.title || s.sku,
        pmv: s.pmv,
        spend: s.adsSpend,
        sales: 0,
        ratio: s.adsSpend / s.pmv,
        recommendation: `Gasto de Ads (R$ ${s.adsSpend.toFixed(2)}) atingiu ${(s.adsSpend / s.pmv).toFixed(1)}× o Preço Médio sem gerar vendas. Pausar anúncio do SKU.`,
      });
    }
  }

  // 7. Deterministic Action Plan Generation (Traceable rule codes)
  const actionPlan: ActionPlanItem[] = [];

  // RULE-01: Ads Waste Elimination (Search terms with zero sales)
  if (highRiskTerms.length > 0) {
    const totalWaste = highRiskTerms.filter((t) => t.sales === 0).reduce((acc, t) => acc + t.spend, 0);
    actionPlan.push({
      id: 'act_rule_ads_waste',
      ruleCode: 'RULE-ADS-WASTE',
      priority: 'CRÍTICA',
      targetType: 'Termo de Pesquisa',
      targetIdentifier: `${highRiskTerms.length} termos de busca identificados`,
      problem: 'Consumo contínuo de verba em termos de pesquisa com 10-15 cliques e zero conversão comercial.',
      numericalEvidence: `${highRiskTerms.length} termos consumiram R$ ${(totalWaste ?? 0).toFixed(2)} em cliques sem nenhuma venda no período auditado.`,
      suggestedAction: 'Negativar os termos exatos nas respectivas campanhas ou reduzir o lance de palavra-chave em 50%.',
      actionRisk: 'Hipótese: a negativação estanca o gasto sem impactar vendas orgânicas, desde que os termos não representem buscas diretas pela marca própria.',
      estimatedImpact: totalWaste > 0 ? `Economia estimada de até R$ ${(totalWaste ?? 0).toFixed(2)} por ciclo` : 'Não estimável',
      impactFormulaExplanation: 'Soma do gasto passado em termos de pesquisa com conversão zero.',
      confidence: 'Alta',
      effort: 'Baixo',
      timeframe: 'Imediato (24h-48h)',
      trackingMetric: 'Gasto em Termos Negativados e Redução do TACOS',
      source: 'Amazon Ads — Termos de Pesquisa',
      period: dataset.sessionConfig?.startDate ? `${dataset.sessionConfig.startDate} a ${dataset.sessionConfig.endDate}` : 'Período Auditado',
      status: 'Pendente',
    });
  }

  // RULE-02: TACOS Ceiling Alert
  if (tacos !== null && tacos > 12) {
    const targetSpend = (officialStoreSales * 0.10);
    const excessSpend = Math.max(0, adsSpend - targetSpend);
    actionPlan.push({
      id: 'act_rule_tacos_ceiling',
      ruleCode: 'RULE-TACOS-CEILING',
      priority: 'CRÍTICA',
      targetType: 'Campanha',
      targetIdentifier: 'Conta Global de Ads',
      problem: `TACOS em ${(tacos ?? 0).toFixed(2)}%, acima do teto gerencial seguro de 12%.`,
      numericalEvidence: `Gasto de Ads (R$ ${(adsSpend ?? 0).toFixed(2)}) representa ${(tacos ?? 0).toFixed(2)}% do faturamento da loja (R$ ${(officialStoreSales ?? 0).toFixed(2)}), comprimindo a margem líquida.`,
      suggestedAction: 'Revisar lances (bids) das campanhas com ACOS acima do Breakeven e readequar orçamentos diários para a meta de 6% a 10% de TACOS.',
      actionRisk: 'Risco: cortes drásticos podem reduzir velocidade de vendas e visibilidade na Buy Box. Fazer reduções graduais de 15% nos lances a cada 3 dias.',
      estimatedImpact: excessSpend > 0 ? `Adequação orçamentária de até R$ ${(excessSpend ?? 0).toFixed(2)}` : 'Não estimável',
      impactFormulaExplanation: 'Gasto atual de Ads menos a meta de 10% do faturamento total da loja.',
      confidence: 'Alta',
      effort: 'Médio',
      timeframe: 'Semanal (7 dias)',
      trackingMetric: 'TACOS da Loja (%)',
      source: 'Relatório Comercial + Campanhas de Ads',
      period: 'Período Auditado',
      status: 'Pendente',
    });
  }

  // RULE-03: Missing Product Costs
  if (!hasCompleteCosts) {
    actionPlan.push({
      id: 'act_rule_missing_costs',
      ruleCode: 'RULE-MISSING-COSTS',
      priority: 'ALTA',
      targetType: 'Custos & Margens',
      targetIdentifier: 'Cadastro de COGS dos SKUs',
      problem: 'Custos de aquisição (COGS) não informados ou incompletos na base.',
      numericalEvidence: 'Não é possível calcular Lucro Líquido Real e Breakeven ACOS com rigor sem o custo de cada produto.',
      suggestedAction: 'Preencher a planilha de custos unitários (COGS) na aba de Rentabilidade para destravar o Breakeven ACOS por SKU.',
      actionRisk: 'Decidir cortes de Ads sem conhecer a margem unitária pode fazer o vendedor pausar produtos altamente lucrativos ou insistir em deficitários.',
      estimatedImpact: 'Não estimável sem custos',
      impactFormulaExplanation: 'Depende do preenchimento dos custos reais pelo lojista.',
      confidence: 'Alta',
      effort: 'Baixo',
      timeframe: 'Imediato (24h-48h)',
      trackingMetric: 'Cobertura de COGS (%)',
      source: 'Módulo de Rentabilidade',
      period: 'Cadastro Permanente',
      status: 'Pendente',
    });
  }

  // RULE-04: High Pending Orders
  if (ordersPendingGross > 500 && ordersCountPending > 0) {
    actionPlan.push({
      id: 'act_rule_pending_orders',
      ruleCode: 'RULE-PENDING-ORDERS',
      priority: 'MÉDIA',
      targetType: 'Operacional / Estoque',
      targetIdentifier: `${ordersCountPending} pedidos pendentes`,
      problem: `Volume expressivo de pedidos pendentes totalizando R$ ${(ordersPendingGross ?? 0).toFixed(2)}.`,
      numericalEvidence: `${ordersCountPending} pedidos aguardando compensação de pagamento (boletos ou cartões em análise).`,
      suggestedAction: 'Monitorar a taxa de conversão de pendentes para Shipped e manter estoque reservado para evitar cancelamento por falta de estoque.',
      actionRisk: 'Cancelamento por atraso logístico caso o pagamento compense e não haja estoque imediato.',
      estimatedImpact: `Potencial de até R$ ${(ordersPendingGross ?? 0).toFixed(2)} em faturamento realizado`,
      impactFormulaExplanation: 'Valor bruto dos pedidos atualmente com status Pending.',
      confidence: 'Média',
      effort: 'Baixo',
      timeframe: 'Imediato (24h-48h)',
      trackingMetric: 'Pedidos Concluídos (Shipped)',
      source: 'Relatório de Todos os Pedidos',
      period: 'Período Auditado',
      status: 'Pendente',
    });
  }

  // 8. Alerts Summary
  const alerts: ReconciledMetrics['alerts'] = [];
  if (tacos !== null && tacos > 12) {
    alerts.push({
      type: 'comprovado',
      title: 'Compressão Severa da Margem pelo Ads',
      description: `O TACOS consolidado está em ${(tacos ?? 0).toFixed(2)}%. O valor investido em publicidade (R$ ${(adsSpend ?? 0).toFixed(2)}) reduz diretamente o lucro líquido da operação.`,
      metric: `${(tacos ?? 0).toFixed(2)}%`,
    });
  }
  if (adsSalesShare !== null && adsSalesShare > 30) {
    alerts.push({
      type: 'investigacao',
      title: 'Possível Canibalização de Vendas Orgânicas',
      description: `A participação de Ads em ${(adsSalesShare ?? 0).toFixed(1)}% do faturamento indica que parte dos clientes que já buscavam a marca pode estar clicando em anúncios defensivos. Não pausar anúncios de defesa sem testar o impacto na Buy Box.`,
      metric: `${(adsSalesShare ?? 0).toFixed(1)}%`,
    });
  }
  if (discrepancyPercent > 10) {
    alerts.push({
      type: 'aviso',
      title: 'Divergência entre Relatório Comercial e Pedidos',
      description: `Diferença de R$ ${(discrepancySales ?? 0).toFixed(2)} (${(discrepancyPercent ?? 0).toFixed(1)}%) entre vendas encomendadas e faturadas. Causada por pedidos pendentes e cancelamentos no período.`,
      metric: `${(discrepancyPercent ?? 0).toFixed(1)}%`,
    });
  }

  // 9. Structured KPI List Descriptors
  const kpiList: KpiDescriptor[] = [
    {
      key: 'businessSales',
      label: 'Faturamento Comercial (Encomendado)',
      value: isFilteringByCampaign ? null : businessSales,
      formatted: isFilteringByCampaign ? 'N/D (Filtro de Campanha)' : `R$ ${businessSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      unit: 'BRL',
      formula: 'Soma da coluna ordered_product_sales do Relatório de Negócios',
      sources: ['Relatório de Negócios por Data / SKU'],
      columns: ['ordered_product_sales / vendas_de_produtos_pedidos'],
      period: dataset.sessionConfig?.startDate ? `${dataset.sessionConfig.startDate} a ${dataset.sessionConfig.endDate}` : 'Período Auditado',
      scope: 'Total da Loja',
      status: businessSales > 0 ? 'calculado' : 'indisponivel',
      coverageNote: 'Base comercial oficial de intenção de compra no instante do pedido.',
      updatedAt: dataset.sessionConfig?.recalculatedAt || new Date().toISOString(),
    },
    {
      key: 'ordersShippedGross',
      label: 'Receita Realizada (Pedidos Shipped)',
      value: isFilteringByCampaign ? null : ordersShippedGross,
      formatted: isFilteringByCampaign ? 'N/D (Filtro de Campanha)' : `R$ ${ordersShippedGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      unit: 'BRL',
      formula: 'Soma de (item_price × quantity) onde order_status == "Shipped"',
      sources: ['Relatório de Todos os Pedidos'],
      columns: ['item_price', 'quantity', 'order_status'],
      period: 'Período Auditado',
      scope: 'Pedidos Faturados e Enviados',
      status: ordersShippedGross > 0 ? 'calculado' : 'indisponivel',
      coverageNote: 'Base operacional real de recebimento financeiro.',
      updatedAt: dataset.sessionConfig?.recalculatedAt || new Date().toISOString(),
    },
    {
      key: 'adsSpend',
      label: 'Gasto Consolidado em Amazon Ads',
      value: adsSpend,
      formatted: `R$ ${adsSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      unit: 'BRL',
      formula: 'Soma da coluna spend das Campanhas da Fonte Mestre',
      sources: ['Amazon Ads — Relatório de Campanhas'],
      columns: ['spend / gastos'],
      period: 'Período Auditado',
      scope: isFilteringByCampaign ? 'Campanha Selecionada' : 'Todas as Campanhas Ativas',
      status: adsSpend > 0 ? 'calculado' : 'indisponivel',
      coverageNote: 'Fonte oficial exclusiva para evitar dupla contagem com relatórios de termos.',
      updatedAt: dataset.sessionConfig?.recalculatedAt || new Date().toISOString(),
    },
    {
      key: 'tacos',
      label: 'TACOS da Loja (Total ACOS)',
      value: isFilteringBySku ? null : tacos,
      formatted: isFilteringBySku
        ? 'N/D (Incompatível com filtro de SKU)'
        : tacos !== null
        ? `${(tacos ?? 0).toFixed(2)}%`
        : 'N/D',
      unit: '%',
      formula: '(Gasto Ads ÷ Faturamento Comercial Total da Loja) × 100',
      sources: ['Amazon Ads — Campanhas', 'Relatório Comercial'],
      columns: ['spend', 'ordered_product_sales'],
      period: 'Período Integral Compatível',
      scope: 'Loja Completa',
      status: tacos !== null ? 'calculado' : 'indisponivel',
      coverageNote: 'Mede o impacto da publicidade na margem geral. Meta: 6% a 10%.',
      updatedAt: dataset.sessionConfig?.recalculatedAt || new Date().toISOString(),
    },
    {
      key: 'adsAcos',
      label: 'ACOS Médio (Advertising Cost of Sales)',
      value: adsAcos,
      formatted: adsAcosLabel,
      unit: '%',
      formula: '(Gasto Ads ÷ Vendas Atribuídas de Ads) × 100',
      sources: ['Amazon Ads — Relatório de Campanhas'],
      columns: ['spend', '7_day_total_sales'],
      period: 'Período Auditado',
      scope: 'Publicidade Patrocinada',
      status: adsAcos !== null ? 'calculado' : adsSpend > 0 ? 'estimado' : 'indisponivel',
      coverageNote: 'Alvo gerencial: 12% a 20%, condicionado a estar estritamente abaixo do Breakeven ACOS.',
      updatedAt: dataset.sessionConfig?.recalculatedAt || new Date().toISOString(),
    },
    {
      key: 'adsRoas',
      label: 'ROAS Médio (Return on Ad Spend)',
      value: adsRoas,
      formatted: adsRoasLabel,
      unit: 'x',
      formula: 'Vendas Atribuídas de Ads ÷ Gasto Ads',
      sources: ['Amazon Ads — Relatório de Campanhas'],
      columns: ['7_day_total_sales', 'spend'],
      period: 'Período Auditado',
      scope: 'Publicidade Patrocinada',
      status: adsRoas !== null ? 'calculado' : 'indisponivel',
      coverageNote: 'Inverso multiplicador do ACOS. ROAS alto com margem baixa ainda pode gerar prejuízo.',
      updatedAt: dataset.sessionConfig?.recalculatedAt || new Date().toISOString(),
    },
  ];

  const metrics: ReconciledMetrics = {
    businessSales,
    businessUnits,
    businessOrders,
    businessSessions,
    businessConversionRate,
    businessBuyBox,
    businessAvgTicket,
    ordersTotalGross,
    ordersShippedGross,
    ordersPendingGross,
    ordersCanceledGross,
    ordersCountTotal,
    ordersCountShipped,
    ordersCountPending,
    ordersCountCanceled,
    ordersUnitsShipped,
    ordersAvgTicket,
    discrepancySales,
    discrepancyPercent,
    discrepancyExplanation,
    adsSpend,
    adsSalesAttributed,
    adsOrdersAttributed,
    adsClicks,
    adsImpressions,
    adsCtr,
    adsCpc,
    adsAcos,
    adsAcosLabel,
    adsRoas,
    adsRoasLabel,
    tacos,
    adsSalesShare,
    unattributedSalesApprox,
    hasCompleteCosts,
    totalContributionMargin,
    totalContributionMarginPercent,
    totalNetProfit,
    totalNetMarginPercent,
    tacosStatus,
    acosStatus,
    roasStatus,
    alerts,
    kpiList,
  };

  return {
    metrics,
    skusSummary,
    actionPlan,
    highRiskTerms,
    skuAlerts,
  };
}
