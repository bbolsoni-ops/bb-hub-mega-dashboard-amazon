import React, { useRef, useState } from 'react';
import {
  X,
  Printer,
  FileDown,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  DownloadCloud,
} from 'lucide-react';
import { ConsolidatedPdfReport, ConsolidatedPdfReportProps } from './ConsolidatedPdfReport';
import { downloadReportAsPdf } from '../utils/pdfDownloader';
import { ErrorBoundary } from './ErrorBoundary';

interface ConsolidatedReportModalProps extends ConsolidatedPdfReportProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConsolidatedReportModal: React.FC<ConsolidatedReportModalProps> = ({
  isOpen,
  onClose,
  ...reportProps
}) => {
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfMode, setPdfMode] = useState<'vector' | 'canvas'>('vector');

  if (!isOpen) return null;

  const handleDownloadPdf = async (overrideMode?: 'vector' | 'canvas') => {
    const activeMode = overrideMode || pdfMode;
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);
    setErrorMessage(null);
    setProgressPercent(5);
    setProgressMsg('Iniciando processamento do documento...');

    try {
      const account = reportProps.dataset?.sessionConfig?.accountName || 'loja_amazon';
      const cleanAccount = account.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `relatorio_executivo_amazon_${cleanAccount}_${dateStr}.pdf`;

      await downloadReportAsPdf({
        reportData: reportProps,
        element: reportContainerRef.current,
        filename,
        mode: activeMode,
        onProgress: (percent, msg) => {
          setProgressPercent(percent);
          setProgressMsg(msg);
        },
      });

      setDownloadFilename(filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 8000);
    } catch (err: any) {
      console.error('Falha ao gerar arquivo PDF:', err);
      setErrorMessage(
        'Houve um erro ao processar o arquivo PDF: ' +
          (err?.message || 'Tente o modo Vetorial Direto.')
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintSystem = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden modal-overlay">
      <div className="bg-[#0f172a] border border-[#243554] rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden modal-container">
        {/* Modal Top Control Bar */}
        <div className="bg-[#111c30] border-b border-[#243554] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md">
              <FileDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-general-sans text-white flex items-center gap-2">
                <span>Relatório Executivo Consolidado</span>
                <span className="hidden sm:inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                  Geração Direta de PDF
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Gere e baixe o arquivo <code className="text-cyan-300 font-bold">.pdf</code> completo de alta resolução diretamente no seu computador.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Engine Selection Toggle */}
            <div className="hidden sm:flex items-center bg-[#09111e] border border-[#243554] rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setPdfMode('vector')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  pdfMode === 'vector'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Geração vetorial de alta definição e download instantâneo (Recomendado)"
              >
                Vetorial A4 (Rápido)
              </button>
              <button
                onClick={() => setPdfMode('canvas')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  pdfMode === 'canvas'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Captura gráfica fiel dos elementos visuais da tela"
              >
                Captura Gráfica
              </button>
            </div>

            {/* Direct PDF Download Button */}
            <button
              onClick={() => handleDownloadPdf()}
              disabled={isGeneratingPdf}
              className={`flex items-center gap-2 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm transition shadow-lg active:scale-95 cursor-pointer ${
                isGeneratingPdf
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-wait'
                  : downloadSuccess
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>Gerando PDF ({progressPercent}%)...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Download Concluído!</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4 text-slate-950" />
                  <span>Baixar Arquivo PDF (.pdf)</span>
                </>
              )}
            </button>

            {/* Optional System Print */}
            <button
              onClick={handlePrintSystem}
              title="Abrir diálogo de impressão do sistema (Ctrl + P)"
              className="p-2.5 text-slate-300 hover:text-white bg-[#1b2b46] hover:bg-[#253a5e] border border-[#2d4268] rounded-xl transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1e2f4a] rounded-xl transition cursor-pointer"
              title="Fechar visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>Arquivo PDF baixado com sucesso!</strong> O relatório consolidado foi salvo como{' '}
                <code className="bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-300 font-mono font-bold">
                  {downloadFilename}
                </code>{' '}
                na pasta de downloads do seu navegador.
              </span>
            </div>
            <button
              onClick={() => handleDownloadPdf()}
              className="text-emerald-300 hover:text-white underline font-bold cursor-pointer"
            >
              Baixar novamente
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => handleDownloadPdf('vector')}
              className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs cursor-pointer"
            >
              Tentar com Motor Vetorial
            </button>
          </div>
        )}

        {/* Progress Bar (when generating PDF) */}
        {isGeneratingPdf && (
          <div className="bg-[#0b1322] border-b border-cyan-500/30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>{progressMsg}</span>
            </div>
            <div className="flex items-center gap-3 w-48 sm:w-64">
              <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-mono text-cyan-400 font-bold text-[11px]">
                {progressPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Info banner confirming real file download */}
        <div className="bg-[#14233c] border-b border-[#243554] px-4 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Geração Direta de Arquivo PDF:</strong> O dossiê completo (8 seções, matriz de conciliação, curva ABC, auditoria de Ads e plano de ação de 30 dias) é renderizado e baixado como arquivo <strong>.pdf</strong> real com paginação A4.
            </span>
          </div>
          <span className="hidden lg:inline-block text-[11px] text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            Formato A4 • 300 DPI
          </span>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto bg-slate-300 p-3 sm:p-6">
          <div
            ref={reportContainerRef}
            className="bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden mx-auto max-w-5xl"
          >
            <ErrorBoundary fallbackTitle="Falha na renderização do relatório pré-visualizado">
              <ConsolidatedPdfReport {...reportProps} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};
