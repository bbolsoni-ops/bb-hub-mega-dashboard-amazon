import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  DollarSign,
  Activity,
  Target,
  ShoppingCart,
  Download,
  UploadCloud,
  Moon,
  Sun,
  CheckCircle,
  Package,
  XCircle,
  ListTodo,
  CheckCircle2,
  Check,
  FileSpreadsheet,
  FileJson,
  Store,
  Save,
  Calendar,
  ShieldCheck,
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
} from 'lucide-react';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { savePdfToFile, downloadReportAsPdf } from '../utils/pdfDownloader';
import {
  ActionPlanItem,
  ReconciledMetrics,
  ParsedDataset,
  SkuUnitEconomics,
} from '../types/amazon';
import { sanitizeCellValue } from '../utils/csvParser';
import { parseAmazonNumber } from '../utils/formatters';

// --- FUNÇÃO DE HIGIENIZAÇÃO DE DADOS DA AMAZON ---
const parseAmazonCurrency = (val: any): number => {
  return parseAmazonNumber(val, 'currency') ?? 0;
};

interface ActionPlanViewProps {
  actionPlan: ActionPlanItem[];
  onToggleStatus: (id: string) => void;
  metrics?: ReconciledMetrics;
  dataset?: ParsedDataset;
  skusWithEconomics?: SkuUnitEconomics[];
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export default function ActionPlanView({
  actionPlan,
  onToggleStatus,
  metrics,
  dataset,
  skusWithEconomics,
  darkMode: propDarkMode,
  onToggleDarkMode,
}: ActionPlanViewProps) {
  // --- TEMA CLARO / ESCURO (SINCRONIZADO GLOBALMENTE) ---
  const [localDarkMode, setLocalDarkMode] = useState(false);
  const darkMode = propDarkMode !== undefined ? propDarkMode : localDarkMode;

  const handleToggleTheme = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      setLocalDarkMode(!localDarkMode);
    }
  };

  // Injeta a classe "dark" direto no <html> caso não venha controlado pelo App
  useEffect(() => {
    if (propDarkMode === undefined) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [darkMode, propDarkMode]);

  // Regras e Informações da Loja
  const [nomeLoja, setNomeLoja] = useState<string>(
    () => dataset?.sessionConfig?.accountName || ''
  );
  const [metaRoas, setMetaRoas] = useState<number>(5.0);
  const [metaTacos, setMetaTacos] = useState<number>(10.0);
  const [simuladorExtra, setSimuladorExtra] = useState<number>(50);

  // Histórico do Mês Anterior (Carregado via JSON)
  const [historico, setHistorico] = useState<any>(null);

  const [uploadStatus, setUploadStatus] = useState<string>(
    'Aguardando planilhas ou histórico...'
  );
  const [filesLoaded, setFilesLoaded] = useState({
    campanhas: false,
    produtos: false,
    orcamento: false,
    termos: false,
    pedidos: false,
    historico: false,
  });

  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // --- ESTADOS DO CHATBOT (NotebookLM Like) ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    {
      role: 'ai',
      content:
        'Olá! Eu sou a IA interna da agência. Analisei os relatórios que você subiu. O que deseja saber ou qual otimização deseja aplicar hoje?',
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // --- COMPONENTE DE COMPARAÇÃO (▲ / ▼) ---
  const renderComparacao = (
    atual: number,
    anterior: number | undefined,
    invertido = false
  ) => {
    if (anterior === undefined || anterior === null || anterior === 0) return null;
    const diff = atual - anterior;
    const percent = (diff / anterior) * 100;
    if (percent === 0) return null;

    const isPositive = percent > 0;
    // Para TACoS e Cancelamento, cair é bom (invertido). Para vendas/ROAS, subir é bom.
    const isGood = invertido ? !isPositive : isPositive;
    const colorClass = isGood
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400';

    return (
      <span
        className={`text-xs ml-2 font-bold ${colorClass} px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 inline-flex items-center gap-0.5`}
        title={`Variação vs Histórico: ${isPositive ? '+' : ''}${(percent ?? 0).toFixed(1)}%`}
      >
        {isPositive ? '▲' : '▼'} {(Math.abs(percent) ?? 0).toFixed(1)}% vs mês anterior
      </span>
    );
  };

  // Estados dos KPIs (Inicializados com baseline auditado ou métricas ao vivo)
  const [kpis, setKpis] = useState(() => {
    const faturamento =
      metrics?.businessSales && metrics.businessSales > 0
        ? metrics.businessSales
        : metrics?.ordersShippedGross && metrics.ordersShippedGross > 0
        ? metrics.ordersShippedGross
        : 29426.24;

    const vendasAds =
      metrics?.adsSalesAttributed && metrics.adsSalesAttributed > 0
        ? metrics.adsSalesAttributed
        : 16481.6;

    const gastoAds =
      metrics?.adsSpend && metrics.adsSpend > 0
        ? metrics.adsSpend
        : 3284.72;

    const tacos =
      metrics?.tacos !== null && metrics?.tacos !== undefined && metrics.tacos > 0
        ? Number((metrics.tacos ?? 0).toFixed(2))
        : Number(((gastoAds / (faturamento || 1)) * 100).toFixed(2)) || 11.16;

    const roas =
      metrics?.adsRoas !== null && metrics?.adsRoas !== undefined && metrics.adsRoas > 0
        ? Number((metrics.adsRoas ?? 0).toFixed(2))
        : Number((vendasAds / (gastoAds || 1)).toFixed(2)) || 5.02;

    return { faturamento, vendasAds, gastoAds, tacos, roas };
  });

  // Estado de Logística (FBA vs DBA vs FBM)
  const [logistica, setLogistica] = useState(() => {
    if (dataset?.orders && dataset.orders.length > 0) {
      let fba = 0;
      let dba = 0;
      let fbm = 0;
      for (const o of dataset.orders) {
        if (
          o.tipoEnvio === 'FBA (Full)' ||
          o.fulfillmentChannel === 'Amazon' ||
          o.fulfillmentChannel === 'AFN'
        ) {
          fba++;
        } else if (o.tipoEnvio === 'DBA' || o.fulfillmentChannel === 'DBA') {
          dba++;
        } else {
          fbm++;
        }
      }
      return { fba, dba, fbm };
    }
    return { fba: 309, dba: 105, fbm: 5 };
  });

  // Estado de Cancelamentos
  const [cancelamentos, setCancelamentos] = useState(() => {
    if (dataset?.orders && dataset.orders.length > 0) {
      let totalPedidos = 0;
      let canceladosCount = 0;
      const skuCanceladosMap: Record<string, number> = {};

      for (const o of dataset.orders) {
        if (!o.amazonOrderId && !(o as any).orderId) continue;
        totalPedidos++;
        const st = String(o.orderStatus || '').toLowerCase();
        if (st.includes('cancel')) {
          canceladosCount++;
          if (o.sku) {
            skuCanceladosMap[o.sku] = (skuCanceladosMap[o.sku] || 0) + 1;
          }
        }
      }

      const topSkus = Object.keys(skuCanceladosMap)
        .map((sku) => ({ sku, count: skuCanceladosMap[sku] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        taxa: totalPedidos > 0 ? parseFloat(((canceladosCount / totalPedidos) * 100).toFixed(1)) : 0,
        total: canceladosCount,
        topSkus:
          topSkus.length > 0
            ? topSkus
            : [
                { sku: 'REL30-081-CINZA', count: 7 },
                { sku: 'REL25-050-PRATA', count: 6 },
              ],
      };
    }

    return {
      taxa: 10.5,
      total: 44,
      topSkus: [
        { sku: 'REL30-081-CINZA', count: 7 },
        { sku: 'REL25-050-PRATA', count: 6 },
      ],
    };
  });

  useEffect(() => {
    if (dataset?.orders && dataset.orders.length > 0) {
      let totalPedidos = 0;
      let canceladosCount = 0;
      const skuCanceladosMap: Record<string, number> = {};

      for (const o of dataset.orders) {
        if (!o.amazonOrderId && !(o as any).orderId) continue;
        totalPedidos++;
        const st = String(o.orderStatus || '').toLowerCase();
        if (st.includes('cancel')) {
          canceladosCount++;
          if (o.sku) {
            skuCanceladosMap[o.sku] = (skuCanceladosMap[o.sku] || 0) + 1;
          }
        }
      }

      const topSkus = Object.keys(skuCanceladosMap)
        .map((sku) => ({ sku, count: skuCanceladosMap[sku] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setCancelamentos({
        taxa: totalPedidos > 0 ? parseFloat(((canceladosCount / totalPedidos) * 100).toFixed(1)) : 0,
        total: canceladosCount,
        topSkus:
          topSkus.length > 0
            ? topSkus
            : [
                { sku: 'REL30-081-CINZA', count: 7 },
                { sku: 'REL25-050-PRATA', count: 6 },
              ],
      });
    }
  }, [dataset?.orders]);

  // Estados dos Insights
  const [saudavel, setSaudavel] = useState<any[]>([
    { sku: 'REL30-692-BRANCO', roas: 9.21 },
    { sku: 'REL30-067-PRATA', roas: 7.59 },
  ]);
  const [critico, setCritico] = useState<any[]>([
    { nome: 'SKU: 8289-CINZA', gasto: 398.79, roas: 0.45, tipo: 'sku' },
    { nome: 'relogio de parede quartz', gasto: 30.17, roas: 0, tipo: 'termo', cliques: 2 },
  ]);
  const [gargalos, setGargalos] = useState<any[]>([
    { nome: 'Relógio 23cm - NATIVO', tempo: 0 },
    { nome: 'Kit Porta Retrato + Relógio', tempo: 0 },
  ]);

  // Ações rápidas aplicadas
  const [appliedActions, setAppliedActions] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Sincroniza se métricas de pedidos mudarem
  useEffect(() => {
    if (metrics && metrics.businessSales > 0) {
      setKpis((prev) => ({
        ...prev,
        faturamento: metrics.businessSales,
        vendasAds: metrics.adsSalesAttributed || prev.vendasAds,
        gastoAds: metrics.adsSpend || prev.gastoAds,
        tacos: metrics.tacos !== null ? Number((metrics.tacos ?? 0).toFixed(2)) : prev.tacos,
        roas: metrics.adsRoas !== null ? Number((metrics.adsRoas ?? 0).toFixed(2)) : prev.roas,
      }));
    }
  }, [metrics]);

  // --- MOTOR DE UPLOAD E LEITURA INTELIGENTE ---
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploadStatus('Processando e higienizando dados...');
    showToast('Processando e higienizando relatórios da Amazon...');

    let tempKpis = { ...kpis };
    let tempSaudavel: any[] = [];
    let tempCritico: any[] = [];
    let tempGargalos: any[] = [];
    let tempLogistica = { fba: 0, dba: 0, fbm: 0 };
    let totalPedidos = 0;
    let canceladosCount = 0;
    let skuCanceladosMap: Record<string, number> = {};
    let loaded = { ...filesLoaded };

    Array.from(files).forEach((file) => {
      // Se for o arquivo de Save (JSON)
      if (file.name.toLowerCase().endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target?.result as string);
            if (json.kpis) {
              setHistorico(json);
              if (json.loja && !nomeLoja) setNomeLoja(json.loja); // Puxa o nome da loja do histórico se estiver vazio
              loaded.historico = true;
              setFilesLoaded({ ...loaded });
              setUploadStatus('Dados e Histórico importados!');
              showToast('Histórico anterior importado com sucesso!');
            }
          } catch (err) {
            console.error('Erro no JSON', err);
            showToast('Erro ao ler arquivo JSON de histórico.');
          }
        };
        reader.readAsText(file);
        return; // Sai do loop para não passar no PapaParse
      }

      // Identificando se é arquivo TSV (Pedidos) ou CSV (Ads)
      const isTsv =
        file.name.toLowerCase().includes('pedidos') ||
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.tsv');

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: isTsv ? '\t' : ',', // Pedidos usam Tab, Ads usam Vírgula
        complete: (results) => {
          const data = results.data as any[];
          if (data.length === 0) return;

          const columns = Object.keys(data[0]);

          // 1. Identifica: PEDIDOS (Logística e Cancelamentos)
          if (columns.includes('order-status') || columns.includes('fulfillment-channel')) {
            data.forEach((row) => {
              if (!row['amazon-order-id']) return;
              totalPedidos++;

              // Logística
              if (row['fulfillment-channel'] === 'Amazon') {
                tempLogistica.fba++;
              } else if (
                row['fulfillment-channel'] === 'Merchant' &&
                row['fulfilled-by'] === 'Easy Ship'
              ) {
                tempLogistica.dba++;
              } else {
                tempLogistica.fbm++;
              }

              // Cancelamentos
              const status = String(row['order-status'] || '').toLowerCase();
              if (status.includes('cancel')) {
                canceladosCount++;
                const sku = row['sku'];
                if (sku) {
                  skuCanceladosMap[sku] = (skuCanceladosMap[sku] || 0) + 1;
                }
              }
            });

            const topCancelados = Object.keys(skuCanceladosMap)
              .map((sku) => ({ sku, count: skuCanceladosMap[sku] }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3);

            setCancelamentos({
              taxa:
                totalPedidos > 0
                  ? parseFloat(((canceladosCount / totalPedidos) * 100).toFixed(1))
                  : 0,
              total: canceladosCount,
              topSkus: topCancelados,
            });
            loaded.pedidos = true;
          }

          // 2. Identifica: CAMPANHAS (Financeiro Oficial)
          if (
            columns.includes('Gastos') &&
            columns.includes('Total de vendas de 7 dias') &&
            !columns.includes('SKU anunciado') &&
            !columns.includes('Termo de pesquisa do cliente')
          ) {
            let totalGasto = 0;
            let totalVendas = 0;
            data.forEach((row) => {
              totalGasto += parseAmazonCurrency(row['Gastos']);
              totalVendas += parseAmazonCurrency(row['Total de vendas de 7 dias']);
            });
            tempKpis.gastoAds = totalGasto;
            tempKpis.vendasAds = totalVendas;
            tempKpis.roas = totalGasto > 0 ? Number((totalVendas / totalGasto).toFixed(2)) : 0;
            tempKpis.tacos =
              tempKpis.faturamento > 0
                ? Number(((totalGasto / tempKpis.faturamento) * 100).toFixed(2))
                : 0;
            loaded.campanhas = true;
          }

          // 3. Identifica: PRODUTOS (Para Ação)
          if (columns.includes('SKU anunciado')) {
            data.forEach((row) => {
              const gasto = parseAmazonCurrency(row['Gastos']);
              const vendas = parseAmazonCurrency(row['Total de vendas de 7 dias']);
              const roas = gasto > 0 ? vendas / gasto : 0;

              if (gasto > 50 && roas > metaRoas) {
                tempSaudavel.push({ sku: row['SKU anunciado'], roas: (roas ?? 0).toFixed(2) });
              }
              if (gasto > 50 && roas > 0 && roas < metaRoas * 0.5) {
                tempCritico.push({
                  nome: `SKU: ${row['SKU anunciado']}`,
                  gasto,
                  roas: (roas ?? 0).toFixed(2),
                  tipo: 'sku',
                });
              }
            });
            loaded.produtos = true;
          }

          // 4. Identifica: ORÇAMENTO (Gargalos)
          if (columns.includes('Tempo médio dentro do orçamento')) {
            data.forEach((row) => {
              const tempo = parseAmazonNumber(row['Tempo médio dentro do orçamento'], 'percentage');
              if (tempo !== null && tempo < 100) {
                tempGargalos.push({ nome: row['Nome da campanha'], tempo });
              }
            });
            loaded.orcamento = true;
          }

          // 5. Identifica: TERMOS DE PESQUISA (Sangramento)
          if (columns.includes('Termo de pesquisa do cliente')) {
            data.forEach((row) => {
              const gasto = parseAmazonCurrency(row['Gastos']);
              const vendas = parseAmazonCurrency(row['Total de vendas de 7 dias']);
              const cliques = parseInt(row['Cliques'] || '0', 10);
              if (gasto > 20 && vendas === 0 && cliques > 1) {
                tempCritico.push({
                  nome: row['Termo de pesquisa do cliente'],
                  gasto,
                  roas: 0,
                  tipo: 'termo',
                  cliques,
                });
              }
            });
            loaded.termos = true;
          }

          setKpis({ ...tempKpis });
          setLogistica({ ...tempLogistica });
          if (tempSaudavel.length > 0) {
            setSaudavel(tempSaudavel.sort((a, b) => Number(b.roas) - Number(a.roas)).slice(0, 5));
          }
          if (tempCritico.length > 0) {
            setCritico(tempCritico.sort((a, b) => b.gasto - a.gasto).slice(0, 5));
          }
          if (tempGargalos.length > 0) {
            setGargalos(tempGargalos.sort((a, b) => a.tempo - b.tempo).slice(0, 5));
          }
          setFilesLoaded({ ...loaded });
          setUploadStatus('Dados importados com sucesso!');
          showToast('Dados e canais logísticos importados com sucesso!');
        },
      });
    });
  };

  // --- LIMPAR / ZERAR DADOS DO RELATÓRIO EXECUTIVO ---
  const handleResetAllData = () => {
    setNomeLoja('');
    setHistorico(null);
    setFilesLoaded({
      campanhas: false,
      produtos: false,
      orcamento: false,
      termos: false,
      pedidos: false,
      historico: false,
    });
    setUploadStatus('Aguardando planilhas ou histórico...');
    setKpis({
      faturamento: 0,
      vendasAds: 0,
      gastoAds: 0,
      tacos: 0,
      roas: 0,
    });
    setLogistica({ fba: 0, dba: 0, fbm: 0 });
    setCancelamentos({ total: 0, taxa: 0, topSkus: [] });
    setSaudavel([]);
    setCritico([]);
    setGargalos([]);
    setSimuladorExtra(50);
    setChatMessages([
      {
        role: 'ai',
        content:
          'Olá! O painel foi limpo. Faça o upload dos relatórios ou carregue um arquivo .json para começar uma nova análise.',
      },
    ]);
    showToast('Todos os dados do relatório foram zerados com sucesso!');
  };

  // --- EXPORTAR APENAS JSON (HISTÓRICO / BACKUP) ---
  const handleExportJSON = () => {
    const finalName = nomeLoja && nomeLoja.trim() !== '' ? nomeLoja.trim() : 'Minha_Loja';
    const safeName = finalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dataToSave = {
      dataGeracao: new Date().toISOString(),
      loja: finalName,
      kpis,
      logistica,
      cancelamentos,
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToSave, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `Historico_BBHub_${safeName}.json`);
    downloadAnchorNode.style.display = 'none';
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    setTimeout(() => {
      if (document.body.contains(downloadAnchorNode)) {
        document.body.removeChild(downloadAnchorNode);
      }
    }, 2000);
    showToast(`Backup "Historico_BBHub_${safeName}.json" salvo com sucesso na sua máquina!`);
  };

  // --- EXPORTAR PDF DO CLIENTE ---
  const handleExportPDF = async () => {
    const finalName = nomeLoja && nomeLoja.trim() !== '' ? nomeLoja.trim() : 'Visao_Geral_Operacao';
    const safeName = finalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `Relatorio_Executivo_${safeName}.pdf`;

    setIsExportingPdf(true);
    showToast('Gerando Relatório Executivo em PDF...');

    // Helper: generate crisp vector fallback PDF
    const generateVectorFallback = () => {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = 297;
      const pageHeight = 210;

      // Header Bar
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 28, 'F');
      pdf.setFillColor(59, 130, 246); // blue-500
      pdf.rect(0, 27, pageWidth, 1, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('BB HUB | RELATÓRIO OFICIAL DE DESEMPENHO NA AMAZON', 14, 12);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      const periodLabel = dataset?.sessionConfig?.startDate && dataset?.sessionConfig?.endDate
        ? `${dataset.sessionConfig.startDate} a ${dataset.sessionConfig.endDate}`
        : 'Período Completo da Operação';
      pdf.text(`Cliente / Loja: ${finalName}   |   Referência: ${periodLabel}`, 14, 20);

      // Section 1: KPIs
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('1. INDICADORES CHAVE DE DESEMPENHO (KPIS COMERCIAIS)', 14, 38);

      const kpiCards = [
        { label: 'Faturamento Bruto', val: formatCurrency(kpis.faturamento) },
        { label: 'Canais Logística', val: `FBA: ${logistica.fba} | DBA: ${logistica.dba} | FBM: ${logistica.fbm}` },
        { label: 'Vendas Ads', val: `${formatCurrency(kpis.vendasAds)} (${((kpis.vendasAds / (kpis.faturamento || 1)) * 100).toFixed(1)}%)` },
        { label: 'Taxa Cancelamento', val: `${cancelamentos.taxa}% (${cancelamentos.total} pedidos)` },
        { label: 'Investimento Ads', val: formatCurrency(kpis.gastoAds) },
        { label: 'TACoS Consolidado', val: `${kpis.tacos}% (Meta: ${metaTacos}%)` },
        { label: 'ROAS Global', val: `${kpis.roas}x (Meta: ${metaRoas}x)` },
      ];

      const startX = 14;
      const startY = 43;
      const cardW = 63;
      const cardH = 22;

      kpiCards.forEach((kpi, idx) => {
        const col = idx % 4;
        const row = Math.floor(idx / 4);
        const x = startX + col * (cardW + 4);
        const y = startY + row * (cardH + 4);

        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 116, 139);
        pdf.text(kpi.label.toUpperCase(), x + 3, y + 6);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(kpi.val, x + 3, y + 15);
      });

      // Section 2: Recomendações
      const sec2Y = 100;
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('2. PLANO DE AÇÃO ESTRATÉGICO (RECOMENDAÇÕES DA AGÊNCIA)', 14, sec2Y);

      const recs = [
        {
          title: 'Produtos em Destaque (Escalar)',
          items: saudavel.map((s) => `${s.sku}: ROAS ${s.roas}x`),
        },
        {
          title: 'Campanhas Limitadas (Gargalos)',
          items: gargalos.map((g) => `${g.nome} (Esgotou após ${(Number(g.tempo) ?? 0).toFixed(0)}%)`),
        },
        {
          title: 'Ajustes / Negativações (Sangria)',
          items: critico.map((c) => `${c.nome}: Gasto ${formatCurrency(c.gasto)}`),
        },
        {
          title: 'Análise de Cancelamentos',
          items: cancelamentos.topSkus.map((t) => `${t.sku}: ${t.count} recusas`),
        },
      ];

      recs.forEach((rec, idx) => {
        const x = startX + idx * (cardW + 4);
        const y = sec2Y + 5;
        const h = 75;

        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, cardW, h, 2, 2, 'FD');

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(rec.title, x + 3, y + 7);

        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);

        let itemY = y + 14;
        if (rec.items.length === 0) {
          pdf.text('Sem ocorrências.', x + 3, itemY);
        } else {
          rec.items.slice(0, 5).forEach((itemText) => {
            const split = pdf.splitTextToSize(itemText, cardW - 6);
            pdf.text(split, x + 3, itemY);
            itemY += split.length * 4.5;
          });
        }
      });

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `BB Hub | Relatório Executivo Amazon Brasil — Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );

      return pdf;
    };

    try {
      let canvasExported = false;

      // Try HTML2Canvas first with strict 2-second timeout
      if (dashboardRef.current) {
        try {
          const canvasPromise = html2canvas(dashboardRef.current, {
            scale: 1.5,
            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
            windowWidth: 1440,
            useCORS: true,
            allowTaint: true,
            logging: false,
            ignoreElements: (el) => {
              return (
                el.hasAttribute('data-html2canvas-ignore') ||
                el.getAttribute('data-html2canvas-ignore') === 'true'
              );
            },
          });

          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 2200)
          );

          const canvas = await Promise.race([canvasPromise, timeoutPromise]);

          if (canvas && canvas.width > 0 && canvas.height > 0) {
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = 297;
            const pageHeight = 210;
            const margin = 6;
            const contentWidth = pageWidth - margin * 2;
            const contentHeight = pageHeight - margin * 2;

            const pxPerMm = canvas.width / contentWidth;
            const pageHeightPx = Math.floor(contentHeight * pxPerMm);
            const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

            for (let pageNum = 0; pageNum < totalPages; pageNum++) {
              if (pageNum > 0) {
                pdf.addPage('a4', 'landscape');
              }
              const sourceY = pageNum * pageHeightPx;
              const currentSliceHeightPx = Math.min(pageHeightPx, canvas.height - sourceY);

              const pageCanvas = document.createElement('canvas');
              pageCanvas.width = canvas.width;
              pageCanvas.height = currentSliceHeightPx;

              const ctx = pageCanvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = darkMode ? '#0f172a' : '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(
                  canvas,
                  0,
                  sourceY,
                  canvas.width,
                  currentSliceHeightPx,
                  0,
                  0,
                  pageCanvas.width,
                  currentSliceHeightPx
                );
              }

              const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
              const sliceHeightMm = (currentSliceHeightPx * contentWidth) / canvas.width;

              pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, sliceHeightMm, undefined, 'FAST');

              pdf.setFontSize(7.5);
              pdf.setTextColor(148, 163, 184);
              pdf.text(
                `BB Hub | Relatório Oficial de Desempenho — ${finalName} — Página ${pageNum + 1} de ${totalPages}`,
                pageWidth / 2,
                pageHeight - 3,
                { align: 'center' }
              );
            }

            savePdfToFile(pdf, filename);
            showToast(`Relatório Executivo "${filename}" baixado com sucesso!`);
            canvasExported = true;
          }
        } catch (canvasErr) {
          console.warn('html2canvas falhou ou esgotou tempo, usando motor vetorial direto:', canvasErr);
        }
      }

      // If canvas was not used or did not produce output, generate vector PDF
      if (!canvasExported) {
        const pdf = generateVectorFallback();
        savePdfToFile(pdf, filename);
        showToast(`Relatório Executivo "${filename}" baixado com sucesso!`);
      }
    } catch (exportErr: any) {
      console.error('Falha geral ao exportar PDF:', exportErr);
      showToast('Tentando modo de recuperação de download...');
      try {
        const fallbackPdf = generateVectorFallback();
        savePdfToFile(fallbackPdf, filename);
        showToast(`Relatório Executivo "${filename}" baixado via motor de segurança!`);
      } catch (critErr) {
        showToast('Erro crítico ao gerar arquivo PDF. Verifique se o navegador permite downloads.');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // --- LÓGICA DO CHATBOT ---
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    const systemPrompt = `
      Você é a IA interna da agência analisando os relatórios da loja "${nomeLoja || 'Atual'}".
      Faturamento: R$ ${kpis.faturamento} | Gasto Ads: R$ ${kpis.gastoAds} | Vendas Ads: R$ ${kpis.vendasAds} | TACoS: ${kpis.tacos}% | ROAS: ${kpis.roas}
      Cancelamentos: ${cancelamentos.total} (${cancelamentos.taxa}%).
      Sangramentos (Ruins): ${critico.map((c) => c.nome).join(', ')}
      Gargalos de Orçamento: ${gargalos.map((g) => g.nome).join(', ')}
      Mensagem do usuário: ${userMsg}
    `;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: systemPrompt }),
      });
      if (!response.ok) throw new Error('API não conectada');
      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', content: data.reply || data.message || 'Resposta recebida.' },
      ]);
    } catch (error) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: `Estou pronto para ajudar! No momento, o backend da Fase 2 ainda não está conectado à Gemini API.\n\nMas vejo que o TACoS da conta está em ${kpis.tacos}%. Termos como "${
              critico.find((c) => c.tipo === 'termo')?.nome || 'Nenhum'
            }" precisam ser negativados.`,
          },
        ]);
        setIsTyping(false);
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApplyAction = (id: string, successLabel: string, toastText: string) => {
    setAppliedActions((prev) => ({ ...prev, [id]: successLabel }));
    showToast(toastText);
  };

  const filteredPlan = actionPlan.filter((item) => {
    return priorityFilter === 'all' || item.priority === priorityFilter;
  });

  const getPriorityBadge = (p: ActionPlanItem['priority']) => {
    switch (p) {
      case 'CRÍTICA':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'ALTA':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MÉDIA':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'BAIXA':
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Regra',
      'Prioridade',
      'Tipo de Alvo',
      'Identificador',
      'Problema',
      'Evidencia Numerica',
      'Acao Recomendada',
      'Risco e Hipotese',
      'Impacto Estimado',
      'Prazo',
      'Status',
    ];

    const rows = actionPlan.map((item) => [
      sanitizeCellValue(item.ruleCode || 'RULE-01'),
      sanitizeCellValue(item.priority),
      sanitizeCellValue(item.targetType),
      sanitizeCellValue(item.targetIdentifier),
      sanitizeCellValue(item.problem),
      sanitizeCellValue(item.numericalEvidence),
      sanitizeCellValue(item.suggestedAction),
      sanitizeCellValue(item.actionRisk),
      sanitizeCellValue(item.estimatedImpact),
      sanitizeCellValue(item.timeframe),
      sanitizeCellValue(item.status),
    ]);

    const csvContent =
      '\ufeff' +
      [
        headers.join(';'),
        ...rows.map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""').replace(/\n/g, ' ')}"`)
            .join(';')
        ),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plano_de_acao_bb_hub_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Planilha de ações em CSV exportada com sucesso!');
  };

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-slate-900 bg-slate-50 text-slate-800 dark:text-slate-100 p-2 sm:p-4 rounded-3xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-black px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 border border-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
          <span className="text-xs sm:text-sm">{toastMessage}</span>
        </div>
      )}

      {/* HEADER DA FERRAMENTA */}
      <header className="px-6 py-4 shadow-md flex justify-between items-center transition-colors dark:bg-slate-950 dark:border-b dark:border-slate-800 bg-slate-900 text-white rounded-2xl mb-6">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-500" size={28} />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            BB Hub <span className="font-light text-slate-400">| Gestão Amazon</span>
          </h1>
        </div>

        {/* data-html2canvas-ignore ESCONDE ESSES BOTÕES NO PDF */}
        <div className="flex items-center gap-3" data-html2canvas-ignore="true">
          <button
            onClick={handleToggleTheme}
            className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-700 dark:hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title="Alternar Tema Visual"
          >
            {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>

          <button
            onClick={handleExportCsv}
            title="Exportar CSV de Ações"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition px-3.5 py-2 rounded-lg font-medium text-sm cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handleResetAllData}
            title="Limpar todos os dados carregados e zerar o relatório"
            className="flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-200 transition px-3 py-2 rounded-lg font-medium text-sm cursor-pointer"
          >
            <Trash2 size={16} className="text-rose-400" />
            <span className="hidden sm:inline">Limpar Dados</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white transition px-4 py-2 rounded-lg font-medium text-sm shadow-md cursor-pointer"
            title="Salvar base para comparação mês a mês"
          >
            <Save size={16} />
            <span className="hidden sm:block">Salvar Histórico (.json)</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition px-4 py-2 rounded-lg font-medium text-sm shadow-md cursor-pointer"
          >
            {isExportingPdf ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Baixar Relatório Cliente (PDF)</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* PAINEL DE CONTROLE INTERNO (NÃO APARECE NO PDF DO CLIENTE) */}
      <div data-html2canvas-ignore="true" className="max-w-[1440px] mx-auto px-2 sm:px-6 mb-6">
        <section className="p-6 rounded-xl shadow-sm border flex flex-col xl:flex-row gap-6 justify-between transition-colors dark:bg-slate-800 dark:border-slate-700 bg-white border-slate-200">
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Target size={20} className="dark:text-blue-400 text-slate-600" />
                <span>Importador de Relatórios</span>
              </h2>
              <p className="text-sm dark:text-slate-400 text-slate-500">
                Arraste os arquivos brutos da Amazon + o histórico <b>.json</b> anterior para gerar o comparativo executivo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition text-sm font-medium shadow-sm">
                <UploadCloud size={18} />
                <span>Selecionar Planilhas Amazon</span>
                <input
                  type="file"
                  multiple
                  accept=".csv, .txt, .tsv, .json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <span
                className={`text-sm font-medium ${
                  uploadStatus.includes('sucesso') ||
                  uploadStatus.includes('carregados') ||
                  uploadStatus.includes('auditados') ||
                  uploadStatus.includes('importados')
                    ? 'text-green-500'
                    : 'dark:text-slate-400 text-slate-500'
                }`}
              >
                {uploadStatus}
              </span>
            </div>
            {/* Status de arquivos lidos */}
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(filesLoaded).map(([key, loaded]) => (
                <span
                  key={key}
                  className={`flex items-center gap-1 ${
                    loaded ? 'text-green-500' : 'dark:text-slate-600 text-slate-400'
                  }`}
                >
                  <CheckCircle size={12} /> {key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg border dark:bg-slate-900 dark:border-slate-700 bg-slate-50 border-slate-100">
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase mb-1 flex items-center gap-1 dark:text-slate-400 text-slate-500">
                <Store size={14} /> Cliente / Loja
              </label>
              <input
                type="text"
                placeholder="Nome do Cliente"
                value={nomeLoja}
                onChange={(e) => setNomeLoja(e.target.value)}
                className={`border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white bg-white border-slate-300 ${
                  !nomeLoja && 'border-red-400'
                }`}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase mb-1 dark:text-slate-400 text-slate-500">
                ROAS Mínimo
              </label>
              <input
                type="number"
                value={metaRoas}
                onChange={(e) => setMetaRoas(Number(e.target.value))}
                step="0.1"
                min="0.5"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white bg-white border-slate-300 font-bold"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase mb-1 dark:text-slate-400 text-slate-500">
                TACoS Máx (%)
              </label>
              <input
                type="number"
                value={metaTacos}
                onChange={(e) => setMetaTacos(Number(e.target.value))}
                step="0.1"
                min="1"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white bg-white border-slate-300 font-bold"
              />
            </div>
          </div>
        </section>
      </div>

      {/* --- RELATÓRIO EXECUTIVO CORPORATIVO (ÁREA CAPTURADA NO PDF) --- */}
      <main
        ref={dashboardRef}
        className="max-w-[1440px] mx-auto px-6 py-8 space-y-8 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl"
      >
        {/* CABEÇALHO DO RELATÓRIO PARA O CLIENTE */}
        <div className="border-b pb-6 dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm mb-1">
              <ShieldCheck size={18} /> Relatório Oficial de Desempenho na Amazon
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {nomeLoja ? nomeLoja : 'Visão Geral da Operação'}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Auditoria Automatizada BB Hub</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-end gap-1">
              <Calendar size={14} /> Referência: Setembro / Outubro 2026
            </p>
          </div>
        </div>

        {/* 1. SUMÁRIO DE INDICADORES (KPIs REVISADOS) */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            1. Indicadores Chave de Desempenho (KPIs Comerciais)
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl shadow-sm border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Faturamento Bruto
                </h4>
                <ShoppingCart size={16} className="text-slate-400" />
              </div>
              <p className="text-2xl font-bold flex items-center">
                {formatCurrency(kpis.faturamento)}{' '}
                {renderComparacao(kpis.faturamento, historico?.kpis?.faturamento)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Volume total vendido na plataforma
              </p>
            </div>

            <div className="p-5 rounded-xl shadow-sm border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Canais de Logística
                </h4>
                <Package size={16} className="text-orange-500" />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center">
                  FBA: {logistica.fba} {renderComparacao(logistica.fba, historico?.logistica?.fba)}
                </span>
                <span className="font-bold text-orange-600 dark:text-orange-400">DBA: {logistica.dba}</span>
              </div>
              <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">FBA (Full) vs DBA (Coleta)</p>
            </div>

            <div className="p-5 rounded-xl shadow-sm border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Receita Atribuída a Ads
                </h4>
                <TrendingUp size={16} className="text-blue-500" />
              </div>
              <p className="text-xl font-bold flex items-center">
                {formatCurrency(kpis.vendasAds)}{' '}
                {renderComparacao(kpis.vendasAds, historico?.kpis?.vendasAds)}
              </p>
              <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                {(kpis.faturamento > 0 ? (kpis.vendasAds / kpis.faturamento) * 100 : 0).toFixed(1)}% do
                faturamento total
              </p>
            </div>

            <div
              className={`p-5 rounded-xl shadow-sm border ${
                cancelamentos.taxa >= 5
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4
                  className={`text-xs font-semibold uppercase ${
                    cancelamentos.taxa >= 5
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Taxa de Cancelamento
                </h4>
                <XCircle
                  size={16}
                  className={cancelamentos.taxa >= 5 ? 'text-red-500' : 'text-slate-400'}
                />
              </div>
              <p
                className={`text-2xl font-bold flex items-center ${
                  cancelamentos.taxa >= 5 ? 'text-red-900 dark:text-red-400' : ''
                }`}
              >
                {cancelamentos.taxa}%{' '}
                {renderComparacao(cancelamentos.taxa, historico?.cancelamentos?.taxa, true)}
              </p>
              <p
                className={`text-xs mt-1 ${
                  cancelamentos.taxa >= 5
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {cancelamentos.total} pedidos recusados ou com boleto vencido
              </p>
            </div>

            <div className="p-5 rounded-xl shadow-sm border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Investimento em Anúncios
                </h4>
                <DollarSign size={16} className="text-red-500" />
              </div>
              <p className="text-xl font-bold flex items-center">
                {formatCurrency(kpis.gastoAds)}{' '}
                {renderComparacao(kpis.gastoAds, historico?.kpis?.gastoAds, true)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verba total investida em Sponsored Products / DMA
              </p>
            </div>

            <div
              className={`p-5 rounded-xl shadow-sm border ${
                kpis.tacos <= metaTacos
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <h4
                className={`text-xs font-semibold uppercase mb-2 ${
                  kpis.tacos <= metaTacos
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                TACoS Consolidado
              </h4>
              <p
                className={`text-2xl font-bold flex items-center ${
                  kpis.tacos <= metaTacos
                    ? 'text-green-900 dark:text-green-400'
                    : 'text-red-900 dark:text-red-400'
                }`}
              >
                {kpis.tacos}% {renderComparacao(kpis.tacos, historico?.kpis?.tacos, true)}
              </p>
              <p
                className={`text-xs mt-1 ${
                  kpis.tacos <= metaTacos
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                Custo de Ads sobre receita total (Meta: {metaTacos}%)
              </p>
            </div>

            <div
              className={`col-span-2 p-5 rounded-xl shadow-sm border ${
                kpis.roas >= metaRoas
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <h4
                className={`text-xs font-semibold uppercase mb-2 ${
                  kpis.roas >= metaRoas
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                ROAS Global (Retorno sobre Anúncios)
              </h4>
              <p
                className={`text-2xl font-bold flex items-center ${
                  kpis.roas >= metaRoas
                    ? 'text-green-900 dark:text-green-400'
                    : 'text-red-900 dark:text-red-400'
                }`}
              >
                {kpis.roas}x {renderComparacao(kpis.roas, historico?.kpis?.roas)}
              </p>
              <p
                className={`text-xs mt-1 ${
                  kpis.roas >= metaRoas
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                Para cada R$ 1 investido em campanhas, retornaram R$ {kpis.roas} em vendas (Meta:{' '}
                {metaRoas}x)
              </p>
            </div>
          </div>
        </section>

        {/* 2. PLANO DE AÇÃO E RECOMENDAÇÕES PARA O CLIENTE */}
        <section className="space-y-3 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            2. Plano de Ação Estratégico (Recomendações da Agência)
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="border-t-4 border-t-green-500 rounded-xl shadow-sm p-5 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-green-500" />
                <h4 className="font-bold text-base">Produtos em Destaque (Escalar)</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Itens com alta conversão e ROAS acima da meta.
              </p>
              <div className="space-y-2">
                {saudavel.length > 0 ? (
                  saudavel.map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 border-slate-100 shadow-xs"
                    >
                      <p className="font-semibold text-xs">{item.sku}</p>
                      <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">
                        Retorno:{' '}
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {item.roas}x
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhum SKU listado.</p>
                )}
              </div>
            </div>

            <div className="border-t-4 border-t-yellow-500 rounded-xl shadow-sm p-5 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-yellow-500" />
                <h4 className="font-bold text-base">Campanhas Limitadas</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Campanhas perdendo vendas por teto de orçamento.
              </p>

              <div
                data-html2canvas-ignore="true"
                className="p-2.5 mb-3 rounded-lg border border-yellow-200/50 bg-yellow-50 dark:bg-yellow-900/10"
              >
                <h5 className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 mb-1">
                  Simulador de Injeção
                </h5>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium">Extra: {formatCurrency(simuladorExtra)}/dia</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={simuladorExtra}
                  onChange={(e) => setSimuladorExtra(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <p className="text-[11px] mt-1 text-slate-600 dark:text-slate-400">
                  Potencial:{' '}
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(simuladorExtra * (kpis.roas || 5.02))}
                  </span>
                  /dia
                </p>
              </div>

              <div className="space-y-2">
                {gargalos.length > 0 ? (
                  gargalos.map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 border-slate-100 shadow-xs"
                    >
                      <p className="font-semibold text-xs truncate" title={item.nome}>
                        {item.nome}
                      </p>
                      <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">
                        Esgotou após{' '}
                        <span className="font-bold text-yellow-600 dark:text-yellow-500">
                          {(Number(item.tempo || 0) ?? 0).toFixed(0)}% do dia
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Sem gargalos detectados.</p>
                )}
              </div>
            </div>

            <div className="border-t-4 border-t-red-500 rounded-xl shadow-sm p-5 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertOctagon className="text-red-500" />
                <h4 className="font-bold text-base">Ajustes / Negativações</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Termos ou SKUs que geraram custo sem conversão.
              </p>
              <div className="space-y-2">
                {critico.length > 0 ? (
                  critico.map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 border-slate-100 shadow-xs"
                    >
                      <p className="font-semibold text-xs truncate" title={item.nome}>
                        {item.nome}
                      </p>
                      <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">
                        Gasto:{' '}
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(item.gasto)}
                        </span>
                        {item.tipo === 'sku' ? ` | ROAS: ${item.roas}x` : ` | ${item.cliques} cliques`}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Operação limpa sem desperdício.</p>
                )}
              </div>
            </div>

            <div className="border-t-4 border-t-orange-500 rounded-xl shadow-sm p-5 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="text-orange-500" />
                <h4 className="font-bold text-base">Análise de Pedidos</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                SKUs que acumularam maior volume de recusas.
              </p>
              <div className="space-y-2">
                {cancelamentos.topSkus.length > 0 ? (
                  cancelamentos.topSkus.map((item, i) => (
                    <div
                      key={i}
                      className="p-2.5 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 border-slate-100 shadow-xs"
                    >
                      <p className="font-semibold text-xs truncate" title={item.sku}>
                        {item.sku}
                      </p>
                      <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">
                        Recusas:{' '}
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {item.count} pedidos
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhum alerta de cancelamento.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MATRIZ ESTRATÉGICA RASTREÁVEL DETALHADA */}
        <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border dark:bg-slate-800 dark:border-slate-700 bg-white border-slate-200">
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-blue-500" />
                <span>Matriz Rastreável do Plano de Ação — Detalhamento Enterprise</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Regras determinísticas auditáveis, evidências numéricas e gestão de risco
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white bg-slate-50 border-slate-300 text-slate-800"
              >
                <option value="all">Todas as Prioridades ({actionPlan.length})</option>
                <option value="CRÍTICA">Prioridade Crítica</option>
                <option value="ALTA">Prioridade Alta</option>
                <option value="MÉDIA">Prioridade Média</option>
                <option value="BAIXA">Prioridade Baixa</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPlan.map((item) => {
              const isDone = item.status === 'Concluído';

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-5 shadow-sm transition-all ${
                    isDone
                      ? 'border-slate-200 dark:border-slate-700 opacity-60 bg-slate-100 dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-black uppercase border ${getPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded border dark:text-slate-400 dark:bg-slate-900 dark:border-slate-700 text-slate-600 bg-slate-100 border-slate-300">
                        {item.ruleCode || 'RULE-01'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded border dark:text-amber-300 dark:bg-slate-900 dark:border-slate-700 text-amber-700 bg-amber-50 border-amber-200">
                        {item.targetType}: {item.targetIdentifier}
                      </span>
                      <span className="text-xs text-slate-400">
                        Prazo: <strong className="dark:text-white text-slate-800">{item.timeframe}</strong>
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleStatus(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-200 border border-slate-700 bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{isDone ? 'Concluído' : 'Marcar Concluído'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block uppercase tracking-wider mb-1">
                        Problema:
                      </span>
                      <p className="dark:text-white text-slate-800 leading-relaxed font-medium">
                        {item.problem}
                      </p>
                      <div className="mt-2 p-2.5 rounded-lg border font-mono dark:bg-slate-900 dark:border-slate-700 bg-slate-50 border-slate-200">
                        <span className="text-amber-500 font-bold block mb-0.5 font-sans">
                          Evidência Numérica:
                        </span>
                        <span className="dark:text-slate-200 text-slate-700">{item.numericalEvidence}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-emerald-500 font-bold block uppercase tracking-wider mb-1">
                          Ação Recomendada:
                        </span>
                        <p className="dark:text-white text-slate-800 leading-relaxed font-semibold">
                          {item.suggestedAction}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-lg border dark:bg-slate-900 dark:border-slate-700 bg-slate-50 border-slate-200 space-y-1">
                        <p>
                          <strong className="text-rose-400">Risco:</strong>{' '}
                          <span className="dark:text-slate-300 text-slate-600">{item.actionRisk}</span>
                        </p>
                        <p>
                          <strong className="text-emerald-400">Impacto Estimado:</strong>{' '}
                          <span className="text-emerald-500 font-bold">{item.estimatedImpact}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* --- WIDGET DO CHATBOT (NotebookLM Like) --- */}
      <div data-html2canvas-ignore="true" className="fixed bottom-6 right-6 z-50">
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-[340px] sm:w-[400px] h-[32rem] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <h3 className="font-bold">Assistente BB Hub</h3>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="hover:bg-blue-700 p-1 rounded-md transition cursor-pointer"
                title="Fechar Chat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-lg text-sm max-w-[80%] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Bot size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-bl-none shadow-sm flex gap-1 items-center">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    ></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleChatSubmit}
              className="p-3 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ex: Quais SKUs devo pausar?"
                className="flex-1 border dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isTyping || !chatInput.trim()}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center cursor-pointer"
                title="Enviar mensagem"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center justify-center cursor-pointer"
          title={isChatOpen ? 'Fechar Assistente IA' : 'Abrir Assistente IA'}
        >
          {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
}

// Named export for compatibility
export { ActionPlanView };
