import React, { useState } from 'react';
import { getAmazonDashboardHtml } from '../utils/amazonDashboardHtml';

interface HtmlCodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HtmlCodeViewerModal: React.FC<HtmlCodeViewerModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const htmlContent = React.useMemo(() => getAmazonDashboardHtml(), []);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = htmlContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_amazon_profissional.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#131921] border border-gray-700 text-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0c1219]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF9900]/20 text-[#FF9900] flex items-center justify-center font-bold">
              <i className="fa-solid fa-code text-lg"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Código HTML do Dashboard Profissional
              </h2>
              <p className="text-xs text-gray-400">
                HTML puro e completo com Tailwind CSS, Chart.js e todos os seus dados reais calculados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#17202c] border-b border-gray-800 text-xs">
          <span className="text-gray-400 font-mono">dashboard_amazon_profissional.html</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <i className="fa-solid fa-download"></i> Baixar Arquivo .HTML
            </button>
            <button
              onClick={handleCopy}
              className={`font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-[#FF9900] hover:bg-[#e88b00] text-white'
              }`}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? 'Copiado para Área de Transferência!' : 'Copiar Código HTML'}
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 flex-1 overflow-auto bg-[#0a0e14]">
          <pre className="text-xs text-emerald-400 font-mono leading-relaxed select-all">
            <code>{htmlContent}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 bg-[#0c1219] flex justify-between items-center text-xs text-gray-400">
          <span>Pronto para copiar e colar em qualquer navegador ou servidor web.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
