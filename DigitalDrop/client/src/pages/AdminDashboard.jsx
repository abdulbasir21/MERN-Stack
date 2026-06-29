import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../api/axios';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }) {
  return (
    <div className="glass-panel inner-glow rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <span className="material-symbols-outlined text-primary text-[28px]">{icon}</span>
      </div>
      <p className="text-headline-md font-mono text-on-surface">{value}</p>
      <p className="text-label-sm font-mono text-outline uppercase tracking-wider mt-1">{label}</p>
      {sub && <p className="text-label-sm text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}

// ─── Add/Edit Product Modal ───────────────────────────────────────────────────
function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || 'ui-kit',
    price: product?.price || '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.description || !form.price) {
      setError('Name, description, and price are required.');
      return;
    }
    if (!product && (!file || !preview)) {
      setError('Both file and preview image are required for new products.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('price', form.price);
      if (file) fd.append('file', file);
      if (preview) fd.append('preview', preview);

      if (product) {
        await api.put(`/api/products/${product._id}`, fd);
      } else {
        await api.post('/api/products', fd);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-margin-mobile">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#1A1A28] rounded-xl border border-[#2A2A3A] shadow-2xl inner-glow overflow-hidden">
        <div className="p-md border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
          <h2 className="text-headline-md text-on-surface">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-md space-y-sm overflow-y-auto max-h-[70vh]">
          {[
            { label: 'Name', key: 'name', type: 'text', placeholder: 'Product name' },
            { label: 'Description', key: 'description', type: 'textarea', placeholder: 'Short description' },
            { label: 'Price (USD)', key: 'price', type: 'number', placeholder: '29' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-label-sm font-mono text-outline uppercase tracking-wider mb-1">{label}</label>
              {type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-[#111118] border border-[#2A2A3A] rounded-lg px-md py-sm text-on-surface focus:border-[#6C63FF] outline-none placeholder:text-outline-variant resize-none"
                />
              ) : (
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-[#111118] border border-[#2A2A3A] rounded-lg px-md py-sm text-on-surface focus:border-[#6C63FF] outline-none placeholder:text-outline-variant"
                />
              )}
            </div>
          ))}

          <div>
            <label className="block text-label-sm font-mono text-outline uppercase tracking-wider mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#111118] border border-[#2A2A3A] rounded-lg px-md py-sm text-on-surface focus:border-[#6C63FF] outline-none"
            >
              {['ui-kit', 'template', 'course', 'figma'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-mono text-outline uppercase tracking-wider mb-1">
              Digital File (ZIP) {product && '— leave blank to keep existing'}
            </label>
            <input type="file" accept=".zip" onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-on-surface-variant text-label-sm font-mono" />
          </div>

          <div>
            <label className="block text-label-sm font-mono text-outline uppercase tracking-wider mb-1">
              Preview Image {product && '— leave blank to keep existing'}
            </label>
            <input type="file" accept="image/*" onChange={(e) => setPreview(e.target.files[0])}
              className="w-full text-on-surface-variant text-label-sm font-mono" />
          </div>

          {error && <p className="text-error text-label-sm font-mono">{error}</p>}
        </div>

        <div className="p-md bg-surface-container-low border-t border-outline-variant/30">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 bg-[#6C63FF] hover:bg-[#5A52E5] text-white font-mono text-label-md rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productModal, setProductModal] = useState(null); // null | 'new' | product obj
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchStats = () => {
    setLoadingStats(true);
    api.get('/api/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  };

  const fetchOrders = () => {
    setLoadingOrders(true);
    api.get('/api/admin/orders')
      .then(({ data }) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoadingOrders(false));
  };

  const fetchProducts = () => {
    setLoadingProducts(true);
    api.get('/api/products')
      .then(({ data }) => setProducts(data))
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  };

  useEffect(() => {
    fetchStats();
    fetchOrders();
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/products/${id}`);
      setDeleteConfirm(null);
      fetchProducts();
      fetchStats();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const TABS = ['overview', 'orders', 'products'];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 h-16 flex items-center justify-between px-margin-desktop">
        <a href="/" className="text-headline-md font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
          DigitalDrop
        </a>
        <span className="text-label-sm font-mono text-on-surface-variant">Admin Dashboard</span>
      </header>

      <div className="pt-24 pb-24 px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-outline-variant/30 pb-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-label-md px-4 py-2 rounded-lg capitalize transition-all ${
                tab === t
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {loadingStats ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard icon="payments" label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} />
                  <StatCard icon="shopping_bag" label="Paid Orders" value={stats.totalOrders} />
                  <StatCard icon="inventory_2" label="Products" value={stats.totalProducts} />
                  <StatCard icon="trending_up" label="Conversion Rate" value={`${stats.conversionRate}%`} />
                </div>

                {/* Orders by day chart */}
                <div className="glass-panel rounded-xl p-6 mb-6">
                  <h2 className="text-label-md font-mono text-outline uppercase tracking-wider mb-4">Orders — Last 30 Days</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={stats.ordersByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                      <XAxis dataKey="date" tick={{ fill: '#918fa1', fontSize: 11 }} tickLine={false} />
                      <YAxis tick={{ fill: '#918fa1', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#1A1A28', border: '1px solid #2A2A3A', borderRadius: '8px', color: '#e1e0ff' }} />
                      <Line type="monotone" dataKey="count" stroke="#c4c0ff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue by product */}
                {stats.revenueByProduct.length > 0 && (
                  <div className="glass-panel rounded-xl p-6">
                    <h2 className="text-label-md font-mono text-outline uppercase tracking-wider mb-4">Revenue by Product</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={stats.revenueByProduct}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                        <XAxis dataKey="productName" tick={{ fill: '#918fa1', fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fill: '#918fa1', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#1A1A28', border: '1px solid #2A2A3A', borderRadius: '8px', color: '#e1e0ff' }} formatter={(v) => [`$${v}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#41eec2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── ORDERS ── */}
        {tab === 'orders' && (
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="p-6 border-b border-outline-variant/30">
              <h2 className="text-headline-md text-on-surface">All Orders</h2>
            </div>
            {loadingOrders ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-label-sm font-mono">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-outline uppercase tracking-wider">
                      {['Product', 'Buyer', 'Method', 'Amount', 'Status', 'Date'].map((h) => (
                        <th key={h} className="text-left px-6 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id} className="border-b border-outline-variant/20 hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4 text-on-surface">{o.productId?.name || '—'}</td>
                        <td className="px-6 py-4 text-on-surface-variant">{o.buyerEmail}</td>
                        <td className="px-6 py-4 capitalize text-on-surface-variant">{o.paymentMethod}</td>
                        <td className="px-6 py-4 text-secondary">${o.amountPaid}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-sm text-[10px] uppercase ${
                            o.status === 'paid' ? 'bg-secondary/10 text-secondary' :
                            o.status === 'failed' ? 'bg-error/10 text-error' :
                            'bg-outline-variant/20 text-outline'
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <p className="text-center text-on-surface-variant font-mono text-label-sm py-12">No orders yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {tab === 'products' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-headline-md text-on-surface">Products</h2>
              <button
                onClick={() => setProductModal('new')}
                className="bg-primary text-on-primary font-mono text-label-md px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-fixed-dim transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add Product
              </button>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p._id} className="glass-card rounded-xl overflow-hidden">
                    <div
                      className="h-36 bg-cover bg-center"
                      style={{ backgroundImage: `url(${import.meta.env.VITE_API_URL}/${p.previewImage})` }}
                    />
                    <div className="p-4">
                      <p className="text-on-surface font-semibold text-body-md">{p.name}</p>
                      <p className="text-primary font-mono">${p.price}</p>
                      <p className="text-on-surface-variant text-label-sm mt-1 capitalize">{p.category}</p>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setProductModal(p)}
                          className="flex-1 bg-surface-container-high/50 border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary text-label-sm font-mono px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p)}
                          className="flex-1 bg-surface-container-high/50 border border-outline-variant/30 text-on-surface-variant hover:border-error hover:text-error text-label-sm font-mono px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="col-span-full text-center text-on-surface-variant font-mono text-label-sm py-12">
                    No products yet. Add one!
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Modal */}
      {productModal && (
        <ProductModal
          product={productModal === 'new' ? null : productModal}
          onClose={() => setProductModal(null)}
          onSaved={() => {
            setProductModal(null);
            fetchProducts();
            fetchStats();
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-margin-mobile">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setDeleteConfirm(null)} />
          <div className="relative z-10 glass-panel inner-glow rounded-xl p-8 max-w-sm w-full text-center">
            <span className="material-symbols-outlined text-error text-4xl mb-4">warning</span>
            <h2 className="text-headline-md text-on-surface mb-2">Delete Product?</h2>
            <p className="text-body-sm text-on-surface-variant mb-6">
              <strong className="text-on-surface">{deleteConfirm.name}</strong> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-outline-variant/30 text-on-surface-variant font-mono text-label-md py-2 rounded-lg hover:border-outline transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm._id)}
                className="flex-1 bg-error/20 border border-error/40 text-error font-mono text-label-md py-2 rounded-lg hover:bg-error/30 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
