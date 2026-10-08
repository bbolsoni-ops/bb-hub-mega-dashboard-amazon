import React from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ArrowRight,
  Lock,
  Layers,
  CheckCircle2,
  TrendingUp,
  Target,
  DollarSign,
} from 'lucide-react';

interface OnboardingEmptyStateProps {
  onStartNewAnalysis: () => void;
  onLoadDemoMode: () => void;
  onRunAcceptanceTestsModal?: () => void;
}

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({
  onStartNewAnalysis,
  onLoadDemoMode,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 px-3 sm:px-6">
      {/* Hero Welcome Banner */}
      <div className="glass-panel p-6 sm:p-10 transition-colors relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span className="font-semibold text-blue-400">100% Client-Side</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Privacidade Absoluta
              </span>
              <span aria-hidden="true">·</span>
              <span>Amazon Brasil 2026</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Dashboard de Vendas Amazon
            </h1>
            
            <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl leading-relaxed">
              Auditoria de vendas, curva ABC (80/15/5), análise de tráfego e Buy Box, unit economics (FBA vs DBA) e otimização de campanhas patrocinadas (ACOS, ROAS e TACoS).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={onStartNewAnalysis}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Carregar Relatórios</span>
            </button>
            <button
              onClick={onLoadDemoMode}
              className="flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-amber-300 font-semibold px-5 py-3 rounded-xl text-sm transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Ver Demonstração</span>
            </button>
          </div>
        </div>

        {/* 3 Core Commitments - Clean & Editorial */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Processamento no Navegador</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Seus relatórios e dados de pedidos nunca saem do seu navegador. Zero upload para servidores externos.
            </p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5 text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Reconciliação Auditável</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O faturamento comercial nunca é somado aos pedidos. Cada métrica possui fonte oficial, fórmula e rastreabilidade.
            </p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 font-semibold text-white mb-1.5 text-sm">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Cálculo Real de Margem</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Estrutura tarifária oficial Amazon Brasil 2026 (Comissões por categoria, DBA R$ 4,50 a R$ 6,75 e tabelas de peso FBA).
            </p>
          </div>
        </div>
      </div>

      {/* Relatórios Suportados do Seller Central */}
      <div className="glass-panel p-6 sm:p-8 space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>Relatórios da Amazon Seller Central Identificados Automaticamente</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              O sistema detecta o tipo de relatório pelo cabeçalho das colunas (CSV ou Excel .xlsx):
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">8 Fontes de Dados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* 1. Pedidos Detalhados */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">1. Pedidos Detalhados</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">By-Porto-Setembro-Pedidos.csv</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              amazon-order-id, purchase-date, order-status, sku, asin, item-price, quantity, ship-city, ship-state.
            </p>
          </div>

          {/* 2. Vendas Diárias */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">2. Vendas Diárias</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">By-Porto-Pedidos-Dia.csv</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Data, Vendas de produtos pedidos, Unidades pedidas, Sessões - Total, Visualizações da página.
            </p>
          </div>

          {/* 3. Performance por SKU */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">3. Performance por SKU</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">By-Porto-SKU.csv</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              ASIN (child), Título, Código SKU, Sessões, Unidades, Vendas, % Oferta em destaque (Buy Box).
            </p>
          </div>

          {/* 4. Campanhas Patrocinadas */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">4. Campanhas Patrocinadas</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">By_Porto_Campanha.csv</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Nome da campanha, Impressões, Cliques, Gastos, Pedidos 7 dias, Vendas 7 dias, ACOS, ROAS.
            </p>
          </div>

          {/* 5. Produtos Anunciados */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">5. Produtos Anunciados</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">By_Porto_Produto_Anunciado.xlsx</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              SKU anunciado, ASIN anunciado, Impressões, Cliques, Gastos, Total de vendas de 7 dias.
            </p>
          </div>

          {/* 6. Termos de Pesquisa */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">6. Termos de Pesquisa</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">By_Porto_Termo_de_Pesquisa.xlsx</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Termo de pesquisa do cliente, Impressões, Cliques, Gastos, Total de vendas de 7 dias.
            </p>
          </div>

          {/* 7. Segmentação (Keywords) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">7. Segmentação & Alvos</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">By_Porto_Segmentacao.xlsx</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Palavra-chave, Tipo de correspondência (EXACT, PHRASE, BROAD), Cliques, Gastos, Vendas.
            </p>
          </div>

          {/* 8. Tarifas Amazon Brasil */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1e2f4a] bg-slate-50 dark:bg-[#0f1a2d] space-y-1.5">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">8. Estrutura Tarifária</span>
            <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">DBA, FBA & Comissões 2026</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Comissões (12% a 15%), mínimo R$ 1,00, taxas de logística por peso dimensional.
            </p>
          </div>
        </div>

        {/* Action Prompt Strip */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#243554] bg-slate-50 dark:bg-[#0f1a2d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Você pode carregar um único arquivo ou múltiplos arquivos de uma só vez. O leitor mapeia as colunas automaticamente e permite inspecionar cada fonte antes do cálculo.
          </div>
          <button
            onClick={onStartNewAnalysis}
            className="whitespace-nowrap px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 font-bold text-xs transition shadow-xs cursor-pointer"
          >
            Carregar Arquivos Agora →
          </button>
        </div>
      </div>
    </div>
  );
};

