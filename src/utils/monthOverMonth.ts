import { BusinessDayRow, OrderItemRow } from '../types/amazon';

export interface MonthlyMetrics {
  monthKey: string; // 'YYYY-MM'
  monthLabel: string; // 'Agosto / 2026'
  shortLabel: string; // 'Ago/26'
  year: number;
  month: number;
  daysCount: number;
  orderedProductSales: number;
  unitsOrdered: number;
  totalOrderItems: number;
  sessions: number;
  pageViews: number;
  buyBoxPercentage: number;
  conversionRate: number; // units / sessions * 100
  aov: number; // sales / orders
  dailyAverageSales: number; // sales / daysCount

  // Logistics & fulfillment from orders
  fbaSales: number;
  fbmSales: number;
  fbaOrders: number;
  fbmOrders: number;
  fbaUnits: number;
  fbmUnits: number;
  fbaSalesShare: number; // %
  shippedOrders: number;
  cancelledOrders: number;
  cancelRate: number; // %

  // MoM deltas vs immediate previous chronological month
  deltaVsPrevMonth?: {
    deltaSales: number;
    deltaSalesPct: number;
    deltaOrders: number;
    deltaOrdersPct: number;
    deltaUnits: number;
    deltaUnitsPct: number;
    deltaAov: number;
    deltaAovPct: number;
    deltaSessionsPct: number;
    deltaConversionRatePoints: number;
    deltaBuyBoxPoints: number;
  };
}

export interface FortnightMetrics {
  label: string; // '1ª Quinzena (Dias 01 a 15)'
  periodKey: string;
  daysCount: number;
  orderedProductSales: number;
  unitsOrdered: number;
  totalOrderItems: number;
  sessions: number;
  conversionRate: number;
  aov: number;
  dailyAverageSales: number;
}

export interface MonthOverMonthAnalysis {
  months: MonthlyMetrics[];
  totalMonths: number;
  bestMonth: MonthlyMetrics | null;
  lowestMonth: MonthlyMetrics | null;
  latestMonth: MonthlyMetrics | null;
  previousMonth: MonthlyMetrics | null;
  recentGrowthSalesPct: number;
  recentGrowthOrdersPct: number;
  allTimeTotalSales: number;
  allTimeTotalOrders: number;
  allTimeAvgAov: number;
  isSingleMonth: boolean;
  biweeklyBreakdown?: {
    firstHalf: FortnightMetrics;
    secondHalf: FortnightMetrics;
    deltaSales: number;
    deltaSalesPct: number;
    deltaOrders: number;
    deltaOrdersPct: number;
  };
}

const MONTH_NAMES_PT: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};

const SHORT_MONTHS_PT: Record<number, string> = {
  1: 'Jan',
  2: 'Fev',
  3: 'Mar',
  4: 'Abr',
  5: 'Mai',
  6: 'Jun',
  7: 'Jul',
  8: 'Ago',
  9: 'Set',
  10: 'Out',
  11: 'Nov',
  12: 'Dez',
};

/**
 * Calculates complete Month-over-Month (MoM) aggregation, growth deltas,
 * and logistics breakdowns from business daily reports and orders.
 */
export function calculateMonthOverMonth(
  businessDays: BusinessDayRow[] = [],
  orders: OrderItemRow[] = []
): MonthOverMonthAnalysis {
  const monthMap: Record<
    string,
    {
      days: BusinessDayRow[];
      orders: OrderItemRow[];
    }
  > = {};

  // 1) Group businessDays by YYYY-MM
  for (const day of businessDays) {
    if (!day.date || day.date.length < 7) continue;
    const monthKey = day.date.slice(0, 7); // e.g. "2026-08"
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { days: [], orders: [] };
    }
    monthMap[monthKey].days.push(day);
  }

  // 2) Group orders by YYYY-MM
  for (const ord of orders) {
    if (!ord.purchaseDate || ord.purchaseDate.length < 7) continue;
    const monthKey = ord.purchaseDate.slice(0, 7);
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { days: [], orders: [] };
    }
    monthMap[monthKey].orders.push(ord);
  }

  // Sorted month keys chronologically (e.g. ['2026-06', '2026-07', '2026-08'])
  const sortedMonthKeys = Object.keys(monthMap).sort();

  const monthlyList: MonthlyMetrics[] = [];

  for (const mKey of sortedMonthKeys) {
    const data = monthMap[mKey];
    const [yearStr, monthStr] = mKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const monthName = MONTH_NAMES_PT[monthNum] || `Mês ${monthNum}`;
    const shortName = SHORT_MONTHS_PT[monthNum] || `M${monthNum}`;

    // Aggregate commercial business days
    let sales = 0;
    let units = 0;
    let itemsCount = 0;
    let sessions = 0;
    let pageViews = 0;
    let sumBuyBox = 0;

    for (const d of data.days) {
      sales += d.orderedProductSales || 0;
      units += d.unitsOrdered || 0;
      itemsCount += d.totalOrderItems || 0;
      sessions += d.sessions || 0;
      pageViews += d.pageViews || 0;
      sumBuyBox += d.buyBoxPercentage || 0;
    }

    const daysCount = data.days.length || 1;
    const avgBuyBox = data.days.length > 0 ? sumBuyBox / data.days.length : 0;
    const conversionRate = sessions > 0 ? (units / sessions) * 100 : 0;

    // Aggregate orders for this month
    let fbaSales = 0;
    let fbmSales = 0;
    let fbaOrders = 0;
    let fbmOrders = 0;
    let fbaUnits = 0;
    let fbmUnits = 0;
    let shippedOrders = 0;
    let cancelledOrders = 0;

    const seenOrderIds = new Set<string>();

    for (const o of data.orders) {
      const isUniqueOrder = !seenOrderIds.has(o.amazonOrderId);
      if (isUniqueOrder) {
        seenOrderIds.add(o.amazonOrderId);
      }

      const isFba =
        o.fulfillmentChannel === 'AFN' ||
        o.fulfillmentChannel === 'Amazon' ||
        o.fulfillmentChannel === 'DBA';

      const lineGross = (o.itemPrice || 0) * (o.quantity || 1);
      const isCancelled = o.orderStatus === 'Canceled';
      const isShipped = o.orderStatus === 'Shipped';

      if (isCancelled && isUniqueOrder) cancelledOrders++;
      if (isShipped && isUniqueOrder) shippedOrders++;

      if (!isCancelled) {
        if (isFba) {
          fbaSales += lineGross;
          fbaUnits += o.quantity || 1;
          if (isUniqueOrder) fbaOrders++;
        } else {
          fbmSales += lineGross;
          fbmUnits += o.quantity || 1;
          if (isUniqueOrder) fbmOrders++;
        }
      }
    }

    // If no business days rows exist for this month, fallback to orders gross
    const effectiveSales = sales > 0 ? sales : fbaSales + fbmSales;
    const effectiveOrders = itemsCount > 0 ? itemsCount : seenOrderIds.size;
    const aov = effectiveOrders > 0 ? effectiveSales / effectiveOrders : 0;
    const dailyAverageSales = daysCount > 0 ? effectiveSales / daysCount : 0;
    const totalOrderLogisticsGross = fbaSales + fbmSales;
    const fbaSalesShare = totalOrderLogisticsGross > 0 ? (fbaSales / totalOrderLogisticsGross) * 100 : 0;
    const totalSeenOrders = seenOrderIds.size || 1;
    const cancelRate = totalSeenOrders > 0 ? (cancelledOrders / totalSeenOrders) * 100 : 0;

    monthlyList.push({
      monthKey: mKey,
      monthLabel: `${monthName} / ${year}`,
      shortLabel: `${shortName}/${String(year).slice(2)}`,
      year,
      month: monthNum,
      daysCount,
      orderedProductSales: effectiveSales,
      unitsOrdered: units || (fbaUnits + fbmUnits),
      totalOrderItems: effectiveOrders,
      sessions,
      pageViews,
      buyBoxPercentage: avgBuyBox,
      conversionRate,
      aov,
      dailyAverageSales,
      fbaSales,
      fbmSales,
      fbaOrders,
      fbmOrders,
      fbaUnits,
      fbmUnits,
      fbaSalesShare,
      shippedOrders,
      cancelledOrders,
      cancelRate,
    });
  }

  // 3) Calculate MoM Deltas across consecutive months
  for (let i = 1; i < monthlyList.length; i++) {
    const prev = monthlyList[i - 1];
    const curr = monthlyList[i];

    const deltaSales = curr.orderedProductSales - prev.orderedProductSales;
    const deltaSalesPct = prev.orderedProductSales > 0 ? (deltaSales / prev.orderedProductSales) * 100 : 0;

    const deltaOrders = curr.totalOrderItems - prev.totalOrderItems;
    const deltaOrdersPct = prev.totalOrderItems > 0 ? (deltaOrders / prev.totalOrderItems) * 100 : 0;

    const deltaUnits = curr.unitsOrdered - prev.unitsOrdered;
    const deltaUnitsPct = prev.unitsOrdered > 0 ? (deltaUnits / prev.unitsOrdered) * 100 : 0;

    const deltaAov = curr.aov - prev.aov;
    const deltaAovPct = prev.aov > 0 ? (deltaAov / prev.aov) * 100 : 0;

    const deltaSessions = curr.sessions - prev.sessions;
    const deltaSessionsPct = prev.sessions > 0 ? (deltaSessions / prev.sessions) * 100 : 0;

    const deltaConversionRatePoints = curr.conversionRate - prev.conversionRate;
    const deltaBuyBoxPoints = curr.buyBoxPercentage - prev.buyBoxPercentage;

    curr.deltaVsPrevMonth = {
      deltaSales,
      deltaSalesPct,
      deltaOrders,
      deltaOrdersPct,
      deltaUnits,
      deltaUnitsPct,
      deltaAov,
      deltaAovPct,
      deltaSessionsPct,
      deltaConversionRatePoints,
      deltaBuyBoxPoints,
    };
  }

  // Find Best and Lowest month
  let bestMonth: MonthlyMetrics | null = null;
  let lowestMonth: MonthlyMetrics | null = null;
  let allTimeTotalSales = 0;
  let allTimeTotalOrders = 0;

  for (const m of monthlyList) {
    allTimeTotalSales += m.orderedProductSales;
    allTimeTotalOrders += m.totalOrderItems;

    if (!bestMonth || m.orderedProductSales > bestMonth.orderedProductSales) {
      bestMonth = m;
    }
    if (!lowestMonth || m.orderedProductSales < lowestMonth.orderedProductSales) {
      lowestMonth = m;
    }
  }

  const allTimeAvgAov = allTimeTotalOrders > 0 ? allTimeTotalSales / allTimeTotalOrders : 0;
  const isSingleMonth = monthlyList.length <= 1;

  const latestMonth = monthlyList.length > 0 ? monthlyList[monthlyList.length - 1] : null;
  const previousMonth = monthlyList.length > 1 ? monthlyList[monthlyList.length - 2] : null;

  const recentGrowthSalesPct = latestMonth?.deltaVsPrevMonth?.deltaSalesPct || 0;
  const recentGrowthOrdersPct = latestMonth?.deltaVsPrevMonth?.deltaOrdersPct || 0;

  // 4) Biweekly breakdown if single month
  let biweeklyBreakdown: MonthOverMonthAnalysis['biweeklyBreakdown'] = undefined;
  if (isSingleMonth && businessDays.length > 5) {
    const sortedDays = [...businessDays].sort((a, b) => a.date.localeCompare(b.date));
    const firstHalfDays = sortedDays.filter((d) => {
      const dayNum = parseInt(d.date.slice(-2), 10);
      return dayNum <= 15;
    });
    const secondHalfDays = sortedDays.filter((d) => {
      const dayNum = parseInt(d.date.slice(-2), 10);
      return dayNum > 15;
    });

    const sumHalf = (days: BusinessDayRow[]) => {
      const s = days.reduce((acc, d) => acc + d.orderedProductSales, 0);
      const u = days.reduce((acc, d) => acc + d.unitsOrdered, 0);
      const o = days.reduce((acc, d) => acc + d.totalOrderItems, 0);
      const sess = days.reduce((acc, d) => acc + d.sessions, 0);
      const daysCount = days.length || 1;
      return {
        orderedProductSales: s,
        unitsOrdered: u,
        totalOrderItems: o,
        sessions: sess,
        conversionRate: sess > 0 ? (u / sess) * 100 : 0,
        aov: o > 0 ? s / o : 0,
        dailyAverageSales: s / daysCount,
        daysCount,
      };
    };

    const firstStats = sumHalf(firstHalfDays);
    const secondStats = sumHalf(secondHalfDays);

    const deltaSales = secondStats.orderedProductSales - firstStats.orderedProductSales;
    const deltaSalesPct =
      firstStats.orderedProductSales > 0 ? (deltaSales / firstStats.orderedProductSales) * 100 : 0;
    const deltaOrders = secondStats.totalOrderItems - firstStats.totalOrderItems;
    const deltaOrdersPct =
      firstStats.totalOrderItems > 0 ? (deltaOrders / firstStats.totalOrderItems) * 100 : 0;

    biweeklyBreakdown = {
      firstHalf: {
        label: '1ª Quinzena (Dias 01 a 15)',
        periodKey: 'Q1',
        ...firstStats,
      },
      secondHalf: {
        label: '2ª Quinzena (Dias 16 ao fim)',
        periodKey: 'Q2',
        ...secondStats,
      },
      deltaSales,
      deltaSalesPct,
      deltaOrders,
      deltaOrdersPct,
    };
  }

  return {
    months: monthlyList,
    totalMonths: monthlyList.length,
    bestMonth,
    lowestMonth,
    latestMonth,
    previousMonth,
    recentGrowthSalesPct,
    recentGrowthOrdersPct,
    allTimeTotalSales,
    allTimeTotalOrders,
    allTimeAvgAov,
    isSingleMonth,
    biweeklyBreakdown,
  };
}
