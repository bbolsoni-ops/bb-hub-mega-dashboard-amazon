import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ParsedDataset,
  ReconciledMetrics,
  SkuUnitEconomics,
  ActionPlanItem,
} from '../types/amazon';
import { calculateMonthOverMonth } from './monthOverMonth';

export interface ConsolidatedPdfReportData {
  dataset: ParsedDataset;
  metrics: ReconciledMetrics;
  skusWithEconomics: SkuUnitEconomics[];
  actionPlan: ActionPlanItem[];
  highRiskTerms?: {
    term: string;
    campaign: string;
    clicks: number;
    spend: number;
    sales: number;
    reason: string;
  }[];
  isDemoMode?: boolean;
  generatedAt?: string;
}

export interface GeneratePdfOptions {
  reportData: ConsolidatedPdfReportData;
  filename?: string;
  mode?: 'vector' | 'canvas';
  element?: HTMLElement | null;
  onProgress?: (progress: number, message: string) => void;
}

// ============================================================================
// FORMATTING UTILITIES (Strict pt-BR)
// ============================================================================

const formatBRL = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatNum = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('pt-BR');
};

const formatPct = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/D';
  return `${val.toFixed(2).replace('.', ',')}%`;
};

const formatRoas = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/D';
  return `${val.toFixed(2).replace('.', ',')}x`;
};

const safeToFixed = (val: number | null | undefined, decimals = 2): string => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return val.toFixed(decimals);
};

const standardizeDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const clean = String(dateStr).trim().split('T')[0];
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return clean;
};

/**
 * Universal Canvas Rounded Rectangle helper (works across all browsers, never throws)
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill = true,
  stroke = false
) {
  if (width <= 0 || height <= 0) return;
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// ============================================================================
// HIGH-RESOLUTION CANVAS CHART GENERATORS (2x / 3x Retina Crisp Quality)
// ============================================================================

/**
 * Chart 1: Daily Evolution Line Chart (Real Sales & Orders from Dashboard State)
 * Tuned with matching aspect ratio for A4 Landscape PDF box (132mm x 127mm)
 */
function renderDailyEvolutionCanvas(
  dailyData: { date: string; label: string; sales: number; orders: number }[],
  width = 1320,
  height = 1270
): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border & container card
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px Helvetica, Arial, sans-serif';
  ctx.fillText('EVOLUÇÃO TEMPORAL DIÁRIA', 50, 60);

  ctx.fillStyle = '#64748b';
  ctx.font = '19px Helvetica, Arial, sans-serif';
  ctx.fillText('Faturamento (R$) e Volume de Pedidos no período selecionado', 50, 94);

  // Legend
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(width - 440, 48, 26, 14);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.fillText('Faturamento (R$)', width - 404, 60);

  ctx.fillStyle = '#d97706';
  ctx.fillRect(width - 210, 48, 26, 14);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
  ctx.fillText('Pedidos', width - 174, 60);

  if (!dailyData || dailyData.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem dados diários disponíveis para o período selecionado', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  // Plot Area
  const padLeft = 140;
  const padRight = 50;
  const padTop = 140;
  const padBottom = 100;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxSales = Math.max(10, ...dailyData.map((d) => d.sales));
  const mag = Math.pow(10, Math.max(1, Math.floor(Math.log10(maxSales))));
  const niceMaxSales = Math.ceil(maxSales / mag) * mag;

  const maxOrders = Math.max(2, ...dailyData.map((d) => d.orders));
  const niceMaxOrders = Math.ceil(maxOrders / 5) * 5;

  // Grid lines (5 horizontal levels)
  const gridLines = 5;
  ctx.textAlign = 'right';
  ctx.font = '18px Helvetica, Arial, sans-serif';
  for (let i = 0; i <= gridLines; i++) {
    const yVal = niceMaxSales * (i / gridLines);
    const yPos = padTop + plotH - (i / gridLines) * plotH;

    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = i === 0 ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, yPos);
    ctx.lineTo(padLeft + plotW, yPos);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.fillText(
      yVal >= 1000
        ? `R$ ${(yVal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`
        : `R$ ${Math.round(yVal)}`,
      padLeft - 16,
      yPos + 6
    );
  }

  // Coordinates
  const n = dailyData.length;
  const stepX = n > 1 ? plotW / (n - 1) : plotW / 2;
  const points = dailyData.map((d, idx) => {
    const x = padLeft + (n > 1 ? idx * stepX : plotW / 2);
    const ySales = padTop + plotH - (niceMaxSales > 0 ? (d.sales / niceMaxSales) * plotH : 0);
    const yOrders = padTop + plotH - (niceMaxOrders > 0 ? (d.orders / niceMaxOrders) * plotH : 0);
    return { x, ySales, yOrders, d };
  });

  // 1. Fill Area under sales curve
  ctx.beginPath();
  ctx.moveTo(points[0].x, padTop + plotH);
  points.forEach((pt) => ctx.lineTo(pt.x, pt.ySales));
  ctx.lineTo(points[points.length - 1].x, padTop + plotH);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
  areaGrad.addColorStop(0, 'rgba(37, 99, 235, 0.26)');
  areaGrad.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // 2. Sales Line
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.ySales);
    else ctx.lineTo(pt.x, pt.ySales);
  });
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 3. Orders Line (Dashed)
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt.x, pt.yOrders);
    else ctx.lineTo(pt.x, pt.yOrders);
  });
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // 4. Circular dots
  points.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.ySales, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pt.x, pt.yOrders, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();
  });

  // 5. X-Axis labels
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '17px Helvetica, Arial, sans-serif';
  const labelInterval = Math.max(1, Math.ceil(n / 10));
  points.forEach((pt, idx) => {
    if (idx % labelInterval === 0 || idx === n - 1) {
      ctx.fillText(pt.d.label, pt.x, padTop + plotH + 30);
    }
  });

  return canvas.toDataURL('image/png');
}

/**
 * Chart 2: Top Products Horizontal Bar Chart (Real Products from Dashboard State)
 * Tuned with matching aspect ratio for A4 Landscape PDF box (132mm x 127mm)
 */
function renderTopProductsCanvas(
  products: { title: string; sku: string; units: number; sales: number }[],
  totalSales: number,
  width = 1320,
  height = 1270
): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px Helvetica, Arial, sans-serif';
  ctx.fillText('TOP PRODUTOS EM FATURAMENTO', 50, 60);

  ctx.fillStyle = '#64748b';
  ctx.font = '19px Helvetica, Arial, sans-serif';
  ctx.fillText('Itens com maior participação na receita bruta da conta', 50, 94);

  if (!products || products.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem dados disponíveis para o período selecionado', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  const items = products.slice(0, 7);
  const padLeft = 380;
  const padRight = 180;
  const padTop = 140;
  const padBottom = 50;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const rowH = plotH / items.length;
  const barH = 30;

  const maxVal = Math.max(1, ...items.map((i) => i.sales));

  items.forEach((item, idx) => {
    const yCenter = padTop + idx * rowH + rowH / 2;
    const yBar = yCenter - barH / 2;
    const barWidth = Math.max(12, (item.sales / maxVal) * plotW);
    const sharePct = totalSales > 0 ? (item.sales / totalSales) * 100 : 0;

    // Rank text
    ctx.fillStyle = idx === 0 ? '#d97706' : idx === 1 ? '#64748b' : idx === 2 ? '#b45309' : '#0f172a';
    ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`#${idx + 1}`, 85, yCenter - 4);

    // Product Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    const truncatedTitle = item.title.length > 26 ? item.title.slice(0, 24) + '...' : item.title;
    ctx.fillText(truncatedTitle, 105, yCenter - 8);

    // SKU & Units
    ctx.fillStyle = '#64748b';
    ctx.font = '15px Helvetica, Arial, sans-serif';
    ctx.fillText(`SKU: ${item.sku || 'N/D'} · ${item.units.toLocaleString('pt-BR')} un.`, 105, yCenter + 16);

    // Bar background track
    ctx.fillStyle = '#f1f5f9';
    drawRoundedRect(ctx, padLeft, yBar, plotW, barH, 5, true, false);

    // Bar Fill
    const barGrad = ctx.createLinearGradient(padLeft, 0, padLeft + barWidth, 0);
    barGrad.addColorStop(0, '#1d4ed8');
    barGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = barGrad;
    drawRoundedRect(ctx, padLeft, yBar, barWidth, barH, 5, true, false);

    // Value at end of bar
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'left';
    const valText = item.sales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    ctx.fillText(valText, padLeft + barWidth + 14, yCenter + 2);

    ctx.fillStyle = '#64748b';
    ctx.font = '15px Helvetica, Arial, sans-serif';
    ctx.fillText(
      `(${sharePct.toFixed(1).replace('.', ',')}%)`,
      padLeft + barWidth + 14 + ctx.measureText(valText).width + 6,
      yCenter + 2
    );
  });

  return canvas.toDataURL('image/png');
}

/**
 * Chart 3: Ads Campaigns Performance Chart (Real Campaigns from Dashboard State)
 * Tuned with matching aspect ratio for A4 Landscape PDF box (126mm x 68mm)
 */
function renderAdsCampaignsCanvas(
  campaigns: { name: string; spend: number; sales: number; acos: number | null; roas: number | null }[],
  width = 1260,
  height = 680
): string | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px Helvetica, Arial, sans-serif';
  ctx.fillText('DESEMPENHO DE CAMPANHAS ADS', 45, 55);

  ctx.fillStyle = '#64748b';
  ctx.font = '17px Helvetica, Arial, sans-serif';
  ctx.fillText('Investimento vs. Vendas Geradas por campanha', 45, 85);

  // Legend
  ctx.fillStyle = '#d97706';
  ctx.fillRect(width - 400, 42, 22, 14);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px Helvetica, Arial, sans-serif';
  ctx.fillText('Investimento', width - 368, 55);

  ctx.fillStyle = '#2563eb';
  ctx.fillRect(width - 210, 42, 22, 14);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 17px Helvetica, Arial, sans-serif';
  ctx.fillText('Vendas Ads', width - 178, 55);

  if (!campaigns || campaigns.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sem dados disponíveis para o período selecionado', width / 2, height / 2);
    return canvas.toDataURL('image/png');
  }

  const items = campaigns.slice(0, 5);
  const padLeft = 360;
  const padRight = 160;
  const padTop = 120;
  const padBottom = 40;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const rowH = plotH / items.length;
  const barH = 16;

  const maxVal = Math.max(1, ...items.map((i) => Math.max(i.spend, i.sales)));

  items.forEach((item, idx) => {
    const yCenter = padTop + idx * rowH + rowH / 2;

    // Campaign Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px Helvetica, Arial, sans-serif';
    const truncatedName = item.name.length > 25 ? item.name.slice(0, 23) + '...' : item.name;
    ctx.fillText(truncatedName, 45, yCenter - 7);

    // ROAS / ACoS badge text
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Helvetica, Arial, sans-serif';
    const roasText = item.roas !== null ? `ROAS: ${item.roas.toFixed(2).replace('.', ',')}x` : 'ROAS: N/D';
    const acosText = item.acos !== null ? `ACoS: ${item.acos.toFixed(1).replace('.', ',')}%` : '';
    ctx.fillText(`${roasText} · ${acosText}`, 45, yCenter + 15);

    // Spend Bar (Amber)
    const ySpend = yCenter - barH - 2;
    const wSpend = Math.max(8, (item.spend / maxVal) * plotW);
    ctx.fillStyle = '#fef3c7';
    drawRoundedRect(ctx, padLeft, ySpend, plotW, barH, 4, true, false);

    ctx.fillStyle = '#d97706';
    drawRoundedRect(ctx, padLeft, ySpend, wSpend, barH, 4, true, false);

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
    ctx.fillText(item.spend.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), padLeft + wSpend + 10, ySpend + 13);

    // Sales Bar (Blue)
    const ySales = yCenter + 3;
    const wSales = Math.max(8, (item.sales / maxVal) * plotW);
    ctx.fillStyle = '#dbeafe';
    drawRoundedRect(ctx, padLeft, ySales, plotW, barH, 4, true, false);

    ctx.fillStyle = '#2563eb';
    drawRoundedRect(ctx, padLeft, ySales, wSales, barH, 4, true, false);

    ctx.fillStyle = '#1e40af';
    ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
    ctx.fillText(item.sales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), padLeft + wSales + 10, ySales + 13);
  });

  return canvas.toDataURL('image/png');
}

// ============================================================================
// EXECUTIVE LANDSCAPE PDF BUILDER (A4 Paisagem, BB HUB Corporate Light Theme)
// ============================================================================

export async function buildExecutiveLandscapePdf(
  data: ConsolidatedPdfReportData,
  onProgress?: (progress: number, message: string) => void
): Promise<jsPDF> {
  onProgress?.(10, 'Aguardando renderização completa dos gráficos e fontes...');

  // Wait for React DOM, animations and web fonts to complete
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));

  onProgress?.(20, 'Inicializando documento executivo A4 Paisagem...');

  const {
    dataset,
    metrics,
    skusWithEconomics = [],
    generatedAt,
  } = data;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 269 mm

  // 1. Account Name
  const accountName = dataset.sessionConfig?.accountName || 'Loja Amazon Brasil';

  // 2. Real Applied Period / Date Range
  let startDate = dataset.sessionConfig?.startDate;
  let endDate = dataset.sessionConfig?.endDate;

  if (!startDate || !endDate) {
    if (dataset.businessDays && dataset.businessDays.length > 0) {
      const dates = dataset.businessDays.map((d) => d.date).filter((d): d is string => Boolean(d)).sort();
      if (dates.length > 0 && dates[0]) {
        startDate = startDate || dates[0];
        endDate = endDate || dates[dates.length - 1];
      }
    }
  }

  if (!startDate || !endDate) {
    if (dataset.orders && dataset.orders.length > 0) {
      const dates = dataset.orders
        .map((o) => (o.purchaseDate ? o.purchaseDate.split('T')[0] : ''))
        .filter((d): d is string => Boolean(d))
        .sort();
      if (dates.length > 0 && dates[0]) {
        startDate = startDate || dates[0];
        endDate = endDate || dates[dates.length - 1];
      }
    }
  }

  if (!startDate || !endDate) {
    if (dataset.auditFiles && dataset.auditFiles.length > 0) {
      const mins = dataset.auditFiles.map((f) => f.dateMin).filter((d): d is string => Boolean(d)).sort();
      const maxs = dataset.auditFiles.map((f) => f.dateMax).filter((d): d is string => Boolean(d)).sort();
      if (mins.length > 0 && mins[0]) startDate = startDate || mins[0];
      if (maxs.length > 0 && maxs[maxs.length - 1]) endDate = endDate || maxs[maxs.length - 1];
    }
  }

  const periodStr =
    startDate && endDate
      ? `${standardizeDate(startDate)} a ${standardizeDate(endDate)}`
      : 'Período Completo da Operação';

  // 3. Real Generation Date/Time (no fake updated timestamp)
  const emissionDate =
    generatedAt ||
    new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // 4. Deterministic Executive Metrics (Reusing exact dashboard state)
  const totalSales =
    metrics.businessSales > 0
      ? metrics.businessSales
      : metrics.ordersShippedGross > 0
      ? metrics.ordersShippedGross
      : 0;

  const totalOrders =
    metrics.businessOrders > 0
      ? metrics.businessOrders
      : metrics.ordersCountShipped > 0
      ? metrics.ordersCountShipped
      : 0;

  const totalUnits =
    metrics.businessUnits > 0
      ? metrics.businessUnits
      : metrics.ordersUnitsShipped > 0
      ? metrics.ordersUnitsShipped
      : 0;

  const avgTicket =
    metrics.businessAvgTicket > 0
      ? metrics.businessAvgTicket
      : metrics.ordersAvgTicket > 0
      ? metrics.ordersAvgTicket
      : totalOrders > 0
      ? totalSales / totalOrders
      : 0;

  const adsSpend = metrics.adsSpend > 0 ? metrics.adsSpend : 0;
  const adsSales = metrics.adsSalesAttributed > 0 ? metrics.adsSalesAttributed : 0;

  const acos =
    metrics.adsAcos !== null && metrics.adsAcos !== undefined
      ? metrics.adsAcos
      : adsSales > 0 && adsSpend > 0
      ? (adsSpend / adsSales) * 100
      : null;

  const tacos =
    metrics.tacos !== null && metrics.tacos !== undefined
      ? metrics.tacos
      : totalSales > 0 && adsSpend > 0
      ? (adsSpend / totalSales) * 100
      : null;

  const roas =
    metrics.adsRoas !== null && metrics.adsRoas !== undefined
      ? metrics.adsRoas
      : adsSpend > 0 && adsSales > 0
      ? adsSales / adsSpend
      : null;

  const adsSalesShare =
    metrics.adsSalesShare !== null && metrics.adsSalesShare !== undefined
      ? metrics.adsSalesShare
      : totalSales > 0
      ? (adsSales / totalSales) * 100
      : null;

  // 5. Month-over-Month calculation (Only show comparison if real calculation is available)
  const mom = calculateMonthOverMonth(dataset.businessDays || [], dataset.orders || []);
  const deltas = mom.latestMonth?.deltaVsPrevMonth;

  const deltaSalesPct =
    deltas && typeof deltas.deltaSalesPct === 'number' && !isNaN(deltas.deltaSalesPct)
      ? deltas.deltaSalesPct
      : null;

  const deltaOrdersPct =
    deltas && typeof deltas.deltaOrdersPct === 'number' && !isNaN(deltas.deltaOrdersPct)
      ? deltas.deltaOrdersPct
      : null;

  const deltaUnitsPct =
    deltas && typeof deltas.deltaUnitsPct === 'number' && !isNaN(deltas.deltaUnitsPct)
      ? deltas.deltaUnitsPct
      : null;

  const deltaAovPct =
    deltas && typeof deltas.deltaAovPct === 'number' && !isNaN(deltas.deltaAovPct)
      ? deltas.deltaAovPct
      : null;

  // 6. Daily Evolution Data (Uses strictly existing dataset businessDays or orders)
  let dailySeries: { date: string; label: string; sales: number; orders: number }[] = [];

  if (dataset.businessDays && dataset.businessDays.length > 0) {
    dailySeries = [...dataset.businessDays]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const parts = d.date.split('-');
        const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
        return {
          date: d.date,
          label,
          sales: d.orderedProductSales || 0,
          orders: d.totalOrderItems || d.unitsOrdered || 0,
        };
      });
  } else if (dataset.orders && dataset.orders.length > 0) {
    const map: Record<string, { sales: number; orders: number }> = {};
    dataset.orders.forEach((o) => {
      if (o.orderStatus === 'Canceled') return;
      const d = o.purchaseDate ? o.purchaseDate.split('T')[0] : '';
      if (!d) return;
      if (!map[d]) map[d] = { sales: 0, orders: 0 };
      map[d].sales += (o.itemPrice || 0) * (o.quantity || 1);
      map[d].orders += 1;
    });
    dailySeries = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => {
        const parts = date.split('-');
        const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
        return { date, label, sales: val.sales, orders: val.orders };
      });
  }

  // 7. Top 10 Products List (Strictly mirrors dashboard skusWithEconomics or orders)
  let topProductsList: { title: string; sku: string; units: number; sales: number; sharePct: number }[] = [];

  if (skusWithEconomics && skusWithEconomics.length > 0) {
    topProductsList = [...skusWithEconomics]
      .sort((a, b) => b.grossSales - a.grossSales)
      .slice(0, 10)
      .map((item) => ({
        title: item.title || item.sku || 'Produto Amazon',
        sku: item.sku || item.asin || 'N/D',
        units: item.unitsSold || 0,
        sales: item.grossSales || 0,
        sharePct: totalSales > 0 ? (item.grossSales / totalSales) * 100 : 0,
      }));
  } else if (dataset.orders && dataset.orders.length > 0) {
    const prodMap: Record<string, { title: string; sku: string; units: number; sales: number }> = {};
    dataset.orders.forEach((o) => {
      if (o.orderStatus === 'Canceled') return;
      const key = o.sku || o.asin || 'Desconhecido';
      if (!prodMap[key]) {
        prodMap[key] = {
          title: o.productName || key,
          sku: key,
          units: 0,
          sales: 0,
        };
      }
      prodMap[key].units += o.quantity || 1;
      prodMap[key].sales += (o.itemPrice || 0) * (o.quantity || 1);
    });
    topProductsList = Object.values(prodMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        sharePct: totalSales > 0 ? (item.sales / totalSales) * 100 : 0,
      }));
  }

  // 8. Campaigns List (Strictly from dataset.campaigns)
  const sortedCampaigns = [...(dataset.campaigns || [])]
    .sort((a, b) => b.spend - a.spend)
    .filter((c) => c.spend > 0 || c.sales > 0);

  const topCampaignsList = sortedCampaigns.slice(0, 8).map((c) => ({
    name: c.campaignName || 'Campanha Ads',
    spend: c.spend || 0,
    sales: c.sales || 0,
    acos: c.sales > 0 ? ((c.spend || 0) / c.sales) * 100 : null,
    roas: c.spend > 0 ? (c.sales || 0) / c.spend : null,
  }));

  const hasAdsData = sortedCampaigns.length > 0 && adsSpend > 0;

  onProgress?.(45, 'Convertendo gráficos do dashboard em imagens de alta definição...');

  // Render Charts to Canvas
  const dailyChartImg = renderDailyEvolutionCanvas(dailySeries);
  const topProductsChartImg = renderTopProductsCanvas(topProductsList, totalSales);
  const adsCampaignsChartImg = hasAdsData ? renderAdsCampaignsCanvas(topCampaignsList) : null;

  onProgress?.(70, 'Gerando páginas executivas e tabelas formatadas...');

  // ==========================================================================
  // PAGE 1: CABEÇALHO, RESUMO EXECUTIVO & GRÁFICOS PRINCIPAIS
  // ==========================================================================

  // --- 1. CABEÇALHO DA PÁGINA 1 ---
  // BB HUB Badge
  doc.setFillColor(15, 23, 42); // slate-900 #0f172a
  doc.roundedRect(marginX, 10, 26, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('BB HUB', marginX + 3.2, 17.5);
  doc.setFillColor(56, 189, 248); // sky-400 dot
  doc.circle(marginX + 23, 13.5, 1.2, 'F');

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text('RELATÓRIO DE PERFORMANCE AMAZON', marginX + 30, 16.5);

  // Subtitle
  doc.setTextColor(100, 116, 139); // slate-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Visão Executiva Consolidada de Faturamento, Pedidos, Eficiência e Publicidade', marginX + 30, 21.2);

  // Metadata Box (Right side)
  const metaBoxW = 98;
  const metaBoxX = pageWidth - marginX - metaBoxW;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(metaBoxX, 9, metaBoxW, 14, 2, 2, 'FD');

  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Conta Selecionada:', metaBoxX + 3.5, 13);
  doc.text('Período Aplicado:', metaBoxX + 3.5, 17.5);
  doc.text('Data/Hora de Geração:', metaBoxX + 3.5, 21.8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const truncAccount = accountName.length > 24 ? accountName.slice(0, 22) + '...' : accountName;
  doc.text(truncAccount, metaBoxX + 32, 13);
  doc.text(periodStr, metaBoxX + 32, 17.5);
  doc.text(emissionDate, metaBoxX + 32, 21.8);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, 25.5, pageWidth - marginX, 25.5);

  // --- 2. RESUMO EXECUTIVO: KPI CARDS GRID (8 CARDS EM 2 LINHAS) ---
  const cardGap = 3.5;
  const cardW = (contentWidth - cardGap * 3) / 4; // ~64.6 mm
  const cardH = 17;

  interface KpiCardConfig {
    label: string;
    val: string;
    sub: string;
    delta?: number | null;
    accentColor: [number, number, number];
  }

  const kpisRow1: KpiCardConfig[] = [
    {
      label: 'FATURAMENTO TOTAL',
      val: formatBRL(totalSales),
      sub: deltaSalesPct !== null ? `${deltaSalesPct >= 0 ? '+' : ''}${formatPct(deltaSalesPct)} vs mês ant.` : 'Receita bruta comercial',
      delta: deltaSalesPct,
      accentColor: [37, 99, 235], // Blue
    },
    {
      label: 'NÚMERO DE PEDIDOS',
      val: totalOrders > 0 ? `${formatNum(totalOrders)} pedidos` : '0 pedidos',
      sub: deltaOrdersPct !== null ? `${deltaOrdersPct >= 0 ? '+' : ''}${formatPct(deltaOrdersPct)} vs mês ant.` : 'Pedidos registrados',
      delta: deltaOrdersPct,
      accentColor: [16, 185, 129], // Emerald
    },
    {
      label: 'UNIDADES VENDIDAS',
      val: totalUnits > 0 ? `${formatNum(totalUnits)} un.` : '0 un.',
      sub: deltaUnitsPct !== null ? `${deltaUnitsPct >= 0 ? '+' : ''}${formatPct(deltaUnitsPct)} vs mês ant.` : 'Volume comercializado',
      delta: deltaUnitsPct,
      accentColor: [14, 165, 233], // Sky
    },
    {
      label: 'TICKET MÉDIO',
      val: formatBRL(avgTicket),
      sub: deltaAovPct !== null ? `${deltaAovPct >= 0 ? '+' : ''}${formatPct(deltaAovPct)} vs mês ant.` : 'Faturamento por pedido',
      delta: deltaAovPct,
      accentColor: [99, 102, 241], // Indigo
    },
  ];

  const kpisRow2: KpiCardConfig[] = [
    {
      label: 'INVESTIMENTO EM ANÚNCIOS',
      val: formatBRL(adsSpend),
      sub: tacos !== null ? `TACoS da conta: ${formatPct(tacos)}` : 'Sem gastos Ads',
      accentColor: [217, 119, 6], // Amber
    },
    {
      label: 'VENDAS ATRIBUÍDAS AO ADS',
      val: formatBRL(adsSales),
      sub: adsSalesShare !== null && adsSalesShare > 0 ? `${formatPct(adsSalesShare)} do faturamento total` : 'Sem vendas Ads',
      accentColor: [6, 182, 212], // Cyan
    },
    {
      label: 'ACOS GERAL',
      val: acos !== null ? formatPct(acos) : 'N/D',
      sub: acos !== null ? (acos <= 15 ? 'Eficiência excelente' : acos <= 25 ? 'Faixa aceitável' : 'Atenção aos custos') : 'Sem dados de ACoS',
      accentColor: [244, 63, 94], // Rose
    },
    {
      label: 'TACOS & ROAS',
      val: roas !== null ? formatRoas(roas) : 'N/D',
      sub: tacos !== null ? `TACoS: ${formatPct(tacos)}` : 'Sem dados de Ads',
      accentColor: [139, 92, 246], // Purple
    },
  ];

  const drawCard = (x: number, y: number, item: KpiCardConfig) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 1.8, 1.8, 'FD');

    // Left accent bar
    doc.setFillColor(item.accentColor[0], item.accentColor[1], item.accentColor[2]);
    doc.roundedRect(x, y, 1.4, cardH, 0.8, 0.8, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 3.8, y + 4.8);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, x + 3.8, y + 10.5);

    // Subtitle / Delta (only if available)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    if (item.delta !== undefined && item.delta !== null) {
      if (item.delta >= 0) {
        doc.setTextColor(22, 163, 74); // Green
      } else {
        doc.setTextColor(220, 38, 38); // Red
      }
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(item.sub, x + 3.8, y + 14.8);
  };

  const row1Y = 28;
  const row2Y = 47.5;
  kpisRow1.forEach((kpi, idx) => {
    drawCard(marginX + idx * (cardW + cardGap), row1Y, kpi);
  });
  kpisRow2.forEach((kpi, idx) => {
    drawCard(marginX + idx * (cardW + cardGap), row2Y, kpi);
  });

  // --- 3. GRÁFICOS OBRIGATÓRIOS (LADO A LADO) ---
  const chartY = 67.5;
  const chartW = (contentWidth - 5) / 2; // 132 mm
  const chartH = 127; // Cleanly fills space down to footer at 200 mm

  if (dailyChartImg) {
    doc.addImage(dailyChartImg, 'PNG', marginX, chartY, chartW, chartH, undefined, 'FAST');
  }

  if (topProductsChartImg) {
    doc.addImage(topProductsChartImg, 'PNG', marginX + chartW + 5, chartY, chartW, chartH, undefined, 'FAST');
  }

  // ==========================================================================
  // PAGE 2: TABELAS EXECUTIVAS & PUBLICIDADE AMAZON ADS
  // ==========================================================================
  doc.addPage('a4', 'landscape');

  // --- CABEÇALHO DA PÁGINA 2 ---
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginX, 10, 26, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BB HUB', marginX + 3.2, 16.5);
  doc.setFillColor(56, 189, 248);
  doc.circle(marginX + 23, 13, 1.2, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RELATÓRIO DE PERFORMANCE AMAZON — PUBLICIDADE & PRODUTOS', marginX + 30, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Conta: ${accountName}   |   Período: ${periodStr}   |   Data/Hora de Geração: ${emissionDate}`, marginX + 30, 20.5);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, 24, pageWidth - marginX, 24);

  let currentY = 28;

  if (hasAdsData) {
    // SECTION 1: PUBLICIDADE (AMAZON ADS)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('1. DESEMPENHO DE CAMPANHAS AMAZON ADS', marginX, currentY);
    currentY += 3.5;

    // Left: Ads Campaigns Chart Image
    const adsChartW = 126;
    const adsChartH = 68;
    if (adsCampaignsChartImg) {
      doc.addImage(adsCampaignsChartImg, 'PNG', marginX, currentY, adsChartW, adsChartH, undefined, 'FAST');
    }

    // Right: Ads Campaigns Table
    const adsTableRows = topCampaignsList.map((c) => [
      c.name.length > 25 ? c.name.slice(0, 23) + '...' : c.name,
      formatBRL(c.spend),
      formatBRL(c.sales),
      c.acos !== null ? formatPct(c.acos) : 'N/D',
      c.roas !== null ? formatRoas(c.roas) : 'N/D',
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX + adsChartW + 5, right: marginX },
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 44 },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      },
      head: [['Campanha', 'Investimento', 'Vendas Ads', 'ACoS', 'ROAS']],
      body: adsTableRows,
      tableWidth: 138,
      showHead: 'everyPage',
    });

    currentY = Math.max(currentY + adsChartH + 6, (doc as any).lastAutoTable?.finalY + 6 || 104);

    // SECTION 2: TOP 10 PRODUTOS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('2. DETALHAMENTO DOS TOP 10 PRODUTOS POR FATURAMENTO', marginX, currentY);
    currentY += 3.5;

    const prodRows =
      topProductsList.length > 0
        ? topProductsList.map((p, idx) => [
            String(idx + 1),
            p.title.length > 55 ? p.title.slice(0, 52) + '...' : p.title,
            p.sku || 'N/D',
            formatNum(p.units),
            formatBRL(p.sales),
            formatPct(p.sharePct),
          ])
        : [['-', 'Sem dados disponíveis para o período selecionado', '-', '-', '-', '-']];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2.2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 115 },
        2: { cellWidth: 44 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 32, halign: 'right' },
      },
      head: [['#', 'Produto / Título', 'SKU', 'Unidades', 'Faturamento', '% Faturamento']],
      body: prodRows,
      tableWidth: contentWidth,
      showHead: 'everyPage',
    });
  } else {
    // If no Ads data: Give full stage to Products Table and display clear Ads status
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('1. DETALHAMENTO DOS TOP 10 PRODUTOS POR FATURAMENTO', marginX, currentY);
    currentY += 4;

    const prodRows =
      topProductsList.length > 0
        ? topProductsList.map((p, idx) => [
            String(idx + 1),
            p.title.length > 60 ? p.title.slice(0, 58) + '...' : p.title,
            p.sku || 'N/D',
            formatNum(p.units),
            formatBRL(p.sales),
            formatPct(p.sharePct),
          ])
        : [['-', 'Sem dados disponíveis para o período selecionado', '-', '-', '-', '-']];

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.6, textColor: [30, 41, 59] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 118 },
        2: { cellWidth: 44 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 29, halign: 'right' },
      },
      head: [['#', 'Produto / Título', 'SKU', 'Unidades', 'Faturamento', '% Faturamento']],
      body: prodRows,
      tableWidth: contentWidth,
      showHead: 'everyPage',
    });

    currentY = ((doc as any).lastAutoTable?.finalY || 110) + 10;

    // SECTION 2: ADS STATUS (No Ads Data Notice)
    if (currentY < 170) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('2. DESEMPENHO DE PUBLICIDADE (AMAZON ADS)', marginX, currentY);
      currentY += 4;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Sem dados disponíveis para o período selecionado', marginX + 6, currentY + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Nenhum relatório de publicidade (Campanhas, Termos de Pesquisa ou Orçamentos) foi importado para esta conta.',
        marginX + 6,
        currentY + 15
      );
    }
  }

  // ==========================================================================
  // RODAPÉ OBRIGATÓRIO EM TODAS AS PÁGINAS
  // ==========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    // Left footnote
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`BB HUB | Relatório gerado em ${emissionDate}`, marginX, pageHeight - 6.5);

    // Right page number
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, { align: 'right' });
  }

  onProgress?.(100, 'Geração de PDF concluída com sucesso!');
  return doc;
}

// Backward-compatible alias for existing imports
export async function buildVectorDossierPdf(
  data: ConsolidatedPdfReportData,
  onProgress?: (progress: number, message: string) => void
): Promise<jsPDF> {
  return await buildExecutiveLandscapePdf(data, onProgress);
}

export function savePdfToFile(pdf: jsPDF, filename: string): void {
  pdf.save(filename);
}

/**
 * Universal PDF Download Handler
 */
export async function downloadReportAsPdf(options: GeneratePdfOptions): Promise<void> {
  const { reportData, filename = 'relatorio_performance_amazon.pdf', onProgress } = options;
  onProgress?.(5, 'Iniciando compilação do relatório executivo BB HUB...');

  const pdf = await buildExecutiveLandscapePdf(reportData, onProgress);
  pdf.save(filename);
  onProgress?.(100, 'Relatório baixado com sucesso!');
}
