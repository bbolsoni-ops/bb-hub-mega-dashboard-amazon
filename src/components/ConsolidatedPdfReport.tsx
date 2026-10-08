import React, { useState } from 'react';
import { AmazonData } from '../types/amazon';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  ResponsiveContainer
} from 'recharts';

interface ConsolidatedPdfReportProps {
  data: AmazonData | null;
  store: string;
}

export const ConsolidatedPdfReport: React.FC<ConsolidatedPdfReportProps> = ({ data, store }) => {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const element = document.getElementById('pdf-slideshow-container');
      if (!element) throw new Error('Container não encontrado');

      const slides = element.querySelectorAll('.pdf-slide');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const canvas = await html2canvas(slide as HTMLElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`relatorio-${store}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-xl">📭 Sem dados para gerar relatório</p>
        <p className="mt-2">Carregue os arquivos CSV primeiro.</p>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const monthYear = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  const salesByWeek = data.orders?.salesByWeek || [
    { week: 'Sem 1', value: 0 },
    { week: 'Sem 2', value: 0 },
    { week: 'Sem 3', value: 0 },
    { week: 'Sem 4', value: 0 }
  ];

  const adsByCampaign = data.ads?.topCampaigns?.slice(0, 5).map(c => ({
    name: c.name.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
    value: c.spend
  })) || [];

  const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed'];

  return (
    <div className="p-6">
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleDownload}
          disabled={generating}
          className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 shadow-lg transition"
        >
          {generating ? '⏳ Gerando PDF...' : '📄 Baixar Relatório Executivo'}
        </button>
      </div>

      <div id="pdf-slideshow-container" className="space-y-0">
        
        {/* SLIDE 1 - CAPA */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-gradient-to-br from-blue-600 to-blue-800 text-white p-12 flex flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">📊 MEGA DASHBOARD</h1>
            <h2 className="text-4xl font-semibold mb-8">AMAZON BRASIL</h2>
            <div className="w-32 h-1 bg-white mb-8"></div>
            <p className="text-3xl mb-4">📋 Relatório Executivo</p>
            <div className="mt-12 space-y-4 text-2xl">
              <p><strong>Seller:</strong> {store}</p>
              <p><strong>Data:</strong> {monthYear}</p>
              <p><strong>Gerado em:</strong> {currentDate}</p>
            </div>
            <div className="mt-16 text-6xl">🚀</div>
          </div>
        </div>

        {/* SLIDE 2 - VENDAS */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-white p-12">
          <h2 className="text-4xl font-bold text-blue-600 mb-8">📈 VENDAS DO MÊS</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-600">
              <p className="text-gray-600 text-lg">Faturamento</p>
              <p className="text-4xl font-bold text-blue-600">
                R$ {(data.orders?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-600">
              <p className="text-gray-600 text-lg">Unidades</p>
              <p className="text-4xl font-bold text-green-600">
                {data.orders?.totalOrders || 0}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl border-l-4 border-purple-600">
              <p className="text-gray-600 text-lg">Ticket Médio</p>
              <p className="text-4xl font-bold text-purple-600">
                R$ {(data.orders?.averageTicket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-700">Vendas por Semana</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-500">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-800">💡 Insights</h3>
            <ul className="space-y-3 text-lg text-gray-700">
              <li>✓ Faturamento total: <strong>R$ {(data.orders?.totalRevenue || 0).toLocaleString('pt-BR')}</strong></li>
              <li>✓ Ticket médio de <strong>R$ {(data.orders?.averageTicket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></li>
              <li>⚠️ Acompanhar conversão por semana</li>
            </ul>
          </div>

          <div className="mt-8 text-center text-gray-400 text-sm">
            Relatório gerado para <strong>{store}</strong>
          </div>
        </div>

        {/* SLIDE 3 - ADS */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-white p-12">
          <h2 className="text-4xl font-bold text-blue-600 mb-8">🎯 PERFORMANCE DE ADS</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-red-50 p-6 rounded-xl border-l-4 border-red-600">
              <p className="text-gray-600 text-lg">Spend Total</p>
              <p className="text-4xl font-bold text-red-600">
                R$ {(data.ads?.totalSpend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-600">
              <p className="text-gray-600 text-lg">ROAS Médio</p>
              <p className="text-4xl font-bold text-green-600">
                {(data.ads?.roas || 0).toFixed(2)}x
              </p>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl border-l-4 border-orange-600">
              <p className="text-gray-600 text-lg">ACOS Médio</p>
              <p className="text-4xl font-bold text-orange-600">
                {((data.ads?.acos || 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-700">Spend por Campanha (Top 5)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={adsByCampaign}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {adsByCampaign.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-500">
            <h3 className="text-2xl font-semibold mb-4 text-blue-800">💡 Insights</h3>
            <ul className="space-y-3 text-lg text-gray-700">
              <li>✓ ROAS de <strong>{(data.ads?.roas || 0).toFixed(2)}x</strong> - {data.ads?.roas && data.ads.roas > 3 ? '✅ Excelente' : '⚠️ Atenção'}</li>
              <li>✓ ACOS de <strong>{((data.ads?.acos || 0) * 100).toFixed(1)}%</strong></li>
              <li>⚠️ Revisar campanhas com ACOS > 30%</li>
            </ul>
          </div>

          <div className="mt-8 text-center text-gray-400 text-sm">
            Relatório gerado para <strong>{store}</strong>
          </div>
        </div>

        {/* SLIDE 4 - CATÁLOGO */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-white p-12">
          <h2 className="text-4xl font-bold text-blue-600 mb-8">📦 CATÁLOGO DE PRODUTOS</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-600">
              <p className="text-gray-600 text-lg">SKUs Ativos</p>
              <p className="text-4xl font-bold text-blue-600">{data.products?.activeSkus || 0}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-xl border-l-4 border-red-600">
              <p className="text-gray-600 text-lg">Sem Estoque</p>
              <p className="text-4xl font-bold text-red-600">{data.products?.outOfStock || 0}</p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-600">
              <p className="text-gray-600 text-lg">Estoque Baixo</p>
              <p className="text-4xl font-bold text-yellow-600">{data.products?.lowStock || 0}</p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-700">🏆 Top 5 Produtos Mais Vendidos</h3>
            <ul className="space-y-3">
              {(data.products?.topProducts || []).slice(0, 5).map((product, idx) => (
                <li key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg">
                  <span className="text-lg">
                    <strong>#{idx + 1}</strong> - {product.name || `SKU ${product.sku}`}
                  </span>
                  <span className="text-lg font-semibold text-blue-600">
                    {product.units || 0} un.
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-500">
            <h3 className="text-2xl font-semibold mb-4 text-green-800">💡 Insights</h3>
            <ul className="space-y-3 text-lg text-gray-700">
              <li>✓ {data.products?.activeSkus || 0} SKUs ativos no catálogo</li>
              <li>⚠️ {data.products?.outOfStock || 0} produtos sem estoque - ação urgente!</li>
              <li>⚠️ {data.products?.lowStock || 0} produtos com estoque baixo</li>
            </ul>
          </div>

          <div className="mt-8 text-center text-gray-400 text-sm">
            Relatório gerado para <strong>{store}</strong>
          </div>
        </div>

        {/* SLIDE 5 - RENTABILIDADE */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-white p-12">
          <h2 className="text-4xl font-bold text-blue-600 mb-8">💰 RENTABILIDADE</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-600">
              <p className="text-gray-600 text-lg">Margem Líquida</p>
              <p className="text-4xl font-bold text-green-600">
                {((data.profitability?.netMargin || 0) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-600">
              <p className="text-gray-600 text-lg">Lucro Líquido</p>
              <p className="text-4xl font-bold text-blue-600">
                R$ {(data.profitability?.netProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl border-l-4 border-purple-600">
              <p className="text-gray-600 text-lg">Receita Total</p>
              <p className="text-4xl font-bold text-purple-600">
                R$ {(data.orders?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-700">Composição de Custos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'COGS', value: data.profitability?.cogs || 0 },
                      { name: 'Taxas', value: data.profitability?.fees || 0 },
                      { name: 'Frete', value: data.profitability?.shipping || 0 },
                      { name: 'Ads', value: data.ads?.totalSpend || 0 },
                      { name: 'Lucro', value: data.profitability?.netProfit || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-purple-50 p-6 rounded-xl border-l-4 border-purple-500">
            <h3 className="text-2xl font-semibold mb-4 text-purple-800">💡 Insights</h3>
            <ul className="space-y-3 text-lg text-gray-700">
              <li>✓ Margem líquida de <strong>{((data.profitability?.netMargin || 0) * 100).toFixed(1)}%</strong></li>
              <li>✓ Lucro de <strong>R$ {(data.profitability?.netProfit || 0).toLocaleString('pt-BR')}</strong></li>
              <li>⚠️ Revisar custos de frete e taxas</li>
            </ul>
          </div>

          <div className="mt-8 text-center text-gray-400 text-sm">
            Relatório gerado para <strong>{store}</strong>
          </div>
        </div>

        {/* SLIDE 6 - TRÁFEGO ORGÂNICO */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-white p-12">
          <h2 className="text-4xl font-bold text-blue-600 mb-8">🔍 TRÁFEGO ORGÂNICO</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl border-l-4 border-blue-600">
              <p className="text-gray-600 text-lg">Total Views</p>
              <p className="text-4xl font-bold text-blue-600">
                {(data.traffic?.totalViews || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-600">
              <p className="text-gray-600 text-lg">Taxa de Conversão</p>
              <p className="text-4xl font-bold text-green-600">
                {((data.traffic?.conversionRate || 0) * 100).toFixed(2)}%
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl border-l-4 border-purple-600">
              <p className="text-gray-600 text-lg">Sessões</p>
              <p className="text-4xl font-bold text-purple-600">
                {(data.traffic?.sessions || 0).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-gray-700">Tráfego por Fonte</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.traffic?.bySource || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-xl border-l-4 border-indigo-500">
            <h3 className="text-2xl font-semibold mb-4 text-indigo-800">💡 Insights</h3>
            <ul className="space-y-3 text-lg text-gray-700">
              <li>✓ <strong>{(data.traffic?.totalViews || 0).toLocaleString('pt-BR')}</strong> views no período</li>
              <li>✓ Conversão de <strong>{((data.traffic?.conversionRate || 0) * 100).toFixed(2)}%</strong></li>
              <li>⚠️ Otimizar listings com baixa conversão</li>
            </ul>
          </div>

          <div className="mt-8 text-center text-gray-400 text-sm">
            Relatório gerado para <strong>{store}</strong>
          </div>
        </div>

        {/* SLIDE 7 - ALERTAS */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-white p-12">
          <h2 className="text-4xl font-bold text-red-600 mb-8">🚨 CENTRAL DE ALERTAS</h2>
          
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-red-600 flex items-center gap-2">
              <span>🔴</span> ESTOQUE CRÍTICO
            </h3>
            <div className="bg-red-50 p-6 rounded-xl border-l-4 border-red-600">
              <ul className="space-y-3 text-lg text-gray-700">
                {(data.alerts?.stock || []).length > 0 ? (
                  data.alerts?.stock.map((alert, idx) => (
                    <li key={idx}>⚠️ {alert}</li>
                  ))
                ) : (
                  <li>✅ Sem alertas críticos de estoque</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-600 flex items-center gap-2">
              <span>🟡</span> PRECIFICAÇÃO
            </h3>
            <div className="bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-600">
              <ul className="space-y-3 text-lg text-gray-700">
                {(data.alerts?.pricing || []).length > 0 ? (
                  data.alerts?.pricing.map((alert, idx) => (
                    <li key={idx}>⚠️ {alert}</li>
                  ))
                ) : (
                  <li>✅ Sem alertas de precificação</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-orange-600 flex items-center gap-2">
              <span>🟠</span> PERFORMANCE
            </h3>
            <div className="bg-orange-50 p-6 rounded-xl border-l-4 border-orange-600">
              <ul className="space-y-3 text-lg text-gray-700">
                {(data.alerts?.performance || []).length > 0 ? (
                  data.alerts?.performance.map((alert, idx) => (
                    <li key={idx}>⚠️ {alert}</li>
                  ))
                ) : (
                  <li>✅ Performance dentro do esperado</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center text-gray-400 text-sm">
            Relatório gerado para <strong>{store}</strong>
          </div>
        </div>

        {/* SLIDE 8 - ACTION PLAN */}
        <div className="pdf-slide w-[800px] h-[1130px] bg-white p-12">
          <h2 className="text-4xl font-bold text-blue-600 mb-8">✅ ACTION PLAN</h2>
          
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-red-600 flex items-center gap-2">
              <span>🔴</span> PRIORIDADE ALTA (essa semana)
            </h3>
            <div className="bg-red-50 p-6 rounded-xl border-l-4 border-red-600">
              <ul className="space-y-3 text-lg text-gray-700">
                <li>☐ Repor estoque dos produtos críticos</li>
                <li>☐ Ajustar preço de produtos acima do Buy Box</li>
                <li>☐ Pausar campanhas com ACOS > 30%</li>
                <li>☐ Revisar listings sem conversão</li>
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-yellow-600 flex items-center gap-2">
              <span>🟡</span> PRIORIDADE MÉDIA (próx. 2 semanas)
            </h3>
            <div className="bg-yellow-50 p-6 rounded-xl border-l-4 border-yellow-600">
              <ul className="space-y-3 text-lg text-gray-700">
                <li>☐ Otimizar palavras-chave de anúncios</li>
                <li>☐ Criar 3 novos anúncios Sponsored</li>
                <li>☐ Revisar keywords negativas</li>
                <li>☐ Atualizar imagens de produtos principais</li>
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-green-600 flex items-center gap-2">
              <span>🟢</span> PRÓXIMOS PASSOS
            </h3>
            <div className="bg-green-50 p-6 rounded-xl border-l-4 border-green-600">
              <ul className="space-y-3 text-lg text-gray-700">
                <li>📅 Próxima revisão: <strong>{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</strong></li>
                <li>📊 Acompanhar métricas diárias no dashboard</li>
                <li>📧 Enviar relatório para equipe</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <p className="text-2xl text-gray-600">
              <strong>Seller:</strong> {store}
            </p>
            <p className="text-lg text-gray-500 mt-2">
              Relatório gerado em {currentDate}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
