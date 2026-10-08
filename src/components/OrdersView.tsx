import React, { useState } from 'react';
import {
  ShoppingBag,
  Truck,
  Clock,
  XCircle,
  CheckCircle2,
  MapPin,
  Search,
  Filter,
  ArrowUpDown,
  Building,
} from 'lucide-react';
import { OrderItemRow } from '../types/amazon';

interface OrdersViewProps {
  orders: OrderItemRow[];
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Deduplicate orders
  const uniqueOrderIds = new Set(orders.map((o) => o.amazonOrderId));
  const totalOrdersCount = uniqueOrderIds.size;

  const shippedOrders = orders.filter((o) => o.orderStatus === 'Shipped');
  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending');
  const canceledOrders = orders.filter((o) => o.orderStatus === 'Canceled');

  const shippedVal = shippedOrders.reduce((acc, o) => acc + o.itemPrice * o.quantity, 0);
  const pendingVal = pendingOrders.reduce((acc, o) => acc + o.itemPrice * o.quantity, 0);
  const canceledVal = canceledOrders.reduce((acc, o) => acc + o.itemPrice * o.quantity, 0);

  // Fulfillment breakdown: FBA (Full), DBA (Easy Ship), FBM (Próprio)
  const fbaOrders = orders.filter(
    (o) =>
      o.tipoEnvio === 'FBA (Full)' ||
      o.fulfillmentChannel === 'Amazon' ||
      o.fulfillmentChannel === 'AFN' ||
      o.fulfillmentChannel === 'FBA (Full)'
  );
  const dbaOrders = orders.filter(
    (o) => o.tipoEnvio === 'DBA' || o.fulfillmentChannel === 'DBA'
  );
  const fbmOrders = orders.filter(
    (o) =>
      (o.tipoEnvio === 'FBM (Próprio)' ||
        o.fulfillmentChannel === 'Merchant' ||
        o.fulfillmentChannel === 'MFN' ||
        o.fulfillmentChannel === 'FBM (Próprio)') &&
      o.tipoEnvio !== 'DBA' &&
      o.fulfillmentChannel !== 'DBA'
  );

  // State distribution
  const stateCounts: Record<string, { count: number; val: number }> = {};
  orders.forEach((o) => {
    const st = o.shipState || 'Outros';
    if (!stateCounts[st]) stateCounts[st] = { count: 0, val: 0 };
    stateCounts[st].count += 1;
    stateCounts[st].val += o.itemPrice * o.quantity;
  });

  const topStates = Object.entries(stateCounts)
    .sort((a, b) => b[1].val - a[1].val)
    .slice(0, 6);

  // Cancellation analysis by SKU
  const canceledBySku: Record<string, { count: number; val: number; name: string }> = {};
  canceledOrders.forEach((o) => {
    const sku = o.sku || 'N/A';
    if (!canceledBySku[sku]) {
      canceledBySku[sku] = { count: 0, val: 0, name: o.productName || sku };
    }
    canceledBySku[sku].count += o.quantity || 1;
    canceledBySku[sku].val += (o.itemPrice || 0) * (o.quantity || 1);
  });

  const topCanceledSkus = Object.entries(canceledBySku)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.amazonOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.shipCity && o.shipCity.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.orderStatus === statusFilter;
    const matchesChannel =
      channelFilter === 'all' ||
      (channelFilter === 'FBA' &&
        (o.tipoEnvio === 'FBA (Full)' ||
          o.fulfillmentChannel === 'Amazon' ||
          o.fulfillmentChannel === 'AFN' ||
          o.fulfillmentChannel === 'FBA (Full)')) ||
      (channelFilter === 'DBA' && (o.tipoEnvio === 'DBA' || o.fulfillmentChannel === 'DBA')) ||
      (channelFilter === 'FBM' &&
        (o.tipoEnvio === 'FBM (Próprio)' ||
          o.fulfillmentChannel === 'Merchant' ||
          o.fulfillmentChannel === 'MFN' ||
          o.fulfillmentChannel === 'FBM (Próprio)') &&
        o.tipoEnvio !== 'DBA' &&
        o.fulfillmentChannel !== 'DBA') ||
      (channelFilter === 'Amazon' &&
        (o.tipoEnvio === 'FBA (Full)' ||
          o.fulfillmentChannel === 'Amazon' ||
          o.fulfillmentChannel === 'AFN')) ||
      (channelFilter === 'Merchant' &&
        (o.fulfillmentChannel === 'Merchant' || o.tipoEnvio === 'FBM (Próprio)'));

    return matchesSearch && matchesStatus && matchesChannel;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
            <span>Pedidos & Status Operacional (Relatório Todos os Pedidos)</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300 font-medium mt-0.5">
            Deduplicação de pedidos, controle de itens pendentes/cancelados e logística (FBA vs FBM)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0f1a2d] border border-[#243554] rounded-xl px-3.5 py-2 text-xs md:text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="all">Todos os Status</option>
            <option value="Shipped">Enviados (Shipped)</option>
            <option value="Pending">Pendentes (Pending)</option>
            <option value="Canceled">Cancelados (Canceled)</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-[#0f1a2d] border border-[#243554] rounded-xl px-3.5 py-2 text-xs md:text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="all">Todos os Canais</option>
            <option value="FBA">FBA (Full)</option>
            <option value="DBA">DBA (Easy Ship)</option>
            <option value="FBM">FBM (Próprio)</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar ID, SKU ou Cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#0f1a2d] border border-[#243554] rounded-xl text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-52"
            />
          </div>
        </div>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Shipped */}
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs md:text-sm mb-1.5">
            <span className="text-slate-300 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pedidos Enviados (Shipped)</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Faturado
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-emerald-400">{formatBRL(shippedVal)}</p>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between font-medium">
            <span>{new Set(shippedOrders.map((o) => o.amazonOrderId)).size} pedidos únicos</span>
            <span className="font-bold text-white">
              {shippedOrders.reduce((acc, o) => acc + o.quantity, 0)} unidades
            </span>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs md:text-sm mb-1.5">
            <span className="text-slate-300 flex items-center gap-2 font-bold">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Pedidos Pendentes (Pending)</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              Aguardando
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-400">{formatBRL(pendingVal)}</p>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between font-medium">
            <span>{new Set(pendingOrders.map((o) => o.amazonOrderId)).size} pedidos aguardando</span>
            <span className="text-slate-400 italic">Não somar como receita realizada</span>
          </div>
        </div>

        {/* Canceled */}
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-xs md:text-sm mb-1.5">
            <span className="text-slate-300 flex items-center gap-2 font-bold">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Pedidos Cancelados (Canceled)</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
              Perdido
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-rose-400">{formatBRL(canceledVal)}</p>
          <div className="mt-2 text-xs text-slate-300 flex items-center justify-between font-medium">
            <span>{new Set(canceledOrders.map((o) => o.amazonOrderId)).size} pedidos cancelados</span>
            <span className="text-rose-400 font-bold">
              {totalOrdersCount > 0 ? `${((canceledOrders.length / totalOrdersCount) * 100).toFixed(1)}% taxa` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Logistics & States Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Logistics Channels */}
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Canais Logísticos (FBA vs DBA vs FBM)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs md:text-sm">
            <div className="p-3.5 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a]">
              <span className="text-slate-300 text-xs font-semibold">FBA (Full)</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">{fbaOrders.length} itens</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {orders.length > 0 ? `${((fbaOrders.length / orders.length) * 100).toFixed(1)}%` : '0%'} do volume
              </p>
            </div>
            <div className="p-3.5 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a]">
              <span className="text-slate-300 text-xs font-semibold">DBA (Easy Ship)</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">{dbaOrders.length} itens</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {orders.length > 0 ? `${((dbaOrders.length / orders.length) * 100).toFixed(1)}%` : '0%'} do volume
              </p>
            </div>
            <div className="p-3.5 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a]">
              <span className="text-slate-300 text-xs font-semibold">FBM (Próprio)</span>
              <p className="text-xl font-bold text-amber-400 mt-1">{fbmOrders.length} itens</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {orders.length > 0 ? `${((fbmOrders.length / orders.length) * 100).toFixed(1)}%` : '0%'} do volume
              </p>
            </div>
          </div>
        </div>

        {/* Top States */}
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Principais Estados de Destino
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            {topStates.map(([state, data]) => (
              <div key={state} className="p-3 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a] text-center shadow-inner">
                <span className="font-bold text-white text-sm">{state}</span>
                <p className="text-slate-300 text-xs mt-0.5">{data.count} pedidos</p>
                <p className="text-amber-300 text-xs font-bold mt-0.5">{formatBRL(data.val)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Canceled SKUs Alert Card */}
      {topCanceledSkus.length > 0 && (
        <div className="bg-[#152238] border border-[#243554] rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#243554] pb-3">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-rose-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  SKUs com Maior Índice de Cancelamento (Recusa de Boleto / Ruptura)
                </h3>
                <p className="text-xs text-slate-300">
                  Total de {canceledOrders.length} cancelamentos identificados ({totalOrdersCount > 0 ? `${((canceledOrders.length / totalOrdersCount) * 100).toFixed(1)}%` : '0%'} da base de pedidos).
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Perda Acumulada: {formatBRL(canceledVal)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {topCanceledSkus.map(([sku, data]) => (
              <div key={sku} className="p-3 bg-[#0f1a2d] rounded-xl border border-[#1e2f4a] space-y-1">
                <p className="font-mono text-xs font-bold text-white truncate" title={sku}>
                  {sku}
                </p>
                <p className="text-[11px] text-slate-400 truncate" title={data.name}>
                  {data.name}
                </p>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1e2f4a]">
                  <span className="text-rose-400 font-bold">{data.count} cancelados</span>
                  <span className="text-amber-400 font-semibold">{formatBRL(data.val)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[#152238] border border-[#243554] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#243554] flex items-center justify-between bg-[#111c30]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Lista Operacional de Pedidos ({filteredOrders.length} registros)
          </h3>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs md:text-sm text-slate-200">
            <thead className="bg-[#0f1a2d] text-slate-300 font-bold border-b border-[#243554] text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3.5">ID Pedido</th>
                <th className="py-3 px-3.5">Data Compra</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Logística</th>
                <th className="py-3 px-3.5">SKU</th>
                <th className="py-3 px-3.5">Qtd</th>
                <th className="py-3 px-3.5">Preço Item</th>
                <th className="py-3 px-3.5">Destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2f4a] font-mono text-xs md:text-sm">
              {filteredOrders.slice(0, 100).map((o, idx) => (
                <tr key={`${o.amazonOrderId}-${idx}`} className="hover:bg-[#1a2b47] transition">
                  <td className="py-2.5 px-3.5 font-bold text-white whitespace-nowrap">
                    {o.amazonOrderId}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-300 whitespace-nowrap">
                    {o.purchaseDate.slice(0, 10)}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        o.orderStatus === 'Shipped'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : o.orderStatus === 'Pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    {(() => {
                      const channel =
                        o.tipoEnvio ||
                        (o.fulfillmentChannel === 'Amazon' ||
                        o.fulfillmentChannel === 'AFN' ||
                        o.fulfillmentChannel === 'FBA (Full)'
                          ? 'FBA (Full)'
                          : o.fulfillmentChannel === 'DBA'
                          ? 'DBA'
                          : 'FBM (Próprio)');
                      return (
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                            channel === 'FBA (Full)'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : channel === 'DBA'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {channel}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2.5 px-3.5 text-white truncate max-w-[160px] font-sans text-xs" title={o.sku}>
                    {o.sku}
                  </td>
                  <td className="py-2.5 px-3.5 text-white font-bold">{o.quantity}</td>
                  <td className="py-2.5 px-3.5 text-amber-400 font-bold">{formatBRL(o.itemPrice * o.quantity)}</td>
                  <td className="py-2.5 px-3.5 text-slate-300 font-sans text-xs">
                    {o.shipCity ? `${o.shipCity} / ${o.shipState}` : o.shipState || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
