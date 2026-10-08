import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ExecutiveView } from './components/ExecutiveView';
import { CommercialView } from './components/CommercialView';
import { OrdersView } from './components/OrdersView';
import { ProductsView } from './components/ProductsView';
import { AdsCampaignsView } from './components/AdsCampaignsView';
import { TrafficAnalysisView } from './components/TrafficAnalysisView';
import { ProfitabilityView } from './components/ProfitabilityView';
import { CentralAlertasView } from './components/CentralAlertasView';
import { AiConsultantChat } from './components/AiConsultantChat';
import { ConsolidatedPdfReport } from './components/ConsolidatedPdfReport';
import { SetupView } from './components/SetupView';
import { parseAllCsvFiles } from './utils/csvParser';
import { reconcileAllData } from './utils/dataReconciler';
import { AmazonData } from './types/amazon';
import './index.css';

export interface AppState {
  currentView: string;
  selectedStore: string;
  data: AmazonData | null;
  loading: boolean;
  error: string | null;
}

export function App() {
  const [state, setState] = useState<AppState>({
    currentView: 'executive',
    selectedStore: 'DMA',
    data: null,
    loading: true,
    error: null,
  });

  const handleChangeView = (view: string) => {
    setState(prev => ({ ...prev, currentView: view }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const files = [
          'orders.csv',
          'products.csv',
          'advertising.csv',
          'search_terms.csv',
          'traffic.csv',
          'pricing.csv',
          'fees.csv',
          'budget.csv',
          'listings.csv',
        ];

        const parsedData = await parseAllCsvFiles(files);
        const reconciledData = reconcileAllData(parsedData);

        setState(prev => ({
          ...prev,
          data: reconciledData,
          loading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro ao carregar dados',
        }));
      }
    };

    loadData();
  }, []);

  const renderView = () => {
    if (state.loading) {
      return <div className="loading-state">Carregando dados...</div>;
    }

    if (state.error) {
      return <div className="error-state">Erro: {state.error}</div>;
    }

    switch (state.currentView) {
      case 'executive':
        return <ExecutiveView data={state.data} store={state.selectedStore} />;
      case 'commercial':
        return <CommercialView data={state.data} store={state.selectedStore} />;
      case 'orders':
        return <OrdersView data={state.data} store={state.selectedStore} />;
      case 'products':
        return <ProductsView data={state.data} store={state.selectedStore} />;
      case 'ads':
        return <AdsCampaignsView data={state.data} store={state.selectedStore} />;
      case 'traffic':
        return <TrafficAnalysisView data={state.data} store={state.selectedStore} />;
      case 'pricing':
        return <ProfitabilityView data={state.data} store={state.selectedStore} isPricingView={true} />;
      case 'profitability':
        return <ProfitabilityView data={state.data} store={state.selectedStore} isPricingView={false} />;
      case 'alerts':
        return <CentralAlertasView data={state.data} store={state.selectedStore} />;
      case 'ai-consultant':
        return <AiConsultantChat data={state.data} store={state.selectedStore} />;
      case 'executive-report':
        return <ConsolidatedPdfReport data={state.data} store={state.selectedStore} />;
      case 'setup':
        return <SetupView data={state.data} store={state.selectedStore} />;
      default:
        return <ExecutiveView data={state.data} store={state.selectedStore} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        currentView={state.currentView}
        onChangeView={handleChangeView}
        state={state}
      />
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}
