import React, { useState, useMemo, useEffect } from 'react';
import { Header, FontScale, BgTheme } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InspectionMappingModal } from './components/InspectionMappingModal';
import { OnboardingEmptyState } from './components/OnboardingEmptyState';
import { ExecutiveView } from './components/ExecutiveView';
import { CommercialView } from './components/CommercialView';
import { OrdersView } from './components/OrdersView';
import { AbcCurveView } from './components/AbcCurveView';
import { TrafficAnalysisView } from './components/TrafficAnalysisView';
import { AiChatbotView } from './components/AiChatbotView';
import { AdsCampaignsView } from './components/AdsCampaignsView';
import { AdsSearchTermsView } from './components/AdsSearchTermsView';
import { ProfitabilityView } from './components/ProfitabilityView';
import { RentabilidadeRealView } from './components/RentabilidadeRealView';
import { CentralAlertasView } from './components/CentralAlertasView';
import { ActionPlanView } from './components/ActionPlanView';
import { AuditMethodologyView } from './components/AuditMethodologyView';
import { ConsolidatedPdfReport } from './components/ConsolidatedPdfReport';
import { ConsolidatedReportModal } from './components/ConsolidatedReportModal';
import { AcceptanceTestsModal } from './components/AcceptanceTestsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SetupView } from './components/SetupView';
import { getDemoDataset } from './utils/demoData';
import { createEmptyDataset } from './utils/csvParser';
import { reconcileAmazonData } from './utils/dataReconciler';
import { downloadStandaloneHtml } from './utils/standaloneHtmlExporter';
import { downloadReportAsPdf } from './utils/pdfDownloader';
import { ActionPlanItem, ParsedDataset, SkuUnitEconomics } from './types/amazon';
import { AMAZON_BR_CATEGORIES } from './utils/amazonFeesCalculator';
import { DEFAULT_SELLER_SETUP, SellerSetup } from './config/sellerSetup';

export default function App() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [commercialSubTab, setCommercialSubTab] = useState<'mom' | 'daily' | 'weekdays'>('mom');
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTestsModalOpen, setIsTestsModalOpen] = useState(false);
  const [isDirectDownloadingPdf, setIsDirectDownloadingPdf] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sellerSetup, setSellerSetup] = useState<SellerSetup>(DEFAULT_SELLER_SETUP);
  const [fontScale, setFontScale] = useState<FontScale>(() => (localStorage.getItem('bb_hub_font_scale') as FontScale) || 'md');
  const [bgTheme, setBgTheme] = useState<BgTheme>(() => (localStorage.getItem('bb_hub_bg_theme') as BgTheme) || 'navy');
  const [dataset, setDataset] = useState<ParsedDataset>(() => createEmptyDataset());
  const [customSkuEconomics, setCustomSkuEconomics] = useState<Record<string, Partial<SkuUnitEconomics>>>({});

  useEffect(() => { document.documentElement.classList.remove('font-scale-sm', 'font-scale-md', 'font-scale-lg', 'font-scale-xl'); document.documentElement.classList.add(`font-scale-${fontScale}`); localStorage.setItem('bb_hub_font_scale', fontScale); }, [fontScale]);
  useEffect(() => { document.documentElement.setAttribute('data-bg', bgTheme); document.documentElement.classList.toggle('light', bgTheme === 'light'); document.documentElement.classList.toggle('dark', bgTheme !== 'light'); localStorage.setItem('bb_hub_bg_theme', bgTheme); }, [bgTheme]);

  const handleNavigateTab = (tab: string, subTab?: string) => { setActiveTab(tab); setIsMobileSidebarOpen(false); if ((tab === 'commercial' || tab === 'mom_aoa') && (subTab === 'mom' || subTab === 'daily' || subTab === 'weekdays')) setCommercialSubTab(subTab); };
  const reconciled = useMemo(() => reconcileAmazonData(dataset, undefined, customSkuEconomics, sellerSetup), [dataset, customSkuEconomics, sellerSetup]);
  const [actionPlan, setActionPlan] = useState<ActionPlanItem[]>([]);
  useEffect(() => { setActionPlan(reconciled.actionPlan); }, [reconciled]);
  const skusWithEconomics = reconciled.skusSummary;
  const handleUpdateSkuEconomics = (sku: string, updates: Partial<SkuUnitEconomics>) => setCustomSkuEconomics((prev) => ({ ...prev, [sku]: { ...prev[sku], ...updates } }));
  const handleConfirmAnalysis = (newDataset: ParsedDataset) => { setIsDemoMode(false); setDataset(newDataset); setActiveTab('overview'); };
  const handleLoadDemo = () => { setIsDemoMode(true); setDataset(getDemoDataset()); setActiveTab('overview'); };
  const handleClearAnalysis = () => { setDataset(createEmptyDataset()); setIsDemoMode(false); setCustomSkuEconomics({}); setActiveTab('overview'); };
  const handleTogglePlanStatus = (id: string) => setActionPlan((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'Concluído' ? 'Pendente' : 'Concluído' } : item));
  const handleExportHtml = () => downloadStandaloneHtml({ dataset, metrics: reconciled.metrics, skusWithEconomics, actionPlan, highRiskTerms: reconciled.highRiskTerms, generatedAt: new Date().toLocaleString('pt-BR') });
  const handleDirectDownloadPdf = async () => { setIsDirectDownloadingPdf(true); try { const account = dataset.sessionConfig?.accountName || 'loja_amazon'; const filename = `relatorio_executivo_amazon_${account.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`; await downloadReportAsPdf({ reportData: { dataset, metrics: reconciled.metrics, skusWithEconomics, actionPlan, highRiskTerms: reconciled.highRiskTerms, isDemoMode, generatedAt: new Date().toLocaleString('pt-BR') }, filename, mode: 'vector' }); } catch (err) { console.error('Erro ao gerar download direto de PDF:', err); } finally { setIsDirectDownloadingPdf(false); } };
  const hasData = isDemoMode || dataset.auditFiles.length > 0;
  const darkMode = bgTheme !== 'light';
  const wrapper = bgTheme === 'light' ? 'bg-[#f8fafc] text-slate-900 light-theme' : 'bg-gradient-to-b from-[#0b1320] via-[#0d1627] to-[#0a0f1a] text-slate-100';

  return <div className={`min-h-screen flex font-sans transition-colors duration-200 selection:bg-blue-500 selection:text-white ${wrapper}`}>
    <Sidebar activeTab={activeTab} onNavigateTab={handleNavigateTab} onOpenUpload={() => setIsInspectionOpen(true)} onClearAnalysis={handleClearAnalysis} hasData={hasData} isDemoMode={isDemoMode} accountName={dataset.sessionConfig?.accountName} fileCount={dataset.auditFiles.length} isOpenMobile={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
    <div className="flex-1 flex flex-col min-w-0 min-h-screen">
      <Header isDemoMode={isDemoMode} hasData={hasData} accountName={dataset.sessionConfig?.accountName} onStartNewAnalysis={() => setIsInspectionOpen(true)} onClearAnalysis={handleClearAnalysis} activeTab={activeTab} setActiveTab={setActiveTab} fileCount={dataset.auditFiles.length} fontScale={fontScale} onChangeFontScale={setFontScale} bgTheme={bgTheme} onChangeBgTheme={setBgTheme} darkMode={darkMode} onToggleDarkMode={() => setBgTheme(darkMode ? 'light' : 'navy')} onExportPdf={() => setIsExportModalOpen(true)} onDirectDownloadPdf={handleDirectDownloadPdf} isDownloadingPdf={isDirectDownloadingPdf} onExportHtml={handleExportHtml} onRunTests={() => setIsTestsModalOpen(true)} onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)} />
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 screen-content print:hidden">
        {activeTab === 'setup' ? <SetupView sellerSetup={sellerSetup} onChange={setSellerSetup} /> : !hasData ? <OnboardingEmptyState onStartNewAnalysis={() => setIsInspectionOpen(true)} onLoadDemoMode={handleLoadDemo} onRunAcceptanceTestsModal={() => setIsTestsModalOpen(true)} /> : <ErrorBoundary fallbackTitle="Ops! Ocorreu um erro ao carregar esta visualização.">
          {(activeTab === 'overview' || activeTab === 'executive') && <ExecutiveView metrics={reconciled.metrics} isDemoMode={isDemoMode} onOpenUpload={() => setIsInspectionOpen(true)} onNavigateTab={handleNavigateTab} businessDays={dataset.businessDays} orders={dataset.orders} skusSummary={skusWithEconomics} />}
          {(activeTab === 'sales_orders' || activeTab === 'orders') && <OrdersView orders={dataset.orders} />}
          {(activeTab === 'abc_curve' || activeTab === 'products') && <AbcCurveView skusSummary={skusWithEconomics} businessSkus={dataset.businessSkus} orders={dataset.orders} />}
          {(activeTab === 'advertising' || activeTab === 'ads_campaigns') && <AdsCampaignsView campaigns={dataset.campaigns} searchTerms={dataset.searchTerms} advertisedProducts={dataset.advertisedProducts} targets={dataset.targets} onOpenUpload={() => setIsInspectionOpen(true)} searchTermsCount={dataset.searchTerms?.length || 0} advertisedProductsCount={dataset.advertisedProducts?.length || 0} />}
          {(activeTab === 'pricing' || activeTab === 'profitability') && <ProfitabilityView skusSummary={skusWithEconomics} onUpdateSkuEconomics={handleUpdateSkuEconomics} />}
          {activeTab === 'rentabilidade_real' && <RentabilidadeRealView dataset={dataset} onNavigateTab={handleNavigateTab} />}
          {activeTab === 'alerts' && <CentralAlertasView dataset={dataset} skusWithEconomics={skusWithEconomics} />}
          {activeTab === 'traffic' && <TrafficAnalysisView businessSkus={dataset.businessSkus} skusSummary={skusWithEconomics} />}
          {(activeTab === 'mom_aoa' || activeTab === 'commercial') && <CommercialView businessDays={dataset.businessDays} orders={dataset.orders} initialSubTab={commercialSubTab} />}
          {activeTab === 'ai_chatbot' && <AiChatbotView metrics={reconciled.metrics} skusSummary={skusWithEconomics} dataset={dataset} isDemoMode={isDemoMode} />}
          {(activeTab === 'pdf_report' || activeTab === 'action_plan') && <ActionPlanView actionPlan={actionPlan} onToggleStatus={handleTogglePlanStatus} metrics={reconciled.metrics} dataset={dataset} skusWithEconomics={skusWithEconomics} darkMode={darkMode} onToggleDarkMode={() => setBgTheme(darkMode ? 'light' : 'navy')} />}
          {activeTab === 'ads_search_terms' && <AdsSearchTermsView searchTerms={dataset.searchTerms} advertisedProducts={dataset.advertisedProducts} highRiskTerms={reconciled.highRiskTerms} />}
          {activeTab === 'audit_methodology' && <AuditMethodologyView auditFiles={dataset.auditFiles} metrics={reconciled.metrics} />}
        </ErrorBoundary>}
      </main>
    </div>
    {hasData && <div className="consolidated-print-container hidden print:block"><ErrorBoundary fallbackTitle="Erro ao renderizar documento para impressão"><ConsolidatedPdfReport dataset={dataset} metrics={reconciled.metrics} skusWithEconomics={skusWithEconomics} actionPlan={actionPlan} highRiskTerms={reconciled.highRiskTerms} isDemoMode={isDemoMode} /></ErrorBoundary></div>}
    <InspectionMappingModal isOpen={isInspectionOpen} onClose={() => setIsInspectionOpen(false)} onConfirmAnalysis={handleConfirmAnalysis} existingDataset={dataset} />
    {hasData && <ConsolidatedReportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} dataset={dataset} metrics={reconciled.metrics} skusWithEconomics={skusWithEconomics} actionPlan={actionPlan} highRiskTerms={reconciled.highRiskTerms} isDemoMode={isDemoMode} />}
    <AcceptanceTestsModal isOpen={isTestsModalOpen} onClose={() => setIsTestsModalOpen(false)} />
  </div>;
}
