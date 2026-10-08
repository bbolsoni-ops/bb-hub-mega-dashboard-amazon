import React, { useMemo, useState } from 'react';
import { AmazonData } from '../types/amazon';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ConsolidatedPdfReportProps {
  data: AmazonData | null;
  store: string;
}

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const number = (value: number) => value.toLocaleString('pt-BR');
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const ConsolidatedPdfReport: React.FC<ConsolidatedPdfReportProps> = ({ data, store }) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const orders = data?.orders;
    const ads = data?.ads;
    const products = data?.products;
    const profitability = data?.profitability;
    const traffic = data?.traffic;

    return {
      revenue: orders?.totalRevenue || 0,
      orders: orders?.totalOrders || 0,
      ticket: orders?.averageTicket || 0,
      spend: ads?.totalSpend || 0,
      roas: ads?.roas || 0,
      acos: ads?.acos || 0,
      activeSkus: products?.activeSkus || 0,
      outOfStock: products?.outOfStock || 0,
      lowStock: products?.lowStock || 0,
      netMargin: profitability?.netMargin || 0,
      netProfit: profitability?.netProfit || 0,
      views: traffic?.totalViews || 0,
      sessions: traffic?.sessions || 0,
      conversion: traffic?.conversionRate || 0,
    };
  }, [data]);

  const dateLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());
  const generatedAt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const seller = store?.trim() || 'Seller não informado';

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);

    try {
      const root = document.getElementById('pdf-slides-root');
      if (!root) throw new Error('Estrutura do relatório não encontrada. Recarregue a página e tente novamente.');

      const slides = Array.from(root.querySelectorAll<HTMLElement>('.pdf-slide'));
      if (!slides.length) throw new Error('Nenhuma página de relatório foi encontrada.');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let index = 0; index < slides.length; index += 1) {
        const slide = slides[index];
        const canvas = await html2canvas(slide, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 800,
        });
        const image = canvas.toDataURL('image/jpeg', 0.94);
        if (index > 0) pdf.addPage();
        pdf.addImage(image, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      const safeSeller = seller.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'seller';
      pdf.save(`relatorio-executivo-${safeSeller}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível gerar o PDF.';
      setError(message);
      console.error('Erro ao gerar relatório PDF:', cause);
    } finally {
      setGenerating(false);
    }
  };

  if (!data) {
    return (
      <section className="p-8 max-w-4xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">📭</div>
          <h2 className="text-2xl font-bold text-slate-800">Nenhum dado disponível para o relatório</h2>
          <p className="mt-2 text-slate-600">Carregue os relatórios do Seller antes de gerar o PDF executivo.</p>
        </div>
      </section>
    );
  }

  const stockAlerts = (data.alerts?.stock || []).slice(0, 4);
  const pricingAlerts = (data.alerts?.pricing || []).slice(0, 4);
  const performanceAlerts = (data.alerts?.performance || []).slice(0, 4);

  return (
    <section className="p-6 max-w-6xl">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-700 p-7 text-white shadow-xl">
        <p className="text-blue-200 text-sm font-semibold tracking-widest">RELATÓRIO EXECUTIVO</p>
        <h1 className="mt-2 text-3xl font-bold">Apresentação mensal do Seller</h1>
        <p className="mt-2 text-blue-100">PDF profissional com indicadores, alertas e plano de ação.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={handleDownload} disabled={generating} className="rounded-xl bg-white px-5 py-3 font-bold text-blue-700 shadow hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
            {generating ? 'Gerando PDF...' : 'Baixar Relatório Executivo (PDF)'}
          </button>
          <span className="rounded-xl border border-blue-300/40 px-4 py-3 text-sm text-blue-100">Seller: <strong>{seller}</strong></span>
          <span className="rounded-xl border border-blue-300/40 px-4 py-3 text-sm text-blue-100">Período: <strong>{dateLabel}</strong></span>
        </div>
      </div>

      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"><strong>Não foi possível gerar o PDF:</strong> {error}</div>}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">O PDF incluirá 8 páginas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-700">
          {['Capa e contexto', 'Visão comercial', 'Performance de Ads', 'Catálogo e estoque', 'Rentabilidade', 'Tráfego orgânico', 'Central de alertas', 'Plano de ação'].map((item, index) => <div key={item} className="rounded-xl bg-slate-50 p-3"><strong>{index + 1}.</strong> {item}</div>)}
        </div>
      </div>

      <div id="pdf-slides-root" aria-hidden="true" style={{ position: 'fixed', left: '-10000px', top: 0, width: 800, pointerEvents: 'none' }}>
        <style>{`
          .pdf-slide { width: 800px; height: 1131px; box-sizing: border-box; overflow: hidden; color: #0f172a; background: #ffffff; font-family: Arial, Helvetica, sans-serif; padding: 56px; position: relative; }
          .pdf-cover { color: white; background: linear-gradient(135deg, #071a3c 0%, #123f87 58%, #1d74d5 100%); }
          .pdf-eyebrow { color: #60a5fa; font-size: 15px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase; }
          .pdf-cover .pdf-eyebrow { color: #bfdbfe; }
          .pdf-title { margin: 10px 0 10px; font-size: 38px; line-height: 1.12; font-weight: 800; }
          .pdf-subtitle { color: #64748b; font-size: 18px; line-height: 1.5; }
          .pdf-cover .pdf-subtitle { color: #dbeafe; }
          .pdf-rule { width: 92px; height: 6px; border-radius: 9px; background: #60a5fa; margin: 28px 0; }
          .pdf-cover-card { margin-top: 50px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.1); border-radius: 22px; padding: 28px; font-size: 20px; line-height: 1.8; }
          .pdf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 30px 0; }
          .pdf-card { border-radius: 18px; padding: 20px; border: 1px solid #e2e8f0; background: #f8fafc; min-height: 112px; }
          .pdf-card-label { color: #64748b; font-size: 14px; font-weight: 700; }
          .pdf-card-value { margin-top: 12px; font-size: 25px; font-weight: 800; color: #0f3f89; line-height: 1.1; }
          .pdf-section { margin-top: 25px; border: 1px solid #e2e8f0; border-radius: 18px; padding: 23px; background: #fff; }
          .pdf-section h3 { margin: 0 0 14px; color: #0f3f89; font-size: 21px; }
          .pdf-section p, .pdf-section li { font-size: 17px; line-height: 1.52; }
          .pdf-list { margin: 0; padding-left: 21px; }
          .pdf-list li { margin: 9px 0; }
          .pdf-highlight { background: #eff6ff; border-color: #bfdbfe; }
          .pdf-warning { background: #fff7ed; border-color: #fed7aa; }
          .pdf-danger { background: #fef2f2; border-color: #fecaca; }
          .pdf-success { background: #f0fdf4; border-color: #bbf7d0; }
          .pdf-footer { position: absolute; left: 56px; right: 56px; bottom: 34px; display: flex; justify-content: space-between; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
          .pdf-cover .pdf-footer { color: #dbeafe; border-color: rgba(255,255,255,.25); }
          .pdf-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .pdf-ranking { display: flex; align-items: center; gap: 12px; margin: 10px 0; padding: 11px 13px; border-radius: 12px; background: #f8fafc; }
          .pdf-rank { width: 27px; height: 27px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; background: #dbeafe; color: #1d4ed8; }
        `}</style>

        <article className="pdf-slide pdf-cover">
          <p className="pdf-eyebrow">Amazon Brasil · Gestão Comercial</p>
          <h1 className="pdf-title" style={{ fontSize: 52, marginTop: 25 }}>MEGA DASHBOARD<br />AMAZON BRASIL</h1>
          <div className="pdf-rule" />
          <p className="pdf-subtitle" style={{ fontSize: 24 }}>Relatório Executivo de Performance</p>
          <div className="pdf-cover-card">
            <div><strong>Seller:</strong> {seller}</div>
            <div><strong>Período analisado:</strong> {dateLabel}</div>
            <div><strong>Relatório gerado em:</strong> {generatedAt}</div>
          </div>
          <div style={{ marginTop: 140, fontSize: 70 }}>📊</div>
          <footer className="pdf-footer"><span>BB Hub Market</span><span>Relatório confidencial</span></footer>
        </article>

        <article className="pdf-slide">
          <p className="pdf-eyebrow">01 · Visão Comercial</p><h2 className="pdf-title">Vendas e resultado do período</h2><p className="pdf-subtitle">Panorama dos principais indicadores comerciais do Seller.</p>
          <div className="pdf-grid"><Metric label="Faturamento" value={brl(metrics.revenue)} /><Metric label="Pedidos / unidades" value={number(metrics.orders)} color="#15803d" /><Metric label="Ticket médio" value={brl(metrics.ticket)} color="#7e22ce" /></div>
          <div className="pdf-section pdf-highlight"><h3>Leitura executiva</h3><ul className="pdf-list"><li>O período totalizou <strong>{brl(metrics.revenue)}</strong> em receita, com <strong>{number(metrics.orders)}</strong> pedidos ou unidades processadas.</li><li>O ticket médio registrado foi de <strong>{brl(metrics.ticket)}</strong>.</li><li>Use a visão de Pedidos para acompanhar concentração de vendas por produto e dias de maior demanda.</li></ul></div>
          <div className="pdf-section"><h3>Direcionamento</h3><p>Priorize os produtos com maior participação no faturamento e valide disponibilidade de estoque para evitar perda de conversão.</p></div>
          <Footer seller={seller} page="2" />
        </article>

        <article className="pdf-slide">
          <p className="pdf-eyebrow">02 · Mídia paga</p><h2 className="pdf-title">Performance de Amazon Ads</h2><p className="pdf-subtitle">Eficiência do investimento e retorno das campanhas no período.</p>
          <div className="pdf-grid"><Metric label="Investimento Ads" value={brl(metrics.spend)} color="#b91c1c" /><Metric label="ROAS" value={`${metrics.roas.toFixed(2)}x`} color="#15803d" /><Metric label="ACOS" value={percent(metrics.acos)} color="#c2410c" /></div>
          <div className="pdf-section pdf-highlight"><h3>Leitura executiva</h3><ul className="pdf-list"><li>O investimento em mídia foi de <strong>{brl(metrics.spend)}</strong>.</li><li>O retorno sobre investimento (ROAS) foi de <strong>{metrics.roas.toFixed(2)}x</strong>.</li><li>O ACOS consolidado ficou em <strong>{percent(metrics.acos)}</strong>.</li></ul></div>
          <div className="pdf-section pdf-warning"><h3>Recomendação</h3><p>Realocar orçamento para campanhas com retorno consistente e revisar termos de busca e campanhas cujo ACOS esteja acima da meta do Seller.</p></div>
          <Footer seller={seller} page="3" />
        </article>

        <article className="pdf-slide">
          <p className="pdf-eyebrow">03 · Catálogo</p><h2 className="pdf-title">Saúde do catálogo e estoque</h2><p className="pdf-subtitle">Indicadores para preservar disponibilidade e potencial de venda.</p>
          <div className="pdf-grid"><Metric label="SKUs ativos" value={number(metrics.activeSkus)} /><Metric label="Sem estoque" value={number(metrics.outOfStock)} color="#b91c1c" /><Metric label="Estoque baixo" value={number(metrics.lowStock)} color="#c2410c" /></div>
          <div className="pdf-two-col"><div className="pdf-section pdf-danger"><h3>Prioridade imediata</h3><p><strong>{number(metrics.outOfStock)}</strong> SKUs estão sem estoque. Avalie reposição, status de listing e impacto nos produtos de maior giro.</p></div><div className="pdf-section pdf-warning"><h3>Prevenção</h3><p><strong>{number(metrics.lowStock)}</strong> SKUs exigem acompanhamento de cobertura para evitar ruptura nos próximos dias.</p></div></div>
          <div className="pdf-section pdf-success"><h3>Direcionamento</h3><p>Combine giro de pedidos, margem e disponibilidade para definir a sequência de reposição. Dê prioridade a itens rentáveis e com maior demanda.</p></div>
          <Footer seller={seller} page="4" />
        </article>

        <article className="pdf-slide">
          <p className="pdf-eyebrow">04 · Resultado</p><h2 className="pdf-title">Rentabilidade e eficiência</h2><p className="pdf-subtitle">Leitura financeira consolidada dos dados processados.</p>
          <div className="pdf-grid"><Metric label="Margem líquida" value={percent(metrics.netMargin)} color="#15803d" /><Metric label="Lucro líquido" value={brl(metrics.netProfit)} color="#0f3f89" /><Metric label="Receita total" value={brl(metrics.revenue)} color="#7e22ce" /></div>
          <div className="pdf-section pdf-highlight"><h3>Leitura executiva</h3><ul className="pdf-list"><li>O lucro líquido estimado foi de <strong>{brl(metrics.netProfit)}</strong>.</li><li>A margem líquida estimada foi de <strong>{percent(metrics.netMargin)}</strong>.</li><li>Valide a composição de taxas, frete, mídia e custo de produto na aba de Rentabilidade para decisões por SKU.</li></ul></div>
          <div className="pdf-section pdf-warning"><h3>Recomendação</h3><p>Trate margem e preço em conjunto: produtos com boa venda, mas baixa margem, devem passar por revisão de custo, logística e estratégia de Ads.</p></div>
          <Footer seller={seller} page="5" />
        </article>

        <article className="pdf-slide">
          <p className="pdf-eyebrow">05 · Tráfego</p><h2 className="pdf-title">Visibilidade e conversão</h2><p className="pdf-subtitle">Indicadores de descoberta e eficiência dos listings.</p>
          <div className="pdf-grid"><Metric label="Visualizações" value={number(metrics.views)} /><Metric label="Sessões" value={number(metrics.sessions)} color="#7e22ce" /><Metric label="Conversão" value={percent(metrics.conversion)} color="#15803d" /></div>
          <div className="pdf-section pdf-highlight"><h3>Leitura executiva</h3><ul className="pdf-list"><li>Foram registradas <strong>{number(metrics.views)}</strong> visualizações e <strong>{number(metrics.sessions)}</strong> sessões.</li><li>A taxa de conversão consolidada foi de <strong>{percent(metrics.conversion)}</strong>.</li><li>Listings com visualização alta e conversão baixa devem ser priorizados em conteúdo, preço, frete e prova social.</li></ul></div>
          <div className="pdf-section"><h3>Direcionamento</h3><p>Otimize título, imagens, conteúdo A+, termos de busca e competitividade de preço dos produtos com maior potencial de tráfego.</p></div>
          <Footer seller={seller} page="6" />
        </article>

        <article className="pdf-slide">
          <p className="pdf-eyebrow">06 · Riscos</p><h2 className="pdf-title">Central de alertas</h2><p className="pdf-subtitle">Pontos que merecem ação ou validação prioritária.</p>
          <div className="pdf-section pdf-danger"><h3>Estoque</h3><AlertList alerts={stockAlerts} empty="Nenhum alerta crítico de estoque identificado." /></div>
          <div className="pdf-section pdf-warning"><h3>Precificação</h3><AlertList alerts={pricingAlerts} empty="Nenhum alerta relevante de precificação identificado." /></div>
          <div className="pdf-section pdf-highlight"><h3>Performance</h3><AlertList alerts={performanceAlerts} empty="Nenhum alerta crítico de performance identificado." /></div>
          <Footer seller={seller} page="7" />
        </article>

        <article className="pdf-slide">
          <p className="pdf-eyebrow">07 · Próximas ações</p><h2 className="pdf-title">Plano de ação recomendado</h2><p className="pdf-subtitle">Sequência prática para a próxima rotina de gestão do Seller.</p>
          <div className="pdf-section pdf-danger"><h3>Prioridade alta · esta semana</h3><ul className="pdf-list"><li>Repor e validar listings dos itens sem estoque.</li><li>Corrigir produtos com risco de ruptura e maior impacto em faturamento.</li><li>Revisar campanhas com custo elevado e retorno abaixo da meta.</li></ul></div>
          <div className="pdf-section pdf-warning"><h3>Prioridade média · próximas duas semanas</h3><ul className="pdf-list"><li>Otimizar os listings de alto tráfego com baixa conversão.</li><li>Aprimorar conteúdo, palavras-chave e imagens dos produtos estratégicos.</li><li>Revisar preço, custos e margem por SKU prioritário.</li></ul></div>
          <div className="pdf-section pdf-success"><h3>Rotina recomendada</h3><p>Faça uma revisão semanal de estoque, Ads, conversão e margem. Reavalie este relatório após a entrada de novos arquivos do Seller.</p></div>
          <Footer seller={seller} page="8" />
        </article>
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="pdf-card"><div className="pdf-card-label">{label}</div><div className="pdf-card-value" style={color ? { color } : undefined}>{value}</div></div>
);

const Footer: React.FC<{ seller: string; page: string }> = ({ seller, page }) => (
  <footer className="pdf-footer"><span>Seller: {seller}</span><span>Relatório Executivo · {page}/8</span></footer>
);

const AlertList: React.FC<{ alerts: unknown[]; empty: string }> = ({ alerts, empty }) => {
  if (!alerts.length) return <p>✅ {empty}</p>;
  return <ul className="pdf-list">{alerts.map((alert, index) => <li key={index}>⚠️ {String(alert)}</li>)}</ul>;
};
