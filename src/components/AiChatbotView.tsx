import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Search,
  DollarSign,
  TrendingDown,
  ShoppingBag,
  FileText,
  User,
  Trash2,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { ReconciledMetrics, SkuUnitEconomics, ParsedDataset } from '../types/amazon';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiChatbotViewProps {
  metrics: ReconciledMetrics;
  skusSummary: SkuUnitEconomics[];
  dataset: ParsedDataset;
  isDemoMode: boolean;
}

export const AiChatbotView: React.FC<AiChatbotViewProps> = ({
  metrics,
  skusSummary,
  dataset,
  isDemoMode,
}) => {
  const accountName = dataset.sessionConfig?.accountName || 'Minha Loja Amazon';

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Olá! Sou seu **Consultor Estratégico de Elite para Amazon Brasil**.

Estou conectado aos dados consolidados da conta **${accountName}**:
- 💰 **Faturamento Real**: R$ ${(metrics.businessSales || metrics.ordersShippedGross).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- 🎯 **Gasto com Anúncios**: R$ ${metrics.adsSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- 📊 **TACoS**: ${metrics.tacos !== null ? `${(metrics.tacos ?? 0).toFixed(2)}%` : 'N/D'} | **ROAS Global**: ${metrics.adsRoasLabel}
- 🛒 **Pedidos Faturados**: ${metrics.ordersCountShipped || metrics.businessOrders} pedidos enviados
- 📦 **SKUs Analisados**: ${skusSummary.length} produtos mapeados

Como posso ajudar você a aumentar seu **lucro líquido** e **eliminar desperdícios** hoje?`,
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: query };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!textToSend) setInput('');
    setIsLoading(true);

    const contextSummary = `
- Loja: ${accountName}
- Faturamento Total: R$ ${((metrics.businessSales || metrics.ordersShippedGross) ?? 0).toFixed(2)}
- Pedidos: ${metrics.ordersCountShipped || metrics.businessOrders}
- Gasto Ads: R$ ${(metrics.adsSpend ?? 0).toFixed(2)}
- Vendas Atribuídas a Ads: R$ ${(metrics.adsSalesAttributed ?? 0).toFixed(2)}
- ACOS: ${metrics.adsAcosLabel}
- ROAS: ${metrics.adsRoasLabel}
- TACoS: ${metrics.tacos !== null ? `${(metrics.tacos ?? 0).toFixed(2)}%` : 'N/D'}
- SKUs cadastrados: ${skusSummary.length}
- SKUs com margem crítica (<10%): ${skusSummary.filter((s) => (s.netMarginPercent ?? 15) < 10).length}
`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          contextSummary,
          enableSearch: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do assistente');
      }

      const data = await response.json();
      const botReply =
        data.text ||
        data.reply ||
        'Desculpe, não consegui processar a resposta no momento. Tente novamente.';

      setMessages((prev) => [...prev, { role: 'assistant', content: botReply }]);
    } catch (err) {
      console.warn('Erro ao consultar chatbot:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Houve uma instabilidade momentânea na conexão com o modelo de IA. 

Com base nos dados locais da sua loja:
- **TACoS atual**: ${metrics.tacos ? `${(metrics.tacos ?? 0).toFixed(1)}%` : 'em auditoria'} (o ideal gerencial de mercado é manter entre 6% e 10%).
- **ROAS**: ${metrics.adsRoasLabel}.
- **Ação imediata recomendada**: Revise campanhas com ACOS acima de 40% e negative termos sem vendas com mais de 10 cliques.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    {
      label: '🏆 Quais são meus produtos Classe A?',
      prompt: 'Quais são os produtos Classe A da minha loja e qual porcentagem do faturamento eles representam?',
      icon: ShoppingBag,
    },
    {
      label: '⚠️ Qual campanha tem pior ACOS/ROAS?',
      prompt: 'Qual campanha de anúncios está com o pior desempenho e gastando mais verba sem retorno proporcional?',
      icon: TrendingDown,
    },
    {
      label: '📊 Gerar Resumo Executivo',
      prompt: 'Gere um resumo executivo com os principais KPIs de vendas, publicidade e margem, destacando 3 conquistas e 3 ações prioritárias.',
      icon: FileText,
    },
    {
      label: '💵 Dicas para aumentar margem líquida',
      prompt: 'Com base nas tarifas da Amazon Brasil (comissão e DBA/FBA), o que posso fazer para melhorar a margem de lucro dos meus SKUs?',
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl p-5 shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                Consultoria Estratégica Amazon Brasil (IA)
              </h2>
              <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                · Gemini Pro
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium mt-0.5">
              Tire dúvidas práticas sobre suas vendas, margem, curva ABC e campanhas com base nos relatórios carregados
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                role: 'assistant',
                content:
                  'Histórico limpo. Como posso ajudar você na auditoria da sua conta Amazon agora?',
              },
            ])
          }
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 transition cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#243554] hover:border-rose-300 dark:hover:border-rose-800/60"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpar Conversa</span>
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickPrompts.map((qp, idx) => {
          const Icon = qp.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="flex items-center gap-2.5 p-3.5 bg-white dark:bg-[#152238] hover:bg-slate-50 dark:hover:bg-[#1e2f4a] border border-slate-200 dark:border-[#243554] hover:border-cyan-500/40 rounded-xl text-left transition shadow-xs group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#0f1a2d] text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition">
                {qp.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-2xl shadow-xs flex flex-col h-[520px] overflow-hidden transition-colors">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-950 font-bold'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#243554] text-slate-800 dark:text-slate-200 rounded-tl-none shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap space-y-1.5">{m.content}</div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-[85%] mr-auto">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0f1a2d] border border-slate-200 dark:border-[#243554] text-xs text-slate-700 dark:text-slate-300 rounded-tl-none flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500 animate-spin" />
                <span>Consultor Gemini analisando dados da conta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-[#0c1424] border-t border-slate-200 dark:border-[#243554]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              placeholder="Digite sua dúvida sobre vendas, ACOS, SKU ou peça uma recomendação..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#243554] rounded-xl px-4 py-3 text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-40 text-slate-950 font-black px-5 py-3 rounded-xl text-xs md:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
