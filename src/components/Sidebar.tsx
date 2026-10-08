import React from 'react';
import { AppState } from '../App';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  state: AppState;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, state }) => {
  const menuItems = [
    { id: 'executive', label: '🏠 Visão Executiva', icon: '🏠' },
    { id: 'commercial', label: '📊 Comercial', icon: '📊' },
    { id: 'orders', label: '📦 Pedidos', icon: '📦' },
    { id: 'products', label: '🏷️ Produtos', icon: '🏷️' },
    { id: 'ads', label: '🎯 Ads', icon: '🎯' },
    { id: 'traffic', label: '🔍 Tráfego Orgânico', icon: '🔍' },
    { id: 'pricing', label: '💰 Precificação', icon: '💰' },
    { id: 'profitability', label: '📈 Rentabilidade', icon: '📈' },
    { id: 'alerts', label: '🚨 Central de Alertas', icon: '🚨' },
    { id: 'ai-consultant', label: '🤖 Consultor IA', icon: '🤖' },
    { id: 'executive-report', label: '📄 Relatório Executivo', icon: '📄' },
    { id: 'setup', label: '⚙️ Setup da Conta', icon: '⚙️' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>📊 Mega Dashboard</h2>
        <p className="sidebar-subtitle">Amazon Brasil</p>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onChangeView(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="store-info">
          <span className="store-name">{state.selectedStore || 'DMA'}</span>
        </div>
      </div>
    </div>
  );
};
