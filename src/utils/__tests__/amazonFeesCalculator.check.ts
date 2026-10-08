// Executar: npx tsx src/utils/__tests__/amazonFeesCalculator.check.ts
import { calculateAmazonCommission, calculateDbaFee, calculateFbaFee } from '../amazonFeesCalculator';
let fails = 0;
const eq = (name: string, got: number, want: number) => {
  const ok = Math.abs(got - want) < 0.005;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: got ${got.toFixed(2)} want ${want.toFixed(2)}`);
};
const d = new Date('2026-10-08');
eq('FBA R$40 420g', calculateFbaFee(40, 420, 'standard', 0, d).effectiveFee, 5.85);
eq('FBA R$80 490g', calculateFbaFee(80, 490, 'standard', 0, d).effectiveFee, 12.05);
eq('FBA R$180 3,95kg', calculateFbaFee(180, 3950, 'standard', 0, d).effectiveFee, 21.95);
eq('FBA R$150 12,6kg (tabela)', calculateFbaFee(150, 12600, 'standard', 0, d).effectiveFee, 61.55);
eq('FBA R$100 benef. ads 4%', calculateFbaFee(100, 500, 'experimente_r6', 4, d).effectiveFee, 6);
eq('FBA R$100 benef. ads 2%', calculateFbaFee(100, 500, 'experimente_r6', 2, d).effectiveFee, 14.05);
eq('DBA R$70,99', calculateDbaFee(70.99, 500, false, 'sp_capital', d).effectiveFee, 6.75);
eq('DBA R$100 3,02kg', calculateDbaFee(100, 3000, false, 'sp_capital', d).effectiveFee, 18.85);
eq('DBA promo 50% vencida', calculateDbaFee(100, 3000, true, 'sp_capital', d).effectiveFee, 18.85);
eq('DBA promo 50% valida', calculateDbaFee(100, 3000, true, 'sp_capital', new Date('2026-08-10')).effectiveFee, 9.425);
eq('Comissao Casa R$100 + frete 10', calculateAmazonCommission(100, 'casa_cozinha', undefined, 10).amount, 13.2);
eq('Comissao Moveis R$300', calculateAmazonCommission(300, 'moveis').amount, 40);
console.log(fails ? `${fails} FALHAS` : 'TODOS OS TESTES OK');
process.exit(fails ? 1 : 0);
