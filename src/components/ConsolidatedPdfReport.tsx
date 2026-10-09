import React, { useState } from 'react';
import { AmazonData } from '../types/amazon';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ConsolidatedPdfReportProps {
  data: AmazonData | null;
  store: string;
}

export const ConsolidatedPdfReport: React.FC<ConsolidatedPdfReportProps> = ({ data, store }) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);

    try {
      const element = document.getElementById('pdf-container');
      if (!element) throw new Error('Container do PDF não encontrado');

      const slides = element.querySelectorAll<HTMLElement>('.pdf-slide');
      if (slides.length === 0) throw new Error('Nenhuma página encontrada');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const canvas = await html2canvas(slide, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      }

      const fileName = `relatorio-${store || 'seller'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl">📭 Sem dados para gerar relatório</p>
        <p className="mt-2 text-gray-600">Carregue os arquivos CSV primeiro.</p>
      </div>
    );
  }

  const revenue = data.orders?.totalRevenue || 0;
  const orders = data.orders?.totalOrders || 0;
  const ticket = data.orders?.averageTicket || 0;
  const spend = data.ads?.totalSpend || 0;
  const roas = data.ads?.roas || 0;
  const acos = data.ads?.acos || 0;
  const activeSkus = data.products?.activeSkus || 0;
  const outOfStock = data.products?.outOfStock || 0;
  const lowStock = data.products?.lowStock || 0;
  const netMargin = data.profitability?.netMargin || 0;
  const netProfit = data.profitability?.netProfit || 0;
  const views = data.traffic?.totalViews || 0;
  const sessions = data.traffic?.sessions || 0;
  const conversion = data.traffic?.conversionRate || 0;

  const stockAlerts = data.alerts?.stock || [];
  const pricingAlerts = data.alerts?.pricing || [];
  const performanceAlerts = data.alerts?.performance || [];

  const currentDate = new Date().toLocaleDateString('pt-BR');
  const monthYear = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const sellerName = store || 'Seller';

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={handleDownload}
          disabled={generating}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
        >
          {generating ? '⏳ Gerando PDF...' : '📄 Baixar Relatório Executivo'}
        </button>
        {error && <p className="mt-2 text-red-600">❌ Erro: {error}</p>}
      </div>

      <div id="pdf-container" style={{ position: 'fixed', left: '-10000px', top: 0 }}>
        <style>{`
          .pdf-slide { width: 800px; min-height: 1130px; background: white; padding: 40px; font-family: Arial, sans-serif; box-sizing: border-box; }
          .slide-cover { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
          .slide-cover h1 { font-size: 48px; margin: 20px 0; }
          .slide-cover p { font-size: 20px; margin: 10px 0; }
          .slide-title { font-size: 32px; color: #1e40af; margin-bottom: 20px; font-weight: bold; }
          .slide-subtitle { font-size: 18px; color: #6b7280; margin-bottom: 30px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
          .metric-card { background: #f3f4f6; padding: 20px; border-radius: 12px; border-left: 4px solid #3b82f6; }
          .metric-card.green { border-left-color: #10b981; background: #ecfdf5; }
          .metric-card.purple { border-left-color: #8b5cf6; background: #f5f3ff; }
          .metric-card.red { border-left-color: #ef4444; background: #fef2f2; }
          .metric-card.orange { border-left-color: #f97316; background: #fff7ed; }
          .metric-label { font-size: 14px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
          .metric-value { font-size: 32px; font-weight: bold; color: #1f2937; margin-top: 8px; }
          .section { background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px solid #e5e7eb; }
          .section h3 { font-size: 20px; color: #1e40af; margin-bottom: 15px; }
          .section ul { margin: 0; padding-left: 20px; }
          .section li { margin: 8px 0; font-size: 16px; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 14px; }
        `}</style>

        {/* SLIDE 1 - CAPA */}
        <div className="pdf-slide slide-cover">
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>📊</div>
          <h1>MEGA DASHBOARD</h1>
          <h1>AMAZON BRASIL</h1>
          <div style={{ width: '100px', height: '4px', background: 'white', margin: '30px 0' }}></div>
          <p style={{ fontSize: '28px', fontWeight: 'bold' }}>📋 Relatório Executivo</p>
          <div style={{ marginTop: '50px', background: 'rgba(255,255,255,0.2)', padding: '30px', borderRadius: '16px' }}>
            <p style={{ fontSize: '22px', margin: '15px 0' }}><strong>Seller:</strong> {sellerName}</p>
            <p style={{ fontSize: '22px', margin: '15px 0' }}><strong>Período:</strong> {monthYear}</p>
            <p style={{ fontSize: '22px', margin: '15px 0' }}><strong>Gerado em:</strong> {currentDate}</p>
          </div>
          <div style={{ fontSize: '72px', marginTop: '60px' }}>🚀</div>
        </div>

        {/* SLIDE 2 - VENDAS */}
        <div className="pdf-slide">
          <h2 className="slide-title">📈 VENDAS DO MÊS</h2>
          <p className="slide-subtitle">Panorama dos principais indicadores comerciais</p>
          
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Faturamento</div>
              <div className="metric-value">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="metric-card green">
              <div className="metric-label">Unidades</div>
              <div className="metric-value">{orders.toLocaleString('pt-BR')}</div>
            </div>
            <div className="metric-card purple">
              <div className="metric-label">Ticket Médio</div>
              <div className="metric-value">R$ {ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="section">
            <h3>💡 Insights</h3>
            <ul>
              <li>Faturamento total: <strong>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
              <li>Total de pedidos: <strong>{orders.toLocaleString('pt-BR')} unidades</strong></li>
              <li>Ticket médio: <strong>R$ {ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
            </ul>
          </div>

          <div className="footer">Relatório gerado para <strong>{sellerName}</strong> • Página 2 de 8</div>
        </div>

        {/* SLIDE 3 - ADS */}
        <div className="pdf-slide">
          <h2 className="slide-title">🎯 PERFORMANCE DE ADS</h2>
          <p className="slide-subtitle">Eficiência do investimento em mídia paga</p>
          
          <div className="metrics-grid">
            <div className="metric-card red">
              <div className="metric-label">Spend Total</div>
              <div className="metric-value">R$ {spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="metric-card green">
              <div className="metric-label">ROAS</div>
              <div className="metric-value">{roas.toFixed(2)}x</div>
            </div>
            <div className="metric-card orange">
              <div className="metric-label">ACOS</div>
              <div className="metric-value">{(acos * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="section">
            <h3>💡 Análise</h3>
            <ul>
              <li>Investimento em Ads: <strong>R$ {spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
              <li>ROAS: <strong>{roas.toFixed(2)}x</strong> {roas > 3 ? '✅ Excelente' : '⚠️ Atenção'}</li>
              <li>ACOS: <strong>{(acos * 100).toFixed(1)}%</strong></li>
            </ul>
          </div>

          <div className="section" style={{ background: '#ecfdf5', borderColor: '#10b981' }}>
            <h3 style={{ color: '#059669' }}>✅ Recomendações</h3>
            <ul>
              <li>Revisar campanhas com ACOS acima de 30%</li>
              <li>Otimizar keywords de baixo desempenho</li>
              <li>Aumentar budget em campanhas com ROAS alto</li>
            </ul>
          </div>

          <div className="footer">Relatório gerado para <strong>{sellerName}</strong> • Página 3 de 8</div>
        </div>

        {/* SLIDE 4 - CATÁLOGO */}
        <div className="pdf-slide">
          <h2 className="slide-title">📦 CATÁLOGO DE PRODUTOS</h2>
          <p className="slide-subtitle">Saúde do catálogo e gestão de estoque</p>
          
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">SKUs Ativos</div>
              <div className="metric-value">{activeSkus.toLocaleString('pt-BR')}</div>
            </div>
            <div className="metric-card red">
              <div className="metric-label">Sem Estoque</div>
              <div className="metric-value">{outOfStock.toLocaleString('pt-BR')}</div>
            </div>
            <div className="metric-card orange">
              <div className="metric-label">Estoque Baixo</div>
              <div className="metric-value">{lowStock.toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div className="section" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
            <h3 style={{ color: '#dc2626' }}>⚠️ Ação Urgente</h3>
            <ul>
              <li><strong>{outOfStock}</strong> produtos sem estoque - repor imediatamente</li>
              <li><strong>{lowStock}</strong> produtos com estoque baixo - monitorar</li>
            </ul>
          </div>

          <div className="footer">Relatório gerado para <strong>{sellerName}</strong> • Página 4 de 8</div>
        </div>

        {/* SLIDE 5 - RENTABILIDADE */}
        <div className="pdf-slide">
          <h2 className="slide-title">💰 RENTABILIDADE</h2>
          <p className="slide-subtitle">Análise de margens e lucratividade</p>
          
          <div className="metrics-grid">
            <div className="metric-card green">
              <div className="metric-label">Margem Líquida</div>
              <div className="metric-value">{(netMargin * 100).toFixed(1)}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Lucro Líquido</div>
              <div className="metric-value">R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="metric-card purple">
              <div className="metric-label">Receita Total</div>
              <div className="metric-value">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="section">
            <h3>💡 Análise Financeira</h3>
            <ul>
              <li>Margem líquida: <strong>{(netMargin * 100).toFixed(1)}%</strong></li>
              <li>Lucro líquido: <strong>R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
              <li>Receita total: <strong>R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
            </ul>
          </div>

          <div className="footer">Relatório gerado para <strong>{sellerName}</strong> • Página 5 de 8</div>
        </div>

        {/* SLIDE 6 - TRÁFEGO */}
        <div className="pdf-slide">
          <h2 className="slide-title">🔍 TRÁFEGO ORGÂNICO</h2>
          <p className="slide-subtitle">Visibilidade e conversão dos listings</p>
          
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Views</div>
              <div className="metric-value">{views.toLocaleString('pt-BR')}</div>
            </div>
            <div className="metric-card green">
              <div className="metric-label">Conversão</div>
              <div className="metric-value">{(conversion * 100).toFixed(2)}%</div>
            </div>
            <div className="metric-card purple">
              <div className="metric-label">Sessões</div>
              <div className="metric-value">{sessions.toLocaleString('pt-BR')}</div>
            </div>
          </div>

          <div className="section">
            <h3>💡 Métricas de Tráfego</h3>
            <ul>
              <li>Total de views: <strong>{views.toLocaleString('pt-BR')}</strong></li>
              <li>Taxa de conversão: <strong>{(conversion * 100).toFixed(2)}%</strong></li>
              <li>Sessões totais: <strong>{sessions.toLocaleString('pt-BR')}</strong></li>
            </ul>
          </div>

          <div className="footer">Relatório gerado para <strong>{sellerName}</strong> • Página 6 de 8</div>
        </div>

        {/* SLIDE 7 - ALERTAS */}
        <div className="pdf-slide">
          <h2 className="slide-title">🚨 CENTRAL DE ALERTAS</h2>
          <p className="slide-subtitle">Pontos que exigem atenção prioritária</p>
          
          <div className="section" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
            <h3 style={{ color: '#dc2626' }}>🔴 Estoque Crítico</h3>
            {stockAlerts.length > 0 ? (
              <ul>{stockAlerts.map((alert, i) => <li key={i}>⚠️ {String(alert)}</li>)}</ul>
            ) : (
              <p style={{ color: '#10b981' }}>✅ Sem alertas críticos de estoque</p>
            )}
          </div>

          <div className="section" style={{ background: '#fff7ed', borderColor: '#f97316' }}>
            <h3 style={{ color: '#ea580c' }}>🟡 Precificação</h3>
            {pricingAlerts.length > 0 ? (
              <ul>{pricingAlerts.map((alert, i) => <li key={i}>⚠️ {String(alert)}</li>)}</ul>
            ) : (
              <p style={{ color: '#10b981' }}>✅ Sem alertas de precificação</p>
            )}
          </div>

          <div className="section" style={{ background: '#ffedd5', borderColor: '#f97316' }}>
            <h3 style={{ color: '#ea580c' }}>🟠 Performance</h3>
            {performanceAlerts.length > 0 ? (
              <ul>{performanceAlerts.map((alert, i) => <li key={i}>⚠️ {String(alert)}</li>)}</ul>
            ) : (
              <p style={{ color: '#10b981' }}>✅ Performance dentro do esperado</p>
            )}
          </div>

          <div className="footer">Relatório gerado para <strong>{sellerName}</strong> • Página 7 de 8</div>
        </div>

        {/* SLIDE 8 - ACTION PLAN */}
        <div className="pdf-slide">
          <h2 className="slide-title">✅ ACTION PLAN</h2>
          <p className="slide-subtitle">Plano de ação para as próximas semanas</p>
          
          <div className="section" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
            <h3 style={{ color: '#dc2626' }}>🔴 Prioridade Alta (esta semana)</h3>
            <ul>
              <li>☐ Repor estoque dos produtos críticos</li>
              <li>☐ Ajustar preço de produtos acima do Buy Box</li>
              <li>☐ Pausar campanhas com ACOS > 30%</li>
              <li>☐ Revisar listings sem conversão</li>
            </ul>
          </div>

          <div className="section" style={{ background: '#fffbeb', borderColor: '#f59e0b' }}>
            <h3 style={{ color: '#d97706' }}>🟡 Prioridade Média (próx. 2 semanas)</h3>
            <ul>
              <li>☐ Otimizar palavras-chave de anúncios</li>
              <li>☐ Criar 3 novos anúncios Sponsored</li>
              <li>☐ Revisar keywords negativas</li>
              <li>☐ Atualizar imagens de produtos principais</li>
            </ul>
          </div>

          <div className="section" style={{ background: '#f0fdf4', borderColor: '#22c55e' }}>
            <h3 style={{ color: '#16a34a' }}>🟢 Próximos Passos</h3>
            <ul>
              <li>📅 Próxima revisão: <strong>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</strong></li>
              <li>📊 Acompanhar métricas diárias no dashboard</li>
              <li>📧 Enviar relatório para equipe</li>
            </ul>
          </div>

          <div style={{ textAlign: 'center', marginTop: '60px', padding: '30px', background: '#f3f4f6', borderRadius: '16px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚀</div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}><strong>Seller:</strong> {sellerName}</p>
            <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '10px' }}>Relatório gerado em {currentDate}</p>
          </div>

          <div className="footer">Relatório gerado para <strong>{sellerName}</strong> • Página 8 de 8</div>
        </div>

      </div>
    </div>
  );
};
