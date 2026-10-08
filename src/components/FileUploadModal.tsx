import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  X,
  FileCheck,
  ClipboardPaste,
  Sparkles,
} from 'lucide-react';
import {
  parseCsvFile,
  processRawRows,
  validateReportColumns,
  readSpreadsheetFile,
  consolidateCampaigns,
} from '../utils/csvParser';
import { FileAuditInfo, ReportType, ParsedDataset } from '../types/amazon';
import { buildUserRealDataset } from '../utils/rawChatData';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesProcessed: (dataset: ParsedDataset) => void;
  existingAudits: FileAuditInfo[];
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onFilesProcessed,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<{
    audit: FileAuditInfo;
    rawRows: any[];
  }[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [pastedName, setPastedName] = useState('relatorio_colado.csv');
  const [pasteError, setPasteError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newStaged: typeof stagedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const { text } = await readSpreadsheetFile(file);
        const { audit, rows } = parseCsvFile(text, file.name);
        newStaged.push({
          audit,
          rawRows: rows,
        });
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) {
      setPasteError('Cole o conteúdo da planilha ou relatório no campo.');
      return;
    }
    setPasteError('');
    try {
      const name = pastedName.trim() || 'relatorio_manual.csv';
      const { audit, rows } = parseCsvFile(pastedText, name);
      if (rows.length === 0) {
        setPasteError('Nenhuma linha de dados válida detectada no texto colado.');
        return;
      }
      setStagedFiles((prev) => [
        ...prev,
        {
          audit,
          rawRows: rows,
        },
      ]);
      setPastedText('');
      setActiveTab('upload');
    } catch {
      setPasteError('Erro ao interpretar o texto colado. Verifique os cabeçalhos.');
    }
  };

  const handleLoadChatData = () => {
    const realDataset = buildUserRealDataset();
    onFilesProcessed(realDataset);
    onClose();
  };

  const handleTypeChange = (index: number, newType: ReportType) => {
    setStagedFiles((prev) => {
      const next = [...prev];
      next[index].audit.type = newType;
      const val = validateReportColumns(newType, next[index].audit.detectedColumns);
      next[index].audit.columnValidation = val;
      next[index].audit.missingCrucialColumns = val.criticalMissing;
      if (val.hasBlockingErrors) {
        next[index].audit.status = 'error';
        next[index].audit.statusMessage = `Bloqueio: ${val.criticalMissing.join('; ')} ausente(s)`;
      } else {
        next[index].audit.status = next[index].rawRows.length > 0 ? 'valid' : 'warning';
      }
      return next;
    });
  };

  const handleRemoveStaged = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    const dataset: ParsedDataset = {
      sessionConfig: {
        accountName: 'Loja Principal',
        timezone: 'America/Sao_Paulo',
        startDate: '',
        endDate: '',
        currency: 'BRL',
        primaryAdsSource: 'campaigns',
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
      auditFiles: stagedFiles.map((s) => s.audit),
    };

    for (const staged of stagedFiles) {
      const processed = processRawRows(staged.audit.type, staged.rawRows, staged.audit.name);
      if (staged.audit.type === 'business_date') dataset.businessDays.push(...processed);
      if (staged.audit.type === 'business_sku') dataset.businessSkus.push(...processed);
      if (staged.audit.type === 'orders_purchase_date' || staged.audit.type === 'orders_last_updated') dataset.orders.push(...processed);
      if (staged.audit.type === 'ads_campaigns' || staged.audit.type === 'ads_budgets') dataset.campaigns.push(...processed);
      if (staged.audit.type === 'ads_search_terms') dataset.searchTerms.push(...processed);
      if (staged.audit.type === 'ads_targeting') dataset.targets.push(...processed);
      if (staged.audit.type === 'ads_advertised_products') dataset.advertisedProducts.push(...processed);
      if (staged.audit.type === 'settlement_cogs') dataset.cogsList.push(...processed);
    }

    dataset.campaigns = consolidateCampaigns(dataset.campaigns);

    onFilesProcessed(dataset);
    onClose();
  };

  const supportedTypes: { type: ReportType; label: string }[] = [
    { type: 'business_date', label: 'Relatório Comercial por Data (Business Report)' },
    { type: 'business_sku', label: 'Relatório Comercial por SKU/ASIN' },
    { type: 'orders_purchase_date', label: 'Todos os Pedidos (Por Data do Pedido)' },
    { type: 'orders_last_updated', label: 'Todos os Pedidos (Por Última Atualização)' },
    { type: 'ads_campaigns', label: 'Amazon Ads — Campanhas' },
    { type: 'ads_budgets', label: 'Amazon Ads — Orçamentos' },
    { type: 'ads_advertised_products', label: 'Amazon Ads — Produtos Anunciados' },
    { type: 'ads_targeting', label: 'Amazon Ads — Segmentação / Alvos' },
    { type: 'ads_search_terms', label: 'Amazon Ads — Termos de Pesquisa' },
    { type: 'settlement_cogs', label: 'Custos / Transações / COGS' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Importar Relatórios da Amazon Brasil</h2>
              <p className="text-xs text-slate-400">
                Arraste arquivos CSV/TSV, cole o texto das planilhas ou carregue seus dados reais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Banner */}
        <div className="mx-5 mt-4 p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-slate-300">
              Deseja carregar imediatamente os <strong>dados reais enviados no chat</strong> (Relatório Comercial, Pedidos com Easy Ship/DBA e Campanhas Ads)?
            </span>
          </div>
          <button
            onClick={handleLoadChatData}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex-shrink-0 shadow-sm"
          >
            Carregar Meus Dados Reais
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Arquivos (.csv / .tsv / .txt)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'paste'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Colar Texto / Planilha Diretamente</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'upload' ? (
            /* Drag & Drop Zone */
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
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/60'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-amber-400 mb-3 border border-slate-700">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                Clique para selecionar ou arraste seus arquivos CSV / TSV aqui
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Suporta Relatório Comercial (Data e SKU), Todos os Pedidos (TSV/CSV), Campanhas, Termos e Segmentação
              </p>
              <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                <span>Detecção 100% automática: Tabulação (TSV), Vírgula (,) e Ponto e Vírgula (;)</span>
              </div>
            </div>
          ) : (
            /* Paste Box */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Cole o texto do relatório (copiado do Seller Central, Ads ou Excel):
                </label>
                <input
                  type="text"
                  placeholder="Nome do relatório (opcional)"
                  value={pastedName}
                  onChange={(e) => setPastedName(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 w-56 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole aqui o conteúdo copiado (com cabeçalhos na primeira linha)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
              />
              {pasteError && <p className="text-xs text-rose-400 font-medium">{pasteError}</p>}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Adicionar Relatório para Reconciliação</span>
                </button>
              </div>
            </div>
          )}

          {/* Staged Files List & Mapping */}
          {stagedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Arquivos Identificados para Processamento ({stagedFiles.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Verifique o tipo detectado antes de aplicar
                </span>
              </div>

              <div className="space-y-2.5">
                {stagedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-[200px]">
                      <div className="p-2 rounded bg-slate-700 text-amber-400">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{item.audit.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {item.audit.rowCount} linhas • {item.audit.delimiter}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                      <label className="text-slate-400 text-[11px] whitespace-nowrap">Mapear como:</label>
                      <select
                        value={item.audit.type}
                        onChange={(e) => handleTypeChange(idx, e.target.value as ReportType)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
                      >
                        {supportedTypes.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleRemoveStaged(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition"
                      title="Remover arquivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy & Methodology Guarantee */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacidade & Reconciliação em Navegador</span>
            </div>
            <p>
              Os relatórios enviados são processados 100% no seu navegador. Nenhuma informação pessoal ou confidencial de pedidos ou clientes é transmitida externamente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            {stagedFiles.some((s) => s.audit.status === 'error' || s.audit.columnValidation?.hasBlockingErrors) ? (
              <button
                disabled
                title="Corrija os arquivos com colunas ausentes antes de processar."
                className="px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 bg-slate-800 border border-rose-500/40 text-rose-300 opacity-60 cursor-not-allowed shadow-none"
              >
                <span>Bloqueado (Colunas Obrigatórias Ausentes)</span>
              </button>
            ) : (
              <button
                onClick={handleApply}
                disabled={stagedFiles.length === 0}
                className={`px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-lg ${
                  stagedFiles.length > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Processar & Reconciliar ({stagedFiles.length} arquivos)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
