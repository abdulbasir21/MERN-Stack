import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar,
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Badge from '../components/Badge';

const categories = [
  { value: 'theft',          label: 'Theft',          icon: 'lock_person'   },
  { value: 'harassment',     label: 'Harassment',     icon: 'warning'       },
  { value: 'missing_person', label: 'Missing Person', icon: 'person_search' },
  { value: 'fraud',          label: 'Fraud',          icon: 'payments'      },
  { value: 'other',          label: 'Other',          icon: 'more_horiz'    },
];

const steps = [
  { icon: 'edit_note',       title: 'File a Report',   desc: 'Describe the incident with detail. You can file anonymously.' },
  { icon: 'manage_accounts', title: 'Officer Review',  desc: 'A trained officer reviews and investigates your complaint.'    },
  { icon: 'check_circle',    title: 'Resolution',      desc: 'Receive updates at every step and a final resolution notice.' },
];

const BAR_COLORS = ['#0d9488', '#525b90', '#b54708', '#1d70b8', '#00703c'];

const CATEGORY_LABELS = {
  theft: 'Theft',
  harassment: 'Harassment',
  missing_person: 'Missing',
  fraud: 'Fraud',
  other: 'Other',
};

function ResolutionDonut({ rate }) {
  const data = [
    { name: 'Resolved', value: rate, fill: '#0d9488' },
    { name: 'Pending',  value: 100 - rate, fill: '#e5e7eb' },
  ];
  return (
    <div className="relative w-32 h-32 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="65%" outerRadius="100%"
          startAngle={90} endAngle={-270}
          data={data}
          barSize={12}
        >
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#e5e7eb' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline-md text-headline-md text-primary font-bold">{rate}%</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant" style={{ fontSize: 10 }}>resolved</span>
      </div>
    </div>
  );
}

function MiniBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
        <Tooltip
          formatter={(v, n) => [v, '']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          cursor={{ fill: 'rgba(13,148,136,0.08)' }}
        />
        {data.map((entry, i) => null)}
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="w-10 h-10 rounded-full border-4 border-surface-container-low border-t-primary animate-spin"
        aria-label="Loading"
      />
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats,  setStats]  = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/public/stats'),
      api.get('/public/recent-resolved'),
    ]).then(([statsRes, recentRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (recentRes.status === 'fulfilled') setRecent(recentRes.value.data.data || []);
      setLoading(false);
    });
  }, []);

  function handleCategory(cat) {
    if (user) navigate(`/complaint/new?category=${cat}`);
    else navigate('/login');
  }

  const resolutionRate = stats ? parseFloat(stats.resolutionRate) || 0 : 0;
  const activeCount = stats
    ? Math.max(0, stats.totalComplaints - Math.round(stats.totalComplaints * resolutionRate / 100))
    : null;

  // Build category bar chart data from recent complaints
  const categoryCountMap = {};
  recent.forEach(r => {
    const k = r.category || 'other';
    categoryCountMap[k] = (categoryCountMap[k] || 0) + 1;
  });
  const categoryChartData = Object.entries(categoryCountMap).map(([k, v]) => ({
    label: CATEGORY_LABELS[k] || k,
    count: v,
  }));

  // Build resolution time histogram from recent
  const timeBuckets = { '1d': 0, '2-3d': 0, '4-7d': 0, '1-2w': 0, '2w+': 0 };
  recent.forEach(r => {
    const d = r.resolutionDays || 0;
    if (d <= 1) timeBuckets['1d']++;
    else if (d <= 3) timeBuckets['2-3d']++;
    else if (d <= 7) timeBuckets['4-7d']++;
    else if (d <= 14) timeBuckets['1-2w']++;
    else timeBuckets['2w+']++;
  });
  const timeChartData = Object.entries(timeBuckets).map(([label, count]) => ({ label, count }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-16 md:py-24 px-4 md:px-gutter">
        <div className="max-w-container-max mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '20px' }}>verified_user</span>
            <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-widest">Civic Safety Platform</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-white mb-4 max-w-3xl mx-auto">
            Report incidents. Track outcomes. Build safer communities.
          </h1>
          <p className="font-body-lg text-body-lg text-on-primary-container mb-10 max-w-2xl mx-auto">
            SafeCity connects citizens with law enforcement. File a complaint, track its progress, and see real outcomes — transparently.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => handleCategory(value)}
                className="flex items-center gap-2 bg-surface-container-lowest border border-border-subtle rounded-full px-5 py-2.5 font-label-md text-label-md text-on-surface-variant hover:border-on-tertiary-container hover:text-on-tertiary-container transition-all group"
              >
                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform" style={{ fontSize: '18px' }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
          {!user && (
            <p className="mt-4 font-label-sm text-label-sm text-on-primary-container">
              <button onClick={() => navigate('/login')} className="text-tertiary-fixed hover:underline">Login</button>
              {' '}or{' '}
              <button onClick={() => navigate('/register')} className="text-tertiary-fixed hover:underline">create an account</button>
              {' '}to file a complaint
            </p>
          )}
        </div>
      </section>

      {/* Platform Statistics — with charts */}
      <section id="stats" className="py-16 px-4 md:px-gutter bg-surface-container-low">
        <div className="max-w-container-max mx-auto">
          <h2 className="font-headline-lg text-headline-lg text-primary text-center mb-10">Platform statistics</h2>

          {loading ? (
            <Spinner />
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Resolution rate donut */}
              <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 level-1-shadow flex flex-col items-center text-center gap-4">
                <p className="font-label-md text-label-md text-on-surface-variant">Resolution rate</p>
                <ResolutionDonut rate={resolutionRate} />
                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <p className="font-headline-md text-headline-md text-primary">{stats?.totalComplaints ?? '—'}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Total</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center">
                    <p className="font-headline-md text-headline-md text-primary">{activeCount ?? '—'}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Active</p>
                  </div>
                </div>
              </div>

              {/* Avg resolution time + time histogram */}
              <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 level-1-shadow flex flex-col gap-4">
                <p className="font-label-md text-label-md text-on-surface-variant">Avg resolution time</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-xl text-headline-xl text-primary" style={{ fontSize: 40 }}>
                    {stats?.avgResolutionDays ?? '—'}
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant">days</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant -mt-2">Average across all resolved complaints</p>
                {timeChartData.some(d => d.count > 0) && (
                  <>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Resolution time breakdown</p>
                    <MiniBarChart data={timeChartData} />
                  </>
                )}
              </div>

              {/* Category breakdown bar chart */}
              <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 level-1-shadow flex flex-col gap-4">
                <p className="font-label-md text-label-md text-on-surface-variant">Resolved by category</p>
                {categoryChartData.length > 0 ? (
                  <MiniBarChart data={categoryChartData} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-on-surface-variant font-body-sm text-body-sm">
                    No data yet
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-1">
                  {categoryChartData.map((d, i) => (
                    <div key={d.label} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4 md:px-gutter">
        <div className="max-w-container-max mx-auto">
          <h2 className="font-headline-lg text-headline-lg text-primary text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-3 gap-space-lg">
            {steps.map(({ icon, title, desc }, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-xl border border-border-subtle p-space-lg level-1-shadow text-center">
                <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center mx-auto mb-space-md">
                  <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '24px' }}>{icon}</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-primary mb-2">{title}</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Resolved — with mini bar chart */}
      {loading ? (
        <section className="py-16 px-4 md:px-gutter bg-surface-container-low">
          <div className="max-w-container-max mx-auto">
            <Spinner />
          </div>
        </section>
      ) : (
        recent.length > 0 && (
          <section className="py-16 px-4 md:px-gutter bg-surface-container-low">
            <div className="max-w-container-max mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-primary">Recently resolved</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    {recent.length} cases resolved — avg {stats?.avgResolutionDays ?? '?'} days each
                  </p>
                </div>
                {/* Mini inline summary bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(categoryCountMap).map(([k, v], i) => (
                    <div key={k} className="flex items-center gap-1.5 bg-surface-container-lowest rounded-full px-3 py-1 border border-border-subtle">
                      <span className="w-2 h-2 rounded-full" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      <span className="font-label-sm text-label-sm text-on-surface-variant capitalize">{CATEGORY_LABELS[k] || k}</span>
                      <span className="font-label-sm text-label-sm text-primary font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recent.slice(0, 6).map((item, i) => (
                  <div
                    key={i}
                    className="bg-surface-container-lowest rounded-xl border border-border-subtle p-5 level-1-shadow flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="resolved" />
                      <span className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                        {item.category?.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="font-label-md text-label-md text-on-surface">{item.area}</p>

                    {/* Resolution time bar */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Resolution time</span>
                        <span className="font-label-sm text-label-sm text-on-tertiary-container font-medium">
                          {item.resolutionDays} {item.resolutionDays === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                      {/* Visual bar: 1 day = fast, 14+ = slow */}
                      <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (item.resolutionDays / 14) * 100)}%`,
                            background: item.resolutionDays <= 2 ? '#0d9488' : item.resolutionDays <= 7 ? '#b54708' : '#6b7280',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      )}

      {/* Footer */}
      <footer className="bg-primary py-16 px-4 md:px-gutter">
        <div className="max-w-container-max mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontSize: '24px' }}>shield</span>
            <span className="font-headline-md text-headline-md text-white">SafeCity Portal</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-primary-container max-w-xl mx-auto">
            This platform is operated for civic purposes. All complaints are reviewed by authorized personnel. Anonymous reporting is available. Information shared is handled in accordance with data protection regulations.
          </p>
          <p className="font-label-sm text-label-sm text-on-primary-container mt-6">
            © {new Date().getFullYear()} SafeCity Portal. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}