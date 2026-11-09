import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import {
  Package,
  Laptop,
  AlertTriangle,
  X,
  Plus,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Wrench,
  Boxes,
} from 'lucide-react';
import { API_BASE } from '../lib/api';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isInvMgrOrOwner = user?.role === 'INVENTORY_MANAGER' || user?.role === 'OWNER';

  const [activeTab, setActiveTab] = useState<'assets' | 'stock' | 'my'>(isInvMgrOrOwner ? 'assets' : 'my');

  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [assigningAsset, setAssigningAsset] = useState<any | null>(null);
  const [returningAsset, setReturningAsset] = useState<any | null>(null);
  const [movingStockItem, setMovingStockItem] = useState<any | null>(null);

  // New Asset Form
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('Laptops');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [assetError, setAssetError] = useState<string | null>(null);

  // New Stock SKU Form
  const [stockName, setStockName] = useState('');
  const [stockCategory, setStockCategory] = useState('Peripherals');
  const [initialQty, setInitialQty] = useState('10');
  const [minQty, setMinQty] = useState('5');
  const [stockLocation, setStockLocation] = useState('');
  const [stockError, setStockError] = useState<string | null>(null);

  // Assign Form
  const [assigneeId, setAssigneeId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  // Return Form
  const [returnCondition, setReturnCondition] = useState('Good');
  const [nextStatus, setNextStatus] = useState('AVAILABLE');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnError, setReturnError] = useState<string | null>(null);

  // Stock Movement Form
  const [moveType, setMoveType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [moveQuantity, setMoveQuantity] = useState('1');
  const [moveReason, setMoveReason] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);

  // 1. Fetch Summary
  const { data: summaryData } = useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/inventory/summary`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load summary');
      return res.json();
    },
    enabled: isInvMgrOrOwner,
  });

  // 2. Fetch Assets
  const { data: assetsData, isLoading: isAssetsLoading } = useQuery({
    queryKey: ['inventory', 'items', 'ASSET'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/inventory/items?kind=ASSET`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load assets');
      return res.json();
    },
    enabled: isInvMgrOrOwner,
  });

  // 3. Fetch Stock
  const { data: stockData, isLoading: isStockLoading } = useQuery({
    queryKey: ['inventory', 'items', 'STOCK'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/inventory/items?kind=STOCK`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load stock');
      return res.json();
    },
    enabled: isInvMgrOrOwner,
  });

  // 4. Fetch My Assigned Assets
  const { data: myAssetsData, isLoading: isMyLoading } = useQuery({
    queryKey: ['inventory', 'my-assets'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/inventory/my-assets`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load assigned assets');
      return res.json();
    },
  });

  // 5. Fetch Employees for assignment dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: isInvMgrOrOwner,
  });

  // Create Item Mutation
  const createItemMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_BASE}/inventory/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create item');
      return data;
    },
    onSuccess: () => {
      setIsAssetModalOpen(false);
      setIsStockModalOpen(false);
      setAssetName('');
      setSerialNumber('');
      setStockName('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  // Assign Asset Mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      setAssignError(null);
      const res = await fetch(`${API_BASE}/inventory/items/${assigningAsset.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: assigneeId, notes: assignNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Assignment failed');
      return data;
    },
    onSuccess: () => {
      setAssigningAsset(null);
      setAssigneeId('');
      setAssignNotes('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => setAssignError(err.message),
  });

  // Return Asset Mutation
  const returnMutation = useMutation({
    mutationFn: async () => {
      setReturnError(null);
      const res = await fetch(`${API_BASE}/inventory/items/${returningAsset.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ condition: returnCondition, nextStatus, notes: returnNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Return failed');
      return data;
    },
    onSuccess: () => {
      setReturningAsset(null);
      setReturnNotes('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => setReturnError(err.message),
  });

  // Stock Movement Mutation
  const movementMutation = useMutation({
    mutationFn: async () => {
      setMoveError(null);
      const res = await fetch(`${API_BASE}/inventory/items/${movingStockItem.id}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: moveType,
          quantity: parseInt(moveQuantity, 10),
          reason: moveReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Movement recording failed');
      return data;
    },
    onSuccess: () => {
      setMovingStockItem(null);
      setMoveQuantity('1');
      setMoveReason('');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => setMoveError(err.message),
  });

  const summary = summaryData?.data || {
    totalAssets: 0,
    availableAssets: 0,
    assignedAssets: 0,
    maintenanceAssets: 0,
    totalStockSkus: 0,
    lowStockCount: 0,
  };

  const assets = assetsData?.data || [];
  const stock = stockData?.data || [];
  const myAssets = myAssetsData?.data || [];
  const employees = employeesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Asset & Inventory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track agency hardware equipment, custody assignments and consumable office inventory.
          </p>
        </div>

        {isInvMgrOrOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setStockError(null);
                setIsStockModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Package className="w-4 h-4" /> Add Stock SKU
            </button>
            <button
              onClick={() => {
                setAssetError(null);
                setIsAssetModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Hardware Asset
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      {isInvMgrOrOwner && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">Total Assets</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 text-blue-600 dark:text-blue-400">
                <Laptop className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-2">
              {summary.totalAssets}
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">Hardware fleet items</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                Available
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
              {summary.availableAssets}
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">Ready to assign</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                Assigned
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-2">
              {summary.assignedAssets}
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">In active deployment</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-500">
                Maintenance
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 text-amber-600 dark:text-amber-400">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-amber-500 mt-2">
              {summary.maintenanceAssets}
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">Repairs & servicing</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-rose-500">
                Low Stock
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 text-rose-600 dark:text-rose-400">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-rose-500 mt-2">
              {summary.lowStockCount}
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">SKUs below safety level</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-sm font-semibold">
        {isInvMgrOrOwner && (
          <>
            <button
              onClick={() => setActiveTab('assets')}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'assets'
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Laptop className="w-4 h-4" /> Hardware Assets ({assets.length})
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'stock'
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-4 h-4" /> Consumable Stock ({stock.length})
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'my'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" /> My Assigned Hardware ({myAssets.length})
        </button>
      </div>

      {/* HARDWARE ASSETS TAB */}
      {isInvMgrOrOwner && activeTab === 'assets' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isAssetsLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No hardware assets registered.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Serial / Tag</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Assigned User</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {assets.map((asset: any) => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{asset.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{asset.serialNumber}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{asset.category}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{asset.location || '-'}</td>
                      <td className="px-4 py-3 text-xs">
                        {asset.assignedUser ? (
                          <span className="font-medium text-slate-900 dark:text-white">{asset.assignedUser.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {asset.assetStatus === 'AVAILABLE' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Available
                          </span>
                        )}
                        {asset.assetStatus === 'ASSIGNED' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
                            Assigned
                          </span>
                        )}
                        {asset.assetStatus === 'UNDER_MAINTENANCE' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                            Maintenance
                          </span>
                        )}
                        {asset.assetStatus === 'DAMAGED' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                            Damaged
                          </span>
                        )}
                        {asset.assetStatus === 'RETIRED' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Retired
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {asset.assetStatus === 'AVAILABLE' && (
                          <button
                            onClick={() => {
                              setAssigningAsset(asset);
                              setAssignError(null);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded transition-colors"
                          >
                            Assign
                          </button>
                        )}
                        {asset.assetStatus === 'ASSIGNED' && (
                          <button
                            onClick={() => {
                              setReturningAsset(asset);
                              setReturnError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONSUMABLE STOCK TAB */}
      {isInvMgrOrOwner && activeTab === 'stock' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {isStockLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading stock inventory...</div>
          ) : stock.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No stock inventory tracked.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">In Stock</th>
                    <th className="px-4 py-3">Min Threshold</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Alert</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {stock.map((item: any) => {
                    const isLow = item.currentQuantity <= item.minQuantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{item.category}</td>
                        <td className="px-4 py-3 font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {item.currentQuantity}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.minQuantity}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{item.location || '-'}</td>
                        <td className="px-4 py-3">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
                              <AlertTriangle className="w-3 h-3" /> Reorder
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                              Adequate
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setMovingStockItem(item);
                              setMoveError(null);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded transition-colors"
                          >
                            Log Movement
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MY ASSIGNED HARDWARE */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assigned Company Equipment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hardware currently checked out to your custody. All items must be returned in good condition upon exit.
            </p>
          </div>

          {isMyLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading assigned hardware...</div>
          ) : myAssets.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              No hardware assets are currently checked out in your custody.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{asset.category}</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
                      In Possession
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{asset.name}</h4>
                    <div className="text-xs font-mono text-slate-500 mt-1">Serial: {asset.serialNumber}</div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                    Location: {asset.location || 'Remote/Workstation'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD ASSET MODAL */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Hardware Asset</h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assetError && (
              <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{assetError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. MacBook Pro 16"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Laptops">Laptops</option>
                    <option value="Monitors">Monitors</option>
                    <option value="Mobile Devices">Mobile Devices</option>
                    <option value="Peripherals">Peripherals</option>
                    <option value="Networking">Networking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Serial # / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="MBP-M3-0099"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Storage Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 302, Locker A"
                  value={assetLocation}
                  onChange={(e) => setAssetLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  placeholder="Hardware specifications, warranty info..."
                  value={assetNotes}
                  onChange={(e) => setAssetNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createItemMutation.mutate({
                    kind: 'ASSET',
                    name: assetName,
                    category: assetCategory,
                    serialNumber,
                    location: assetLocation || undefined,
                    notes: assetNotes || undefined,
                  })
                }
                disabled={createItemMutation.isPending || !assetName || !serialNumber}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg disabled:opacity-50"
              >
                {createItemMutation.isPending ? 'Registering...' : 'Register Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STOCK SKU MODAL */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Consumable Stock SKU</h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {stockError && (
              <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{stockError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDMI to USB-C Cables"
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={stockCategory}
                  onChange={(e) => setStockCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="Peripherals">Peripherals</option>
                  <option value="Cables & Adapters">Cables & Adapters</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Packaging">Packaging</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialQty}
                    onChange={(e) => setInitialQty(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Supply Closet Shelf 2"
                  value={stockLocation}
                  onChange={(e) => setStockLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createItemMutation.mutate({
                    kind: 'STOCK',
                    name: stockName,
                    category: stockCategory,
                    currentQuantity: parseInt(initialQty, 10),
                    minQuantity: parseInt(minQty, 10),
                    location: stockLocation || undefined,
                  })
                }
                disabled={createItemMutation.isPending || !stockName}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg disabled:opacity-50"
              >
                {createItemMutation.isPending ? 'Saving...' : 'Add SKU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {assigningAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Asset Custody</h3>
              <button onClick={() => setAssigningAsset(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{assignError}</div>}

            <div className="text-xs text-slate-500">
              Assigning <span className="font-bold text-slate-900 dark:text-white">{assigningAsset.name}</span> (Serial:{' '}
              {assigningAsset.serialNumber})
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Employee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">-- Select Active Employee --</option>
                  {employees
                    .filter((e: any) => e.isActive)
                    .map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Standard workstation kit deployment"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAssigningAsset(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending || !assigneeId}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment (1 Tx)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {returningAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Return Hardware Asset</h3>
              <button onClick={() => setReturningAsset(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {returnError && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{returnError}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Return Condition
                </label>
                <input
                  type="text"
                  placeholder="e.g. Excellent, normal wear & tear, screen pristine"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Next Status</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="AVAILABLE">Available for Re-assignment</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance / Inspection</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setReturningAsset(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => returnMutation.mutate()}
                disabled={returnMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg disabled:opacity-50"
              >
                {returnMutation.isPending ? 'Processing...' : 'Complete Return (1 Tx)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG STOCK MOVEMENT MODAL */}
      {movingStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Stock Movement</h3>
              <button onClick={() => setMovingStockItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {moveError && <div className="p-3 text-xs bg-red-50 text-red-600 rounded-lg">{moveError}</div>}

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">SKU:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{movingStockItem.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Stock:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {movingStockItem.currentQuantity}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Movement Type
                  </label>
                  <select
                    value={moveType}
                    onChange={(e: any) => setMoveType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="IN">Restock (IN +)</option>
                    <option value="OUT">Deduction (OUT -)</option>
                    <option value="ADJUSTMENT">Manual Count (Audit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={moveQuantity}
                    onChange={(e) => setMoveQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received shipment PO-4091, Distributed to team"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setMovingStockItem(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => movementMutation.mutate()}
                disabled={movementMutation.isPending || !moveReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 rounded-lg disabled:opacity-50"
              >
                {movementMutation.isPending ? 'Logging...' : 'Save Movement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
