/**
 * Utilitários padronizados e seguros de formatação para Amazon Brasil (pt-BR)
 * Protege contra null, undefined, NaN e valores não-numéricos antes de aplicar toFixed ou toLocaleString.
 */

export type ColumnDataType = 'currency' | 'integer' | 'decimal' | 'percentage';

/**
 * Função centralizada e universal para converter números de relatórios da Amazon Brasil e internacional.
 * Usada em toda a importação de CSV/TSV e em todos os KPIs/gráficos/tabelas.
 *
 * Regras:
 * - "94%" -> 94
 * - "94,5%" -> 94.5
 * - "94.5%" -> 94.5
 * - "0,945" -> 94.5 quando percentage em escala decimal
 * - "0.945" -> 94.5 quando percentage em escala decimal
 * - "1.234,56" -> 1234.56
 * - "1,234.56" -> 1234.56
 * - "R$ 1.234,56" -> 1234.56
 * - "", "-", "N/A", "—", "null" e inválidos -> null (NUNCA zero)
 * - Para percentage: se tem %, mantém na escala 0-100; se não tem % e estiver entre 0 e 1, multiplica por 100; nunca multiplica 2x.
 */
export function parseAmazonNumber(
  val: any,
  columnType?: ColumnDataType
): number | null {
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    if (columnType === 'percentage') {
      if (val > 0 && val <= 1) {
        return Number((val * 100).toFixed(6));
      }
      if (val >= -1 && val < 0) {
        return Number((val * 100).toFixed(6));
      }
      return val;
    }
    if (columnType === 'integer') {
      return Math.round(val);
    }
    return val;
  }

  let str = String(val).trim();
  if (
    !str ||
    str === '-' ||
    str === '—' ||
    str === '–' ||
    str === '--' ||
    str === 'N/A' ||
    str === 'N/D' ||
    str === 'n/a' ||
    str === 'n/d' ||
    str === 'null' ||
    str === 'NULL' ||
    str === 'undefined' ||
    str === 'NaN' ||
    str === 'none' ||
    str === 'nil' ||
    str === 'Sem dados' ||
    str === 'Sem dados disponíveis'
  ) {
    return null;
  }

  // Detect negative format: e.g. "(1.234,56)" or "- 1.234,56"
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  const hadPercent = str.includes('%');

  // Strip currency prefixes, %, quotes and spacing
  str = str
    .replace(/\u00a0/g, ' ')
    .replace(/^(R\$|BRL|\$|EUR|US\$|GBP)\s*/i, '')
    .replace(/[%\s"']/g, '')
    .trim();

  if (!str) return null;

  // Determine decimal separator
  let normalized = str;
  if (str.includes('.') && str.includes(',')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      // BR format: 1.234,56 -> 1234.56
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56 -> 1234.56
      normalized = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Single comma: In BR Amazon / latin, comma is decimal
    normalized = str.replace(',', '.');
  } else if (str.includes('.')) {
    // Single dot
    if (columnType === 'integer' && /^\d{1,3}\.\d{3}$/.test(str)) {
      normalized = str.replace(/\./g, '');
    } else {
      normalized = str;
    }
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return null;

  const signed = isNegative ? -parsed : parsed;

  if (columnType === 'integer') {
    return Math.round(signed);
  }

  if (columnType === 'percentage') {
    if (hadPercent) {
      return signed;
    }
    if (signed > 0 && signed <= 1) {
      return Number((signed * 100).toFixed(6));
    }
    if (signed >= -1 && signed < 0) {
      return Number((signed * 100).toFixed(6));
    }
    return signed;
  }

  return signed;
}

/**
 * Função segura para formatar números com toFixed protegida contra undefined, null e NaN.
 */
export const safeToFixed = (value: number | undefined | null, decimals: number = 2): string => {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return (isNaN(num) ? 0 : num).toFixed(decimals);
};

/**
 * Função segura para formatar moeda (R$ 0,00) com replace de ponto por vírgula.
 */
export const formatCurrency = (value: number | undefined | null): string => {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  const safe = isNaN(num) ? 0 : num;
  return `R$ ${safe.toFixed(2).replace('.', ',')}`;
};

/**
 * Função única e padronizada para formatar porcentagem na escala de 0 a 100 no padrão pt-BR.
 * Exibe "N/D" se o valor for null, undefined ou inválido.
 * NUNCA multiplica por 100 internamente.
 * Exibe: 94%, 94,5% ou 94,50% de forma consistente.
 */
export const formatPercentage = (value: number | undefined | null, decimals: number = 2): string => {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return 'N/D';
  }
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return 'N/D';

  const fixed = num.toFixed(decimals).replace('.', ',');
  // Limpa zeros decimais redundantes quando decimals for 2 ou 1 (ex: "94,00" -> "94%", "94,50" -> "94,5%")
  const clean = fixed.replace(/,00$/, '').replace(/(,\d)0$/, '$1');
  return `${clean}%`;
};

/**
 * Alias unificado para formatPercentage
 */
export const formatPercent = formatPercentage;

/**
 * Formata número inteiro ou com separador de milhar (1.250).
 */
export function formatNumber(val: any, fallback = '0'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return num.toLocaleString('pt-BR');
}

/**
 * Multiplicador / Múltiplo de retorno ROAS (ex: 5,20x).
 */
export function formatRoas(val: any, decimals = 2, fallback = '0,00x'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return `${num.toFixed(decimals).replace('.', ',')}x`;
}
