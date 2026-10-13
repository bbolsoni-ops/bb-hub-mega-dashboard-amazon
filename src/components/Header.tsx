import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileCheck2,
  FileCode2,
  FileDown,
  Printer,
  Sparkles,
  Type,
  Trash2,
  Lock,
  Layers,
  CheckCircle,
  Loader2,
  DownloadCloud,
  Sun,
  Moon,
  Palette,
  Check,
  ChevronDown,
  Menu,
} from 'lucide-react';

export type FontScale = 'sm' | 'md' | 'lg' | 'xl';
export type BgTheme = 'light';

export const THEME_OPTIONS: {
  id: BgTheme;
  name: string;
  category: string;
  previewColor: string;
  borderPreview: string;
  description: string;
}[] = [
  {
    id: 'light',
    name: 'Modo Claro (Executivo)',
    category: 'Claro (Único)',
    previewColor: '#ffffff',
    borderPreview: '#2563eb',
    description: 'Tema claro padrão, legível e econômico para impressão',
  },
];

interface HeaderProps {
  isDemoMode: boolean;
  hasData: boolean;
  accountName?: string;
  onStartNewAnalysis: () => void;
  onClearAnalysis: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  fileCount: number;
  fontScale?: FontScale;
  onChangeFontScale?: (scale: FontScale) => void;
  bgTheme?: BgTheme;
  onChangeBgTheme?: (theme: BgTheme) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onExportPdf?: () => void;
  onDirectDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
  onExportHtml?: () => void;
  onRunTests?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDemoMode,
  hasData,
  accountName = 'Loja Principal',
  onStartNewAnalysis,
  onClearAnalysis,
  activeTab,
  setActiveTab,
  fileCount,
  fontScale = 'md',
  onChangeFontScale,
  bgTheme = 'light',
  onChangeBgTheme,
  darkMode = false,
  onToggleDarkMode,
  onExportPdf,
  onDirectDownloadPdf,
  isDownloadingPdf = false,
  onExportHtml,
  onRunTests,
  onToggleMobileSidebar,
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeMenuOpen]);

  const currentTheme = THEME_OPTIONS.find((t) => t.id === bgTheme) || THEME_OPTIONS[0];
  const tabs = [
    { id: 'overview', label: '📊 Visão Executiva' },
    { id: 'sales_orders', label: '💰 Vendas e Tráfego' },
    { id: 'abc_curve', label: '📦 Catálogo e Curva ABC' },
    { id: 'advertising', label: '📣 Amazon Ads' },
    { id: 'traffic', label: '🔎 Tráfego Orgânico' },
    { id: 'pricing', label: '💵 Precificação' },
    { id: 'rentabilidade_real', label: '✅ Rentabilidade Real' },
    { id: 'alerts', label: '⚠️ Central de Alertas' },
    { id: 'mom_aoa', label: '📅 MoM / MTD / AoA' },
    { id: 'ai_chatbot', label: '🤖 Consultor IA' },
    { id: 'pdf_report', label: '📄 Relatório Executivo' },
  ];

  return (
    <header
      className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm text-slate-900"
    >
      {isDemoMode ? (
        <div className="bg-amber-600 text-white w-full px-4 sm:px-6 lg:px-8 py-1.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px] bg-black/25 px-2 py-0.5 rounded">
              Modo Demonstração
            </span>
            <span className="text-amber-100">Dados simulados para teste. Clique em Nova Análise para importar seus relatórios.</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={onStartNewAnalysis}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-2.5 py-1 rounded transition cursor-pointer"
            >
              Nova Análise Real
            </button>
            <button
              onClick={onClearAnalysis}
              className="text-amber-100 hover:text-white underline font-medium cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>
      ) : hasData ? (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-1.5 text-xs flex items-center justify-between border-b bg-slate-50 text-slate-700 border-slate-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-emerald-600">● Dados Ativos</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>Loja: <strong className="text-slate-950 font-bold">{accountName}</strong></span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>{fileCount} arquivos reconciliados</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={onStartNewAnalysis}
              className="hover:underline font-medium cursor-pointer text-blue-600"
            >
              Substituir Arquivos
            </button>
            <button
              onClick={onClearAnalysis}
              className="text-slate-500 hover:text-rose-600 transition cursor-pointer flex items-center gap-1"
              title="Limpar todos os dados da memória"
            >
              <Trash2 className="w-3 h-3" />
              <span>Zerar Dados</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              title="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-base shadow-sm">
            BB
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-950">
                Dashboard de Vendas
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                BB HUB
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500">
              Acompanhe faturamento, pedidos, publicidade e rentabilidade em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStartNewAnalysis}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs md:text-sm transition shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-white" />
            <span>Nova Análise</span>
          </button>

          {(hasData || isDemoMode) && (
            <button
              onClick={onClearAnalysis}
              title="Limpar todos os dados e voltar ao início"
              className="flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer border bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}

          {hasData && (
            <button
              onClick={onDirectDownloadPdf || onExportPdf}
              disabled={isDownloadingPdf}
              title="Baixar relatório executivo em PDF"
              className="flex items-center gap-1.5 font-bold px-3.5 py-2 rounded-xl text-xs md:text-sm transition shadow-sm border cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-300 text-sky-800 disabled:opacity-60"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4 text-blue-600" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {hasData && (
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 overflow-x-auto scrollbar-none border-t border-slate-200 bg-slate-50">
          <nav className="flex space-x-1.5 py-1.5 min-w-max">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs md:text-sm font-bold font-general-sans rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-b-2 border-blue-700 shadow-sm font-black'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/90 font-semibold'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
