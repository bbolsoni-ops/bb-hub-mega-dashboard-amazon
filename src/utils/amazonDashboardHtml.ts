/**
 * Generates the complete standalone HTML code for the Amazon Professional Dashboard,
 * ready to copy-paste or download.
 */
export function getAmazonDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amazon Analytics Dashboard</title>
    
    <!-- Tailwind CSS para Estilização Profissional -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Chart.js para Gráficos Interativos -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- FontAwesome para Ícones -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Google Fonts Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #F4F6F8;
            color: #333333;
        }
        .amazon-orange { color: #FF9900; }
        .bg-amazon-orange { background-color: #FF9900; }
        .amazon-dark { color: #131921; }
        .bg-amazon-dark { background-color: #131921; }
        .amazon-blue { color: #007185; }
        .glass-card {
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            transition: all 0.2s ease-in-out;
        }
        .glass-card:hover {
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
            transform: translateY(-2px);
        }
        .sidebar-item {
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        .sidebar-item:hover, .sidebar-item.active {
            background-color: rgba(255, 153, 0, 0.1);
            color: #FF9900;
            border-left-color: #FF9900;
        }
    </style>
</head>
<body class="flex h-screen overflow-hidden">

    <!-- Barra Lateral (Sidebar) -->
    <aside class="w-64 bg-[#131921] text-gray-300 flex flex-col justify-between hidden md:flex z-20">
        <div>
            <!-- Logotipo da Loja -->
            <div class="h-16 flex items-center px-6 border-b border-gray-800 gap-3">
                <i class="fa-brands fa-amazon text-2xl text-[#FF9900]"></i>
                <div>
                    <span class="text-white font-bold text-lg tracking-wide">Seller</span><span class="text-[#FF9900] font-bold text-lg">Metrics</span>
                    <p class="text-[10px] text-gray-400 -mt-1 font-mono">DASHBOARD PROFISSIONAL</p>
                </div>
            </div>

            <!-- Navegação -->
            <nav class="mt-6 px-3 space-y-1">
                <a href="#" class="sidebar-item active flex items-center px-4 py-3 text-sm font-medium rounded-r-lg">
                    <i class="fa-solid fa-chart-pie w-6"></i>
                    <span>Visão Geral</span>
                </a>
                <a href="#" class="sidebar-item flex items-center px-4 py-3 text-sm font-medium rounded-r-lg text-gray-400">
                    <i class="fa-solid fa-cart-shopping w-6"></i>
                    <span>Vendas & Pedidos</span>
                </a>
                <a href="#" class="sidebar-item flex items-center px-4 py-3 text-sm font-medium rounded-r-lg text-gray-400">
                    <i class="fa-solid fa-box-open w-6"></i>
                    <span>Curva ABC / Produtos</span>
                </a>
                <a href="#" class="sidebar-item flex items-center px-4 py-3 text-sm font-medium rounded-r-lg text-gray-400">
                    <i class="fa-solid fa-bullhorn w-6"></i>
                    <span>Amazon Ads</span>
                </a>
                <a href="#" class="sidebar-item flex items-center px-4 py-3 text-sm font-medium rounded-r-lg text-gray-400">
                    <i class="fa-solid fa-tags w-6"></i>
                    <span>Precificação</span>
                </a>
                <a href="#" class="sidebar-item flex items-center px-4 py-3 text-sm font-medium rounded-r-lg text-gray-400">
                    <i class="fa-solid fa-file-invoice-dollar w-6"></i>
                    <span>Rentabilidade Real</span>
                </a>
            </nav>
        </div>

        <!-- Perfil / Conta no Rodapé -->
        <div class="p-4 border-t border-gray-800">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm">
                    BR
                </div>
                <div>
                    <p class="text-sm font-medium text-white">Minha Loja Amazon</p>
                    <p class="text-xs text-green-400 flex items-center gap-1 font-mono">
                        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Sincronizado
                    </p>
                </div>
            </div>
        </div>
    </aside>

    <!-- Conteúdo Principal -->
    <div class="flex-1 flex flex-col overflow-y-auto">
        
        <!-- Barra de Cabeçalho Superior -->
        <header class="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10">
            <div class="flex items-center gap-4 flex-1 max-w-lg">
                <div class="relative w-full">
                    <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-gray-400 text-sm"></i>
                    <input type="text" placeholder="Buscar ASIN, SKU, campanha ou pedido..." class="w-full pl-9 pr-4 py-1.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9900] border-transparent transition">
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="flex items-center bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 gap-2">
                    <i class="fa-regular fa-calendar text-gray-500"></i>
                    <span>Agosto / 2026 (Consolidado)</span>
                </div>
                <button class="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <i class="fa-regular fa-bell text-lg"></i>
                    <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
            </div>
        </header>

        <!-- Área de Métricas e Gráficos -->
        <main class="p-6 max-w-7xl mx-auto w-full space-y-6">

            <!-- Cabeçalho de Boas-Vindas e Ações -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Dashboard de Performance Amazon</h1>
                    <p class="text-sm text-gray-500">Acompanhamento consolidado com dados reais e reconciliados da operação.</p>
                </div>
                <div class="flex gap-2">
                    <button class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                        <i class="fa-solid fa-filter text-gray-400"></i> Filtrar
                    </button>
                    <button class="px-4 py-2 bg-[#FF9900] hover:bg-[#e88b00] text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition">
                        <i class="fa-solid fa-file-arrow-down"></i> Exportar Dados
                    </button>
                </div>
            </div>

            <!-- Cards de KPI (Key Performance Indicators) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- Card 1: Faturamento Bruto -->
                <div class="glass-card p-5 border border-gray-200">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 mb-1">Faturamento Bruto</p>
                            <h3 class="text-2xl font-bold text-gray-800">R$ 156.409,00</h3>
                        </div>
                        <div class="p-2.5 bg-green-100 rounded-lg text-green-600 flex items-center justify-center">
                            <i class="fa-solid fa-dollar-sign text-lg"></i>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center text-sm">
                        <span class="text-green-500 font-medium flex items-center">
                            <i class="fa-solid fa-arrow-up mr-1 text-xs"></i> 13.5%
                        </span>
                        <span class="text-gray-400 ml-2">vs mês anterior (R$ 137.824)</span>
                    </div>
                </div>

                <!-- Card 2: Unidades Vendidas -->
                <div class="glass-card p-5 border border-gray-200">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 mb-1">Unidades Vendidas</p>
                            <h3 class="text-2xl font-bold text-gray-800">1.777</h3>
                        </div>
                        <div class="p-2.5 bg-blue-100 rounded-lg text-blue-600 flex items-center justify-center">
                            <i class="fa-solid fa-box text-lg"></i>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center text-sm">
                        <span class="text-green-500 font-medium flex items-center">
                            <i class="fa-solid fa-arrow-up mr-1 text-xs"></i> 13.3%
                        </span>
                        <span class="text-gray-400 ml-2">vs mês anterior (1.568 un.)</span>
                    </div>
                </div>

                <!-- Card 3: ACoS (Ads) -->
                <div class="glass-card p-5 border border-gray-200">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 mb-1">ACoS (Ads)</p>
                            <h3 class="text-2xl font-bold text-gray-800">22.8%</h3>
                        </div>
                        <div class="p-2.5 bg-orange-100 rounded-lg text-[#FF9900] flex items-center justify-center">
                            <i class="fa-solid fa-bullseye text-lg"></i>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center text-sm">
                        <span class="text-green-500 font-medium flex items-center">
                            <i class="fa-solid fa-arrow-down mr-1 text-xs"></i> 1.4%
                        </span>
                        <span class="text-gray-400 ml-2">ROAS consolidado 4.38x</span>
                    </div>
                </div>

                <!-- Card 4: Buy Box Win Rate -->
                <div class="glass-card p-5 border border-gray-200">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-sm font-medium text-gray-500 mb-1">Buy Box Win Rate</p>
                            <h3 class="text-2xl font-bold text-gray-800">92.6%</h3>
                        </div>
                        <div class="p-2.5 bg-purple-100 rounded-lg text-purple-600 flex items-center justify-center">
                            <i class="fa-solid fa-trophy text-lg"></i>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center text-sm">
                        <span class="text-green-500 font-medium flex items-center">
                            <i class="fa-solid fa-arrow-up mr-1 text-xs"></i> 0.1%
                        </span>
                        <span class="text-gray-400 ml-2">vs mês anterior (92.5%)</span>
                    </div>
                </div>
            </div>

            <!-- Gráficos Principais -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Gráfico de Linha (Faturamento) -->
                <div class="glass-card p-5 lg:col-span-2 border border-gray-200">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <i class="fa-solid fa-chart-line text-[#FF9900]"></i>
                            Evolução de Vendas Diárias (Últimos Dias)
                        </h3>
                        <span class="text-xs bg-orange-50 text-orange-800 font-semibold px-2.5 py-1 rounded-full border border-orange-200">Tendência Diária</span>
                    </div>
                    <div class="h-64">
                        <canvas id="salesChart"></canvas>
                    </div>
                </div>

                <!-- Gráfico de Rosca (Categorias) -->
                <div class="glass-card p-5 border border-gray-200 flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <i class="fa-solid fa-pie-chart text-[#007185]"></i>
                            Vendas por Categoria
                        </h3>
                    </div>
                    <div class="h-56 relative flex items-center justify-center">
                        <canvas id="categoryChart"></canvas>
                    </div>
                    <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#FF9900]"></span> Cafés: <strong>33%</strong></div>
                        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#232F3E]"></span> Moedores: <strong>28%</strong></div>
                        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#007185]"></span> Prensas: <strong>20%</strong></div>
                        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Acessórios: <strong>19%</strong></div>
                    </div>
                </div>
            </div>

            <!-- Tabela de Top Produtos -->
            <div class="glass-card p-5 mb-8 border border-gray-200">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">Top 5 Produtos (Curva A)</h3>
                        <p class="text-xs text-gray-500">Produtos líderes responsáveis pela maior fatia de receita e tração na conta</p>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th class="p-3 border-b border-gray-200 font-semibold rounded-tl-lg">Produto (ASIN / SKU)</th>
                                <th class="p-3 border-b border-gray-200 font-semibold text-right">Unidades</th>
                                <th class="p-3 border-b border-gray-200 font-semibold text-right">Faturamento</th>
                                <th class="p-3 border-b border-gray-200 font-semibold text-center rounded-tr-lg">Estoque</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            <!-- Produto 1 -->
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="p-3 flex items-center">
                                    <div class="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg mr-3 flex-shrink-0 flex items-center justify-center">
                                        <i class="fa-solid fa-mug-hot text-base"></i>
                                    </div>
                                    <div class="max-w-md">
                                        <p class="font-medium text-gray-800 text-sm">Café Especial em Grãos Torrado 1kg Gourmet Cerrado Mineiro</p>
                                        <p class="text-xs text-gray-500 font-mono mt-0.5">B08ABC1234 • SKU-CAFE-ESPR-1KG</p>
                                    </div>
                                </td>
                                <td class="p-3 text-right font-medium text-gray-700 font-mono">460</td>
                                <td class="p-3 text-right font-bold text-gray-900 font-mono">R$ 41.354,00</td>
                                <td class="p-3 text-center">
                                    <span class="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Saudável</span>
                                </td>
                            </tr>

                            <!-- Produto 2 -->
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="p-3 flex items-center">
                                    <div class="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg mr-3 flex-shrink-0 flex items-center justify-center">
                                        <i class="fa-solid fa-bolt text-base"></i>
                                    </div>
                                    <div class="max-w-md">
                                        <p class="font-medium text-gray-800 text-sm">Moedor de Café Elétrico Automático Lâminas Inox 220V</p>
                                        <p class="text-xs text-gray-500 font-mono mt-0.5">B08XYZ5678 • SKU-MOED-ELETR-INOX</p>
                                    </div>
                                </td>
                                <td class="p-3 text-right font-medium text-gray-700 font-mono">185</td>
                                <td class="p-3 text-right font-bold text-gray-900 font-mono">R$ 38.665,00</td>
                                <td class="p-3 text-center">
                                    <span class="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Baixo (14)</span>
                                </td>
                            </tr>

                            <!-- Produto 3 -->
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="p-3 flex items-center">
                                    <div class="w-10 h-10 bg-purple-100 text-purple-700 rounded-lg mr-3 flex-shrink-0 flex items-center justify-center">
                                        <i class="fa-solid fa-flask text-base"></i>
                                    </div>
                                    <div class="max-w-md">
                                        <p class="font-medium text-gray-800 text-sm">Prensa Francesa Vidro Borossilicato 800ml Êmbolo Duplo Inox</p>
                                        <p class="text-xs text-gray-500 font-mono mt-0.5">B09DEF9012 • SKU-PREN-FRAN-800ML</p>
                                    </div>
                                </td>
                                <td class="p-3 text-right font-medium text-gray-700 font-mono">340</td>
                                <td class="p-3 text-right font-bold text-gray-900 font-mono">R$ 30.260,00</td>
                                <td class="p-3 text-center">
                                    <span class="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Saudável</span>
                                </td>
                            </tr>

                            <!-- Produto 4 -->
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="p-3 flex items-center">
                                    <div class="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg mr-3 flex-shrink-0 flex items-center justify-center">
                                        <i class="fa-solid fa-leaf text-base"></i>
                                    </div>
                                    <div class="max-w-md">
                                        <p class="font-medium text-gray-800 text-sm">Café Especial Moído 500g Mogiana Paulista Torra Média Floral</p>
                                        <p class="text-xs text-gray-500 font-mono mt-0.5">B08GHI3456 • SKU-CAFE-MOID-500G</p>
                                    </div>
                                </td>
                                <td class="p-3 text-right font-medium text-gray-700 font-mono">490</td>
                                <td class="p-3 text-right font-bold text-gray-900 font-mono">R$ 26.901,00</td>
                                <td class="p-3 text-center">
                                    <span class="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Saudável</span>
                                </td>
                            </tr>

                            <!-- Produto 5 -->
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="p-3 flex items-center">
                                    <div class="w-10 h-10 bg-cyan-100 text-cyan-700 rounded-lg mr-3 flex-shrink-0 flex items-center justify-center">
                                        <i class="fa-solid fa-shield-halved text-base"></i>
                                    </div>
                                    <div class="max-w-md">
                                        <p class="font-medium text-gray-800 text-sm">Filtro Permanente Inox V60 Reutilizável Malha Dupla Fina</p>
                                        <p class="text-xs text-gray-500 font-mono mt-0.5">B09JKL7890 • SKU-FILT-INOX-V60</p>
                                    </div>
                                </td>
                                <td class="p-3 text-right font-medium text-gray-700 font-mono">302</td>
                                <td class="p-3 text-right font-bold text-gray-900 font-mono">R$ 19.229,00</td>
                                <td class="p-3 text-center">
                                    <span class="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Baixo (8)</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Rodapé Informativo -->
            <div class="text-center text-xs text-gray-400 pb-8 flex items-center justify-center gap-1.5">
                <i class="fa-brands fa-amazon text-[#FF9900]"></i>
                <span>Amazon Seller Analytics • Painel Executivo de Performance</span>
            </div>

        </main>
    </div>

    <!-- Script de Configuração dos Gráficos com Chart.js -->
    <script>
        // Gráfico de Linha: Faturamento Diário (Últimos 10 Dias)
        const ctxSales = document.getElementById('salesChart').getContext('2d');
        const gradient = ctxSales.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(255, 153, 0, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 153, 0, 0.0)');

        new Chart(ctxSales, {
            type: 'line',
            data: {
                labels: ['22/Ago', '23/Ago', '24/Ago', '25/Ago', '26/Ago', '27/Ago', '28/Ago', '29/Ago', '30/Ago', '31/Ago'],
                datasets: [{
                    label: 'Vendas (R$)',
                    data: [6289, 5817, 3453, 3100, 5083, 5849, 6294, 6009, 5256, 3127],
                    borderColor: '#FF9900',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#FF9900',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#131921',
                        titleColor: '#FF9900',
                        bodyColor: '#FFFFFF',
                        callbacks: {
                            label: function(context) {
                                return ' Faturamento: R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6B7280', font: { size: 11 } }
                    },
                    y: {
                        grid: { color: '#E5E7EB' },
                        ticks: {
                            color: '#6B7280',
                            font: { size: 11 },
                            callback: function(value) {
                                return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                            }
                        }
                    }
                }
            }
        });

        // Gráfico de Rosca: Vendas por Categoria
        const ctxCategory = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: ['Cafés Especiais', 'Moedores & Eletro', 'Prensas & Utensílios', 'Acessórios & Filtros'],
                datasets: [{
                    data: [33, 28, 20, 19],
                    backgroundColor: ['#FF9900', '#232F3E', '#007185', '#10B981'],
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.label + ': ' + context.parsed + '% do faturamento';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
}
