import {
  parseCsvFile,
  parseNumberStrict,
  parseNumber,
  standardizeDate,
  processRawRows,
  createEmptyDataset,
  validateReportColumns,
  consolidateCampaigns,
} from '../csvParser';
import { parseAmazonNumber, formatPercentage } from '../formatters';
import { reconcileAmazonData } from '../dataReconciler';
import { generateStandaloneHtml } from '../standaloneHtmlExporter';
import { generateBudgetInsights } from '../adsBudgetInsights';
import { ParsedDataset, AdsCampaignRow } from '../../types/amazon';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export function runAllAcceptanceTests(): { passed: boolean; results: TestResult[] } {
  const results: TestResult[] = [];

  // Helper assertion
  const assert = (condition: boolean, name: string, errorMsg: string) => {
    if (condition) {
      results.push({ name, passed: true, message: 'OK' });
    } else {
      results.push({ name, passed: false, message: errorMsg });
    }
  };

  // Test 1: CSV pt-BR with ;, decimal 1.234,56, UTF-8 BOM and multiline quotes
  try {
    const rawCsv = '\ufeff"data";"vendas_de_produtos_pedidos";"unidades_pedidas";"titulo"\n"2026-09-01";"1.234,56";"10";"Produto com\nQuebra de Linha"';
    const { audit, rows } = parseCsvFile(rawCsv, 'teste_ptbr.csv');
    const processed = processRawRows(audit.type, rows);
    const valid =
      audit.delimiter === ';' &&
      processed.length === 1 &&
      processed[0].orderedProductSales === 1234.56 &&
      processed[0].unitsOrdered === 10;
    assert(valid, '1. CSV pt-BR com ;, decimal 1.234,56 e quebra em aspas', `Falhou: ${JSON.stringify(processed)}`);
  } catch (e: any) {
    assert(false, '1. CSV pt-BR com ;, decimal 1.234,56 e quebra em aspas', e.message);
  }

  // Test 2: Two items in 1 order: 1 order, 2 items, revenue without double count
  try {
    const dataset = createEmptyDataset();
    dataset.orders = [
      {
        amazonOrderId: 'ORD-001',
        orderItemId: 'ITEM-1',
        purchaseDate: '2026-09-10',
        orderStatus: 'Shipped',
        fulfillmentChannel: 'AFN',
        salesChannel: 'Amazon.com.br',
        sku: 'SKU-A',
        asin: 'ASIN-A',
        productName: 'Item A',
        quantity: 2,
        itemPrice: 50.0,
        itemTax: 0,
        shippingPrice: 0,
        shippingTax: 0,
        itemPromoDiscount: 0,
        isBusinessOrder: false,
      },
      {
        amazonOrderId: 'ORD-001',
        orderItemId: 'ITEM-2',
        purchaseDate: '2026-09-10',
        orderStatus: 'Shipped',
        fulfillmentChannel: 'AFN',
        salesChannel: 'Amazon.com.br',
        sku: 'SKU-B',
        asin: 'ASIN-B',
        productName: 'Item B',
        quantity: 1,
        itemPrice: 100.0,
        itemTax: 0,
        shippingPrice: 0,
        shippingTax: 0,
        itemPromoDiscount: 0,
        isBusinessOrder: false,
      },
    ];

    const reconciled = reconcileAmazonData(dataset);
    const valid =
      reconciled.metrics.ordersCountShipped === 1 &&
      reconciled.metrics.ordersUnitsShipped === 3 &&
      reconciled.metrics.ordersShippedGross === 200.0;
    assert(valid, '2. Dois itens em 1 pedido: 1 pedido único, 2 itens e receita R$ 200 sem dupla contagem', `Contagem: ${reconciled.metrics.ordersCountShipped}, Receita: ${reconciled.metrics.ordersShippedGross}`);
  } catch (e: any) {
    assert(false, '2. Dois itens em 1 pedido', e.message);
  }

  // Test 3: Export by last update with previous month's order does NOT alter current month sales
  try {
    const dataset = createEmptyDataset();
    dataset.orders = [
      {
        amazonOrderId: 'ORD-AUG',
        orderItemId: 'ITEM-AUG',
        purchaseDate: '2026-08-15',
        lastUpdatedDate: '2026-09-05',
        orderStatus: 'Shipped',
        fulfillmentChannel: 'AFN',
        salesChannel: 'Amazon.com.br',
        sku: 'SKU-A',
        asin: 'ASIN-A',
        productName: 'Item Antigo',
        quantity: 1,
        itemPrice: 150.0,
        itemTax: 0,
        shippingPrice: 0,
        shippingTax: 0,
        itemPromoDiscount: 0,
        isBusinessOrder: false,
      },
    ];

    // Filter to September only
    const reconciledSept = reconcileAmazonData(dataset, {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    const valid = reconciledSept.metrics.ordersShippedGross === 0;
    assert(valid, '3. Pedido de mês anterior atualizado no mês atual NÃO altera vendas do mês atual', `Vendas setembro apuradas: ${reconciledSept.metrics.ordersShippedGross}`);
  } catch (e: any) {
    assert(false, '3. Atualização de pedido antigo', e.message);
  }

  // Test 4: Line "TOTAL" ignored; missing item-id signals collision risk
  try {
    const csvWithTotal = `amazon_order_id,sku,item_price,quantity,order_status\nORD-101,SKU-X,50.00,1,Shipped\nORD-101,SKU-X,50.00,1,Shipped\nTotal,Resumo,100.00,2,Shipped`;
    const { rows } = parseCsvFile(csvWithTotal, 'orders.csv');
    const processed = processRawRows('orders_purchase_date', rows);
    // Since order_item_id was missing, isCollisionRisk must be true
    const totalRowIgnored = rows.length === 2;
    const hasCollisionRisk = processed.some((p: any) => p.isCollisionRisk === true);
    assert(totalRowIgnored && hasCollisionRisk, '4. Linha TOTAL ignorada e falta de item-id sinaliza risco de colisão', `Rows: ${rows.length}, Collision: ${hasCollisionRisk}`);
  } catch (e: any) {
    assert(false, '4. Linha TOTAL e risco de colisão', e.message);
  }

  // Test 5: Campaigns sum NOT increased by search terms sum
  try {
    const dataset = createEmptyDataset();
    dataset.campaigns = [
      {
        campaignName: 'Campanha Principal',
        status: 'Enabled',
        budget: 50,
        impressions: 1000,
        clicks: 50,
        spend: 100.0,
        orders: 5,
        sales: 500.0,
        ctr: 5.0,
        cpc: 2.0,
        acos: 20.0,
        roas: 5.0,
      },
    ];
    dataset.searchTerms = [
      {
        campaignName: 'Campanha Principal',
        adGroupName: 'Grupo 1',
        customerSearchTerm: 'termo 1',
        targeting: 'alvo 1',
        matchType: 'EXACT',
        impressions: 500,
        clicks: 25,
        spend: 50.0,
        orders: 2,
        sales: 250.0,
        ctr: 5.0,
        cpc: 2.0,
        acos: 20.0,
        roas: 5.0,
        conversionRate: 8.0,
      },
    ];

    const reconciled = reconcileAmazonData(dataset);
    const valid = reconciled.metrics.adsSpend === 100.0;
    assert(valid, '5. Soma por campanha NÃO acrescida de gasto dos termos de busca', `Gasto apurado: ${reconciled.metrics.adsSpend} (esperado: 100.0)`);
  } catch (e: any) {
    assert(false, '5. Isolamento de fontes de Ads', e.message);
  }

  // Test 6: Math accuracy: Ads 100 and Sales 1000 => TACOS 10%; Ads 100 and Sales 500 => ACOS 20% and ROAS 5; Denominator zero => N/D
  try {
    const dataset = createEmptyDataset();
    dataset.businessDays = [
      {
        date: '2026-09-01',
        orderedProductSales: 1000.0,
        unitsOrdered: 10,
        totalOrderItems: 10,
        sessions: 100,
        pageViews: 150,
        buyBoxPercentage: 90,
        unitSessionPercentage: 10,
      },
    ];
    dataset.campaigns = [
      {
        campaignName: 'Campanha Teste',
        status: 'Enabled',
        budget: 50,
        impressions: 1000,
        clicks: 50,
        spend: 100.0,
        orders: 5,
        sales: 500.0,
        ctr: 5.0,
        cpc: 2.0,
        acos: 20.0,
        roas: 5.0,
      },
    ];

    const rec = reconcileAmazonData(dataset);
    const tacosOk = Math.abs(rec.metrics.tacos! - 10.0) < 0.001;
    const acosOk = Math.abs(rec.metrics.adsAcos! - 20.0) < 0.001;
    const roasOk = Math.abs(rec.metrics.adsRoas! - 5.0) < 0.001;

    // Zero sales test
    const datasetZero = createEmptyDataset();
    datasetZero.campaigns = [
      {
        campaignName: 'Campanha Zero',
        status: 'Enabled',
        budget: 50,
        impressions: 100,
        clicks: 10,
        spend: 50.0,
        orders: 0,
        sales: 0,
        ctr: 10,
        cpc: 5,
        acos: 0,
        roas: 0,
      },
    ];
    const recZero = reconcileAmazonData(datasetZero);
    const acosZeroOk = recZero.metrics.adsAcosLabel === 'Sem venda — requer avaliação';
    const roasZeroOk = recZero.metrics.adsRoas === 0;

    assert(
      tacosOk && acosOk && roasOk && acosZeroOk && roasZeroOk,
      '6. Cálculos exatos: TACOS 10%, ACOS 20%, ROAS 5, e "Sem venda — requer avaliação" para venda 0',
      `TACOS: ${rec.metrics.tacos}, ACOS: ${rec.metrics.adsAcos}, ROAS: ${rec.metrics.adsRoas}, AcosZeroLabel: ${recZero.metrics.adsAcosLabel}`
    );
  } catch (e: any) {
    assert(false, '6. Cálculos exatos e denominador zero', e.message);
  }

  // Test 7: Campaign filter does not alter global store sales; SKU filter marks incompatible global metrics as N/D
  try {
    const dataset = createEmptyDataset();
    dataset.businessDays = [
      {
        date: '2026-09-01',
        orderedProductSales: 5000.0,
        unitsOrdered: 50,
        totalOrderItems: 40,
        sessions: 500,
        pageViews: 800,
        buyBoxPercentage: 95,
        unitSessionPercentage: 10,
      },
    ];
    dataset.campaigns = [
      {
        campaignName: 'Campanha A',
        status: 'Enabled',
        budget: 50,
        impressions: 1000,
        clicks: 50,
        spend: 100.0,
        orders: 5,
        sales: 500.0,
        ctr: 5.0,
        cpc: 2.0,
        acos: 20.0,
        roas: 5.0,
      },
      {
        campaignName: 'Campanha B',
        status: 'Enabled',
        budget: 50,
        impressions: 1000,
        clicks: 50,
        spend: 200.0,
        orders: 10,
        sales: 1000.0,
        ctr: 5.0,
        cpc: 4.0,
        acos: 20.0,
        roas: 5.0,
      },
    ];

    // Filter by Campanha A
    const filteredCamp = reconcileAmazonData(dataset, { campaign: 'Campanha A' });
    const storeSalesUnchanged = filteredCamp.metrics.businessSales === 5000.0;
    const spendFiltered = filteredCamp.metrics.adsSpend === 100.0;

    // Filter by SKU
    const filteredSku = reconcileAmazonData(dataset, { sku: 'SKU-INEXISTENTE' });
    const tacosNullWhenSkuFilter = filteredSku.metrics.kpiList.find((k) => k.key === 'tacos')?.value === null;

    assert(
      storeSalesUnchanged && spendFiltered && tacosNullWhenSkuFilter,
      '7. Filtro de campanha não altera faturamento global da loja; filtro de SKU marca KPIs incompatíveis como N/D',
      `StoreSales: ${filteredCamp.metrics.businessSales}, Spend: ${filteredCamp.metrics.adsSpend}, TacosValue: ${filteredSku.metrics.kpiList.find((k) => k.key === 'tacos')?.value}`
    );
  } catch (e: any) {
    assert(false, '7. Isolamento de filtros globais', e.message);
  }

  // Test 8: Without complete costs, Profit and Breakeven ACOS = null / N/D
  try {
    const dataset = createEmptyDataset();
    dataset.orders = [
      {
        amazonOrderId: 'ORD-1',
        orderItemId: 'ITEM-1',
        purchaseDate: '2026-09-01',
        orderStatus: 'Shipped',
        fulfillmentChannel: 'DBA',
        salesChannel: 'Amazon.com.br',
        sku: 'SKU-SEM-COGS',
        asin: 'ASIN-1',
        productName: 'Produto Sem Custo',
        quantity: 1,
        itemPrice: 100.0,
        itemTax: 0,
        shippingPrice: 0,
        shippingTax: 0,
        itemPromoDiscount: 0,
        isBusinessOrder: false,
      },
    ];

    const rec = reconcileAmazonData(dataset);
    const skuResult = rec.skusSummary[0];
    const valid =
      skuResult.hasCogsProvided === false &&
      skuResult.breakevenAcos === null &&
      skuResult.netProfitAfterAds === null &&
      rec.metrics.hasCompleteCosts === false &&
      rec.metrics.totalNetProfit === null;

    assert(valid, '8. Sem custos completos (COGS), Lucro Líquido e Breakeven ACOS são travados como N/D', `Breakeven: ${skuResult.breakevenAcos}, NetProfit: ${skuResult.netProfitAfterAds}`);
  } catch (e: any) {
    assert(false, '8. Trava de lucro sem custos', e.message);
  }

  // Test 9: Empty state shows no demo numbers
  try {
    const emptyDataset = createEmptyDataset();
    const recEmpty = reconcileAmazonData(emptyDataset);
    const valid =
      recEmpty.metrics.businessSales === 0 &&
      recEmpty.metrics.ordersShippedGross === 0 &&
      recEmpty.metrics.adsSpend === 0 &&
      recEmpty.metrics.tacos === null;
    assert(valid, '9. Estado vazio inicial não exibe números de demonstração nem inventa faturamento', `Vendas: ${recEmpty.metrics.businessSales}, Spend: ${recEmpty.metrics.adsSpend}`);
  } catch (e: any) {
    assert(false, '9. Estado vazio limpo', e.message);
  }

  // Test 10: Exported standalone HTML generates self-contained HTML without external CDN scripts
  try {
    const dataset = createEmptyDataset();
    dataset.businessDays = [
      {
        date: '2026-09-01',
        orderedProductSales: 1000.0,
        unitsOrdered: 10,
        totalOrderItems: 10,
        sessions: 100,
        pageViews: 150,
        buyBoxPercentage: 90,
        unitSessionPercentage: 10,
      },
    ];
    const rec = reconcileAmazonData(dataset);

    const html = generateStandaloneHtml({
      dataset,
      metrics: rec.metrics,
      skusWithEconomics: rec.skusSummary,
      actionPlan: rec.actionPlan,
      highRiskTerms: rec.highRiskTerms,
      generatedAt: '2026-09-29 12:00:00',
    });

    const isHtmlValid =
      html.includes('<!DOCTYPE html>') &&
      html.includes('BB Hub | Gestão de Contas Amazon') &&
      html.includes('window.__BB_HUB_DATA__') &&
      !html.includes('src="http') && // No external CDN script dependencies
      !html.includes('href="http'); // No external fonts/css dependencies required

    assert(isHtmlValid, '10. HTML independente gerado é 100% autocontido e abre via file:// sem CDNs externas', `HTML length: ${html.length}`);
  } catch (e: any) {
    assert(false, '10. HTML independente offline', e.message);
  }

  // Test 11: Mandatory column validation detects missing ASIN/SKU, date, or purchase-date and blocks calculation
  try {
    // 11.1 Products report without SKU or ASIN
    const valMissingSku = validateReportColumns('business_sku', ['titulo', 'sessoes']);
    // 11.2 Date commercial report without date
    const valMissingDate = validateReportColumns('business_date', ['vendas_de_produtos_pedidos']);
    // 11.3 Orders report without purchase-date or order-id
    const valMissingOrder = validateReportColumns('orders_purchase_date', ['item_price', 'quantity']);
    // 11.4 Valid products report with ASIN and sales
    const valValid = validateReportColumns('business_sku', ['child_asin', 'vendas_de_produtos_pedidos', 'sessoes']);

    const validTest11 =
      valMissingSku.hasBlockingErrors === true &&
      valMissingSku.criticalMissing.some((c) => c.includes('SKU') || c.includes('ASIN')) &&
      valMissingDate.hasBlockingErrors === true &&
      valMissingDate.criticalMissing.some((c) => c.includes('Data') || c.includes('date')) &&
      valMissingOrder.hasBlockingErrors === true &&
      valValid.hasBlockingErrors === false &&
      valValid.isValid === true;

    assert(
      validTest11,
      '11. Validação robusta de colunas obrigatórias detecta ausência de ASIN/SKU ou date/purchase-date e bloqueia cálculo',
      `Resultados: SkuMiss=${valMissingSku.hasBlockingErrors}, DateMiss=${valMissingDate.hasBlockingErrors}, Valid=${valValid.isValid}`
    );
  } catch (e: any) {
    assert(false, '11. Validação robusta de colunas obrigatórias', e.message);
  }

  // Test 12: Quick Budget Insights engine identifies bleeding campaigns to pause and high performers to scale
  try {
    const testCampaigns: AdsCampaignRow[] = [
      {
        campaignName: 'SP - High Bleeding ACoS',
        status: 'ENABLED',
        budget: 150.0,
        impressions: 40000,
        clicks: 500,
        spend: 1500.0,
        orders: 10,
        sales: 2500.0,
        ctr: 1.25,
        cpc: 3.0,
        acos: 60.0, // 60% vs target 15% (4x target!)
        roas: 1.67,
      },
      {
        campaignName: 'SP - Zero Conversion Bleed',
        status: 'ENABLED',
        budget: 80.0,
        impressions: 25000,
        clicks: 120,
        spend: 360.0,
        orders: 0,
        sales: 0.0, // 0 sales with spend R$ 360
        ctr: 0.48,
        cpc: 3.0,
        acos: 0,
        roas: 0,
      },
      {
        campaignName: 'SP - Star Performer Scale',
        status: 'ENABLED',
        budget: 100.0,
        impressions: 60000,
        clicks: 800,
        spend: 800.0,
        orders: 90,
        sales: 12000.0,
        ctr: 1.33,
        cpc: 1.0,
        acos: 6.67, // Excellent < 10% vs target 15%
        roas: 15.0,
      },
    ];

    const insights = generateBudgetInsights(testCampaigns, 15.0);

    const pauseHighAcos = insights.recommendations.find((r) => r.campaignName === 'SP - High Bleeding ACoS');
    const pauseZeroSales = insights.recommendations.find((r) => r.campaignName === 'SP - Zero Conversion Bleed');
    const scalePerformer = insights.recommendations.find((r) => r.campaignName === 'SP - Star Performer Scale');

    const validTest12 =
      insights.criticalPauseCount === 2 &&
      insights.scaleOpportunitiesCount === 1 &&
      pauseHighAcos?.actionType === 'PAUSE_CRITICAL' &&
      pauseHighAcos.budgetChangePercent === -70 &&
      pauseZeroSales?.actionType === 'PAUSE_CRITICAL' &&
      pauseZeroSales.suggestedBudget === 0 &&
      scalePerformer?.actionType === 'SCALE_AGGRESSIVE' &&
      scalePerformer.suggestedBudget === 150 &&
      scalePerformer.budgetChangePercent === 50 &&
      insights.potentialMonthlySavings > 0 &&
      insights.potentialGrowthBudget > 0;

    assert(
      validTest12,
      '12. Painel de Insights Rápidos sugere ações de orçamento (pausar/cortar sangria com ACoS abusivo e escalar top performers)',
      `Resultados: pauseCount=${insights.criticalPauseCount}, scaleCount=${insights.scaleOpportunitiesCount}, highAcosAction=${pauseHighAcos?.actionType}, scaleBudget=${scalePerformer?.suggestedBudget}`
    );
  } catch (e: any) {
    assert(false, '12. Painel de Insights Rápidos de orçamento', e.message);
  }

  // Test 13: Detecção inteligente de cabeçalhos com linhas de metadados iniciais e suporte ao relatório de Orçamentos (Budgets)
  try {
    const rawWithBanner = `Relatório de campanhas de Sponsored Products
Período da extração: 01/09/2026 a 21/09/2026
Conta: Principal - Brasil

Data,Nome da campanha,Status da Campanha,Quantia do Orçamento,Gastos,Total de vendas de 7 dias,Cliques
"Sep 01, 2026",Campanha Alfa,ENABLED,50.0,15.50,150.00,20
"Sep 02, 2026",Campanha Alfa,ENABLED,50.0,14.50,120.00,18`;

    const { audit, rows } = parseCsvFile(rawWithBanner, 'campanhas_com_banner.csv');
    const processed = processRawRows(audit.type, rows);

    // Also test a dedicated Budgets report
    const rawBudget = `Nome da campanha,Status,Quantia do Orçamento,Tempo médio dentro do orçamento
Campanha Alfa,ENABLED,50.0,92.5%
Campanha Beta,PAUSED,30.0,45.0%`;

    const budgetParsed = parseCsvFile(rawBudget, 'orcamentos.csv');
    const budgetProcessed = processRawRows(budgetParsed.audit.type, budgetParsed.rows);

    const validTest13 =
      audit.type === 'ads_campaigns' &&
      processed.length === 2 &&
      processed[0].campaignName === 'Campanha Alfa' &&
      processed[0].spend === 15.5 &&
      budgetParsed.audit.type === 'ads_budgets' &&
      budgetProcessed.length === 2 &&
      budgetProcessed[0].budget === 50.0 &&
      budgetProcessed[0].budgetUtilization === 92.5;

    assert(
      validTest13,
      '13. Suporte robusto a planilhas de Ads com banners de metadados no início e relatórios de Orçamentos (Budgets)',
      `CampAudit=${audit.type} (len=${processed.length}), BudgetAudit=${budgetParsed.audit.type} (len=${budgetProcessed.length})`
    );
  } catch (e: any) {
    assert(false, '13. Suporte a metadados iniciais e relatórios de orçamentos', e.message);
  }

  // Test 14: Consolidação automática de campanhas com multi-dias e mesclagem de orçamento
  try {
    const multiDayCampaigns: AdsCampaignRow[] = [
      {
        campaignName: 'Campanha SP Alfa',
        status: 'ENABLED',
        budget: 50.0,
        impressions: 1000,
        clicks: 20,
        spend: 15.0,
        orders: 1,
        sales: 100.0,
        ctr: 2.0,
        cpc: 0.75,
        acos: 15.0,
        roas: 6.67,
      },
      {
        campaignName: 'Campanha SP Alfa',
        status: 'ENABLED',
        budget: 50.0,
        impressions: 1500,
        clicks: 30,
        spend: 25.0,
        orders: 2,
        sales: 200.0,
        ctr: 2.0,
        cpc: 0.83,
        acos: 12.5,
        roas: 8.0,
      },
      {
        campaignName: 'Campanha SP Beta (Apenas Orçamento)',
        status: 'ENABLED',
        budget: 40.0,
        impressions: 0,
        clicks: 0,
        spend: 0,
        orders: 0,
        sales: 0,
        ctr: 0,
        cpc: 0,
        acos: 0,
        roas: 0,
        budgetUtilization: 85.0,
      },
    ];

    const consolidated = consolidateCampaigns(multiDayCampaigns);
    const alfa = consolidated.find((c) => c.campaignName === 'Campanha SP Alfa');
    const beta = consolidated.find((c) => c.campaignName === 'Campanha SP Beta (Apenas Orçamento)');

    const validTest14 =
      consolidated.length === 2 &&
      alfa !== undefined &&
      alfa.spend === 40.0 &&
      alfa.sales === 300.0 &&
      alfa.orders === 3 &&
      alfa.clicks === 50 &&
      alfa.impressions === 2500 &&
      alfa.budget === 50.0 &&
      alfa.acos !== null &&
      Math.abs(alfa.acos - 13.33) < 0.1 &&
      beta !== undefined &&
      beta.budget === 40.0 &&
      beta.budgetUtilization === 85.0;

    assert(
      validTest14,
      '14. Consolidação automática de campanhas agrega histórico diário sem duplicar linhas e preserva tetos orçamentários',
      `Consolidado: len=${consolidated.length}, AlfaSpend=${alfa?.spend}, AlfaSales=${alfa?.sales}, AlfaAcos=${(alfa?.acos ?? 0).toFixed(2)}%`
    );
  } catch (e: any) {
    assert(false, '14. Consolidação automática de campanhas', e.message);
  }

  // TEST 15: Conversão e formatação universal de números da Amazon
  try {
    const t94 = parseAmazonNumber('94%', 'percentage');
    const t94_5 = parseAmazonNumber('94,5%', 'percentage');
    const t94_5_dot = parseAmazonNumber('94.5%', 'percentage');
    const t0_945_comma = parseAmazonNumber('0,945', 'percentage');
    const t0_945_dot = parseAmazonNumber('0.945', 'percentage');
    const t1234_56_br = parseAmazonNumber('1.234,56', 'currency');
    const t1234_56_us = parseAmazonNumber('1,234.56', 'currency');
    const tR$_1234_56 = parseAmazonNumber('R$ 1.234,56', 'currency');
    const tDash = parseAmazonNumber('-', 'percentage');
    const tNA = parseAmazonNumber('N/A', 'percentage');
    const tEmpty = parseAmazonNumber('', 'decimal');
    const tNull = parseAmazonNumber(null, 'currency');

    const fmt94 = formatPercentage(94);
    const fmt94_5 = formatPercentage(94.5);
    const fmtNull = formatPercentage(null);
    const fmtUndefined = formatPercentage(undefined);

    const validTest15 =
      t94 === 94 &&
      t94_5 === 94.5 &&
      t94_5_dot === 94.5 &&
      t0_945_comma === 94.5 &&
      t0_945_dot === 94.5 &&
      t1234_56_br === 1234.56 &&
      t1234_56_us === 1234.56 &&
      tR$_1234_56 === 1234.56 &&
      tDash === null &&
      tNA === null &&
      tEmpty === null &&
      tNull === null &&
      fmt94 === '94%' &&
      fmt94_5 === '94,5%' &&
      fmtNull === 'N/D' &&
      fmtUndefined === 'N/D';

    assert(
      validTest15,
      '15. Conversão e formatação universal de números da Amazon ("94%", "94,5%", "0,945", "1.234,56", "1,234.56", "R$ 1.234,56", "-", "N/A")',
      `Valores obtidos: t94=${t94}, t94,5=${t94_5}, t0,945=${t0_945_comma}, t1234,56=${t1234_56_br}, t1234.56=${t1234_56_us}, tR$=${tR$_1234_56}, tDash=${tDash}, tNA=${tNA}, fmt94=${fmt94}, fmt94,5=${fmt94_5}, fmtNull=${fmtNull}`
    );
  } catch (e: any) {
    assert(false, '15. Conversão e formatação universal de números da Amazon', e.message);
  }

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}
