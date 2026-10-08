import React, { useState } from 'react';
import {
  FileSearch,
  Search,
  AlertTriangle,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { AdsSearchTermRow, AdsAdvertisedProductRow } from '../types/amazon';

interface AdsSearchTermsViewProps {
  searchTerms: AdsSearchTermRow[];
  advertisedProducts: AdsAdvertisedProductRow[];
  highRiskTerms: {
    term: string;
    campaign: string;
    clicks: number;
    spend: number;
    sales: number;
    reason: string;
  }[];
}

export const AdsSearchTermsView: React.FC<AdsSearchTermsViewProps> = ({
  searchTerms,
  advertisedProducts,
  highRiskTerms,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'investigation' | 'all_terms' | 'gold_terms' | 'advertised'>('investigation');
  const [searchTerm, setSearchTerm] = useState('');

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Gold terms: Orders >= 2, ACOS <= 15%
  const goldTerms = searchTerms.filter((st) => st.orders >= 2 && st.acos > 0 && st.acos <= 15);

  const filteredSearchTerms = searchTerms.filter((st) =>
    st.customerSearchTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <FileSearch className="w-6 h-6 text-cyan-400" />
            <span>Amazon Ads — Termos de Pesquisa, Alvos & Produtos</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Auditoria semântica de termos do cliente, identificação de termos sob investigação e termos de alta conversão
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar termo ou campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#0f1a2d] border border-[#243554] rounded-xl text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-60"
            />
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[#243554] pb-3">
        <button
          onClick={() => setActiveSubTab('investigation')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'investigation'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
              : 'text-slate-300 hover:text-white bg-[#152238] border border-[#243554]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Gasto sob Investigação (10-15 cliques) ({highRiskTerms.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gold_terms')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition ${
            activeSubTab === 'gold_terms'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
              : 'text-slate-300 hover:text-white bg-[#152238] border border-[#243554]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Termos Ouro (Alta Conversão) ({goldTerms.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('all_terms')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
            activeSubTab === 'all_terms'
              ? 'bg-[#0f1a2d] text-white border border-cyan-500/50 shadow-md'
              : 'text-slate-300 hover:text-white bg-[#152238] border border-[#243554]'
          }`}
        >
          Todos os Termos ({filteredSearchTerms.length})
        </button>

        <button
          onClick={() => setActiveSubTab('advertised')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
            activeSubTab === 'advertised'
              ? 'bg-[#0f1a2d] text-white border border-cyan-500/50 shadow-md'
              : 'text-slate-300 hover:text-white bg-[#152238] border border-[#243554]'
          }`}
        >
          Produtos Anunciados ({advertisedProducts.length})
        </button>
      </div>

      {/* Subtab 1: Terms under Investigation */}
      {activeSubTab === 'investigation' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#152238] border-2 border-amber-500/40 rounded-2xl space-y-2 text-xs md:text-sm shadow-xl">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm md:text-base">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Diretriz do Consultor Sênior: Termos com 10 a 15 cliques e zero conversão</span>
            </div>
            <p className="text-slate-200 leading-relaxed">
              Estes termos acumularam entre 10 e 15+ cliques sem vendas registradas no período. A Amazon trabalha com uma janela de atribuição de 7 a 14 dias (um cliente pode comprar dias após o clique). Portanto, chame este montante de <strong>“gasto sob investigação”</strong> e coloque em revisão semanal. Não tribute este corte como economia garantida automática sem antes avaliar se o termo não alimenta o topo do funil ou tráfego direto.
            </p>
          </div>

          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#243554] flex justify-between items-center bg-[#111c30]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Termos Elegíveis para Revisão Semanal / Negativação
              </h3>
              <span className="text-xs md:text-sm text-amber-300 font-bold bg-[#0f1a2d] px-3 py-1 rounded-lg border border-[#1e2f4a]">
                Gasto Total Sob Investigação:{' '}
                {formatBRL(highRiskTerms.reduce((acc, t) => acc + t.spend, 0))}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-3.5">Termo Digitado pelo Cliente</th>
                    <th className="py-3.5 px-3.5">Campanha</th>
                    <th className="py-3.5 px-3.5">Cliques</th>
                    <th className="py-3.5 px-3.5">Gasto</th>
                    <th className="py-3.5 px-3.5">Vendas</th>
                    <th className="py-3.5 px-3.5">Diagnóstico Técnico & Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                  {highRiskTerms.map((t, idx) => (
                    <tr key={idx} className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-white font-sans text-sm">{t.term}</td>
                      <td className="py-3 px-3.5 text-slate-300 font-sans">{t.campaign}</td>
                      <td className="py-3 px-3.5 text-amber-400 font-bold">{t.clicks}</td>
                      <td className="py-3 px-3.5 text-rose-400 font-bold">{formatBRL(t.spend)}</td>
                      <td className="py-3 px-3.5 text-slate-400">R$ 0,00</td>
                      <td className="py-3 px-3.5 text-xs text-slate-200 font-sans max-w-sm leading-relaxed">
                        {t.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Gold Terms */}
      {activeSubTab === 'gold_terms' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#152238] border-2 border-emerald-500/40 rounded-2xl space-y-2 text-xs md:text-sm shadow-xl">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm md:text-base">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Oportunidade de Escalar: Termos Ouro de Alta Eficiência</span>
            </div>
            <p className="text-slate-200 leading-relaxed">
              Termos que geraram pelo menos 2 pedidos com ACOS abaixo de 15%. Recomenda-se colher (harvest) esses termos para campanhas de correspondência EXATA (Exact Match) com lance otimizado para maximizar a cota de impressões.
            </p>
          </div>

          <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-200">
                <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-3.5">Termo Ouro</th>
                    <th className="py-3.5 px-3.5">Campanha</th>
                    <th className="py-3.5 px-3.5">Pedidos</th>
                    <th className="py-3.5 px-3.5">Vendas</th>
                    <th className="py-3.5 px-3.5">Gasto</th>
                    <th className="py-3.5 px-3.5">ACOS</th>
                    <th className="py-3.5 px-3.5">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                  {goldTerms.map((t, idx) => (
                    <tr key={idx} className="hover:bg-[#1a2b47] transition">
                      <td className="py-3 px-3.5 font-bold text-white font-sans text-sm">{t.customerSearchTerm}</td>
                      <td className="py-3 px-3.5 text-slate-300 font-sans">{t.campaignName}</td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">{t.orders}</td>
                      <td className="py-3 px-3.5 font-bold text-white">{formatBRL(t.sales)}</td>
                      <td className="py-3 px-3.5 text-amber-400 font-bold">{formatBRL(t.spend)}</td>
                      <td className="py-3 px-3.5 text-emerald-400 font-bold">{(t.acos ?? 0).toFixed(1)}%</td>
                      <td className="py-3 px-3.5 text-cyan-300 font-bold">{(t.roas ?? 0).toFixed(1)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: All Search Terms */}
      {activeSubTab === 'all_terms' && (
        <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm text-slate-200">
              <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-3.5">Termo Pesquisado</th>
                  <th className="py-3.5 px-3.5">Campanha</th>
                  <th className="py-3.5 px-3.5">Correspondência</th>
                  <th className="py-3.5 px-3.5">Cliques</th>
                  <th className="py-3.5 px-3.5">Gasto</th>
                  <th className="py-3.5 px-3.5">Pedidos</th>
                  <th className="py-3.5 px-3.5">Vendas</th>
                  <th className="py-3.5 px-3.5">ACOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                {filteredSearchTerms.slice(0, 100).map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white font-sans text-sm">{t.customerSearchTerm}</td>
                    <td className="py-3 px-3.5 text-slate-300 font-sans max-w-[200px] truncate" title={t.campaignName}>
                      {t.campaignName}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-lg bg-[#0f1a2d] text-slate-300 text-xs border border-[#1e2f4a]">
                        {t.matchType}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-white">{t.clicks}</td>
                    <td className="py-3 px-3.5 text-amber-400 font-bold">{formatBRL(t.spend)}</td>
                    <td className="py-3 px-3.5 text-slate-200 font-medium">{t.orders}</td>
                    <td className="py-3 px-3.5 font-bold text-white">{formatBRL(t.sales)}</td>
                    <td className="py-3 px-3.5">
                      <span className={t.sales > 0 && t.acos <= 20 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                        {t.sales > 0 ? `${(t.acos ?? 0).toFixed(1)}%` : '0%'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 4: Advertised Products */}
      {activeSubTab === 'advertised' && (
        <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm text-slate-200">
              <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-3.5">SKU Anunciado</th>
                  <th className="py-3.5 px-3.5">ASIN</th>
                  <th className="py-3.5 px-3.5">Campanha</th>
                  <th className="py-3.5 px-3.5">Cliques</th>
                  <th className="py-3.5 px-3.5">Gasto</th>
                  <th className="py-3.5 px-3.5">Vendas</th>
                  <th className="py-3.5 px-3.5">ACOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
                {advertisedProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#1a2b47] transition">
                    <td className="py-3 px-3.5 font-bold text-white font-sans text-sm">{p.sku}</td>
                    <td className="py-3 px-3.5 text-slate-400">{p.asin}</td>
                    <td className="py-3 px-3.5 text-slate-300 font-sans">{p.campaignName}</td>
                    <td className="py-3 px-3.5 text-white">{p.clicks}</td>
                    <td className="py-3 px-3.5 text-amber-400 font-bold">{formatBRL(p.spend)}</td>
                    <td className="py-3 px-3.5 font-bold text-white">{formatBRL(p.sales)}</td>
                    <td className="py-3 px-3.5">
                      <span className={p.sales > 0 && p.acos <= 20 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                        {p.sales > 0 ? `${(p.acos ?? 0).toFixed(1)}%` : 'Sem vendas'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
