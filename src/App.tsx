import React, { useState, useMemo, useEffect } from 'react';
import { Header, FontScale, BgTheme } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { InspectionMappingModal } from './components/InspectionMappingModal';
import { OnboardingEmptyState } from './components/OnboardingEmptyState';
import { ExecutiveView } from './components/ExecutiveView';
import { CommercialView } from './components/CommercialView';
import { ProductsView } from './components/ProductsView';
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
import {
  calculateAmazonCommission,
  calculateDbaFee,
  calculateFbaFee,
  AMAZON_BR_CATEGORIES,
} from './utils/amazonFeesCalculator';
import { DEFAULT_SELLER_SETUP, SellerSetup, fbaProgramFromSetup } from './config/sellerSetup';

export default function App() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [commercialSubTab, setCommercialSubTab] = useState<'mom' | 'daily' | 'weekdays'>('mom');
  const [isInspectionOpen, setIsInspectionOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isTestsModalOpen, setIsTestsModalOpen] = useState<boolean>(false);
  const [isDirectDownloadingPdf, setIsDirectDownloadingPdf] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [sellerSetup, setSellerSetup] = useState<SellerSetup>(DEFAULT_SELLER_SETUP);

  const handleNavigateTab = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
    if (
      (tab === 'commercial' || tab === 'mom_aoa') &&
      (subTab === 'mom' || subTab === 'daily' || subTab === 'weekdays')
    ) {
      setCommercialSubTab(subTab as 'mom' | 'daily' | 'weekdays');
    }
  };

  // Font scale presentation state ('sm' = 16px, 'md' = 18px (default), 'lg' = 20px, 'xl' = 22px)
  const [fontScale, setFontScale] = useState<FontScale>(() => {
    return (localStorage.getItem('bb_hub_font_scale') as FontScale) || 'md';
  });

  useEffect(() => {
    document.documentElement.classList.remove('font-scale-sm', 'font-scale-md', 'font-scale-lg', 'font-scale-xl');
    document.documentElement.classList.add(`font-scale-${fontScale}`);
    localStorage.setItem('bb_hub_font_scale', fontScale);
  }, [fontScale]);

  // Dashboard Background Theme & Dark Mode State
  const [bgTheme, setBgTheme] = useState<BgTheme>(() => {
    return (localStorage.getItem('bb_hub_bg_theme') as BgTheme) || 'navy';
  });

  const darkMode = bgTheme !== 'light';

  useEffect(() => {
    // Sync attributes and classes to HTML root element
    document.documentElement.setAttribute('data-bg', bgTheme);
    if (bgTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('bb_hub_bg_theme', bgTheme);
  }, [bgTheme]);

  const handleToggleDarkMode = () => {
    if (bgTheme === 'light') {
      setBgTheme('navy');
    } else {
      setBgTheme('light');
    }
  };

  const handleChangeBgTheme = (newTheme: BgTheme) => {
    setBgTheme(newTheme);
  };

  const getThemeWrapperClass = (theme: BgTheme) => {
    switch (theme) {
      case 'midnight':
        return 'bg-gradient-to-b from-[#020408] via-[#050811] to-[#000000] text-slate-100';
      case 'charcoal':
        return 'bg-gradient-to-b from-[#111827] via-[#141d2e] to-[#0d131f] text-slate-100';
      case 'sapphire':
        return 'bg-gradient-to-b from-[#07152d] via-[#0b1e3e] to-[#051024] text-slate-100';
      case 'light':
        return 'bg-[#f8fafc] text-slate-900 light-theme';
      case 'navy':
      default:
        return 'bg-gradient-to-b from-[#0b1320] via-[#0d1627] to-[#0a0f1a] text-slate-100';
    }
  };

  // Core dataset state - initialized clean and EMPTY on first load (no fake data, no client data invented)
  const [dataset, setDataset] = useState<ParsedDataset>(() => createEmptyDataset());

  // Custom SKU unit economics override state
  const [customSkuEconomics, setCustomSkuEconomics] = useState<Record<string, Partial<SkuUnitEconomics>>>({});

  // Compute reconciled metrics 100% locally
  const reconciled = useMemo(() => {
    return reconcileAmazonData(dataset, undefined, {}, sellerSetup);
  }, [dataset, sellerSetup]);

  // Action plan state (initialized from deterministic reconciliation, modifiable by user)
  const [actionPlan, setActionPlan] = useState<ActionPlanItem[]>(() => reconciled.actionPlan);

  useEffect(() => {
    setActionPlan(reconciled.actionPlan);
  }, [reconciled]);

  // Merge custom economics overrides with reconciled skus
  const skusWithEconomics = useMemo(() => {
    return reconciled.skusSummary.map((item) => {
      const overrides = customSkuEconomics[item.sku];
      if (!overrides) return item;

      const cogs = overrides.cogs !== undefined ? overrides.cogs : item.cogs;
      const categoryId = overrides.categoryId || item.categoryId || 'casa_cozinha';
      const categoryObj = AMAZON_BR_CATEGORIES.find((c) => c.id === categoryId);
      const categoryName = categoryObj ? categoryObj.name : item.categoryName;
      const weightGrams = overrides.weightGrams !== undefined ? overrides.weightGrams : (item.weightGrams || 450);
      const hasSp50Discount = overrides.hasSp50Discount !== undefined ? overrides.hasSp50Discount : (item.hasSp50Discount ?? sellerSetup.dbaHalfFeePromoActive);
      const fbaProgram = overrides.fbaProgram || item.fbaProgram || fbaProgramFromSetup(sellerSetup);
      const logisticsChannel = overrides.logisticsChannel || item.logisticsChannel;

      const commCalc = calculateAmazonCommission(
        item.pmv,
        categoryId,
        overrides.commissionPercent ?? (overrides.amazonFeePercent !== undefined ? overrides.amazonFeePercent : undefined)
      );
      const commissionPercent = overrides.commissionPercent !== undefined ? overrides.commissionPercent : commCalc.effectivePercent;
      const commissionAmount = (item.pmv * commissionPercent) / 100;

      const skuAdsPercent = sellerSetup.adsInvestmentPercentLast30d ?? (item.grossSales > 0 ? (item.adsSpend / item.grossSales) * 100 : 0);
      const dbaCalc = calculateDbaFee(item.pmv, weightGrams, hasSp50Discount, sellerSetup.dbaOriginRegion);
      const dbaFee = overrides.dbaFee !== undefined ? overrides.dbaFee : dbaCalc.effectiveFee;

      const fbaCalc = calculateFbaFee(item.pmv, weightGrams, fbaProgram, skuAdsPercent);
      const fbaFee = overrides.fbaFee !== undefined ? overrides.fbaFee : fbaCalc.effectiveFee;

      const logisticsFeeUnit = logisticsChannel === 'FBA' ? fbaFee : logisticsChannel === 'DBA' ? dbaFee : 0;
      const standardLogisticsFeeUnit = logisticsChannel === 'FBA' ? fbaCalc.standardFee : logisticsChannel === 'DBA' ? dbaCalc.standardFee : 0;
      const programSavingsUnit = Math.max(0, standardLogisticsFeeUnit - logisticsFeeUnit);
      const totalProgramSavings = programSavingsUnit * item.unitsSold;
      const fbaAdsEligible = fbaCalc.isEligibleForR6;

      const fixedFee = overrides.fixedFee !== undefined ? overrides.fixedFee : item.fixedFee;
      const shippingCost = overrides.shippingCost !== undefined ? overrides.shippingCost : item.shippingCost;
      const taxRatePercent = overrides.taxRatePercent !== undefined ? overrides.taxRatePercent : item.taxRatePercent;

      const amazonTotalFeeUnit = commissionAmount + logisticsFeeUnit + fixedFee;
      const amazonTakeRatePercent = item.pmv > 0 ? (amazonTotalFeeUnit / item.pmv) * 100 : 0;

      const unitVariableCost = cogs + amazonTotalFeeUnit + shippingCost + (item.pmv * taxRatePercent) / 100;
      const totalVariableCosts = unitVariableCost * item.unitsSold;
      const contributionMarginBeforeAds = item.grossSales - totalVariableCosts;
      const contributionMarginPercent = item.grossSales > 0 ? (contributionMarginBeforeAds / item.grossSales) * 100 : 0;

      const hasCogsProvided = overrides.hasCogsProvided ?? item.hasCogsProvided ?? (cogs > 0);
      const breakevenAcos = hasCogsProvided ? Math.max(0, contributionMarginPercent) : null;
      const netProfitAfterAds = hasCogsProvided ? contributionMarginBeforeAds - item.adsSpend : null;
      const netMarginPercent = (hasCogsProvided && item.grossSales > 0) ? (netProfitAfterAds! / item.grossSales) * 100 : null;

      return {
        ...item,
        cogs,
        hasCogsProvided,
        categoryId,
        categoryName,
        weightGrams,
        commissionPercent,
        commissionAmount,
        logisticsChannel,
        dbaFee,
        hasSp50Discount,
        fbaFee,
        fbaProgram,
        standardLogisticsFeeUnit,
        programSavingsUnit,
        totalProgramSavings,
        fbaAdsEligible,
        logisticsFeeUnit,
        amazonTotalFeeUnit,
        amazonTakeRatePercent,
        amazonFeePercent: commissionPercent,
        fixedFee,
        shippingCost,
        taxRatePercent,
        totalVariableCosts,
        contributionMarginBeforeAds,
        contributionMarginPercent,
        breakevenAcos,
        netProfitAfterAds,
        netMarginPercent,
        costsComplete: hasCogsProvided,
      };
    });
  }, [reconciled.skusSummary, customSkuEconomics, sellerSetup]);

  const handleUpdateSkuEconomics = (sku: string, updates: Partial<SkuUnitEconomics>) => {
    setCustomSkuEconomics((prev) => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        ...updates,
      },
    }));
  };

  const handleConfirmAnalysis = (newDataset: ParsedDataset) => {
    setIsDemoMode(false);
    setDataset(newDataset);
    setActiveTab('overview');
  };

  const handleLoadDemo = () => {
    setIsDemoMode(true);
    setDataset(getDemoDataset());
    setActiveTab('overview');
  };

  const handleClearAnalysis = () => {
    setDataset(createEmptyDataset());
    setIsDemoMode(false);
    setCustomSkuEconomics({});
    setActiveTab('overview');
  };

  const handleTogglePlanStatus = (id: string) => {
    setActionPlan((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'Concluído' ? 'Pendente' : 'Concluído';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleExportHtml = () => {
    downloadStandaloneHtml({
      dataset,
      metrics: reconciled.metrics,
      skusWithEconomics,
      actionPlan,
      highRiskTerms: reconciled.highRiskTerms,
      generatedAt: new Date().toLocaleString('pt-BR'),
    });
  };

  const handleDirectDownloadPdf = async () => {
    setIsDirectDownloadingPdf(true);
    try {
      const account = dataset.sessionConfig?.accountName || 'loja_amazon';
      const cleanAccount = account.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `relatorio_executivo_amazon_${cleanAccount}_${dateStr}.pdf`;

      await downloadReportAsPdf({
        reportData: {
          dataset,
          metrics: reconciled.metrics,
          skusWithEconomics,
          actionPlan,
          highRiskTerms: reconciled.highRiskTerms,
          isDemoMode,
          generatedAt: new Date().toLocaleString('pt-BR'),
        },
        filename,
        mode: 'vector',
      });
    } catch (err) {
      console.error('Erro ao gerar download direto de PDF:', err);
    } finally {
      setIsDirectDownloadingPdf(false);
    }
  };

  const hasData = isDemoMode || dataset.auditFiles.length > 0;

  return (
    <div
      className={`min-h-screen flex font-sans transition-colors duration-200 selection:bg-blue-500 selection:text-white ${getThemeWrapperClass(
        bgTheme
      )}`}
    >
      {/* Desktop Sidebar & Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        onNavigateTab={handleNavigateTab}
        onOpenUpload={() => setIsInspectionOpen(true)}
        onClearAnalysis={handleClearAnalysis}
        hasData={hasData}
        isDemoMode={isDemoMode}
        accountName={dataset.sessionConfig?.accountName}
        fileCount={dataset.auditFiles.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <Header
          isDemoMode={isDemoMode}
          hasData={hasData}
          accountName={dataset.sessionConfig?.accountName}
          onStartNewAnalysis={() => setIsInspectionOpen(true)}
          onClearAnalysis={handleClearAnalysis}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fileCount={dataset.auditFiles.length}
          fontScale={fontScale}
          onChangeFontScale={setFontScale}
          bgTheme={bgTheme}
          onChangeBgTheme={handleChangeBgTheme}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onExportPdf={() => setIsExportModalOpen(true)}
          onDirectDownloadPdf={handleDirectDownloadPdf}
          isDownloadingPdf={isDirectDownloadingPdf}
          onExportHtml={handleExportHtml}
          onRunTests={() => setIsTestsModalOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Main View Area */}
        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 screen-content print:hidden">
          {activeTab === 'setup' ? (
            <SetupView sellerSetup={sellerSetup} onChange={setSellerSetup} />
          ) : !hasData ? (
            <OnboardingEmptyState
              onStartNewAnalysis={() => setIsInspectionOpen(true)}
              onLoadDemoMode={handleLoadDemo}
              onRunAcceptanceTestsModal={() => setIsTestsModalOpen(true)}
            />
          ) : (
            <ErrorBoundary fallbackTitle="Ops! Ocorreu um erro ao carregar esta visualização.">
              {/* 1. Visão Geral */}
              {(activeTab === 'overview' || activeTab === 'executive') && (
                <ExecutiveView
                  metrics={reconciled.metrics}
                  isDemoMode={isDemoMode}
                  onOpenUpload={() => setIsInspectionOpen(true)}
                  onNavigateTab={handleNavigateTab}
                  businessDays={dataset.businessDays}
                  orders={dataset.orders}
                  skusSummary={skusWithEconomics}
                />
              )}

            {/* 2. Vendas e Pedidos */}
            {(activeTab === 'sales_orders' || activeTab === 'orders') && (
              <OrdersView orders={dataset.orders} />
            )}

            {/* 3. Curva ABC */}
            {(activeTab === 'abc_curve' || activeTab === 'products') && (
              <AbcCurveView
                skusSummary={skusWithEconomics}
                businessSkus={dataset.businessSkus}
                orders={dataset.orders}
              />
            )}

            {/* 4. Publicidade */}
            {(activeTab === 'advertising' || activeTab === 'ads_campaigns') && (
              <AdsCampaignsView
                campaigns={dataset.campaigns}
                searchTerms={dataset.searchTerms}
                advertisedProducts={dataset.advertisedProducts}
                targets={dataset.targets}
                onOpenUpload={() => setIsInspectionOpen(true)}
                searchTermsCount={dataset.searchTerms?.length || 0}
                advertisedProductsCount={dataset.advertisedProducts?.length || 0}
              />
            )}

            {/* 5. Precificação */}
            {(activeTab === 'pricing' || activeTab === 'profitability') && (
              <ProfitabilityView
                skusSummary={skusWithEconomics}
                onUpdateSkuEconomics={handleUpdateSkuEconomics}
              />
            )}

            {/* Rentabilidade Real */}
            {activeTab === 'rentabilidade_real' && (
              <RentabilidadeRealView
                dataset={dataset}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {/* Central de Alertas */}
            {activeTab === 'alerts' && (
              <CentralAlertasView
                dataset={dataset}
                skusWithEconomics={skusWithEconomics}
              />
            )}

            {/* 6. Tráfego Orgânico */}
            {activeTab === 'traffic' && (
              <TrafficAnalysisView
                businessSkus={dataset.businessSkus}
                skusSummary={skusWithEconomics}
              />
            )}

            {/* 7. MoM / AoA */}
            {(activeTab === 'mom_aoa' || activeTab === 'commercial') && (
              <CommercialView
                businessDays={dataset.businessDays}
                orders={dataset.orders}
                initialSubTab={commercialSubTab}
              />
            )}

            {/* 8. Chatbot IA */}
            {activeTab === 'ai_chatbot' && (
              <AiChatbotView
                metrics={reconciled.metrics}
                skusSummary={skusWithEconomics}
                dataset={dataset}
                isDemoMode={isDemoMode}
              />
            )}

            {/* 9. Relatório PDF */}
            {(activeTab === 'pdf_report' || activeTab === 'action_plan') && (
              <ActionPlanView
                actionPlan={actionPlan}
                onToggleStatus={handleTogglePlanStatus}
                metrics={reconciled.metrics}
                dataset={dataset}
                skusWithEconomics={skusWithEconomics}
                darkMode={darkMode}
                onToggleDarkMode={handleToggleDarkMode}
              />
            )}

            {/* Visualizações de Apoio e Metodologia */}
            {activeTab === 'ads_search_terms' && (
              <AdsSearchTermsView
                searchTerms={dataset.searchTerms}
                advertisedProducts={dataset.advertisedProducts}
                highRiskTerms={reconciled.highRiskTerms}
              />
            )}

            {activeTab === 'audit_methodology' && (
              <AuditMethodologyView
                auditFiles={dataset.auditFiles}
                metrics={reconciled.metrics}
              />
            )}
          </ErrorBoundary>
        )}
      </main>
      </div>

      {/* Consolidated Full Report Container for Direct System Print / PDF Generation */}
      {hasData && (
        <div className="consolidated-print-container hidden print:block">
          <ErrorBoundary fallbackTitle="Erro ao renderizar documento para impressão">
            <ConsolidatedPdfReport
              dataset={dataset}
              metrics={reconciled.metrics}
              skusWithEconomics={skusWithEconomics}
              actionPlan={actionPlan}
              highRiskTerms={reconciled.highRiskTerms}
              isDemoMode={isDemoMode}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Inspection & Mapping Modal */}
      <InspectionMappingModal
        isOpen={isInspectionOpen}
        onClose={() => setIsInspectionOpen(false)}
        onConfirmAnalysis={handleConfirmAnalysis}
        existingDataset={dataset}
      />

      {/* Consolidated PDF Report Preview Modal */}
      {hasData && (
        <ConsolidatedReportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          dataset={dataset}
          metrics={reconciled.metrics}
          skusWithEconomics={skusWithEconomics}
          actionPlan={actionPlan}
          highRiskTerms={reconciled.highRiskTerms}
          isDemoMode={isDemoMode}
        />
      )}

      {/* Acceptance Tests Modal */}
      <AcceptanceTestsModal
        isOpen={isTestsModalOpen}
        onClose={() => setIsTestsModalOpen(false)}
      />
    </div>
  );
}
