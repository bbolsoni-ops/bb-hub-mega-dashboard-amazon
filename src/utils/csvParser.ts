import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  ReportType,
  FileAuditInfo,
  BusinessDayRow,
  BusinessSkuRow,
  OrderItemRow,
  AdsCampaignRow,
  AdsSearchTermRow,
  AdsTargetRow,
  AdsAdvertisedProductRow,
  SkuUnitEconomics,
  ParsedDataset,
  AnalysisSessionConfig,
  ColumnRuleStatus,
  ColumnValidationResult,
  AmazonCommissionPreviewRow,
  RentabilidadeRealRow,
} from '../types/amazon';
import { parseCurrency as parseCurrencyAds, calculateAcos, calculateRoas } from './adsBudgetInsights';
import { parseAmazonNumber, ColumnDataType } from './formatters';

// Read any file: automatically converts Excel (.xlsx, .xls) to CSV or reads raw text for CSV/TSV
export async function readSpreadsheetFile(
  file: File
): Promise<{ text: string; isExcel: boolean; sheetName?: string }> {
  const isExcel = /\.(xlsx|xls|xlsm)$/i.test(file.name);
  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    // Look through sheets to find one with content
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet && sheet['!ref']) {
        const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ',', blankrows: false });
        if (csv.trim().length > 0) {
          return { text: csv, isExcel: true, sheetName };
        }
      }
    }
    return { text: '', isExcel: true };
  }
  const text = await file.text();
  return { text, isExcel: false };
}

// Formula injection sanitizer (neutralize =, +, -, @ at the start of text fields)
export function sanitizeCellValue(val: any): any {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return `'${trimmed}`;
  }
  return val;
}

// Standardize any Amazon date into ISO format YYYY-MM-DD
export function standardizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim().replace(/"/g, '');

  // 1. ISO 8601: "2026-09-21T16:17:51+00:00" or "2026-09-21"
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // 2. Brazilian format: "01/09/2026" or "1/9/2026"
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].slice(0, 4);
    return `${year}-${month}-${day}`;
  }

  // 3. Month abbreviations in Portuguese and English
  const ptMonths: Record<string, string> = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  };
  const enMonths: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // e.g. "set. 13, 2026" or "Sep 01, 2026" or "set 13 2026"
  const mMatch = str.match(/([a-zA-Z]{3})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (mMatch) {
    const mStr = mMatch[1].toLowerCase();
    const month = ptMonths[mStr] || enMonths[mStr] || '01';
    const day = mMatch[2].padStart(2, '0');
    const year = mMatch[3];
    return `${year}-${month}-${day}`;
  }

  return str;
}

// Standardize and translate Amazon Ads campaign status to Portuguese
export function translateCampaignStatus(status: string | null | undefined): string {
  if (!status) return 'Ativa';
  const clean = String(status).trim().toUpperCase();
  if (clean === 'ENABLED' || clean === 'DELIVERING' || clean === 'ACTIVE' || clean === 'ATIVA' || clean === 'ATIVO') {
    return 'Ativa';
  }
  if (clean === 'PAUSED' || clean === 'PAUSADA' || clean === 'PAUSADO') {
    return 'Pausada';
  }
  if (clean === 'ARCHIVED' || clean === 'ARQUIVADA' || clean === 'ARQUIVADO') {
    return 'Arquivada';
  }
  if (clean === 'ENDED' || clean === 'FINALIZADA' || clean === 'ENCERRADA') {
    return 'Finalizada';
  }
  if (clean === 'OUT_OF_BUDGET' || clean === 'SEM_ORCAMENTO') {
    return 'Sem Orçamento';
  }
  return status;
}

export { parseAmazonNumber, type ColumnDataType } from './formatters';

// Backward-compatible delegates
export function parseNumberStrict(val: any, columnType?: ColumnDataType): number | null {
  return parseAmazonNumber(val, columnType);
}

export function parseNumber(val: any, fallback = 0, columnType?: ColumnDataType): number {
  const res = parseAmazonNumber(val, columnType);
  return res === null ? fallback : res;
}

// Clean and normalize column names for matching (strips UTF-8 BOM, accents, spaces, hyphens)
export function normalizeCol(col: string): string {
  if (!col) return '';
  return col
    .toLowerCase()
    .replace(/^\ufeff/, '') // Strip BOM
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Column synonyms map for intelligent, deterministic field mapping
export const COLUMN_SYNONYMS: Record<string, string[]> = {
  // Orders
  amazon_order_id: ['amazon_order_id', 'order_id', 'numero_do_pedido', 'id_do_pedido'],
  order_item_id: ['order_item_id', 'id_do_item_do_pedido', 'item_id'],
  purchase_date: ['purchase_date', 'data_da_compra', 'data_do_pedido', 'data_de_compra', 'order_date'],
  last_updated_date: ['last_updated_date', 'data_da_ultima_atualizacao', 'ultima_atualizacao', 'last_updated'],
  order_status: ['order_status', 'status_do_pedido', 'status'],
  fulfillment_channel: ['fulfillment_channel', 'fulfillment-channel', 'canal_de_envio', 'canal-de-envio', 'canal_de_atendimento', 'canal_logistico'],
  fulfilled_by: ['fulfilled_by', 'fulfilled-by', 'atendido_por', 'atendido-por', 'cumprido_por', 'cumprido-por', 'transportadora', 'logistica'],
  sku: ['sku', 'seller_sku', 'codigo_sku', 'sku_do_vendedor', 'item_sku'],
  asin: ['asin', 'asin_do_item', 'codigo_asin'],
  product_name: ['product_name', 'nome_do_produto', 'titulo', 'item_name', 'title'],
  quantity: ['quantity', 'quantidade', 'unidades', 'quantity_purchased', 'item_quantity'],
  item_price: ['item_price', 'preco_do_item', 'preco', 'valor_do_item', 'product_price'],
  item_tax: ['item_tax', 'imposto_do_item', 'tributos'],
  shipping_price: ['shipping_price', 'preco_do_frete', 'frete', 'shipping_fee'],

  // Business Report
  date: ['date', 'data', 'periodo'],
  ordered_product_sales: ['ordered_product_sales', 'vendas_de_produtos_pedidos', 'vendas_de_produtos_encomendados', 'vendas_de_produtos', 'ordered_sales'],
  units_ordered: ['units_ordered', 'unidades_pedidas', 'unidades_encomendadas', 'unidades'],
  total_order_items: ['total_order_items', 'total_de_itens_do_pedido', 'itens_do_pedido', 'pedidos'],
  sessions: ['sessions', 'sessoes', 'visitas'],
  page_views: ['page_views', 'visualizacoes_de_pagina', 'visualizacoes'],
  buyBoxPercentage: [
    'featured_offer_buy_box_percentage',
    'buy_box_percentage',
    'buy_box',
    'percentual_de_oferta_em_destaque_buy_box',
    'porcentagem_de_oferta_em_destaque_buy_box',
    'percentual_de_oferta_em_destaque',
    'porcentagem_de_oferta_em_destaque',
    'featured_offer_percentage',
    'percentual_de_buy_box',
    'porcentagem_de_buy_box',
    'percentual_de_caixa_de_compra',
    'porcentagem_de_caixa_de_compra',
    'featured_offer',
    'oferta_em_destaque',
    'caixa_de_compra',
    'buybox',
  ],
  unitSessionPercentage: [
    'unit_session_percentage',
    'order_item_session_percentage',
    'session_percentage',
    'porcentagem_de_sessoes_de_unidade',
    'percentual_de_sessoes_de_unidade',
    'taxa_de_conversao',
    'conversion_rate',
    'conversao',
    'cvr',
  ],

  // Ads Campaigns
  campaign_name: ['campaign_name', 'nome_da_campanha', 'campanha', 'campaign', 'nome_campanha', 'campaigns', 'campanhas', 'nome_de_campanha'],
  campaign_status: ['campaign_status', 'status_da_campanha', 'status', 'estado', 'state', 'situacao'],
  budget: ['budget', 'orcamento', 'daily_budget', 'orcamento_diario', 'quantia_do_orcamento', 'orcamento_da_campanha', 'campaign_budget', 'orcamento_recomendado'],
  impressions: ['impressions', 'impressoes', 'impressoes_do_ano_anterior'],
  clicks: ['clicks', 'cliques', 'cliques_no_ultimo_anterior'],
  spend: ['spend', 'gastos', 'gasto', 'custo', 'custos', 'custo_total', 'cost', 'total_spend', 'valor_gasto', 'despesas', 'investimento', 'gasto_total', 'gastos_no_ano_anterior', 'custo_r'],
  orders_ads: ['7_day_total_orders', '14_day_total_orders', 'orders', 'pedidos', 'total_de_pedidos', 'total_de_pedidos_de_7_dias', 'total_de_pedidos_em_7_dias', 'total_de_pedidos_de_14_dias', 'pedidos_de_7_dias', 'pedidos_em_7_dias', '7_day_orders', '14_day_orders', 'pedidos_totais', 'units', 'unidades', 'total_de_unidades_de_7_dias'],
  sales_ads: ['7_day_total_sales', '14_day_total_sales', 'sales', 'vendas', 'total_de_vendas', 'total_de_vendas_de_7_dias', 'total_de_vendas_em_7_dias', 'total_de_vendas_de_14_dias', 'vendas_de_7_dias', 'vendas_em_7_dias', '7_day_sales', '14_day_sales', 'vendas_totais', 'vendas_de_anuncios'],
  ctr: ['ctr', 'taxa_de_cliques', 'click_through_rate', 'taxa_de_clique'],
  cpc: ['cpc', 'custo_por_clique', 'cost_per_click'],
  acos: ['acos', 'advertising_cost_of_sales', 'total_do_custo_de_publicidade_das_vendas', 'custo_de_publicidade_das_vendas', 'custo_das_vendas_de_publicidade', 'acos_percentage'],
  roas: ['roas', 'return_on_ad_spend', 'retorno_total_sobre_gastos_com_anuncios', 'retorno_sobre_gastos_com_anuncios', 'retorno_sobre_os_gastos_com_anuncios'],
  budget_utilization: ['budget_utilization', 'utilizacao_do_orcamento', 'tempo_medio_dentro_do_orcamento', 'tempo_medio_no_orcamento', 'average_time_in_budget', 'time_in_budget', 'out_of_budget', 'tempo_no_orcamento'],
  tacos: ['tacos', 'total_advertising_cost_of_sales', 'tacos_percentage'],
  cvr: ['cvr', 'conversion_rate', 'taxa_de_conversao', 'conversao'],

  // Ads Search Terms
  customer_search_term: ['customer_search_term', 'termo_de_pesquisa_do_cliente', 'termo_de_pesquisa', 'search_term', 'termo'],
  ad_group_name: ['ad_group_name', 'nome_do_grupo_de_anuncios', 'grupo_de_anuncios'],
  targeting: ['targeting', 'segmentacao', 'alvo', 'palavra_chave', 'keyword'],
  match_type: ['match_type', 'tipo_de_correspondencia', 'correspondencia'],

  // Commission Preview
  preco_publicado: ['your_price', 'preco_de_venda', 'preco_da_oferta', 'preco_publicado', 'price', 'your-price', 'preco_do_produto', 'preco_oferta'],
  comissao_estimada: ['estimated_fee', 'comissao_estimada', 'estimated_commission', 'comissao_estimada_por_unidade', 'fee_estimate', 'fee-estimate', 'comissao_unidade', 'comissao_estimada_unidade'],
  percentual_comissao: ['commission_rate', 'percentual_comissao', 'referral_fee_percentage', 'taxa_de_comissao', 'percentual_comissao_efetivo', 'fee_percentage', 'taxa_comissao'],
  categoria_amazon: ['product_category', 'categoria', 'categoria_amazon', 'category', 'categoria_do_produto'],
  comissao_minima: ['comissao_minima', 'minimum_fee', 'referral_fee_minimum', 'fee_minimum_brl', 'comissao_minima_unitaria'],

  // Rentabilidade Real
  marca: ['marca', 'brand', 'fabricante'],
  receita_liquida: ['receita_liquida', 'net_revenue', 'receita_liquida_total', 'receita'],
  vendas: ['vendas', 'sales', 'sales_volume', 'faturamento_bruto', 'vendas_brutas'],
  custo_logistica: ['custo_de_logistica', 'custo_logistica', 'logistics_cost', 'custo_logistico'],
  tarifa_logistica_fba: ['tarifas_de_logistica_do_fba_logistica_da_amazon', 'tarifa_fba', 'fba_fee', 'fba_logistics'],
  tarifa_venda: ['tarifas_de_venda', 'tarifa_de_venda', 'selling_fee', 'referral_fee_total', 'tarifas_venda'],
  comissao: ['comissao', 'commission', 'referral_fee'],
  custo_armazenamento: ['custo_de_armazenamento', 'armazenamento', 'storage_fee', 'storage_cost', 'custo_armazenamento'],
  devolucoes: ['operacoes_de_devolucao_e_recuperacao', 'devolucao_e_recuperacao', 'returns', 'devolucoes', 'operacoes_de_devolucao'],
  custo_ads: ['custo_de_vendas_por_anuncio', 'custo_ads', 'ad_spend_cost', 'custo_vendas_anuncio'],
  ads_sp: ['cobrancas_de_sponsored_products', 'sponsored_products', 'ads_sp', 'sponsored_products_spend', 'cobrancas_sponsored'],
  cogs_rentabilidade: ['custo_das_mercadorias_vendidas_fornecido_pelo_vendedor', 'cogs', 'custo_mercadoria', 'custo_fornecedor', 'custo_das_mercadorias_vendidas'],
};

// Identify report type from headers deterministically
export function detectReportType(headers: string[]): { type: ReportType; label: string; confidence: number } {
  const norm = headers.map(normalizeCol);

  // 1. Orders report (All Orders / Pedidos)
  if (
    norm.some((c) => c.includes('amazon_order_id') || c.includes('order_id') || c.includes('numero_do_pedido')) &&
    norm.some((c) => c === 'sku' || c.includes('seller_sku') || c.includes('asin') || c.includes('item_price') || c.includes('order_item_id'))
  ) {
    if (norm.some((c) => c.includes('last_updated') || c.includes('ultima_atualizacao'))) {
      return { type: 'orders_last_updated', label: 'Todos os Pedidos (Por Atualização / Eventos)', confidence: 0.98 };
    }
    return { type: 'orders_purchase_date', label: 'Todos os Pedidos (Por Data da Compra)', confidence: 0.98 };
  }

  // 2. Business report by SKU / ASIN (Detalhes por item filho / parent)
  if (
    norm.some((c) => c === 'asin_parent' || c === 'parent_asin' || c === 'asin_child' || c === 'child_asin') ||
    (norm.some((c) => c === 'codigo_sku' || c === 'sku') &&
      norm.some((c) => c.includes('sessoes') || c.includes('sessions')) &&
      norm.some((c) => c.includes('vendas') || c.includes('sales') || c.includes('pedidos')))
  ) {
    return { type: 'business_sku', label: 'Relatório Comercial por SKU/ASIN (Tráfego & Catálogo)', confidence: 0.98 };
  }

  // 3. Business report by date (Vendas e tráfego por data)
  if (
    norm.some((c) => c === 'data' || c === 'date') &&
    norm.some((c) =>
      c.includes('vendas_de_produtos_pedidos') ||
      c.includes('vendas_de_produtos_encomendados') ||
      c.includes('ordered_product_sales') ||
      c.includes('unidades_pedidas') ||
      c.includes('unidades_encomendadas')
    )
  ) {
    return { type: 'business_date', label: 'Relatório Comercial por Data (Vendas & Tráfego)', confidence: 0.98 };
  }

  // 4. Amazon Ads - Search Terms (Termos de pesquisa do cliente)
  if (norm.some((c) => c.includes('customer_search_term') || c.includes('termo_de_pesquisa_do_cliente') || c.includes('termo_de_pesquisa') || c.includes('search_term'))) {
    return { type: 'ads_search_terms', label: 'Amazon Ads — Termos de Pesquisa (Diagnóstico)', confidence: 0.98 };
  }

  // 5. Amazon Ads - Advertised Products (Produtos anunciados)
  if (norm.some((c) => c.includes('advertised_sku') || c.includes('sku_anunciado') || c.includes('advertised_asin') || c.includes('asin_anunciado'))) {
    return { type: 'ads_advertised_products', label: 'Amazon Ads — Produtos Anunciados', confidence: 0.98 };
  }

  // 6. Amazon Ads - Targeting (Segmentação / Palavras-chave)
  if (
    norm.some((c) => c === 'palavra_chave' || c === 'keyword' || c.includes('targeting') || c.includes('segmentacao') || c.includes('alvo')) &&
    norm.some((c) => c.includes('impressoes') || c.includes('impressions') || c.includes('cliques')) &&
    !norm.some((c) => c.includes('termo_de_pesquisa') || c.includes('search_term'))
  ) {
    return { type: 'ads_targeting', label: 'Amazon Ads — Segmentação / Palavras-Chave', confidence: 0.95 };
  }

  // 7. Amazon Ads - Campaigns (Campanhas consolidadas ou com quebra de data)
  if (
    norm.some((c) => c.includes('campaign_name') || c.includes('nome_da_campanha') || c === 'campanha' || c === 'campaign') &&
    norm.some((c) => c.includes('spend') || c.includes('gastos') || c.includes('gasto') || c.includes('custo') || c.includes('cliques') || c.includes('clicks') || c.includes('impressoes') || c.includes('impressions'))
  ) {
    return { type: 'ads_campaigns', label: 'Amazon Ads — Campanhas & Orçamentos (Fonte Principal de Gasto)', confidence: 0.98 };
  }

  // 8. Amazon Ads - Budgets (Relatório dedicado de Orçamentos)
  if (
    (norm.some((c) => c.includes('campaign_name') || c.includes('nome_da_campanha') || c === 'campanha' || c === 'campaign')) &&
    (norm.some((c) => c.includes('budget') || c.includes('orcamento') || c.includes('tempo_medio') || c.includes('utilizacao')))
  ) {
    return { type: 'ads_budgets', label: 'Amazon Ads — Orçamentos (Budgets)', confidence: 0.95 };
  }

  // 8.1 Fallback Budgets (sem coluna de nome de campanha explícita)
  if (
    norm.some((c) => c.includes('budget') || c.includes('orcamento')) &&
    norm.some((c) => c.includes('budget_utilization') || c.includes('utilizacao_do_orcamento') || c.includes('out_of_budget') || c.includes('tempo_medio'))
  ) {
    return { type: 'ads_budgets', label: 'Amazon Ads — Orçamentos (Budgets)', confidence: 0.9 };
  }

  // 9. Rentabilidade Real Amazon (Análise de Rentabilidade por Produto)
  // Reconhecido pelas colunas oficiais da Amazon (não depende do nome do arquivo):
  // Código ASIN, Código SKU, Nome do produto, Marca, Receita líquida, Vendas, Custo de logística, etc.
  const hasRentabilidadeIdentifiers = (
    norm.some((c) => c === 'sku' || c === 'seller_sku' || c.includes('codigo_sku')) ||
    norm.some((c) => c === 'asin' || c.includes('codigo_asin'))
  );
  const hasRentabilidadeMetrics = (
    norm.some((c) => c.includes('receita_liquida') || c.includes('receit_liquida') || c.includes('net_revenue')) ||
    (norm.some((c) => c.includes('custo_de_logistica') || c.includes('tarifas_de_logistica_do_fba')) && norm.some((c) => c.includes('tarifas_de_venda') || c.includes('comissao')))
  );

  if (hasRentabilidadeIdentifiers && hasRentabilidadeMetrics) {
    return { type: 'rentabilidade_real', label: 'Relatório de Rentabilidade Real Amazon (Análise de Rentabilidade)', confidence: 0.99 };
  }

  // 10. COGS / Custos do produto (Apenas planilhas de cadastro de custo simples)
  if (
    !norm.some((c) => c.includes('receita_liquida') || c.includes('tarifas_de_venda') || c.includes('custo_de_logistica')) &&
    norm.some((c) => c.includes('custo') || c.includes('cogs')) &&
    norm.some((c) => c.includes('sku'))
  ) {
    return { type: 'settlement_cogs', label: 'Custos Unitários dos Produtos (COGS / Fornecedor)', confidence: 0.85 };
  }

  // 11. Amazon Commission Preview (Visualização da Comissão)
  if (
    norm.some((c) => c === 'sku' || c.includes('seller_sku') || c.includes('codigo_sku')) &&
    norm.some((c) => c === 'asin' || c.includes('codigo_asin')) &&
    norm.some((c) => c.includes('price') || c.includes('preco') || c.includes('oferta')) &&
    norm.some((c) => c.includes('fee') || c.includes('comissao') || c.includes('taxa'))
  ) {
    return { type: 'commission_preview', label: 'Visualização de Tarifa/Comissão Amazon (Preview)', confidence: 0.98 };
  }

  return { type: 'unknown', label: 'Relatório Não Identificado', confidence: 0.2 };
}

export interface RequiredRuleDefinition {
  groupName: string;
  fieldLabel: string;
  isMandatory: boolean; // true = crítico/obrigatório (bloqueante); false = recomendado
  synonyms: string[]; // Ao menos um sinônimo deve existir no cabeçalho
  explanation: string;
}

export const REPORT_COLUMN_RULES: Record<ReportType, RequiredRuleDefinition[]> = {
  business_sku: [
    {
      groupName: 'Identificador do Produto',
      fieldLabel: 'SKU ou ASIN',
      isMandatory: true,
      synonyms: [
        'sku',
        'seller_sku',
        'codigo_sku',
        'sku_do_vendedor',
        'item_sku',
        'asin',
        'child_asin',
        'asin_child',
        'parent_asin',
        'asin_parent',
        'asin_do_item',
      ],
      explanation: 'Obrigatório para vincular o tráfego e vendas aos SKUs do catálogo da loja.',
    },
    {
      groupName: 'Métrica de Faturamento ou Unidades',
      fieldLabel: 'Vendas de Produtos ou Unidades',
      isMandatory: true,
      synonyms: [
        'ordered_product_sales',
        'vendas_de_produtos_pedidos',
        'vendas_de_produtos_encomendados',
        'vendas_de_produtos',
        'ordered_sales',
        'units_ordered',
        'unidades_pedidas',
        'unidades_encomendadas',
        'unidades',
      ],
      explanation: 'Essencial para calcular a curva ABC de faturamento e volume de itens por anúncio.',
    },
    {
      groupName: 'Métrica de Tráfego / Sessões',
      fieldLabel: 'Sessões ou Visualizações de Página',
      isMandatory: false,
      synonyms: [
        'sessions',
        'sessoes',
        'visitas',
        'page_views',
        'visualizacoes_de_pagina',
        'visualizacoes',
      ],
      explanation: 'Utilizado para calcular a taxa de conversão comercial por anúncio.',
    },
  ],
  business_date: [
    {
      groupName: 'Dimensão Temporal',
      fieldLabel: 'Coluna de Data (date / data)',
      isMandatory: true,
      synonyms: ['date', 'data', 'periodo'],
      explanation: 'Obrigatório para consolidar a evolução diária de vendas e sessões da loja.',
    },
    {
      groupName: 'Faturamento Comercial',
      fieldLabel: 'Vendas de Produtos Pedidos / Encomendados',
      isMandatory: true,
      synonyms: [
        'ordered_product_sales',
        'vendas_de_produtos_pedidos',
        'vendas_de_produtos_encomendados',
        'vendas_de_produtos',
        'ordered_sales',
      ],
      explanation: 'Base oficial do faturamento comercial para o cálculo de TACOS global.',
    },
    {
      groupName: 'Unidades e Pedidos',
      fieldLabel: 'Unidades Pedidas / Total de Itens',
      isMandatory: false,
      synonyms: [
        'units_ordered',
        'unidades_pedidas',
        'unidades_encomendadas',
        'total_order_items',
        'itens_do_pedido',
      ],
      explanation: 'Permite calcular ticket médio e unidades vendidas por dia.',
    },
  ],
  orders_purchase_date: [
    {
      groupName: 'Identificador do Pedido',
      fieldLabel: 'Número do Pedido Amazon (Order ID)',
      isMandatory: true,
      synonyms: ['amazon_order_id', 'order_id', 'numero_do_pedido', 'id_do_pedido'],
      explanation: 'Chave primária obrigatória para contagem unificada de pedidos elegíveis e deduplicação.',
    },
    {
      groupName: 'Data da Compra',
      fieldLabel: 'Data da Compra (Purchase Date)',
      isMandatory: true,
      synonyms: ['purchase_date', 'data_da_compra', 'data_do_pedido', 'data_de_compra', 'order_date'],
      explanation: 'Obrigatório para posicionar o pedido no período fechado da análise contábil.',
    },
    {
      groupName: 'Status Operacional',
      fieldLabel: 'Status do Pedido (Order Status)',
      isMandatory: true,
      synonyms: ['order_status', 'status_do_pedido', 'status'],
      explanation: 'Necessário para separar receita realizada (Shipped), não realizada (Pending) e cancelamentos.',
    },
    {
      groupName: 'Valor Monetário',
      fieldLabel: 'Preço do Item (Item Price)',
      isMandatory: false,
      synonyms: ['item_price', 'preco_do_item', 'preco', 'valor_do_item'],
      explanation: 'Necessário para apuração financeira exata dos itens do pedido.',
    },
    {
      groupName: 'Identificador do Item ou SKU',
      fieldLabel: 'ID do Item do Pedido ou SKU',
      isMandatory: false,
      synonyms: [
        'order_item_id',
        'id_do_item_do_pedido',
        'item_id',
        'sku',
        'seller_sku',
        'codigo_sku',
        'asin',
      ],
      explanation: 'Recomendado para evitar colisão entre múltiplos itens dentro do mesmo pedido.',
    },
  ],
  orders_last_updated: [
    {
      groupName: 'Identificador do Pedido',
      fieldLabel: 'Número do Pedido Amazon (Order ID)',
      isMandatory: true,
      synonyms: ['amazon_order_id', 'order_id', 'numero_do_pedido', 'id_do_pedido'],
      explanation: 'Chave obrigatória para vincular a atualização ao pedido original.',
    },
    {
      groupName: 'Data da Atualização',
      fieldLabel: 'Data da Última Atualização (Last Updated Date)',
      isMandatory: true,
      synonyms: ['last_updated_date', 'data_da_ultima_atualizacao', 'ultima_atualizacao', 'last_updated'],
      explanation: 'Obrigatório para ordenar eventos temporais e auditar alterações de status.',
    },
    {
      groupName: 'Status Atualizado',
      fieldLabel: 'Status do Pedido (Order Status)',
      isMandatory: true,
      synonyms: ['order_status', 'status_do_pedido', 'status'],
      explanation: 'Utilizado para enriquecer o estado do pedido sem criar novas vendas indevidas.',
    },
  ],
  ads_campaigns: [
    {
      groupName: 'Identificador da Campanha',
      fieldLabel: 'Nome da Campanha (Campaign Name)',
      isMandatory: true,
      synonyms: ['campaign_name', 'nome_da_campanha', 'campanha', 'campaign', 'nome_campanha', 'campaigns'],
      explanation: 'Chave primária para consolidar o investimento publicitário.',
    },
    {
      groupName: 'Gasto Consolidado',
      fieldLabel: 'Gasto / Custo Publicitário (Spend)',
      isMandatory: true,
      synonyms: ['spend', 'gastos', 'gasto', 'custo', 'custos', 'custo_total', 'cost', 'total_spend', 'valor_gasto', 'despesas', 'investimento', 'gasto_total', 'clicks', 'cliques'],
      explanation: 'Métrica mestra oficial de gasto para o cálculo de TACOS, ACOS e ROAS.',
    },
    {
      groupName: 'Vendas Atribuídas de Ads',
      fieldLabel: 'Vendas de Ads (7 ou 14 dias)',
      isMandatory: false,
      synonyms: ['7_day_total_sales', '14_day_total_sales', 'sales', 'vendas', 'total_de_vendas', 'total_de_vendas_de_7_dias'],
      explanation: 'Necessário para calcular o ACOS e o ROAS oficial da campanha.',
    },
    {
      groupName: 'Cliques ou Impressões',
      fieldLabel: 'Cliques ou Impressões de Anúncios',
      isMandatory: false,
      synonyms: ['clicks', 'cliques', 'impressions', 'impressoes'],
      explanation: 'Permite analisar CTR e CPC médio das campanhas.',
    },
  ],
  ads_budgets: [
    {
      groupName: 'Identificador da Campanha',
      fieldLabel: 'Nome da Campanha (Campaign Name)',
      isMandatory: true,
      synonyms: ['campaign_name', 'nome_da_campanha', 'campanha', 'campaign', 'nome_campanha', 'campaigns', 'campanhas'],
      explanation: 'Identifica a campanha monitorada.',
    },
    {
      groupName: 'Orçamento Diário',
      fieldLabel: 'Orçamento (Budget)',
      isMandatory: true,
      synonyms: ['budget', 'orcamento', 'daily_budget', 'orcamento_diario', 'quantia_do_orcamento', 'orcamento_da_campanha', 'campaign_budget', 'orcamento_recomendado'],
      explanation: 'Valor do teto de orçamento configurado na Amazon Ads.',
    },
    {
      groupName: 'Utilização do Orçamento',
      fieldLabel: 'Tempo Médio no Orçamento ou Utilização',
      isMandatory: false,
      synonyms: [
        'tempo_medio_dentro_do_orcamento',
        'tempo_medio_no_orcamento',
        'budget_utilization',
        'utilizacao_do_orcamento',
        'tempo_no_orcamento',
        'average_time_in_budget',
      ],
      explanation: 'Mede o percentual do dia em que a campanha permaneceu ativa sem esgotar o orçamento.',
    },
  ],
  ads_search_terms: [
    {
      groupName: 'Termo de Pesquisa',
      fieldLabel: 'Termo de Pesquisa do Cliente (Search Term)',
      isMandatory: true,
      synonyms: ['customer_search_term', 'termo_de_pesquisa_do_cliente', 'termo_de_pesquisa', 'search_term', 'termo'],
      explanation: 'Obrigatório para diagnosticar termos de busca e termos de alto risco/desperdício.',
    },
    {
      groupName: 'Campanha de Origem',
      fieldLabel: 'Nome da Campanha (Campaign Name)',
      isMandatory: true,
      synonyms: ['campaign_name', 'nome_da_campanha', 'campanha'],
      explanation: 'Permite saber onde o termo foi disparado para futura negativação.',
    },
    {
      groupName: 'Consumo do Termo',
      fieldLabel: 'Cliques ou Gasto do Termo',
      isMandatory: true,
      synonyms: ['clicks', 'cliques', 'spend', 'gastos', 'gasto', 'custo'],
      explanation: 'Essencial para mensurar o volume de investimento sem conversão.',
    },
  ],
  ads_targeting: [
    {
      groupName: 'Alvo de Segmentação',
      fieldLabel: 'Palavra-Chave / Segmentação (Targeting)',
      isMandatory: true,
      synonyms: ['targeting', 'segmentacao', 'alvo', 'palavra_chave', 'keyword'],
      explanation: 'Alvo específico (palavra-chave ou ASIN alvo) auditado.',
    },
    {
      groupName: 'Consumo do Alvo',
      fieldLabel: 'Gasto ou Cliques do Alvo',
      isMandatory: true,
      synonyms: ['spend', 'gastos', 'gasto', 'clicks', 'cliques'],
      explanation: 'Necessário para identificar segmentações com ACOS fora do breakeven.',
    },
  ],
  ads_advertised_products: [
    {
      groupName: 'Produto Anunciado',
      fieldLabel: 'SKU ou ASIN Anunciado',
      isMandatory: true,
      synonyms: ['advertised_sku', 'sku_anunciado', 'advertised_asin', 'asin_anunciado', 'sku', 'asin'],
      explanation: 'Identificador do produto anunciado na campanha.',
    },
    {
      groupName: 'Campanha de Origem',
      fieldLabel: 'Nome da Campanha (Campaign Name)',
      isMandatory: true,
      synonyms: ['campaign_name', 'nome_da_campanha', 'campanha'],
      explanation: 'Identifica a campanha onde o produto está vinculado.',
    },
  ],
  settlement_cogs: [
    {
      groupName: 'Identificador de Produto',
      fieldLabel: 'SKU ou ASIN do Produto',
      isMandatory: true,
      synonyms: ['sku', 'seller_sku', 'codigo_sku', 'asin'],
      explanation: 'Permite atribuir o custo unitário ao item do catálogo.',
    },
    {
      groupName: 'Custo Unitário',
      fieldLabel: 'Custo do Produto (COGS)',
      isMandatory: true,
      synonyms: ['cogs', 'custo', 'custo_unitario', 'unit_cost', 'custo_produto'],
      explanation: 'Custo de compra/fabricação por unidade para apuração de lucro líquido.',
    },
  ],
  commission_preview: [
    {
      groupName: 'Identificador do SKU',
      fieldLabel: 'SKU do Vendedor (SKU)',
      isMandatory: true,
      synonyms: ['sku', 'seller_sku', 'codigo_sku', 'sku_do_vendedor', 'item_sku'],
      explanation: 'Obrigatório para cruzar com o catálogo de produtos e vendas.',
    },
    {
      groupName: 'Identificador ASIN',
      fieldLabel: 'ASIN do Produto (ASIN)',
      isMandatory: true,
      synonyms: ['asin', 'codigo_asin', 'asin_do_item'],
      explanation: 'Utilizado para validação do vínculo do produto.',
    },
    {
      groupName: 'Preço Publicado',
      fieldLabel: 'Preço Publicado / Preço da Oferta (Your Price)',
      isMandatory: true,
      synonyms: ['your_price', 'preco_de_venda', 'preco_da_oferta', 'preco_publicado', 'price', 'preco_do_produto', 'preco_oferta'],
      explanation: 'Preço oficial publicado na Amazon Brasil.',
    },
    {
      groupName: 'Comissão Estimada',
      fieldLabel: 'Comissão Estimada por Unidade (Estimated Fee)',
      isMandatory: true,
      synonyms: ['estimated_fee', 'comissao_estimada', 'estimated_commission', 'comissao_estimada_por_unidade', 'fee_estimate', 'comissao_unidade', 'comissao_estimada_unidade'],
      explanation: 'Tarifa de indicação estimada calculada pela Amazon para a oferta.',
    },
  ],
  rentabilidade_real: [
    {
      groupName: 'Identificador do SKU',
      fieldLabel: 'Código SKU',
      isMandatory: true,
      synonyms: ['sku', 'seller_sku', 'codigo_sku', 'sku_do_vendedor', 'item_sku'],
      explanation: 'Obrigatório para cruzar com o catálogo de produtos e vendas.',
    },
    {
      groupName: 'Identificador ASIN',
      fieldLabel: 'Código ASIN',
      isMandatory: true,
      synonyms: ['asin', 'codigo_asin', 'asin_do_item'],
      explanation: 'Utilizado para validação do vínculo do produto.',
    },
    {
      groupName: 'Receita Líquida',
      fieldLabel: 'Receita líquida',
      isMandatory: true,
      synonyms: ['receita_liquida', 'net_revenue', 'receita_liquida_total', 'receita'],
      explanation: 'Faturamento líquido gerado pelo SKU após tarifas iniciais.',
    },
    {
      groupName: 'Vendas Brutas',
      fieldLabel: 'Vendas',
      isMandatory: true,
      synonyms: ['vendas', 'sales', 'sales_volume', 'faturamento_bruto', 'vendas_brutas', 'total_de_vendas_receita'],
      explanation: 'Faturamento bruto total do produto no período.',
    },
    {
      groupName: 'Nome e Marca',
      fieldLabel: 'Nome do produto / Marca',
      isMandatory: false,
      synonyms: ['nome_do_produto', 'nome_produto', 'titulo', 'title', 'marca', 'brand'],
      explanation: 'Descrição e marca do item para apresentação gerencial.',
    },
    {
      groupName: 'Logística',
      fieldLabel: 'Custo de logística / FBA',
      isMandatory: false,
      synonyms: ['custo_de_logistica_total', 'custo_de_logistica', 'custo_logistica', 'tarifas_de_logistica_do_fba_logistica_da_amazon_total', 'tarifa_fba'],
      explanation: 'Frete e tarifas de atendimento logístico (FBA ou DBA).',
    },
    {
      groupName: 'Tarifas Comerciais',
      fieldLabel: 'Tarifas de venda / Comissão',
      isMandatory: false,
      synonyms: ['tarifas_de_venda_total', 'tarifas_de_venda', 'comissao_total', 'comissao', 'tarifas_de_venda_comissao_total'],
      explanation: 'Comissão percentual da categoria cobrada pela Amazon.',
    },
    {
      groupName: 'Armazenamento',
      fieldLabel: 'Custo de armazenamento',
      isMandatory: false,
      synonyms: ['custo_de_armazenamento_total', 'custo_de_armazenamento', 'armazenagem_total', 'armazenamento_total'],
      explanation: 'Tarifa mensal de inventário estático no centro de distribuição.',
    },
    {
      groupName: 'Devoluções',
      fieldLabel: 'Operações de devolução e recuperação',
      isMandatory: false,
      synonyms: ['operacoes_de_devolucao_e_recuperacao_total', 'operacoes_de_devolucao_e_recuperacao', 'devolucoes_total', 'tarifa_reembolso_total'],
      explanation: 'Impacto financeiro das devoluções e reprocessamento.',
    },
    {
      groupName: 'Publicidade',
      fieldLabel: 'Custo de vendas por anúncio / Sponsored Products',
      isMandatory: false,
      synonyms: ['custo_de_vendas_por_anuncio_total', 'custo_de_vendas_por_anuncio', 'custo_ads', 'cobrancas_de_sponsored_products_total', 'sponsored_products'],
      explanation: 'Investimento em mídia patrocinada alocado ao produto.',
    },
    {
      groupName: 'Custo da Mercadoria',
      fieldLabel: 'Custo das mercadorias vendidas (COGS)',
      isMandatory: false,
      synonyms: ['custo_das_mercadorias_vendidas_fornecido_pelo_vendedor_total', 'custo_das_mercadorias_vendidas_fornecido_pelo_vendedor_por_unidade', 'custo_das_mercadorias_vendidas_fornecido_pelo_vendedor', 'cogs', 'custo_unitario'],
      explanation: 'Custo do produto fornecido pelo vendedor para apuração do lucro líquido.',
    },
  ],
  unknown: [
    {
      groupName: 'Tipo Não Identificado',
      fieldLabel: 'Tipo de Relatório Reconhecido',
      isMandatory: true,
      synonyms: [],
      explanation: 'O cabeçalho do arquivo não corresponde a nenhum relatório reconhecido da Amazon Brasil.',
    },
  ],
};

// Find matching header column for a synonym list
export function matchSynonymToHeader(headers: string[], synonyms: string[]): string | undefined {
  if (!headers || headers.length === 0 || !synonyms || synonyms.length === 0) return undefined;
  const normHeaders = headers.map((h) => ({ original: h, norm: normalizeCol(h) }));

  // 1. Exact normalized match
  for (const syn of synonyms) {
    const normSyn = normalizeCol(syn);
    const exact = normHeaders.find((h) => h.norm === normSyn);
    if (exact) return exact.original;
  }

  // 2. Substring normalized match
  for (const syn of synonyms) {
    const normSyn = normalizeCol(syn);
    if (!normSyn) continue;
    const sub = normHeaders.find((h) => h.norm.includes(normSyn) || normSyn.includes(h.norm));
    if (sub) return sub.original;
  }

  return undefined;
}

// Validate column headers for any given report type
export function validateReportColumns(
  reportType: ReportType,
  headers: string[]
): ColumnValidationResult {
  const rules = REPORT_COLUMN_RULES[reportType] || REPORT_COLUMN_RULES.unknown;
  const ruleStatuses: ColumnRuleStatus[] = [];
  const criticalMissing: string[] = [];
  const warningsMissing: string[] = [];

  for (const rule of rules) {
    const matchedHeader = matchSynonymToHeader(headers, rule.synonyms);
    const satisfied = !!matchedHeader;

    if (!satisfied) {
      if (rule.isMandatory) {
        criticalMissing.push(`${rule.groupName} (${rule.fieldLabel})`);
      } else {
        warningsMissing.push(`${rule.groupName} (${rule.fieldLabel})`);
      }
    }

    ruleStatuses.push({
      groupName: rule.groupName,
      fieldLabel: rule.fieldLabel,
      isMandatory: rule.isMandatory,
      satisfied,
      matchedHeader,
      synonymsExpected: rule.synonyms,
      explanation: rule.explanation,
    });
  }

  const hasBlockingErrors = criticalMissing.length > 0;
  const isValid = !hasBlockingErrors;

  let summaryMessage = 'Todas as colunas obrigatórias foram localizadas com sucesso.';
  if (hasBlockingErrors) {
    summaryMessage = `Colunas críticas ausentes: ${criticalMissing.join(', ')}. O cálculo requer a presença destas colunas.`;
  } else if (warningsMissing.length > 0) {
    summaryMessage = `Colunas recomendadas ausentes: ${warningsMissing.join(', ')}.`;
  }

  return {
    isValid,
    hasBlockingErrors,
    criticalMissingCount: criticalMissing.length,
    warningsMissingCount: warningsMissing.length,
    criticalMissing,
    warningsMissing,
    rules: ruleStatuses,
    summaryMessage,
  };
}

// Find column value using fuzzy normalized alternatives
export function getCol(row: Record<string, any>, possibleNames: string[]): any {
  if (!row) return undefined;
  const keys = Object.keys(row);

  // 1. Exact match on normalized names
  for (const name of possibleNames) {
    const normName = normalizeCol(name);
    for (const key of keys) {
      if (normalizeCol(key) === normName) {
        return row[key];
      }
    }
  }

  // 2. Fallback prefix/contains match
  for (const name of possibleNames) {
    const normName = normalizeCol(name);
    for (const key of keys) {
      const normKey = normalizeCol(key);
      if (normKey.includes(normName)) {
        return row[key];
      }
    }
  }

  return undefined;
}

// Extrator seguro e tipado de números usando a função centralizada parseAmazonNumber
export function getColNumber(
  row: Record<string, any>,
  possibleNames: string[],
  columnType?: ColumnDataType
): number | null {
  const raw = getCol(row, possibleNames);
  return parseAmazonNumber(raw, columnType);
}

// Detects if the first line is an introductory banner or metadata, and returns the line offset where true headers start
export function findHeaderRowOffset(content: string, delimiter: string): number {
  const lines = content.split(/\r?\n/).slice(0, 25);
  let bestLineIdx = 0;
  let maxScore = 0;

  const keySynonyms = [
    'campaign_name',
    'nome_da_campanha',
    'campanha',
    'campaign',
    'spend',
    'gastos',
    'gasto',
    'custo',
    'impressions',
    'impressoes',
    'clicks',
    'cliques',
    'sales',
    'vendas',
    'orders',
    'pedidos',
    'budget',
    'orcamento',
    'quantia_do_orcamento',
    'tempo_medio',
    'utilizacao_do_orcamento',
    'customer_search_term',
    'termo_de_pesquisa',
    'search_term',
    'targeting',
    'segmentacao',
    'palavra_chave',
    'keyword',
    'data',
    'date',
    'purchase_date',
    'data_da_compra',
    'sku',
    'asin',
    'amazon_order_id',
    'order_id',
    'numero_do_pedido',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(delimiter).map(normalizeCol).filter((p) => p.length >= 3);
    let score = 0;
    for (const part of parts) {
      if (keySynonyms.some((syn) => syn === part || part.includes(syn) || syn.includes(part))) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestLineIdx = i;
    }
  }

  // Only apply offset if a subsequent line has at least 2 recognized column indicators and scores higher than line 0
  return maxScore >= 2 ? bestLineIdx : 0;
}

// Parse CSV content strictly
export function parseCsvFile(
  fileContent: string,
  fileName: string,
  fileSize = 0,
  userPeriodOverride?: { startDate: string; endDate: string } | null,
  userEncoding = 'UTF-8'
): { audit: FileAuditInfo; rows: any[] } {
  // Strip BOM if present
  let cleanContent = fileContent.replace(/^\ufeff/, '');

  // Split into lines to check for Amazon Multi-row Rentabilidade / Análise de Rentabilidade format
  let rawLines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  
  // Auto-detect delimiter from the first few lines
  const firstLinesSample = rawLines.slice(0, 5).join('\n');
  const tabCount = (firstLinesSample.match(/\t/g) || []).length;
  const commaCount = (firstLinesSample.match(/,/g) || []).length;
  const semiCount = (firstLinesSample.match(/;/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  } else if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  }

  let isAmazonRentabilidadeReal = false;
  let rent0Idx = -1;
  let rent1Idx = -1;

  for (let i = 0; i < Math.min(10, rawLines.length - 1); i++) {
    const l1 = rawLines[i];
    const l2 = rawLines[i + 1];
    const norm1 = normalizeCol(l1);
    const norm2 = normalizeCol(l2);

    if (
      (norm1.includes('receita_liquida') || norm1.includes('receit_liquida') || norm1.includes('net_revenue') || norm1.includes('custo_de_logistica') || norm1.includes('tarifas_de_venda')) &&
      (norm2.includes('codigo_sku') || norm2.includes('sku') || norm2.includes('seller_sku')) &&
      (norm2.includes('codigo_asin') || norm2.includes('asin'))
    ) {
      isAmazonRentabilidadeReal = true;
      rent0Idx = i;
      rent1Idx = i + 1;
      break;
    }
  }

  if (isAmazonRentabilidadeReal && rent0Idx !== -1 && rent1Idx !== -1) {
    // Parse the two header rows with Papa to support quotes/escapes properly
    const headerParsed = Papa.parse(rawLines[rent0Idx] + '\n' + rawLines[rent1Idx], {
      delimiter,
      header: false,
    });
    const row0 = (headerParsed.data[0] as string[]) || [];
    const row1 = (headerParsed.data[1] as string[]) || [];

    const mergedHeaders: string[] = [];
    let currentParent = 'Produto';

    for (let j = 0; j < Math.max(row0.length, row1.length); j++) {
      const p = String(row0[j] || '').trim();
      const s = String(row1[j] || '').trim();

      if (p) {
        currentParent = p;
      }

      if (!s) {
        mergedHeaders.push(p ? `${p}_Empty_${j}` : `Empty_${j}`);
        continue;
      }

      // Check if this sub column is already unique or within core fields
      const normSub = normalizeCol(s);
      if (
        currentParent === 'Produto' || 
        normSub === 'codigo_sku' || 
        normSub === 'codigo_asin' || 
        normSub === 'nome_do_produto' || 
        normSub === 'marca' ||
        normSub === 'sku' ||
        normSub === 'asin'
      ) {
        mergedHeaders.push(s); // Keep these as pure SKU, ASIN, Marca, etc.
      } else {
        mergedHeaders.push(`${currentParent}_${s}`);
      }
    }

    const mergedLine = mergedHeaders
      .map((h) => {
        if (h.includes(delimiter) || h.includes('"')) {
          return `"${h.replace(/"/g, '""')}"`;
        }
        return h;
      })
      .join(delimiter);

    // Splice the consolidated line in place of Row 0 and Row 1
    rawLines.splice(rent0Idx, 2, mergedLine);
    cleanContent = rawLines.join('\n');
  }

  // Detect and skip metadata banner / title lines if present
  const headerOffset = findHeaderRowOffset(cleanContent, delimiter);
  if (headerOffset > 0) {
    const lines = cleanContent.split(/\r?\n/);
    cleanContent = lines.slice(headerOffset).join('\n');
  }

  const parsed = Papa.parse(cleanContent, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter,
  });

  const rawRows = (parsed.data as any[]).filter((r) => {
    // Ignore summary total rows (Amazon appends "Total", "Resumo", "Grand Total")
    const values = Object.values(r);
    if (values.length <= 1) return false;
    const firstVal = String(values[0] || '').toLowerCase().trim();
    if (firstVal === 'total' || firstVal === 'resumo' || firstVal.startsWith('total ') || firstVal === 'grand total') {
      return false;
    }
    // Also ignore if any cell contains an overall total marker in a 1-item line
    return true;
  });

  const headers = parsed.meta.fields || [];
  const detected = detectReportType(headers);

  // Analyze date presence in rows
  let minDate = '';
  let maxDate = '';
  let hasDateCol = false;
  const nullCounts: Record<string, number> = {};

  for (const h of headers) {
    nullCounts[h] = 0;
  }

  for (const r of rawRows) {
    for (const h of headers) {
      if (r[h] === undefined || r[h] === null || String(r[h]).trim() === '') {
        nullCounts[h] = (nullCounts[h] || 0) + 1;
      }
    }

    const possibleDate = getCol(r, [
      'date',
      'data',
      'purchase_date',
      'data_da_compra',
      'last_updated_date',
      'data_da_ultima_atualizacao',
    ]);
    if (possibleDate) {
      hasDateCol = true;
      const std = standardizeDate(possibleDate);
      if (std && /^\d{4}-\d{2}-\d{2}$/.test(std)) {
        if (!minDate || std < minDate) minDate = std;
        if (!maxDate || std > maxDate) maxDate = std;
      }
    }
  }

  // If user provided period override or if dates were detected in rows
  const effectiveMinDate = userPeriodOverride?.startDate || minDate;
  const effectiveMaxDate = userPeriodOverride?.endDate || maxDate;

  // Determine metadata use and limitations
  let granularity = 'Linha a linha';
  let officialUse = 'Diagnóstico';
  let limitations = 'Nenhuma limitação identificada';

  if (detected.type === 'business_date') {
    granularity = 'Diária (Total da Loja)';
    officialUse = 'Base oficial de faturamento comercial, sessões e conversão';
    limitations = 'Não detalha SKUs nem canais de envio (FBA/DBA)';
  } else if (detected.type === 'business_sku') {
    granularity = 'Por SKU / ASIN (Agregado)';
    officialUse = 'Curva ABC de produtos, sessões por anúncio e Buy Box';
    limitations = 'Não somar ao relatório diário para evitar dupla contagem';
  } else if (detected.type === 'orders_purchase_date') {
    granularity = 'Por Item de Pedido (Transacional)';
    officialUse = 'Base operacional de faturamento real (Shipped), frete e logística';
    limitations = 'Não somar ao faturamento do Business Report';
  } else if (detected.type === 'orders_last_updated') {
    granularity = 'Por Atualização de Pedido';
    officialUse = 'Enriquecimento de status (entregas, cancelamentos recentes)';
    limitations = 'Não gera vendas novas; pedidos antigos atualizados não pertencem ao mês';
  } else if (detected.type === 'ads_campaigns') {
    granularity = 'Por Campanha (Agregado)';
    officialUse = 'FONTE MESTRE oficial de gasto e vendas atribuídas de Ads';
    limitations = 'Janela de atribuição pode ser revisada nos 7-14 dias recentes';
  } else if (detected.type === 'ads_search_terms') {
    granularity = 'Por Termo de Pesquisa / Alvo';
    officialUse = 'Detecção de termos com cliques e zero conversão (alto risco)';
    limitations = 'NÃO somar ao gasto das campanhas; inclui apenas termos com cliques';
  } else if (detected.type === 'rentabilidade_real') {
    granularity = 'Por SKU / ASIN (Rentabilidade Real)';
    officialUse = 'Auditoria completa de tarifas Amazon, margem de contribuição, Ads e lucro líquido';
    limitations = 'Valores podem estar consolidados por período selecionado na exportação';
  }

  // Perform robust column validation against required rules for the detected report type
  const columnValidation = validateReportColumns(detected.type, headers);

  let status: 'valid' | 'warning' | 'error' = 'valid';
  let statusMessage = 'Arquivo validado com sucesso';

  if (rawRows.length === 0) {
    status = 'warning';
    statusMessage = 'Arquivo sem linhas de dados detectadas';
  } else if (columnValidation.hasBlockingErrors) {
    status = 'error';
    statusMessage = `Bloqueio: ${columnValidation.criticalMissing.join('; ')} ausente(s)`;
  } else if (columnValidation.warningsMissing.length > 0) {
    status = 'warning';
    statusMessage = `Atenção: ${columnValidation.warningsMissing.join('; ')} ausente(s)`;
  }

  const audit: FileAuditInfo = {
    id: Math.random().toString(36).substring(2, 9),
    name: fileName,
    sizeBytes: fileSize,
    type: detected.type,
    typeLabel: detected.label,
    rowCount: rawRows.length,
    colCount: headers.length,
    dateMin: effectiveMinDate || undefined,
    dateMax: effectiveMaxDate || undefined,
    delimiter,
    encoding: userEncoding,
    detectedColumns: headers,
    missingCrucialColumns: columnValidation.criticalMissing,
    columnValidation,
    status,
    statusMessage,
    granularity,
    officialUse,
    limitations,
    nullCountSummary: nullCounts,
    hasDateColumn: hasDateCol,
    userSpecifiedPeriod: userPeriodOverride || null,
  };

  return { audit, rows: rawRows };
}

// Convert raw rows into typed records based on confirmed report type
export function processRawRows(reportType: ReportType, rows: any[], fileName = ''): any[] {
  switch (reportType) {
    case 'business_date': {
      return rows
        .map((r) => {
          const rawDate = getCol(r, ['data', 'date']);
          if (!rawDate) return null;
          return {
            date: standardizeDate(rawDate),
            orderedProductSales: getColNumber(r, COLUMN_SYNONYMS.ordered_product_sales, 'currency') ?? 0,
            unitsOrdered: getColNumber(r, COLUMN_SYNONYMS.units_ordered, 'integer') ?? 0,
            totalOrderItems: getColNumber(r, COLUMN_SYNONYMS.total_order_items, 'integer') ?? 0,
            sessions: getColNumber(r, COLUMN_SYNONYMS.sessions, 'integer') ?? 0,
            pageViews: getColNumber(r, COLUMN_SYNONYMS.page_views, 'integer') ?? 0,
            buyBoxPercentage: getColNumber(r, COLUMN_SYNONYMS.buyBoxPercentage, 'percentage'),
            unitSessionPercentage: getColNumber(r, COLUMN_SYNONYMS.unitSessionPercentage, 'percentage'),
          } as BusinessDayRow;
        })
        .filter(Boolean);
    }

    case 'business_sku': {
      return rows
        .map((r) => {
          const sku = String(getCol(r, ['codigo_sku', 'sku', 'seller_sku']) || '').trim();
          const asin = String(getCol(r, ['child_asin', 'asin_child', 'asin', 'parent_asin']) || '').trim();
          if (!sku && !asin) return null;
          return {
            sku: sku || asin,
            asin,
            title: String(getCol(r, ['titulo', 'title', 'product_name']) || '').trim(),
            sessions: getColNumber(r, COLUMN_SYNONYMS.sessions, 'integer') ?? 0,
            pageViews: getColNumber(r, COLUMN_SYNONYMS.page_views, 'integer') ?? 0,
            buyBoxPercentage: getColNumber(r, COLUMN_SYNONYMS.buyBoxPercentage, 'percentage'),
            unitsOrdered: getColNumber(r, COLUMN_SYNONYMS.units_ordered, 'integer') ?? 0,
            orderedProductSales: getColNumber(r, COLUMN_SYNONYMS.ordered_product_sales, 'currency') ?? 0,
            unitSessionPercentage: getColNumber(r, COLUMN_SYNONYMS.unitSessionPercentage, 'percentage'),
          } as BusinessSkuRow;
        })
        .filter(Boolean);
    }

    case 'orders_purchase_date':
    case 'orders_last_updated': {
      return rows
        .map((r, idx) => {
          const orderId = String(getCol(r, ['amazon_order_id', 'order_id', 'numero_do_pedido']) || '').trim();
          if (!orderId) return null;
          const orderItemId = String(getCol(r, ['order_item_id', 'item_id']) || '').trim();
          const sku = String(getCol(r, ['sku', 'seller_sku', 'codigo_sku']) || '').trim();
          const itemPrice = getColNumber(r, COLUMN_SYNONYMS.item_price, 'currency') ?? 0;
          const quantity = getColNumber(r, COLUMN_SYNONYMS.quantity, 'integer') ?? 1;

          // If orderItemId is missing, signal collision risk
          const isCollisionRisk = !orderItemId;

          const rawStatus = String(getCol(r, ['order_status', 'status_do_pedido', 'status']) || '').trim();
          let orderStatus: OrderItemRow['orderStatus'] = 'Unknown';
          const lowerStatus = rawStatus.toLowerCase();
          if (lowerStatus.includes('shipped') || lowerStatus.includes('enviado') || lowerStatus.includes('entregue')) {
            orderStatus = 'Shipped';
          } else if (lowerStatus.includes('pending') || lowerStatus.includes('pendente')) {
            orderStatus = 'Pending';
          } else if (lowerStatus.includes('canceled') || lowerStatus.includes('cancelado')) {
            orderStatus = 'Canceled';
          } else if (lowerStatus.includes('unshipped')) {
            orderStatus = 'Unshipped';
          }

          const rawChannel = String(
            getCol(r, [
              'fulfillment_channel',
              'fulfillment-channel',
              'canal_de_envio',
              'canal_de_atendimento',
            ]) || ''
          ).trim();

          const rawFulfilledBy = String(
            getCol(r, [
              'fulfilled_by',
              'fulfilled-by',
              'atendido_por',
              'atendido-por',
              'cumprido_por',
            ]) || ''
          ).trim();

          // Exemplo de como o código do Painel deve ler a linha do pedido
          let tipoEnvio = 'FBM (Próprio)';
          const lowerChan = rawChannel.toLowerCase();
          const lowerFulfilledBy = rawFulfilledBy.toLowerCase();

          if (rawChannel === 'Amazon' || lowerChan.includes('amazon') || lowerChan.includes('afn') || lowerChan.includes('fba')) {
            tipoEnvio = 'FBA (Full)';
          } else if (
            (rawChannel === 'Merchant' || lowerChan.includes('merchant') || lowerChan.includes('mfn')) &&
            (rawFulfilledBy === 'Easy Ship' || lowerFulfilledBy.includes('easy ship') || lowerFulfilledBy.includes('easy_ship') || lowerFulfilledBy.includes('dba'))
          ) {
            tipoEnvio = 'DBA';
          } else if (lowerChan.includes('dba')) {
            tipoEnvio = 'DBA';
          } else {
            tipoEnvio = 'FBM (Próprio)';
          }

          let fulfillmentChannel: OrderItemRow['fulfillmentChannel'] =
            tipoEnvio === 'FBA (Full)' ? 'Amazon' : tipoEnvio === 'DBA' ? 'DBA' : 'Merchant';

          return {
            amazonOrderId: orderId,
            orderItemId: orderItemId || `${orderId}_${sku}_${itemPrice}_${quantity}_${idx}`,
            purchaseDate: standardizeDate(getCol(r, ['purchase_date', 'data_da_compra', 'data_do_pedido'])),
            lastUpdatedDate: standardizeDate(getCol(r, ['last_updated_date', 'data_da_ultima_atualizacao', 'ultima_atualizacao'])),
            orderStatus,
            fulfillmentChannel,
            tipoEnvio,
            fulfilledBy: rawFulfilledBy,
            salesChannel: String(getCol(r, ['sales_channel', 'canal_de_vendas']) || 'Amazon.com.br'),
            sku,
            asin: String(getCol(r, ['asin', 'codigo_asin']) || '').trim(),
            productName: String(getCol(r, ['product_name', 'nome_do_produto', 'titulo']) || '').trim(),
            quantity,
            itemPrice,
            itemTax: getColNumber(r, COLUMN_SYNONYMS.item_tax, 'currency') ?? 0,
            shippingPrice: getColNumber(r, COLUMN_SYNONYMS.shipping_price, 'currency') ?? 0,
            shippingTax: getColNumber(r, ['shipping_tax', 'imposto_do_frete'], 'currency') ?? 0,
            itemPromoDiscount: getColNumber(r, ['item_promotion_discount', 'desconto_promocional'], 'currency') ?? 0,
            shipCity: String(getCol(r, ['ship_city', 'cidade_de_envio']) || ''),
            shipState: String(getCol(r, ['ship_state', 'estado_de_envio']) || ''),
            isBusinessOrder: String(getCol(r, ['is_business_order', 'pedido_corporativo']) || '').toLowerCase() === 'true',
            sourceFile: fileName,
            isCollisionRisk,
          } as OrderItemRow;
        })
        .filter(Boolean);
    }

    case 'ads_campaigns': {
      return rows
        .map((r) => {
          const campName = String(getCol(r, ['campaign_name', 'nome_da_campanha', 'campanha', 'campaign', 'nome_campanha']) || '').trim();
          if (!campName) return null;

          const budget = getColNumber(
            r,
            ['quantia_do_orcamento', 'orcamento', 'daily_budget', 'orcamento_diario', 'orcamento_da_campanha', 'campaign_budget', 'orcamento_recomendado'],
            'currency'
          ) ?? undefined;

          const spend = getColNumber(
            r,
            ['spend', 'gastos', 'gasto', 'custo', 'custos', 'custo_total', 'cost', 'total_spend', 'valor_gasto', 'despesas', 'investimento', 'gasto_total', 'gastos_no_ano_anterior'],
            'currency'
          ) ?? 0;

          const sales = getColNumber(
            r,
            ['7_day_total_sales', '14_day_total_sales', 'sales', 'vendas', 'total_de_vendas', 'total_de_vendas_de_7_dias', 'total_de_vendas_em_7_dias', 'total_de_vendas_de_14_dias', 'vendas_de_7_dias', 'vendas_em_7_dias', '7_day_sales', '14_day_sales', 'vendas_totais'],
            'currency'
          ) ?? 0;

          const clicks = getColNumber(r, ['clicks', 'cliques', 'cliques_no_ultimo_anterior'], 'integer') ?? 0;
          const impressions = getColNumber(r, ['impressions', 'impressoes', 'impressoes_do_ano_anterior'], 'integer') ?? 0;

          const orders = getColNumber(
            r,
            ['7_day_total_orders', '14_day_total_orders', 'orders', 'pedidos', 'total_de_pedidos', 'total_de_pedidos_de_7_dias', 'total_de_pedidos_em_7_dias', 'pedidos_de_7_dias', 'pedidos_em_7_dias', '7_day_orders', '14_day_orders', 'pedidos_totais', 'units', 'unidades', 'total_de_unidades_de_7_dias'],
            'integer'
          ) ?? 0;

          const budgetUtilization = getColNumber(
            r,
            ['budget_utilization', 'utilizacao_do_orcamento', 'tempo_medio_dentro_do_orcamento', 'tempo_medio_no_orcamento', 'average_time_in_budget', 'time_in_budget', 'out_of_budget', 'tempo_no_orcamento'],
            'percentage'
          ) ?? undefined;

          const status = String(
            r["Status da Campanha"] ??
            r["Campaign Status"] ??
            getCol(r, ['campaign_status', 'status_da_campanha', 'status', 'estado', 'state', 'situacao']) ??
            'ENABLED'
          ).trim().toUpperCase();

          const directAcos = getColNumber(r, ['acos', 'advertising_cost_of_sales', 'acos_percentage', 'custo_de_publicidade_das_vendas'], 'percentage');
          const acos = directAcos !== null ? directAcos : calculateAcos(spend, sales);

          const directRoas = getColNumber(r, ['roas', 'return_on_ad_spend', 'retorno_sobre_gastos_com_anuncios'], 'decimal');
          const roas = directRoas !== null ? directRoas : calculateRoas(spend, sales);

          const directCtr = getColNumber(r, ['ctr', 'taxa_de_cliques', 'click_through_rate'], 'percentage');
          const ctr = directCtr !== null ? directCtr : (impressions > 0 ? (clicks / impressions) * 100 : 0);

          return {
            campaignName: campName,
            status,
            budget,
            impressions,
            clicks,
            spend,
            orders,
            sales,
            ctr,
            cpc: clicks > 0 ? spend / clicks : 0,
            acos,
            roas,
            budgetUtilization: budgetUtilization !== undefined && budgetUtilization > 0 ? budgetUtilization : undefined,
          } as AdsCampaignRow;
        })
        .filter(Boolean);
    }

    case 'ads_budgets': {
      return rows
        .map((r) => {
          const campName = String(getCol(r, ['campaign_name', 'nome_da_campanha', 'campanha', 'campaign', 'nome_campanha']) || '').trim();
          if (!campName) return null;

          const budget = getColNumber(
            r,
            ['quantia_do_orcamento', 'orcamento', 'daily_budget', 'orcamento_diario', 'orcamento_da_campanha', 'campaign_budget', 'orcamento_recomendado'],
            'currency'
          ) ?? undefined;

          const budgetUtilization = getColNumber(
            r,
            ['budget_utilization', 'utilizacao_do_orcamento', 'tempo_medio_dentro_do_orcamento', 'tempo_medio_no_orcamento', 'average_time_in_budget', 'time_in_budget', 'out_of_budget', 'tempo_no_orcamento'],
            'percentage'
          ) ?? undefined;

          const status = String(
            r["Status da Campanha"] ??
            r["Campaign Status"] ??
            getCol(r, ['campaign_status', 'status_da_campanha', 'status', 'estado', 'state', 'situacao']) ??
            'ENABLED'
          ).trim().toUpperCase();

          const spend = getColNumber(
            r,
            ['spend', 'gastos', 'gasto', 'custo', 'custos', 'custo_total', 'cost', 'total_spend', 'valor_gasto', 'despesas', 'investimento', 'gasto_total', 'gastos_no_ano_anterior'],
            'currency'
          ) ?? 0;

          const sales = getColNumber(
            r,
            ['7_day_total_sales', '14_day_total_sales', 'sales', 'vendas', 'total_de_vendas', 'total_de_vendas_de_7_dias', 'total_de_vendas_em_7_dias', 'total_de_vendas_de_14_dias', 'vendas_de_7_dias', 'vendas_em_7_dias', '7_day_sales', '14_day_sales', 'vendas_totais'],
            'currency'
          ) ?? 0;

          const clicks = getColNumber(r, ['clicks', 'cliques', 'cliques_no_ultimo_anterior'], 'integer') ?? 0;
          const impressions = getColNumber(r, ['impressions', 'impressoes', 'impressoes_do_ano_anterior'], 'integer') ?? 0;

          const orders = getColNumber(
            r,
            ['7_day_total_orders', '14_day_total_orders', 'orders', 'pedidos', 'total_de_pedidos', 'total_de_pedidos_de_7_dias', 'total_de_pedidos_em_7_dias', 'pedidos_de_7_dias', 'pedidos_em_7_dias', '7_day_orders', '14_day_orders', 'pedidos_totais', 'units', 'unidades', 'total_de_unidades_de_7_dias'],
            'integer'
          ) ?? 0;

          const directAcos = getColNumber(r, ['acos', 'advertising_cost_of_sales', 'acos_percentage', 'custo_de_publicidade_das_vendas'], 'percentage');
          const acos = directAcos !== null ? directAcos : calculateAcos(spend, sales);

          const directRoas = getColNumber(r, ['roas', 'return_on_ad_spend', 'retorno_sobre_gastos_com_anuncios'], 'decimal');
          const roas = directRoas !== null ? directRoas : calculateRoas(spend, sales);

          const directCtr = getColNumber(r, ['ctr', 'taxa_de_cliques', 'click_through_rate'], 'percentage');
          const ctr = directCtr !== null ? directCtr : (impressions > 0 ? (clicks / impressions) * 100 : 0);

          return {
            campaignName: campName,
            status,
            budget,
            impressions,
            clicks,
            spend,
            orders,
            sales,
            ctr,
            cpc: clicks > 0 ? spend / clicks : 0,
            acos,
            roas,
            budgetUtilization: budgetUtilization !== undefined && budgetUtilization > 0 ? budgetUtilization : undefined,
          } as AdsCampaignRow;
        })
        .filter(Boolean);
    }

    case 'ads_search_terms': {
      return rows
        .map((r) => {
          const term = String(getCol(r, ['customer_search_term', 'termo_de_pesquisa_do_cliente', 'termo_de_pesquisa', 'search_term']) || '').trim();
          if (!term) return null;
          const spend = getColNumber(r, ['spend', 'gastos', 'gasto', 'custo'], 'currency') ?? 0;
          const sales = getColNumber(r, ['7_day_total_sales', '14_day_total_sales', 'sales', 'vendas'], 'currency') ?? 0;
          const clicks = getColNumber(r, ['clicks', 'cliques'], 'integer') ?? 0;
          const impressions = getColNumber(r, ['impressions', 'impressoes'], 'integer') ?? 0;
          const orders = getColNumber(r, ['7_day_total_orders', '14_day_total_orders', 'orders', 'pedidos'], 'integer') ?? 0;

          return {
            campaignName: String(getCol(r, ['campaign_name', 'nome_da_campanha']) || '').trim(),
            adGroupName: String(getCol(r, ['ad_group_name', 'nome_do_grupo_de_anuncios']) || '').trim(),
            customerSearchTerm: term,
            targeting: String(getCol(r, ['targeting', 'segmentacao', 'palavra_chave']) || '').trim(),
            matchType: String(getCol(r, ['match_type', 'tipo_de_correspondencia']) || 'EXACT').trim(),
            impressions,
            clicks,
            spend,
            orders,
            sales,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? spend / clicks : 0,
            acos: sales > 0 ? (spend / sales) * 100 : 0,
            roas: spend > 0 ? sales / spend : 0,
            conversionRate: clicks > 0 ? (orders / clicks) * 100 : 0,
          } as AdsSearchTermRow;
        })
        .filter(Boolean);
    }

    case 'ads_targeting': {
      return rows
        .map((r) => {
          const target = String(getCol(r, ['targeting', 'segmentacao', 'palavra_chave', 'alvo']) || '').trim();
          if (!target) return null;
          const spend = getColNumber(r, ['spend', 'gastos', 'gasto', 'custo'], 'currency') ?? 0;
          const sales = getColNumber(r, ['7_day_total_sales', '14_day_total_sales', 'sales', 'vendas'], 'currency') ?? 0;
          const clicks = getColNumber(r, ['clicks', 'cliques'], 'integer') ?? 0;
          const impressions = getColNumber(r, ['impressions', 'impressoes'], 'integer') ?? 0;
          const orders = getColNumber(r, ['7_day_total_orders', '14_day_total_orders', 'orders', 'pedidos'], 'integer') ?? 0;

          return {
            campaignName: String(getCol(r, ['campaign_name', 'nome_da_campanha']) || '').trim(),
            target,
            matchType: String(getCol(r, ['match_type', 'tipo_de_correspondencia']) || 'BROAD').trim(),
            impressions,
            clicks,
            spend,
            orders,
            sales,
            ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
            cpc: clicks > 0 ? spend / clicks : 0,
            acos: sales > 0 ? (spend / sales) * 100 : 0,
            roas: spend > 0 ? sales / spend : 0,
          } as AdsTargetRow;
        })
        .filter(Boolean);
    }

    case 'ads_advertised_products': {
      return rows
        .map((r) => {
          const sku = String(getCol(r, ['advertised_sku', 'sku_anunciado', 'sku']) || '').trim();
          const asin = String(getCol(r, ['advertised_asin', 'asin_anunciado', 'asin']) || '').trim();
          if (!sku && !asin) return null;
          const spend = getColNumber(r, ['spend', 'gastos', 'gasto', 'custo'], 'currency') ?? 0;
          const sales = getColNumber(r, ['7_day_total_sales', '14_day_total_sales', 'sales', 'vendas'], 'currency') ?? 0;
          const clicks = getColNumber(r, ['clicks', 'cliques'], 'integer') ?? 0;
          const impressions = getColNumber(r, ['impressions', 'impressoes'], 'integer') ?? 0;
          const orders = getColNumber(r, ['7_day_total_orders', '14_day_total_orders', 'orders', 'pedidos'], 'integer') ?? 0;

          return {
            campaignName: String(getCol(r, ['campaign_name', 'nome_da_campanha']) || '').trim(),
            sku: sku || asin,
            asin,
            impressions,
            clicks,
            spend,
            orders,
            sales,
            acos: sales > 0 ? (spend / sales) * 100 : 0,
          } as AdsAdvertisedProductRow;
        })
        .filter(Boolean);
    }

    case 'settlement_cogs': {
      return rows
        .map((r) => {
          const sku = String(getCol(r, ['sku', 'codigo_sku', 'seller_sku']) || '').trim();
          if (!sku) return null;
          const cogs = getColNumber(r, ['cogs', 'custo', 'custo_unitario', 'custo_do_produto'], 'currency') ?? 0;
          return {
            sku,
            cogs,
            hasCogsProvided: cogs > 0,
          } as any;
        })
        .filter(Boolean);
    }

    case 'commission_preview': {
      return rows
        .map((r) => {
          const sku = String(getCol(r, ['sku', 'seller_sku', 'codigo_sku', 'sku_do_vendedor', 'item_sku']) || '').trim();
          const asin = String(getCol(r, ['asin', 'codigo_asin', 'asin_do_item']) || '').trim();
          if (!sku && !asin) return null;
          
          const precoPublicado = getColNumber(r, ['preco_publicado', 'preco_de_venda', 'preco_da_oferta', 'price', 'your_price', 'preco_do_produto', 'preco_oferta'], 'currency') ?? 0;
          const comissaoEstimadaUnidade = getColNumber(r, ['comissao_estimada', 'estimated_commission', 'comissao_estimada_por_unidade', 'fee_estimate', 'estimated_fee', 'comissao_estimada_unidade', 'comissao_unidade'], 'currency') ?? 0;
          const percentualComissaoEfetivo = getColNumber(r, ['percentual_comissao', 'percentual_comissao_efetivo', 'commission_rate', 'referral_fee_percentage', 'fee_percentage', 'taxa_comissao', 'taxa_de_comissao'], 'percentage') ?? 0;
          const categoriaAmazon = String(getCol(r, ['categoria_amazon', 'product_category', 'categoria', 'category', 'categoria_do_produto']) || '').trim();
          const comissaoMinima = getColNumber(r, ['comissao_minima', 'minimum_fee', 'referral_fee_minimum', 'fee_minimum_brl', 'comissao_minima_unitaria'], 'currency') ?? 1.0;

          return {
            sku: sku || asin,
            asin,
            precoPublicado,
            comissaoEstimadaUnidade,
            percentualComissaoEfetivo,
            categoriaAmazon,
            comissaoMinima,
          } as AmazonCommissionPreviewRow;
        })
        .filter(Boolean);
    }

    case 'rentabilidade_real': {
      return rows
        .map((r) => {
          const sku = String(getCol(r, ['sku', 'codigo_sku', 'seller_sku', 'item_sku']) || '').trim();
          const asin = String(getCol(r, ['asin', 'codigo_asin', 'asin_do_item']) || '').trim();
          if (!sku && !asin) return null;

          // 1. Vendas Brutas e Volumes
          const vendasBrutasTotal = parseNumber(getCol(r, [
            'vendas_total_de_vendas_receita',
            'vendas_total_de_vendas',
            'total_de_vendas_receita',
            'vendas_brutas',
            'faturamento_bruto',
            'vendas',
          ]), 0);

          const unidadesVendidas = parseNumber(getCol(r, [
            'vendas_total_de_unidades_vendidas',
            'total_de_unidades_vendidas',
            'unidades_vendidas',
            'unidades_cobradas',
            'unidades',
          ]), 1) || 1;

          const unidadesReembolsadas = parseNumber(getCol(r, [
            'vendas_unidades_reembolsadas',
            'unidades_reembolsadas',
            'devolucoes_unidades',
          ]), 0);

          const unidadesLiquidasVendidas = Math.max(0, unidadesVendidas - unidadesReembolsadas);
          const precoMedioVenda = unidadesVendidas > 0 ? vendasBrutasTotal / unidadesVendidas : vendasBrutasTotal;
          const vendasBrutasUnitaria = precoMedioVenda;

          // 2. Receita Líquida (Liberada pela Amazon após tarifas primárias)
          const receitaLiquidaTotal = parseNumber(getCol(r, [
            'receita_liquida_total',
            'receita_liquida',
            'receit_liquida',
            'net_revenue_total',
            'net_revenue',
          ]), 0);
          const receitaLiquidaUnitaria = unidadesVendidas > 0 ? receitaLiquidaTotal / unidadesVendidas : receitaLiquidaTotal;

          // 3. Logística
          const custoLogisticaTotal = parseNumber(getCol(r, [
            'custo_de_logistica_total',
            'custo_logistica_total',
            'custo_de_logistica',
            'custo_logistica',
          ]), 0);
          const tarifaFbaTotal = parseNumber(getCol(r, [
            'tarifas_de_logistica_do_fba_logistica_da_amazon_total',
            'tarifas_do_fba_logistica_da_amazon_total',
            'tarifa_fba_total',
            'tarifa_fba',
          ]), 0);
          const tarifaDbaTotal = custoLogisticaTotal > tarifaFbaTotal ? custoLogisticaTotal - tarifaFbaTotal : 0;

          // 4. Comissão e Tarifas de Venda (Prevenir dupla dedução de tarifa!)
          const comissaoTotal = parseNumber(getCol(r, [
            'comissao_total',
            'commission_total',
            'tarifas_de_venda_comissao_total',
            'comissao',
          ]), 0);
          const tarifaVendaTotal = parseNumber(getCol(r, [
            'tarifas_de_venda_total',
            'tarifa_de_venda_total',
            'tarifa_venda_total',
            'tarifa_venda',
          ]), 0);

          const comissaoEfetiva = comissaoTotal > 0 ? comissaoTotal : tarifaVendaTotal;
          const tarifaVendaEfetiva = Math.max(tarifaVendaTotal, comissaoTotal);
          const outrasTarifasVendaNaoComissao = tarifaVendaEfetiva > comissaoEfetiva ? tarifaVendaEfetiva - comissaoEfetiva : 0;

          // 5. Armazenamento e Devoluções
          const tarifaArmazenagemTotal = parseNumber(getCol(r, [
            'custo_de_armazenamento_total',
            'custo_de_armazenamento_tarifas_mensais_de_armazenagem_de_inventario_total',
            'armazenagem_total',
            'tarifa_armazenagem_total',
            'armazenamento_total',
            'custo_de_armazenamento',
          ]), 0);

          const tarifaReembolsoTotal = parseNumber(getCol(r, [
            'operacoes_de_devolucao_e_recuperacao_total',
            'operacoes_de_devolucao_e_recuperacao',
            'operacoes_de_devolucao_total',
            'tarifa_reembolso_total',
            'devolucoes_total',
          ]), 0);

          // 6. Publicidade
          const custoAdsTotal = parseNumber(getCol(r, [
            'custo_de_vendas_por_anuncio_total',
            'custo_de_vendas_por_anuncio',
            'custo_ads_total',
            'custo_ads',
          ]), 0);

          const custoAdsSponsoredProductsTotal = parseNumber(getCol(r, [
            'cobrancas_de_sponsored_products_total',
            'cobrancas_de_sponsored_products',
            'sponsored_products_total',
            'sponsored_products',
          ]), custoAdsTotal);

          const adsParaDeduzir = custoAdsSponsoredProductsTotal || custoAdsTotal;

          // 7. Tarifas adicionais
          const tarifaRemocaoTotal = parseNumber(getCol(r, ['tarifa_remocao_total', 'remocao_total']), 0);
          const tarifaDescarteTotal = parseNumber(getCol(r, ['tarifa_descarte_total', 'descarte_total']), 0);
          const tarifaCupomTotal = parseNumber(getCol(r, ['tarifa_cupom_total', 'cupons_total']), 0);
          const tarifaPromocaoTotal = parseNumber(getCol(r, ['tarifa_promocao_total', 'promocoes_total']), 0);
          const outrosAjustesTotal = parseNumber(getCol(r, ['outros_ajustes_total', 'outras_cobrancas']), 0);

          // Custo total Amazon = Comissão + Logística + Tarifas de venda + Armazenagem + Devoluções + Remoção + Cupons + Ads + Outras cobranças
          const custoAmazonTotal =
            comissaoEfetiva +
            outrasTarifasVendaNaoComissao +
            custoLogisticaTotal +
            tarifaArmazenagemTotal +
            tarifaReembolsoTotal +
            tarifaRemocaoTotal +
            tarifaDescarteTotal +
            tarifaCupomTotal +
            tarifaPromocaoTotal +
            adsParaDeduzir +
            outrosAjustesTotal;

          // 8. COGS (Custo das mercadorias vendidas)
          const cogsTotalRaw = parseNumberStrict(getCol(r, [
            'custo_das_mercadorias_vendidas_fornecido_pelo_vendedor_total',
            'custo_das_mercadorias_vendidas_total',
            'cogs_total',
          ]));

          const cogsUnitarioRaw = parseNumberStrict(getCol(r, [
            'custo_das_mercadorias_vendidas_fornecido_pelo_vendedor_por_unidade',
            'custo_das_mercadorias_vendidas_por_unidade',
            'cogs_por_unidade',
            'cogs_unitario',
          ]));

          const cogsGenericRaw = parseNumberStrict(getCol(r, [
            'custo_das_mercadorias_vendidas_fornecido_pelo_vendedor',
            'custo_das_mercadorias_vendidas',
            'cogs',
            'custo_do_produto',
          ]));

          let cogsTotal = 0;
          let cogsUnitario = 0;

          if (cogsTotalRaw !== null && cogsTotalRaw > 0) {
            cogsTotal = cogsTotalRaw;
            cogsUnitario = cogsUnitarioRaw !== null && cogsUnitarioRaw > 0
              ? cogsUnitarioRaw
              : (unidadesVendidas > 0 ? cogsTotal / unidadesVendidas : cogsTotal);
          } else if (cogsUnitarioRaw !== null && cogsUnitarioRaw > 0) {
            cogsUnitario = cogsUnitarioRaw;
            cogsTotal = cogsUnitario * unidadesVendidas;
          } else if (cogsGenericRaw !== null && cogsGenericRaw > 0) {
            if (unidadesVendidas > 1 && cogsGenericRaw > precoMedioVenda && cogsGenericRaw <= vendasBrutasTotal * 1.1) {
              cogsTotal = cogsGenericRaw;
              cogsUnitario = cogsTotal / unidadesVendidas;
            } else {
              cogsUnitario = cogsGenericRaw;
              cogsTotal = cogsUnitario * unidadesVendidas;
            }
          }

          // 9. Custos Externos
          const custoEmbalagemTotal = parseNumber(getCol(r, ['custo_embalagem_total', 'embalagem_total', 'custo_embalagem', 'embalagem']), 0);
          const custoEmbalagemUnitario = unidadesVendidas > 0 ? custoEmbalagemTotal / unidadesVendidas : custoEmbalagemTotal;

          const impostosTotal = parseNumber(getCol(r, ['impostos_total', 'impostos', 'imposto', 'tax_total', 'tributos']), 0);
          const impostosUnitario = unidadesVendidas > 0 ? impostosTotal / unidadesVendidas : impostosTotal;

          const freteAbastecimentoTotal = parseNumber(getCol(r, ['frete_abastecimento_total', 'frete_abastecimento', 'frete_entrada']), 0);
          const custosExternosTotal = parseNumber(getCol(r, ['custos_externos_total', 'custos_externos', 'outros_custos_externos']), 0);

          // 10. Fórmulas Obrigatórias
          // Resultado antes do COGS = Receita líquida − Custo Ads − Custos externos não incluídos
          const resultadoAntesCogs = receitaLiquidaTotal - adsParaDeduzir - custosExternosTotal;

          // Margem de contribuição = (Receita líquida − Ads − Custos externos) / Vendas brutas
          const margemContribuicao = vendasBrutasTotal > 0
            ? ((receitaLiquidaTotal - adsParaDeduzir - custosExternosTotal) / vendasBrutasTotal) * 100
            : 0;

          // Lucro líquido = Receita líquida − COGS − Embalagem − Impostos − Frete de abastecimento − Custos externos
          const hasCogs = cogsTotal > 0 || cogsUnitario > 0;
          const lucroLiquidoEstimado = hasCogs
            ? (receitaLiquidaTotal - cogsTotal - custoEmbalagemTotal - impostosTotal - freteAbastecimentoTotal - custosExternosTotal)
            : 0;

          // Margem líquida = Lucro líquido / Vendas brutas
          const margemLiquida = hasCogs && vendasBrutasTotal > 0
            ? (lucroLiquidoEstimado / vendasBrutasTotal) * 100
            : 0;

          // Break-even ACoS = (Receita líquida − COGS − Embalagem − Impostos − Frete de abastecimento) / Vendas brutas
          const breakEvenAcos = (hasCogs && vendasBrutasTotal > 0)
            ? ((receitaLiquidaTotal - cogsTotal - custoEmbalagemTotal - impostosTotal - freteAbastecimentoTotal) / vendasBrutasTotal) * 100
            : null;

          const statusConfiabilidade = hasCogs ? 'concluido' : 'pendente_cogs';

          return {
            sku: sku || asin,
            asin,
            nomeProduto: String(getCol(r, ['nome_do_produto', 'nome_produto', 'product_name', 'titulo', 'title']) || '').trim(),
            marca: String(getCol(r, ['marca', 'brand', 'fabricante']) || 'By Porto').trim(),

            receitaLiquidaTotal,
            receitaLiquidaUnitaria,
            vendasBrutasTotal,
            vendasBrutasUnitaria,
            precoMedioVenda,
            unidadesCobradas: unidadesVendidas,
            unidadesVendidas,
            unidadesReembolsadas,
            unidadesLiquidasVendidas,
            indiceDevolucao: unidadesVendidas > 0 ? (unidadesReembolsadas / unidadesVendidas) * 100 : 0,

            custoLogisticaTotal,
            custoLogisticaUnitario: unidadesVendidas > 0 ? custoLogisticaTotal / unidadesVendidas : custoLogisticaTotal,
            tarifaFbaTotal,
            tarifaFbaUnitaria: unidadesVendidas > 0 ? tarifaFbaTotal / unidadesVendidas : tarifaFbaTotal,
            tarifaDbaTotal,
            tarifaDbaUnitaria: unidadesVendidas > 0 ? tarifaDbaTotal / unidadesVendidas : tarifaDbaTotal,
            comissaoTotal: comissaoEfetiva,
            comissaoUnitaria: unidadesVendidas > 0 ? comissaoEfetiva / unidadesVendidas : comissaoEfetiva,
            tarifaVendaTotal: tarifaVendaEfetiva,
            tarifaVendaUnitaria: unidadesVendidas > 0 ? tarifaVendaEfetiva / unidadesVendidas : tarifaVendaEfetiva,
            tarifaItemTotal: 0,
            tarifaArmazenagemTotal,
            tarifaBaixoInventarioTotal: 0,
            tarifaRemocaoTotal,
            tarifaDescarteTotal,
            tarifaReembolsoTotal,
            tarifaCupomTotal,
            tarifaPromocaoTotal,
            custoAdsTotal,
            custoAdsUnitario: unidadesVendidas > 0 ? custoAdsTotal / unidadesVendidas : custoAdsTotal,
            custoAdsSponsoredProductsTotal,
            outrosAjustesTotal,

            cogsTotal,
            cogsUnitario,
            custoEmbalagemTotal,
            custoEmbalagemUnitario,
            impostosTotal,
            impostosUnitario,
            freteAbastecimentoTotal,
            custosExternosTotal,

            custoAmazonTotal,
            resultadoAntesCogs,
            lucroLiquidoEstimado,
            margemContribuicao,
            margemLiquida,
            breakEvenAcos,
            statusConfiabilidade,
            arquivoOrigem: fileName,
            periodoInicio: '',
            periodoFim: '',
          } as RentabilidadeRealRow;
        })
        .filter(Boolean);
    }

    default:
      return rows;
  }
}

// Consolidates Amazon Ads campaigns by campaignName (aggregates multi-day exports and merges budget data)
export function consolidateCampaigns(campaignList: AdsCampaignRow[]): AdsCampaignRow[] {
  if (!campaignList || campaignList.length === 0) return [];
  const map = new Map<string, AdsCampaignRow>();

  for (const c of campaignList) {
    const name = String(c.campaignName || '').trim();
    if (!name) continue;

    const existing = map.get(name);
    if (!existing) {
      map.set(name, { ...c, campaignName: name });
    } else {
      const spend = existing.spend + (c.spend || 0);
      const sales = existing.sales + (c.sales || 0);
      const orders = existing.orders + (c.orders || 0);
      const clicks = existing.clicks + (c.clicks || 0);
      const impressions = existing.impressions + (c.impressions || 0);
      // Prefer enabled status if any row has it
      const status =
        existing.status.toUpperCase() === 'ENABLED' || c.status.toUpperCase() === 'ENABLED'
          ? 'ENABLED'
          : c.status || existing.status;
      // Budget: take max budget observed (> 0) or null if both null/undefined
      const b1 = existing.budget !== undefined ? existing.budget : null;
      const b2 = c.budget !== undefined ? c.budget : null;

      let budget: number | null = null;
      if (b1 === null && b2 === null) {
        budget = null;
      } else if (b1 === null) {
        budget = b2;
      } else if (b2 === null) {
        budget = b1;
      } else {
        budget = Math.max(b1, b2);
      }
      const budgetUtilization = Math.max(existing.budgetUtilization || 0, c.budgetUtilization || 0);

      const acos = calculateAcos(spend, sales);
      const roas = calculateRoas(spend, sales);

      map.set(name, {
        campaignName: name,
        status,
        budget,
        impressions,
        clicks,
        spend,
        orders,
        sales,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        acos,
        roas,
        budgetUtilization: budgetUtilization > 0 ? budgetUtilization : undefined,
      });
    }
  }

  return Array.from(map.values());
}

// Synthesizes campaign-level rows when only Search Terms, Advertised Products, or Targeting reports were uploaded
export function deriveCampaignsFromAdsData(
  searchTerms: AdsSearchTermRow[] = [],
  advertisedProducts: AdsAdvertisedProductRow[] = [],
  targets: AdsTargetRow[] = []
): AdsCampaignRow[] {
  const map = new Map<string, AdsCampaignRow>();

  // Determine which source to use to avoid duplicate metric summation across disparate reports
  const primarySource: { campaignName: string; spend?: number; sales?: number; orders?: number; clicks?: number; impressions?: number }[] =
    (searchTerms && searchTerms.length > 0)
      ? searchTerms
      : (advertisedProducts && advertisedProducts.length > 0)
      ? advertisedProducts
      : (targets && targets.length > 0)
      ? targets
      : [];

  for (const item of primarySource) {
    const rawName = String(item.campaignName || '').trim();
    if (!rawName) continue;

    const existing = map.get(rawName);
    const spend = Number(item.spend || 0);
    const sales = Number(item.sales || 0);
    const orders = Number(item.orders || 0);
    const clicks = Number(item.clicks || 0);
    const impressions = Number(item.impressions || 0);

    if (!existing) {
      map.set(rawName, {
        campaignName: rawName,
        status: 'ENABLED',
        budget: null,
        impressions,
        clicks,
        spend,
        orders,
        sales,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        acos: calculateAcos(spend, sales),
        roas: calculateRoas(spend, sales),
      });
    } else {
      existing.spend += spend;
      existing.sales += sales;
      existing.orders += orders;
      existing.clicks += clicks;
      existing.impressions += impressions;
      existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
      existing.cpc = existing.clicks > 0 ? existing.spend / existing.clicks : 0;
      existing.acos = calculateAcos(existing.spend, existing.sales);
      existing.roas = calculateRoas(existing.spend, existing.sales);
    }
  }

  return Array.from(map.values());
}

// Create an initial clean, empty dataset on first launch
export function createEmptyDataset(accountName = 'Conta Principal / Loja Alpha'): ParsedDataset {
  return {
    sessionConfig: {
      accountName,
      timezone: 'America/Sao_Paulo',
      startDate: '',
      endDate: '',
      currency: 'BRL',
      primaryAdsSource: 'campaigns',
      recalculatedAt: new Date().toISOString(),
      consentSavePreferences: false,
    },
    businessDays: [],
    businessSkus: [],
    orders: [],
    campaigns: [],
    searchTerms: [],
    targets: [],
    advertisedProducts: [],
    cogsList: [],
    commissionPreview: [],
    rentabilidadeReal: [],
    auditFiles: [],
  };
}
