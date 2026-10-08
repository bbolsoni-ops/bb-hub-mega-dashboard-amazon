import {
  ParsedDataset,
  ReconciledMetrics,
  SkuUnitEconomics,
  ActionPlanItem,
} from '../types/amazon';
import { generateBudgetInsights } from './adsBudgetInsights';

export interface StandaloneExportData {
  dataset: ParsedDataset;
  metrics: ReconciledMetrics;
  skusWithEconomics: SkuUnitEconomics[];
  actionPlan: ActionPlanItem[];
  highRiskTerms: {
    term: string;
    campaign: string;
    clicks: number;
    spend: number;
    sales: number;
    reason: string;
  }[];
  generatedAt: string;
}

export function generateStandaloneHtml(data: StandaloneExportData): string {
  const jsonPayload = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  const formatBRL = (v: number | null | undefined) => {
    if (v === null || v === undefined) return 'Não informado';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  const formatNum = (v: number) => (v || 0).toLocaleString('pt-BR');
  const formatPct = (v: number | null | undefined) => {
    if (v === null || v === undefined) return '—';
    return `${v.toFixed(2)}%`;
  };
  const budgetInsights = generateBudgetInsights(data.dataset.campaigns || [], 15.0);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BB Hub | Gestão de Contas Amazon — Relatório Consolidado Offline</title>
  <style>
    /* Reset & Base */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px; background-color: #0c1424; color: #f1f5f9; }
    body { min-height: 100vh; display: flex; flex-direction: column; }
    
    /* Utility & Components */
    .header { background: #111c30; border-bottom: 1px solid #243554; padding: 1rem 1.5rem; position: sticky; top: 0; z-index: 50; }
    .header-content { max-width: 1400px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; }
    .brand { display: flex; align-items: center; gap: 0.85rem; }
    .brand-badge { width: 44px; height: 44px; background: #0f172a; border: 2px solid #06b6d4; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.25rem; color: #22d3ee; }
    .brand-title { font-size: 1.35rem; font-weight: 900; color: #ffffff; letter-spacing: -0.02em; }
    .brand-sub { font-size: 0.75rem; color: #67e8f9; font-weight: 600; }
    
    .nav-bar { background: #090e18; border-bottom: 1px solid #243554; overflow-x: auto; white-space: nowrap; }
    .nav-content { max-width: 1400px; margin: 0 auto; display: flex; gap: 0.5rem; padding: 0.5rem 1.5rem; }
    .tab-btn { background: transparent; border: none; color: #94a3b8; font-weight: 700; font-size: 0.825rem; padding: 0.6rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
    .tab-btn:hover { color: #ffffff; background: #1e293b; }
    .tab-btn.active { color: #22d3ee; background: rgba(6, 182, 212, 0.15); border-bottom: 2px solid #06b6d4; }

    .main { flex: 1; max-width: 1400px; width: 100%; margin: 0 auto; padding: 1.5rem; }
    .card { background: #152238; border: 1px solid #243554; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25); }
    .card-title { font-size: 1.15rem; font-weight: 800; color: #ffffff; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; }

    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: #0f1a2d; border: 1px solid #1e2f4a; border-radius: 12px; padding: 1.25rem; }
    .kpi-label { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }
    .kpi-val { font-size: 1.85rem; font-weight: 900; color: #ffffff; margin: 0.4rem 0; font-family: monospace; }
    .kpi-meta { font-size: 0.75rem; color: #cbd5e1; }

    /* Tables */
    .table-responsive { width: 100%; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; }
    th { background: #0f1a2d; color: #94a3b8; font-weight: 800; text-transform: uppercase; font-size: 0.725rem; padding: 0.85rem 1rem; border-bottom: 1px solid #243554; }
    td { padding: 0.85rem 1rem; border-bottom: 1px solid #1e2f4a; color: #e2e8f0; }
    tr:hover td { background: #1a2942; }

    /* Badges */
    .badge { display: inline-block; padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; border: 1px solid transparent; }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3); }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }
    .badge-rose { background: rgba(244, 63, 94, 0.15); color: #fb7185; border-color: rgba(244, 63, 94, 0.3); }
    .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3); }

    .btn { background: #0284c7; color: white; border: none; font-weight: 700; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.825rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; }
    .btn:hover { background: #0369a1; }
    .btn-emerald { background: #059669; }
    .btn-emerald:hover { background: #047857; }

    /* Print styles */
    @media print {
      body { background: white !important; color: black !important; font-size: 10pt !important; }
      .header, .nav-bar, .no-print, button { display: none !important; }
      .card { background: white !important; color: black !important; border: 1px solid #ccc !important; box-shadow: none !important; page-break-inside: avoid; }
      .kpi-card { background: #f8fafc !important; color: black !important; border: 1px solid #ccc !important; }
      .kpi-val { color: black !important; }
      th { background: #f1f5f9 !important; color: black !important; border: 1px solid #ccc !important; }
      td { color: black !important; border: 1px solid #ccc !important; }
    }
  </style>
</head>
<body>
  <!-- Top App Bar -->
  <header class="header">
    <div class="header-content">
      <div class="brand">
        <div class="brand-badge">BB</div>
        <div>
          <div class="brand-title">BB Hub | Gestão de Contas Amazon</div>
          <div class="brand-sub">Relatório Consolidado 100% Client-Side • Abertura Offline via file://</div>
        </div>
      </div>
      <div style="display: flex; gap: 0.75rem; align-items: center;">
        <span style="font-size: 0.75rem; color: #94a3b8;">Gerado em: <strong style="color: #ffffff;">${data.generatedAt}</strong></span>
        <button class="btn btn-emerald no-print" onclick="window.print()">Imprimir / Salvar PDF</button>
      </div>
    </div>
  </header>

  <!-- Navigation Bar -->
  <nav class="nav-bar no-print">
    <div class="nav-content">
      <button class="tab-btn active" onclick="switchTab('tab-exec')">1. Visão Executiva</button>
      <button class="tab-btn" onclick="switchTab('tab-comm')">2. Comercial & Evolução</button>
      <button class="tab-btn" onclick="switchTab('tab-skus')">3. SKUs & ASINs</button>
      <button class="tab-btn" onclick="switchTab('tab-orders')">4. Pedidos & Logística</button>
      <button class="tab-btn" onclick="switchTab('tab-ads')">5. Ads: Campanhas</button>
      <button class="tab-btn" onclick="switchTab('tab-terms')">6. Ads: Termos de Risco</button>
      <button class="tab-btn" onclick="switchTab('tab-profit')">7. Rentabilidade Unitária</button>
      <button class="tab-btn" onclick="switchTab('tab-action')">8. Plano de Ação</button>
      <button class="tab-btn" onclick="switchTab('tab-audit')">9. Auditoria de Fontes</button>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="main">
    <!-- TAB 1: VISÃO EXECUTIVA -->
    <div id="tab-exec" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>Diagnóstico Executivo Consolidado</span>
          <span class="badge badge-green">${data.dataset.auditFiles.length} Fontes Auditadas</span>
        </div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Faturamento Comercial</div>
            <div class="kpi-val" style="color: #38bdf8;">${formatBRL(data.metrics.businessSales || data.metrics.ordersShippedGross)}</div>
            <div class="kpi-meta">${data.metrics.businessOrders || data.metrics.ordersCountShipped} pedidos faturados</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gasto Consolidado Ads</div>
            <div class="kpi-val" style="color: #fbbf24;">${formatBRL(data.metrics.adsSpend)}</div>
            <div class="kpi-meta">${formatNum(data.metrics.adsClicks)} cliques • CPC: ${formatBRL(data.metrics.adsCpc || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">TACOS da Loja</div>
            <div class="kpi-val" style="color: ${data.metrics.tacos && data.metrics.tacos > 12 ? '#fb7185' : '#34d399'};">
              ${data.metrics.tacos !== null ? formatPct(data.metrics.tacos) : 'N/D'}
            </div>
            <div class="kpi-meta">Meta BB Hub: 6% a 10%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">ACOS Médio</div>
            <div class="kpi-val" style="color: #ffffff;">${data.metrics.adsAcosLabel}</div>
            <div class="kpi-meta">ROAS: ${data.metrics.adsRoasLabel}</div>
          </div>
        </div>

        <div style="background: #0f1a2d; padding: 1rem; border-radius: 12px; border: 1px solid #1e2f4a; font-size: 0.85rem; line-height: 1.6; color: #cbd5e1;">
          <strong style="color: #38bdf8;">Conciliação Metodológica:</strong> Faturamento do Business Report (${formatBRL(data.metrics.businessSales)}) 
          vs Pedidos Enviados/Shipped (${formatBRL(data.metrics.ordersShippedGross)}). 
          Diferença de ${formatBRL(data.metrics.discrepancySales)} (${(data.metrics.discrepancyPercent ?? 0).toFixed(1)}%) decorrente de pedidos pendentes (${formatBRL(data.metrics.ordersPendingGross)}) e cancelamentos.
        </div>
      </div>
    </div>

    <!-- TAB 2: COMERCIAL -->
    <div id="tab-comm" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-title">Evolução Comercial por Período</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th style="text-align: right;">Vendas Encomendadas</th>
                <th style="text-align: right;">Unidades</th>
                <th style="text-align: right;">Sessões</th>
                <th style="text-align: right;">Conversão (%)</th>
                <th style="text-align: right;">Buy Box (%)</th>
              </tr>
            </thead>
            <tbody>
              ${(data.dataset.businessDays || []).map(d => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700;">${d.date}</td>
                  <td style="text-align: right; font-family: monospace;">${formatBRL(d.orderedProductSales)}</td>
                  <td style="text-align: right; font-family: monospace;">${d.unitsOrdered}</td>
                  <td style="text-align: right; font-family: monospace;">${formatNum(d.sessions)}</td>
                  <td style="text-align: right; font-family: monospace;">${formatPct(d.unitSessionPercentage)}</td>
                  <td style="text-align: right; font-family: monospace;">${(d.buyBoxPercentage ?? 0).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: SKUS -->
    <div id="tab-skus" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-title">Curva ABC e Performance por SKU</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>ASIN</th>
                <th style="text-align: right;">PMV</th>
                <th style="text-align: right;">Unidades</th>
                <th style="text-align: right;">Faturamento Bruto</th>
                <th style="text-align: right;">Gasto Ads</th>
                <th style="text-align: right;">Margem Contrib. (%)</th>
              </tr>
            </thead>
            <tbody>
              ${data.skusWithEconomics.slice(0, 30).map(s => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700;">${s.sku}</td>
                  <td style="font-family: monospace; color: #94a3b8;">${s.asin || '-'}</td>
                  <td style="text-align: right; font-family: monospace;">${formatBRL(s.pmv)}</td>
                  <td style="text-align: right; font-family: monospace;">${s.unitsSold}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">${formatBRL(s.grossSales)}</td>
                  <td style="text-align: right; font-family: monospace; color: #fbbf24;">${formatBRL(s.adsSpend)}</td>
                  <td style="text-align: right; font-family: monospace; color: #34d399;">${formatPct(s.contributionMarginPercent)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 4: ORDERS -->
    <div id="tab-orders" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-title">Auditoria de Pedidos & Logística</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Pedidos Enviados (Shipped)</div>
            <div class="kpi-val" style="color: #34d399;">${data.metrics.ordersCountShipped}</div>
            <div class="kpi-meta">${formatBRL(data.metrics.ordersShippedGross)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pedidos Pendentes (Pending)</div>
            <div class="kpi-val" style="color: #fbbf24;">${data.metrics.ordersCountPending}</div>
            <div class="kpi-meta">${formatBRL(data.metrics.ordersPendingGross)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pedidos Cancelados (Canceled)</div>
            <div class="kpi-val" style="color: #fb7185;">${data.metrics.ordersCountCanceled}</div>
            <div class="kpi-meta">${formatBRL(data.metrics.ordersCanceledGross)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 5: ADS CAMPAIGNS -->
    <div id="tab-ads" class="tab-pane" style="display: none;">
      <!-- Quick Budget Insights Prescriptive Card -->
      <div class="card" style="border: 1px solid rgba(245, 158, 11, 0.3); background: #131f33; margin-bottom: 1.5rem;">
        <div class="card-title" style="color: #fbbf24; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <span>⚡ Insights Rápidos de Orçamento Prescritivo (Meta ACoS: 15%)</span>
          <span class="badge badge-amber">Economia Est: ${formatBRL(budgetInsights.potentialMonthlySavings)}/mês</span>
        </div>
        <div style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1rem;">
          Sugestões automáticas baseadas no desempenho real de cada campanha: pause imediatamente sangrias com ACoS abusivo e turbine campanhas de alta conversão.
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
          ${budgetInsights.recommendations.slice(0, 4).map(r => `
            <div style="background: #0b1322; border: 1px solid ${r.actionType === 'PAUSE_CRITICAL' ? 'rgba(244,63,94,0.3)' : r.category === 'scale' ? 'rgba(52,211,153,0.3)' : '#1e2f4a'}; border-radius: 8px; padding: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: #fff; font-size: 0.85rem;">${r.campaignName}</strong>
                <span class="badge ${r.actionType === 'PAUSE_CRITICAL' ? 'badge-rose' : r.category === 'scale' ? 'badge-green' : 'badge-amber'}">${r.actionTitle}</span>
              </div>
              <p style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.5rem;">${r.reason}</p>
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-family: monospace; color: #38bdf8;">
                <span>Atual: ${formatBRL(r.currentBudget)}/dia</span>
                <strong style="color: ${r.suggestedBudget === 0 ? '#fb7185' : '#34d399'};">Sugerido: ${r.suggestedBudget === 0 ? 'Pausar' : formatBRL(r.suggestedBudget) + '/dia'}</strong>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Campanhas de Amazon Ads (Fonte Mestre)</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Status</th>
                <th>Ação Orçamento</th>
                <th style="text-align: right;">Orçamento</th>
                <th style="text-align: right;">Cliques</th>
                <th style="text-align: right;">Gasto</th>
                <th style="text-align: right;">Vendas Ads</th>
                <th style="text-align: right;">ACOS (%)</th>
                <th style="text-align: right;">ROAS</th>
              </tr>
            </thead>
            <tbody>
              ${(data.dataset.campaigns || []).map(c => {
                const rec = budgetInsights.recommendations.find(r => r.campaignName === c.campaignName);
                return `
                <tr>
                  <td style="font-weight: 700;">${c.campaignName}</td>
                  <td><span class="badge ${c.status.toLowerCase().includes('enab') ? 'badge-green' : 'badge-amber'}">${c.status}</span></td>
                  <td>
                    ${rec ? `
                      <span class="badge ${
                        rec.actionType === 'PAUSE_CRITICAL'
                          ? 'badge-rose'
                          : rec.category === 'scale'
                          ? 'badge-green'
                          : 'badge-amber'
                      }">${rec.actionTitle}</span>
                    ` : '-'}
                  </td>
                  <td style="text-align: right; font-family: monospace;">${formatBRL(c.budget)}</td>
                  <td style="text-align: right; font-family: monospace;">${formatNum(c.clicks)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; color: #fbbf24;">${formatBRL(c.spend)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">${formatBRL(c.sales)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 800; color: ${c.acos !== null && c.acos > 20 ? '#fb7185' : '#34d399'};">
                    ${c.sales > 0 && c.acos !== null ? formatPct(c.acos) : 'Sem venda'}
                  </td>
                  <td style="text-align: right; font-family: monospace;">${c.roas !== null && c.roas > 0 ? (c.roas ?? 0).toFixed(2) + 'x' : '-'}</td>
                </tr>
              `;}).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 6: HIGH RISK TERMS -->
    <div id="tab-terms" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-title">Termos de Busca de Alto Risco (Gasto sob Investigação)</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Termo de Pesquisa</th>
                <th>Campanha</th>
                <th style="text-align: right;">Cliques</th>
                <th style="text-align: right;">Gasto</th>
                <th>Diagnóstico & Ação Recomendada</th>
              </tr>
            </thead>
            <tbody>
              ${data.highRiskTerms.map(t => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700;">${t.term}</td>
                  <td style="color: #94a3b8;">${t.campaign}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700;">${t.clicks}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 800; color: #fb7185;">${formatBRL(t.spend)}</td>
                  <td style="color: #fca5a5;">${t.reason} — <strong>Negativar Termo</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 7: RENTABILIDADE -->
    <div id="tab-profit" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-title">Rentabilidade & Unit Economics por SKU</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th style="text-align: right;">PMV</th>
                <th style="text-align: right;">COGS</th>
                <th style="text-align: right;">Comissão</th>
                <th style="text-align: right;">Logística</th>
                <th style="text-align: right;">Margem Contrib.</th>
                <th style="text-align: right;">Breakeven ACOS</th>
              </tr>
            </thead>
            <tbody>
              ${data.skusWithEconomics.slice(0, 30).map(s => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700;">${s.sku}</td>
                  <td style="text-align: right; font-family: monospace;">${formatBRL(s.pmv)}</td>
                  <td style="text-align: right; font-family: monospace;">${s.hasCogsProvided ? formatBRL(s.cogs) : 'N/D'}</td>
                  <td style="text-align: right; font-family: monospace;">${formatBRL(s.commissionAmount)} (${(s.commissionPercent ?? 0).toFixed(1)}%)</td>
                  <td style="text-align: right; font-family: monospace;">${formatBRL(s.logisticsFeeUnit)} (${s.logisticsChannel})</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 700; color: #34d399;">${formatPct(s.contributionMarginPercent)}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 800; color: #38bdf8;">
                    ${s.breakevenAcos !== null ? formatPct(s.breakevenAcos) : 'N/D (Sem COGS)'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 8: ACTION PLAN -->
    <div id="tab-action" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-title">Plano de Ação Estratégico Priorizado</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Regra & Prioridade</th>
                <th>Alvo</th>
                <th>Problema & Evidência</th>
                <th>Ação Recomendada</th>
                <th>Impacto Estimado</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              ${data.actionPlan.map(a => `
                <tr>
                  <td>
                    <span class="badge ${a.priority === 'CRÍTICA' ? 'badge-rose' : a.priority === 'ALTA' ? 'badge-amber' : 'badge-blue'}">${a.priority}</span>
                    <div style="font-family: monospace; font-size: 0.65rem; color: #94a3b8; margin-top: 4px;">${a.ruleCode}</div>
                  </td>
                  <td style="font-weight: 700;">${a.targetIdentifier}</td>
                  <td style="font-size: 0.8rem; line-height: 1.4; color: #cbd5e1;">${a.problem}<br><small style="color: #94a3b8;">${a.numericalEvidence}</small></td>
                  <td style="font-size: 0.8rem; line-height: 1.4; color: #ffffff;">${a.suggestedAction}<br><small style="color: #fca5a5;">${a.actionRisk}</small></td>
                  <td style="font-weight: 700; color: #34d399;">${a.estimatedImpact}</td>
                  <td style="font-family: monospace; font-size: 0.75rem;">${a.timeframe}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 9: AUDIT -->
    <div id="tab-audit" class="tab-pane" style="display: none;">
      <div class="card">
        <div class="card-title">Inventário de Fontes e Metodologia de Reconciliação</div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Tipo Identificado</th>
                <th style="text-align: right;">Linhas</th>
                <th>Granularidade</th>
                <th>Uso Oficial</th>
                <th>Limitações e Cuidados</th>
              </tr>
            </thead>
            <tbody>
              ${data.dataset.auditFiles.map(f => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700;">${f.name}</td>
                  <td><span class="badge badge-blue">${f.typeLabel}</span></td>
                  <td style="text-align: right; font-family: monospace;">${formatNum(f.rowCount)}</td>
                  <td>${f.granularity}</td>
                  <td style="color: #cbd5e1;">${f.officialUse}</td>
                  <td style="color: #94a3b8;">${f.limitations}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>

  <script>
    // Embedded Vanilla JavaScript - Zero CDN, Zero Network, Works 100% via file://
    window.__BB_HUB_DATA__ = ${jsonPayload};

    function switchTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById(tabId);
      if (activeEl) activeEl.style.display = 'block';
      event.target.classList.add('active');
    }
  </script>
</body>
</html>`;
}

export function downloadStandaloneHtml(data: StandaloneExportData): void {
  const htmlContent = generateStandaloneHtml(data);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeDate = new Date().toISOString().slice(0, 10);
  a.download = `BB_Hub_Gestao_Amazon_Offline_${safeDate}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
