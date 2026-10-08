import React from 'react';
import {
  LayoutDashboard,
  Package,
  Megaphone,
  ShoppingCart,
  Settings,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Search,
  DollarSign,
  Bot,
  FileText,
  UploadCloud,
  Trash2,
  X,
  Layers,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onNavigateTab: (tab: string, subTab?: string) => void;
  onOpenUpload: () => void;
  onClearAnalysis: () => void;
  hasData: boolean;
  isDemoMode: boolean;
  accountName?: string;
  fileCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigateTab,
  onOpenUpload,
  onClearAnalysis,
  hasData,
  isDemoMode,
  accountName = 'Loja Principal',
  fileCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  // Main primary tabs requested by user
  const primaryNavItems = [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: LayoutDashboard,
      badge: 'Principal',
    },
    {
      id: 'products',
      altIds: ['abc_curve'],
      label: 'Produtos',
      icon: Package,
    },
    {
      id: 'advertising',
      altIds: ['ads_campaigns'],
      label: 'Campanhas / Ads',
      icon: Megaphone,
    },
    {
      id: 'orders',
      altIds: ['sales_orders'],
      label: 'Pedidos',
      icon: ShoppingCart,
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      isAction: true,
      action: onOpenUpload,
    },
  ];

  // Additional analytical modules
  const secondaryNavItems = [
    { id: 'pricing', label: 'Precificação & Custos', icon: DollarSign },
    { id: 'rentabilidade_real', label: 'Rentabilidade Real', icon: TrendingUp },
    { id: 'alerts', label: 'Central de Alertas', icon: AlertTriangle },
    { id: 'traffic', label: 'Tráfego Orgânico', icon: Search },
    { id: 'mom_aoa', label: 'Comparativo MoM / MTD', icon: BarChart3 },
    { id: 'ai_chatbot', label: 'Consultor IA', icon: Bot },
    { id: 'pdf_report', label: 'Relatório Executivo', icon: FileText },
  ];

  const isCurrentActive = (item: { id: string; altIds?: string[] }) => {
    if (activeTab === item.id) return true;
    if (item.altIds && item.altIds.includes(activeTab)) return true;
    return false;
  };

  const handleSelectTab = (id: string, isAction?: boolean, action?: () => void) => {
    if (isAction && action) {
      action();
    } else {
      onNavigateTab(id);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 bg-slate-900/80 backdrop-blur-2xl border-r border-white/10 text-slate-200">
      {/* Brand & Top Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-3">
            {/* Glowing Brand Logo */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <span className="font-black text-white text-base tracking-wider">BB</span>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-white">BB HUB</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/25">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Amazon Analytics</p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Primary Navigation Menu */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navegação Principal
          </p>
          <div className="space-y-1 pt-1">
            {primaryNavItems.map((item) => {
              const active = isCurrentActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id, item.isAction, item.action)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/30 shadow-sm shadow-blue-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Modules Menu */}
        <div className="space-y-1 pt-2">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Módulos Analíticos
          </p>
          <div className="space-y-1 pt-1">
            {secondaryNavItems.map((item) => {
              const active = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/30 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Account Info & Status Footer */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        {/* Account Badge Card */}
        <div className="p-3 rounded-xl bg-slate-800/50 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Status Operação</span>
            <span
              className={`flex items-center gap-1 font-semibold text-[11px] ${
                isDemoMode
                  ? 'text-amber-400'
                  : hasData
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isDemoMode
                    ? 'bg-amber-400 animate-pulse'
                    : hasData
                    ? 'bg-emerald-400'
                    : 'bg-slate-500'
                }`}
              />
              {isDemoMode ? 'Modo Demo' : hasData ? 'Dados Ativos' : 'Sem Dados'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-bold truncate" title={accountName}>
              {accountName}
            </span>
            <span className="text-slate-400 font-mono">
              {fileCount > 0 ? `${fileCount} arq.` : '—'}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectTab('upload', true, onOpenUpload)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          <button
            onClick={onClearAnalysis}
            disabled={!hasData && !isDemoMode}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-white/5 hover:border-rose-800/40 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Limpar dados"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed/Sticky on large screens) */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-0 h-screen z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Visible when burger menu is opened) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-xs h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
