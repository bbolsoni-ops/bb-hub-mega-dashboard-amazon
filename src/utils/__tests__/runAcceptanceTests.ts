import { runAllAcceptanceTests } from './acceptanceTests';

console.log('====================================================');
console.log('  BB HUB | TESTES DE ACEITE OBRIGATÓRIOS (AMAZON BR) ');
console.log('====================================================\n');

const { passed, results } = runAllAcceptanceTests();

for (const r of results) {
  const icon = r.passed ? '✅ [PASSOU]' : '❌ [FALHOU]';
  console.log(`${icon} ${r.name}`);
  if (!r.passed) {
    console.error(`   Detalhe: ${r.message}`);
  }
}

console.log('\n----------------------------------------------------');
if (passed) {
  console.log(`🎉 TODOS OS ${results.length} TESTES DE ACEITE FORAM APROVADOS COM SUCESSO!`);
  process.exit(0);
} else {
  console.error(`🚨 ALGUNS TESTES FALHARAM! Verifique os detalhes acima.`);
  process.exit(1);
}
