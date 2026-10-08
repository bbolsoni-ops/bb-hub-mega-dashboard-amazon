import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  parseCsvFile,
  processRawRows,
  detectReportType,
  COLUMN_SYNONYMS,
  normalizeCol,
  validateReportColumns,
  readSpreadsheetFile,
  consolidateCampaigns,
} from '../utils/csvParser';
import {
  ReportType,
  FileAuditInfo,
  ParsedDataset,
  AnalysisSessionConfig,
} from '../types/amazon';

const FIELD_LABELS: Record<string, { label: string; field: string; type: string }> = {
  buyBoxPercentage: { label: 'Buy Box / Oferta em destaque', field: 'buyBoxPercentage', type: 'percentage (0-100)' },
  unitSessionPercentage: { label: 'Taxa de conversão comercial', field: 'unitSessionPercentage', type: 'percentage (0-100)' },
  ordered_product_sales: { label: 'Vendas de produtos pedidos', field: 'orderedProductSales', type: 'currency' },
  units_ordered: { label: 'Unidades pedidas', field: 'unitsOrdered', type: 'integer' },
  total_order_items: { label: 'Itens do pedido', field: 'totalOrderItems', type: 'integer' },
  sessions: { label: 'Sessões de tráfego', field: 'sessions', type: 'integer' },
  page_views: { label: 'Visualizações de página', field: 'pageViews', type: 'integer' },
  amazon_order_id: { label: 'Número do pedido', field: 'amazonOrderId', type: 'string' },
  sku: { label: 'Código SKU', field: 'sku', type: 'string' },
  asin: { label: 'Código ASIN', field: 'asin', type: 'string' },
  item_price: { label: 'Preço do item', field: 'itemPrice', type: 'currency' },
  spend: { label: 'Investimento em anúncios', field: 'spend', type: 'currency' },
  sales_ads: { label: 'Vendas de anúncios', field: 'sales', type: 'currency' },
  budget: { label: 'Orçamento da campanha', field: 'budget', type: 'currency' },
  acos: { label: 'ACoS', field: 'acos', type: 'percentage (0-100)' },
  roas: { label: 'ROAS', field: 'roas', type: 'decimal' },
  ctr: { label: 'CTR (Taxa de cliques)', field: 'ctr', type: 'percentage (0-100)' },
  cvr: { label: 'CVR (Conversão Ads)', field: 'cvr', type: 'percentage (0-100)' },
  tacos: { label: 'TACoS global', field: 'tacos', type: 'percentage (0-100)' },
};

function getColumnMappingDiagnostic(col: string): { internalField: string; displayType: string } | null {
  const norm = normalizeCol(col);
  for (const [canonicalKey, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    if (synonyms.some((s) => {
      const normSyn = normalizeCol(s);
      return norm === normSyn || norm.includes(normSyn) || normSyn.includes(norm);
    })) {
      const info = FIELD_LABELS[canonicalKey];
      return {
        internalField: info ? info.field : canonicalKey,
        displayType: info ? info.type : 'reconhecido',
      };
    }
  }
  return null;
}

interface InspectionMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmAnalysis: (newDataset: ParsedDataset) => void;
  existingDataset: ParsedDataset;
}

export const InspectionMappingModal: React.FC<InspectionMappingModalProps> = ({
  isOpen,
  onClose,
  onConfirmAnalysis,
  existingDataset,
}) => {
  // Wizard steps: 1 = Configuração, 2 = Inspeção, 3 = Mapeamento & Confirmação
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Session Configuration
  const [accountName, setAccountName] = useState<string>(
    existingDataset.sessionConfig?.accountName || 'Loja Principal / Conta Alpha'
  );
  const [timezone, setTimezone] = useState<string>(
    existingDataset.sessionConfig?.timezone || 'America/Sao_Paulo'
  );
  const [startDate, setStartDate] = useState<string>(
    existingDataset.sessionConfig?.startDate || ''
  );
  const [endDate, setEndDate] = useState<string>(
    existingDataset.sessionConfig?.endDate || ''
  );
  const [primaryAdsSource, setPrimaryAdsSource] = useState<'campaigns' | 'search_terms'>(
    existingDataset.sessionConfig?.primaryAdsSource || 'campaigns'
  );

  // Step 2: Staged Files Inspection
  const [stagedFiles, setStagedFiles] = useState<{
    audit: FileAuditInfo;
    rawText: string;
    rawRows: any[];
    selectedEncoding: string;
    selectedDelimiter: string;
    importStrategy: 'replace' | 'append';
  }[]>([]);

  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file uploads with encoding and delimiter detection
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newStaged: typeof stagedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { text, isExcel } = await readSpreadsheetFile(file);
        const { audit, rows } = parseCsvFile(text, file.name, file.size, {
          startDate,
          endDate,
        });

        newStaged.push({
          audit,
          rawText: text,
          rawRows: rows,
          selectedEncoding: isExcel ? 'Excel / UTF-8' : (audit.encoding || 'UTF-8'),
          selectedDelimiter: audit.delimiter || ',',
          importStrategy: 'replace',
        });
      } catch (err) {
        console.error('Erro ao ler arquivo:', file.name, err);
      }
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    if (stagedFiles.length === 0 && newStaged.length > 0) {
      setActiveFileIndex(0);
    }
  };

  const handleRemoveFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    if (activeFileIndex >= stagedFiles.length - 1) {
      setActiveFileIndex(Math.max(0, stagedFiles.length - 2));
    }
  };

  const handleUpdateFileType = (index: number, newType: ReportType) => {
    setStagedFiles((prev) => {
      const next = [...prev];
      next[index].audit.type = newType;
      const detected = detectReportType(next[index].audit.detectedColumns);
      next[index].audit.typeLabel = detected.type === newType ? detected.label : `Relatório: ${newType}`;

      // Revalidate columns against new report type
      const columnValidation = validateReportColumns(newType, next[index].audit.detectedColumns);
      next[index].audit.columnValidation = columnValidation;
      next[index].audit.missingCrucialColumns = columnValidation.criticalMissing;

      if (columnValidation.hasBlockingErrors) {
        next[index].audit.status = 'error';
        next[index].audit.statusMessage = `Bloqueio: ${columnValidation.criticalMissing.join('; ')} ausente(s)`;
      } else if (columnValidation.warningsMissing.length > 0) {
        next[index].audit.status = 'warning';
        next[index].audit.statusMessage = `Atenção: ${columnValidation.warningsMissing.join('; ')} ausente(s)`;
      } else {
        next[index].audit.status = next[index].rawRows.length > 0 ? 'valid' : 'warning';
        next[index].audit.statusMessage = 'Arquivo validado com sucesso';
      }

      return next;
    });
  };

  const handleUpdateFilePeriod = (index: number, start: string, end: string) => {
    setStagedFiles((prev) => {
      const next = [...prev];
      next[index].audit.userSpecifiedPeriod = { startDate: start, endDate: end };
      next[index].audit.dateMin = start;
      next[index].audit.dateMax = end;
      return next;
    });
  };

  const handleReParseWithSettings = (index: number, encoding: string, delimiter: string) => {
    setStagedFiles((prev) => {
      const next = [...prev];
      const target = next[index];
      const { audit, rows } = parseCsvFile(
        target.rawText,
        target.audit.name,
        target.audit.sizeBytes,
        target.audit.userSpecifiedPeriod,
        encoding
      );
      audit.delimiter = delimiter;
      next[index] = {
        ...target,
        audit,
        rawRows: rows,
        selectedEncoding: encoding,
        selectedDelimiter: delimiter,
      };
      return next;
    });
  };

  // Final confirmation: build dataset and trigger local reconciliation
  const handleFinalConfirm = () => {
    const finalDataset: ParsedDataset = {
      sessionConfig: {
        accountName: accountName.trim() || 'Conta Principal / Loja Alpha',
        timezone,
        startDate,
        endDate,
        currency: 'BRL',
        primaryAdsSource,
        recalculatedAt: new Date().toISOString(),
        consentSavePreferences: true,
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

    for (const staged of stagedFiles) {
      const processed = processRawRows(staged.audit.type, staged.rawRows, staged.audit.name);
      finalDataset.auditFiles.push(staged.audit);

      switch (staged.audit.type) {
        case 'business_date':
          finalDataset.businessDays.push(...processed);
          break;
        case 'business_sku':
          finalDataset.businessSkus.push(...processed);
          break;
        case 'orders_purchase_date':
        case 'orders_last_updated':
          finalDataset.orders.push(...processed);
          break;
        case 'ads_campaigns':
        case 'ads_budgets':
          finalDataset.campaigns.push(...processed);
          break;
        case 'ads_search_terms':
          finalDataset.searchTerms.push(...processed);
          break;
        case 'ads_targeting':
          finalDataset.targets.push(...processed);
          break;
        case 'ads_advertised_products':
          finalDataset.advertisedProducts.push(...processed);
          break;
        case 'settlement_cogs':
          finalDataset.cogsList.push(...processed);
          break;
        case 'commission_preview':
          finalDataset.commissionPreview!.push(...processed);
          break;
        case 'rentabilidade_real':
          if (!finalDataset.rentabilidadeReal) finalDataset.rentabilidadeReal = [];
          finalDataset.rentabilidadeReal.push(...processed);
          break;
      }
    }

    // Consolidate campaigns by name (aggregating daily breakdowns and merging budget details)
    finalDataset.campaigns = consolidateCampaigns(finalDataset.campaigns);

    onConfirmAnalysis(finalDataset);
    onClose();
  };

  const currentFile = stagedFiles[activeFileIndex];
  const blockingFiles = stagedFiles.filter(
    (f) => f.audit.status === 'error' || f.audit.columnValidation?.hasBlockingErrors
  );
  const hasBlockingErrors = blockingFiles.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-hidden modal-overlay">
      <div className="bg-[#0f172a] border border-[#243554] rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden modal-container">
        {/* Modal Header */}
        <div className="bg-[#111c30] border-b border-[#243554] px-5 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-black">
              {step === 1 ? '1' : step === 2 ? '2' : '3'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {step === 1 && 'Etapa 1: Configurar Escopo da Análise Local'}
                {step === 2 && 'Etapa 2: Inspeção & Auditoria dos Arquivos'}
                {step === 3 && 'Etapa 3: Mapeamento de Colunas & Confirmação'}
              </h2>
              <p className="text-xs text-slate-400">
                100% Client-Side • Seus dados não são enviados a nenhum servidor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#1e2f4a] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {/* ================= STEP 1: CONFIGURATION ================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-[#152238] p-5 rounded-2xl border border-[#243554] space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Identificador da Conta & Período de Análise
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">
                      Nome / Identificador Local da Conta (sem PII):
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Ex: Loja Principal / Matriz SP"
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Usado apenas como rótulo visual na sua tela e relatórios offline.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">
                      Fuso Horário Oficial:
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
                    >
                      <option value="America/Sao_Paulo">America/Sao_Paulo (Horário de Brasília - UTC-3)</option>
                      <option value="America/Manaus">America/Manaus (UTC-4)</option>
                      <option value="UTC">UTC (Universal Time)</option>
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Evita deslocamento involuntário de dias em datas sem horário.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">
                      Data Início do Período de Análise (Opcional):
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">
                      Data Fim do Período de Análise (Opcional):
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-[#243554] hover:border-cyan-500/50 bg-[#111c30]/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  multiple
                  accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm"
                  ref={fileInputRef}
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Arraste suas planilhas Excel (.xlsx/.xls) ou CSV/TSV aqui ou clique para selecionar
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Suporta Relatórios Comerciais, Todos os Pedidos e Amazon Ads (Campanhas, Orçamentos, Termos de Pesquisa, Produtos)
                  </p>
                </div>
                <span className="text-[11px] text-cyan-300 bg-cyan-950/80 border border-cyan-800/40 px-3 py-1 rounded-full font-bold">
                  Formatos aceitos: Excel (.xlsx, .xls), CSV, TSV • UTF-8, Windows-1252 • Vírgula, ponto-e-vírgula ou tab
                </span>
              </div>

              {/* Staged files count notice */}
              {stagedFiles.length > 0 && (
                <div className="bg-[#0f1a2d] p-4 rounded-2xl border border-emerald-500/30 flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {stagedFiles.length} arquivo(s) carregados para inspeção.
                  </span>
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black transition cursor-pointer"
                  >
                    Avançar para Inspeção →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: INSPECTION ================= */}
          {step === 2 && stagedFiles.length > 0 && (
            <div className="space-y-6">
              {/* File switcher tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#243554]">
                {stagedFiles.map((f, idx) => {
                  const isFileBlocking = f.audit.status === 'error' || f.audit.columnValidation?.hasBlockingErrors;
                  const isFileWarning = f.audit.status === 'warning' || (f.audit.columnValidation?.warningsMissingCount || 0) > 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveFileIndex(idx)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                        activeFileIndex === idx
                          ? isFileBlocking
                            ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/30 ring-2 ring-rose-400'
                            : 'bg-cyan-500 text-slate-950 font-black'
                          : isFileBlocking
                          ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-rose-900/50'
                          : 'bg-[#152238] text-slate-300 hover:bg-[#1e2f4a]'
                      }`}
                    >
                      {isFileBlocking ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{f.audit.name}</span>
                      {isFileBlocking && (
                        <span className="bg-rose-900 text-rose-200 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                          Coluna Ausente
                        </span>
                      )}
                      <span className="text-[10px] opacity-75">({f.audit.rowCount} lin.)</span>
                    </button>
                  );
                })}
              </div>

              {/* Active file inspection card */}
              {currentFile && (
                <div className="bg-[#152238] p-5 sm:p-6 rounded-2xl border border-[#243554] space-y-5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#243554]">
                    <div>
                      <h3 className="text-base font-black text-white font-mono">{currentFile.audit.name}</h3>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Tamanho: {(currentFile.audit.sizeBytes ? (currentFile.audit.sizeBytes / 1024).toFixed(1) : '0')} KB • {currentFile.audit.rowCount} linhas de dados • {currentFile.audit.colCount} colunas
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemoveFile(activeFileIndex)}
                        className="text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>

                  {/* Settings grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Tipo de Relatório Detectado:</label>
                      <select
                        value={currentFile.audit.type}
                        onChange={(e) => handleUpdateFileType(activeFileIndex, e.target.value as ReportType)}
                        className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-medium"
                      >
                        <option value="business_date">Relatório Comercial por Data (Business Report)</option>
                        <option value="business_sku">Relatório Comercial por SKU/ASIN</option>
                        <option value="orders_purchase_date">Todos os Pedidos (Data da Compra)</option>
                        <option value="orders_last_updated">Todos os Pedidos (Por Atualização)</option>
                        <option value="ads_campaigns">Amazon Ads — Campanhas & Orçamentos (Fonte Mestre)</option>
                        <option value="ads_budgets">Amazon Ads — Orçamentos (Budgets)</option>
                        <option value="ads_search_terms">Amazon Ads — Termos de Pesquisa</option>
                        <option value="ads_targeting">Amazon Ads — Segmentação / Alvos</option>
                        <option value="ads_advertised_products">Amazon Ads — Produtos Anunciados</option>
                        <option value="settlement_cogs">Custos Unitários (COGS)</option>
                        <option value="commission_preview">Visualização de Tarifa/Comissão Amazon (Preview)</option>
                        <option value="rentabilidade_real">Relatório de Rentabilidade Real Amazon (XLSX Oficial)</option>
                        <option value="unknown">Outro / Desconhecido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Encoding:</label>
                      <select
                        value={currentFile.selectedEncoding}
                        onChange={(e) =>
                          handleReParseWithSettings(activeFileIndex, e.target.value, currentFile.selectedDelimiter)
                        }
                        className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-medium"
                      >
                        <option value="UTF-8">UTF-8</option>
                        <option value="UTF-8-BOM">UTF-8 com BOM</option>
                        <option value="UTF-16">UTF-16</option>
                        <option value="Windows-1252">Windows-1252 / ISO-8859-1</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Delimitador:</label>
                      <select
                        value={currentFile.selectedDelimiter}
                        onChange={(e) =>
                          handleReParseWithSettings(activeFileIndex, currentFile.selectedEncoding, e.target.value)
                        }
                        className="w-full bg-[#0f1a2d] border border-[#243554] rounded-xl px-3 py-2 text-white font-medium"
                      >
                        <option value=",">Vírgula (,)</option>
                        <option value=";">Ponto-e-vírgula (;)</option>
                        <option value="&#9;">Tabulação (\t)</option>
                      </select>
                    </div>
                  </div>

                  {/* Period Detection or Required Manual Input */}
                  <div className="bg-[#0f1a2d] p-4 rounded-xl border border-[#1e2f4a]">
                    {currentFile.audit.hasDateColumn ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-300">
                        <span className="flex items-center gap-2 font-bold">
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          Período detectado nas linhas do arquivo:
                        </span>
                        <span className="font-mono bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/40 text-white font-black">
                          {currentFile.audit.dateMin || 'Início'} até {currentFile.audit.dateMax || 'Fim'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-300 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>Este relatório é agregado e NÃO possui coluna de data nas linhas.</span>
                        </div>
                        <p className="text-slate-400 text-xs">
                          O período NÃO foi detectado automaticamente. Por favor, confirme o intervalo fechado coberto pelo arquivo:
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <input
                            type="date"
                            value={currentFile.audit.dateMin || startDate}
                            onChange={(e) =>
                              handleUpdateFilePeriod(
                                activeFileIndex,
                                e.target.value,
                                currentFile.audit.dateMax || endDate
                              )
                            }
                            className="bg-[#111c30] border border-[#243554] rounded-lg px-3 py-1.5 text-white"
                          />
                          <span className="text-slate-400 font-bold">até</span>
                          <input
                            type="date"
                            value={currentFile.audit.dateMax || endDate}
                            onChange={(e) =>
                              handleUpdateFilePeriod(
                                activeFileIndex,
                                currentFile.audit.dateMin || startDate,
                                e.target.value
                              )
                            }
                            className="bg-[#111c30] border border-[#243554] rounded-lg px-3 py-1.5 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column Validation Status Card */}
                  {currentFile.audit.columnValidation && (
                    <div
                      className={`p-4 rounded-xl border ${
                        currentFile.audit.columnValidation.hasBlockingErrors
                          ? 'bg-rose-950/30 border-rose-500/50 shadow-inner'
                          : currentFile.audit.columnValidation.warningsMissingCount > 0
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-emerald-950/20 border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {currentFile.audit.columnValidation.hasBlockingErrors ? (
                            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                          ) : currentFile.audit.columnValidation.warningsMissingCount > 0 ? (
                            <Info className="w-5 h-5 text-amber-400 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          )}
                          <div>
                            <h4 className="font-black text-sm text-white flex items-center gap-2 flex-wrap">
                              <span>Validação de Colunas Obrigatórias</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  currentFile.audit.columnValidation.hasBlockingErrors
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : currentFile.audit.columnValidation.warningsMissingCount > 0
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {currentFile.audit.columnValidation.hasBlockingErrors
                                  ? `🚨 ${currentFile.audit.columnValidation.criticalMissingCount} Crítica(s) Ausente(s)`
                                  : '✅ Colunas Essenciais Mapeadas'}
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                              {currentFile.audit.columnValidation.summaryMessage}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Rules list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                        {currentFile.audit.columnValidation.rules.map((rule, rIdx) => (
                          <div
                            key={rIdx}
                            className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-1.5 ${
                              rule.satisfied
                                ? 'bg-[#0f1a2d]/80 border-emerald-500/30'
                                : rule.isMandatory
                                ? 'bg-rose-950/50 border-rose-500/60 shadow-sm ring-1 ring-rose-500/20'
                                : 'bg-amber-950/20 border-amber-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                {rule.satisfied ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : rule.isMandatory ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                ) : (
                                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                )}
                                {rule.fieldLabel}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  rule.isMandatory
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-slate-700/50 text-slate-400'
                                }`}
                              >
                                {rule.isMandatory ? 'Obrigatória' : 'Recomendada'}
                              </span>
                            </div>

                            <div className="text-[11px] mt-0.5">
                              {rule.satisfied ? (
                                <span className="text-emerald-300 font-mono">
                                  Coluna no arquivo: <strong className="text-white">"{rule.matchedHeader}"</strong>
                                </span>
                              ) : (
                                <div className="text-rose-200">
                                  <span className="font-bold text-rose-300 block">Coluna não localizada no cabeçalho!</span>
                                  <span className="text-slate-400 block text-[10px] mt-0.5">
                                    Sinônimos aceitos: {rule.synonymsExpected.slice(0, 4).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-400 italic mt-0.5">
                              {rule.explanation}
                            </p>
                          </div>
                        ))}
                      </div>

                      {currentFile.audit.columnValidation.hasBlockingErrors && (
                        <div className="mt-3 p-3 rounded-lg bg-rose-900/40 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <strong>Bloqueio de Cálculo:</strong> Este arquivo não possui as colunas críticas necessárias para o cálculo do relatório "{currentFile.audit.typeLabel}". Caso este arquivo pertença a outro relatório, altere o seletor "Tipo de Relatório Detectado" acima para revalidar.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Diagnóstico de Mapeamento de Colunas (Coluna Original → Campo Interno) */}
                  <div className="bg-[#0f1a2d] border border-[#243554] rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                        <span>Diagnóstico de Importação: Mapeamento de Colunas (Original → Interno)</span>
                      </h4>
                      <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                        {currentFile.audit.detectedColumns.length} colunas detectadas
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {currentFile.audit.detectedColumns.map((col, idx) => {
                        const diag = getColumnMappingDiagnostic(col);
                        return (
                          <div
                            key={idx}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono border flex items-center gap-1.5 ${
                              diag
                                ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-200'
                                : 'bg-[#152238] border-slate-700/60 text-slate-400'
                            }`}
                          >
                            <span className="font-bold text-white max-w-[130px] truncate" title={col}>
                              "{col}"
                            </span>
                            <span className="text-cyan-400">→</span>
                            <span className="font-bold text-amber-300">
                              {diag ? diag.internalField : 'campo livre'}
                            </span>
                            {diag && (
                              <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">
                                {diag.displayType}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sample Rows Preview */}
                  <div>
                    <h4 className="font-bold text-slate-300 mb-2">Amostra Segura das Primeiras Linhas:</h4>
                    <div className="overflow-x-auto border border-[#1e2f4a] rounded-xl bg-[#0a0f1d]">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#111c30] text-slate-400 uppercase font-bold border-b border-[#1e2f4a]">
                          <tr>
                            {currentFile.audit.detectedColumns.slice(0, 7).map((col, idx) => {
                              const diag = getColumnMappingDiagnostic(col);
                              return (
                                <th key={idx} className="py-2 px-3 whitespace-nowrap">
                                  <span className="block text-white font-bold">{col}</span>
                                  <span className="block text-[9px] text-cyan-400 font-mono font-normal">
                                    → {diag ? diag.internalField : 'adicional'}
                                  </span>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e2f4a] text-slate-300">
                          {currentFile.rawRows.slice(0, 3).map((r, rIdx) => (
                            <tr key={rIdx}>
                              {currentFile.audit.detectedColumns.slice(0, 7).map((col, cIdx) => (
                                <td key={cIdx} className="py-1.5 px-3 truncate max-w-[150px] font-mono">
                                  {String(r[col] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: MAPPING & CONFIRMATION ================= */}
          {step === 3 && (
            <div className="space-y-6 text-xs">
              {hasBlockingErrors && (
                <div className="bg-rose-950/40 border-2 border-rose-500/80 p-5 rounded-2xl flex items-start gap-3.5 shadow-xl">
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-sm font-black text-rose-200 uppercase tracking-wide">
                      🚨 Cálculo Bloqueado: Colunas Críticas Ausentes ({blockingFiles.length} arquivo{blockingFiles.length > 1 ? 's' : ''})
                    </h4>
                    <p className="text-xs text-rose-100/90 leading-relaxed">
                      Não é seguro executar o cálculo da conta porque foram identificados arquivos sem as colunas mínimas exigidas pela Amazon (ex: falta de ASIN/SKU em produtos, ou falta de identificador do pedido e datas). Prossiga apenas após corrigir o mapeamento ou substituir os arquivos para evitar métricas nulas ou corrompidas.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          const errIdx = stagedFiles.findIndex(
                            (f) => f.audit.status === 'error' || f.audit.columnValidation?.hasBlockingErrors
                          );
                          if (errIdx >= 0) setActiveFileIndex(errIdx);
                          setStep(2);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar para Etapa 2 e Corrigir Arquivos</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#152238] p-5 rounded-2xl border border-[#243554] space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                  Resumo das Fontes Consolidadas & Status de Validação
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Confira as fontes que serão processadas localmente. Apenas dados auditados e validados alimentarão os KPIs do painel:
                </p>

                <div className="space-y-2">
                  {stagedFiles.map((f, idx) => {
                    const isBlocking = f.audit.status === 'error' || f.audit.columnValidation?.hasBlockingErrors;
                    const isWarning = f.audit.status === 'warning' || (f.audit.columnValidation?.warningsMissingCount || 0) > 0;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                          isBlocking
                            ? 'bg-rose-950/40 border-rose-500/60 shadow-sm'
                            : isWarning
                            ? 'bg-[#0f1a2d] border-amber-500/30'
                            : 'bg-[#0f1a2d] border-[#1e2f4a]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {isBlocking ? (
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            <span className="font-bold text-white font-mono">{f.audit.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {f.audit.typeLabel} • {f.audit.rowCount} linhas • {f.audit.colCount} colunas
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isBlocking ? (
                            <>
                              <span className="bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-lg font-bold text-[10px] border border-rose-500/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>Bloqueado: {f.audit.columnValidation?.criticalMissing.join('; ') || 'Colunas ausentes'}</span>
                              </span>
                              <button
                                onClick={() => {
                                  setActiveFileIndex(idx);
                                  setStep(2);
                                }}
                                className="text-cyan-400 hover:text-cyan-300 font-bold text-[11px] underline cursor-pointer"
                              >
                                Corrigir →
                              </button>
                            </>
                          ) : isWarning ? (
                            <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-amber-400/30">
                              Válido com Avisos
                            </span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] border border-emerald-400/30">
                              Pronto para Reconciliação
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#111c30] p-4 rounded-xl border border-cyan-500/30 text-slate-300 space-y-1">
                <strong className="text-cyan-300 block">Regra Mestre de Reconciliação BB Hub:</strong>
                <p className="text-xs">
                  • Gasto de Ads consolidado exclusivamente a partir do Relatório de Campanhas (para evitar duplicidade com relatórios de termos e segmentação).
                  <br />• Faturamento Comercial (Business Report) e Faturamento Operacional (All Orders) mantidos em raias separadas com cálculo explícito de divergência.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#111c30] border-t border-[#243554] px-5 sm:px-8 py-4 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1b2b46] hover:bg-[#253a5e] text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as any)}
                disabled={stagedFiles.length === 0}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs transition shadow cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : hasBlockingErrors ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const errIdx = stagedFiles.findIndex(
                      (f) => f.audit.status === 'error' || f.audit.columnValidation?.hasBlockingErrors
                    );
                    if (errIdx >= 0) setActiveFileIndex(errIdx);
                    setStep(2);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar e Corrigir Arquivos ({blockingFiles.length})</span>
                </button>
                <button
                  disabled
                  title="Cálculo bloqueado: corrija as colunas obrigatórias dos arquivos na Etapa 2 antes de calcular."
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-rose-500/40 text-rose-300 font-bold text-xs opacity-60 cursor-not-allowed shadow-none"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Cálculo Bloqueado (Colunas Ausentes)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleFinalConfirm}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar & Executar Análise Local</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
