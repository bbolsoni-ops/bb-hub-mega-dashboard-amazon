import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { runAllAcceptanceTests, TestResult } from '../utils/__tests__/acceptanceTests';

interface AcceptanceTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptanceTestsModal: React.FC<AcceptanceTestsModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [allPassed, setAllPassed] = useState<boolean>(true);

  const runTests = () => {
    const outcome = runAllAcceptanceTests();
    setResults(outcome.results);
    setAllPassed(outcome.passed);
  };

  useEffect(() => {
    if (isOpen) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6 overflow-hidden modal-overlay">
      <div className="bg-[#0f172a] border border-[#243554] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden modal-container">
        {/* Header */}
        <div className="bg-[#111c30] border-b border-[#243554] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Bateria de Testes de Aceite Obrigatórios
              </h2>
              <p className="text-xs text-slate-400">
                Executado localmente em memória no navegador ({results.length} critérios especificados)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-[#1e2f4a] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between bg-[#152238] p-4 rounded-2xl border border-[#243554]">
            <div>
              <span className="text-slate-300 font-bold block">Status Geral dos Testes:</span>
              <span className={`text-sm font-black ${allPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {allPassed ? `🎉 ${results.length} de ${results.length} Testes Aprovados com Sucesso` : 'Alguns testes falharam'}
              </span>
            </div>
            <button
              onClick={runTests}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reexecutar</span>
            </button>
          </div>

          <div className="space-y-2">
            {results.map((r, idx) => (
              <div
                key={idx}
                className="bg-[#0f1a2d] p-3.5 rounded-xl border border-[#1e2f4a] flex items-start gap-3"
              >
                {r.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-200">{r.name}</div>
                  <div className={`text-[11px] mt-0.5 ${r.passed ? 'text-emerald-400/80 font-mono' : 'text-rose-400'}`}>
                    {r.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#111c30] border-t border-[#243554] px-6 py-3.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
