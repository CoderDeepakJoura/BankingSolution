import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, MapPin, User2, Phone, Mail, Hash,
  Calendar, ArrowRight, GitMerge, Download,
  FileText, CreditCard, BookOpen, BarChart2,
  ShieldCheck, Clock, Star, Plus, X, Search,
} from 'lucide-react';
import DashboardLayout from '../Common/Layout';
import { useSelector } from 'react-redux';
import { RootState } from '../redux';
import { useNavigate } from 'react-router-dom';
import favouritesApi, { Favourite } from '../services/favouritesApi';
import { SEARCHABLE_SCREENS } from '../routes/screenList';
import Swal from 'sweetalert2';

// ── Quick-access cards ────────────────────────────────────────────────────────

const QuickCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  to: string;
  gradient: string;
}> = ({ icon, label, desc, to, gradient }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`group relative overflow-hidden rounded-2xl p-5 text-left shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 ${gradient}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </div>
      <p className="text-white font-semibold text-sm mb-0.5">{label}</p>
      <p className="text-white/70 text-xs">{desc}</p>
    </button>
  );
};

const InfoChip: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 bg-white/60 backdrop-blur rounded-xl px-4 py-3 border border-white/80">
    <div className="text-slate-500 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-700 truncate">{value || '—'}</p>
    </div>
  </div>
);

// ── Favourites pick modal ─────────────────────────────────────────────────────

const AddFavouriteModal: React.FC<{
  existingPaths: Set<string>;
  onAdd: (path: string, label: string, category: string) => void;
  onClose: () => void;
}> = ({ existingPaths, onAdd, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = query.trim().length === 0
    ? SEARCHABLE_SCREENS
    : SEARCHABLE_SCREENS.filter(s =>
        s.label.toLowerCase().includes(query.toLowerCase()) ||
        s.category.toLowerCase().includes(query.toLowerCase())
      );

  // Group by category
  const grouped = filtered.reduce<Record<string, typeof SEARCHABLE_SCREENS>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-bold text-slate-800 text-base">Add to Favourites</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Search */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search screens…"
              className="bg-transparent text-sm w-full outline-none text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>
        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 pb-4">
          {Object.entries(grouped).map(([cat, screens]) => (
            <div key={cat} className="mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pt-2 pb-1">{cat}</p>
              {screens.map(s => {
                const already = existingPaths.has(s.path);
                return (
                  <button
                    key={s.path}
                    disabled={already}
                    onClick={() => { onAdd(s.path, s.label, s.category); onClose(); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      already
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-indigo-50 cursor-pointer'
                    }`}
                  >
                    <span className="text-sm text-slate-700">{s.label}</span>
                    {already
                      ? <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      : <Plus className="w-4 h-4 text-slate-400" />}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">No screens match "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Favourite tile ────────────────────────────────────────────────────────────

const FavTile: React.FC<{
  fav: Favourite;
  onRemove: (id: number) => void;
}> = ({ fav, onRemove }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(fav.path)}
      className="group relative bg-white border border-slate-200 rounded-2xl px-4 py-3 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3"
    >
      <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700 truncate">{fav.label}</p>
        <p className="text-[11px] text-slate-400 truncate">{fav.category}</p>
      </div>
      <span
        role="button"
        onClick={e => { e.stopPropagation(); onRemove(fav.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 p-1 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </span>
    </button>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

const DashboardSkeleton: React.FC = () => (
  <div className="w-full min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6 lg:p-10 space-y-8 animate-pulse">
    {/* Hero skeleton */}
    <div className="rounded-3xl bg-gradient-to-br from-blue-500/60 via-indigo-500/60 to-violet-600/60 h-40" />
    {/* Chips skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl bg-white/70" />
      ))}
    </div>
    {/* Favourites skeleton */}
    <div className="space-y-3">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="h-20 rounded-2xl border-2 border-dashed border-slate-200" />
    </div>
    {/* Quick access skeleton */}
    <div className="space-y-3">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [favsLoaded, setFavsLoaded] = useState(false);

  const isLoading = user.branchid === 0;

  useEffect(() => {
    if (isLoading) return;
    favouritesApi.getAll().then(res => {
      if (res.success && res.data) setFavourites(res.data);
      setFavsLoaded(true);
    }).catch(() => setFavsLoaded(true));
  }, [isLoading]);

  const handleAdd = async (path: string, label: string, category: string) => {
    try {
      const res = await favouritesApi.add(path, label, category);
      if (res.success && res.data) {
        setFavourites(prev => [...prev, res.data!]);
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Failed to add favourite.', confirmButtonColor: '#EF4444' });
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const res = await favouritesApi.remove(id);
      if (res.success) setFavourites(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Failed to remove favourite.', confirmButtonColor: '#EF4444' });
    }
  };

  const existingPaths = new Set(favourites.map(f => f.path));

  const quickActions = [
    {
      icon: <CreditCard className="w-5 h-5 text-white" />,
      label: 'Voucher Operations',
      desc: 'Search, modify & delete vouchers',
      to: '/voucher-operations',
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      icon: <BookOpen className="w-5 h-5 text-white" />,
      label: 'Saving Ledger',
      desc: 'View saving account transactions',
      to: '/saving-ledger',
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    {
      icon: <Download className="w-5 h-5 text-white" />,
      label: 'IB Incoming Vouchers',
      desc: 'Approve inter-branch deposits',
      to: '/ib-incoming-vouchers',
      gradient: 'bg-gradient-to-br from-purple-500 to-violet-600',
    },
    {
      icon: <GitMerge className="w-5 h-5 text-white" />,
      label: 'IB Pending Vouchers',
      desc: 'HO settlement for branch transfers',
      to: '/ib-pending-vouchers',
      gradient: 'bg-gradient-to-br from-amber-500 to-orange-500',
    },
    {
      icon: <BarChart2 className="w-5 h-5 text-white" />,
      label: 'Balance Sheet',
      desc: 'Financial position at a glance',
      to: '/balance-sheet',
      gradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
    },
    {
      icon: <FileText className="w-5 h-5 text-white" />,
      label: 'Day Book',
      desc: 'Daily transaction summary',
      to: '/day-book',
      gradient: 'bg-gradient-to-br from-cyan-500 to-sky-600',
    },
  ];

  if (isLoading || !favsLoaded) {
    return <DashboardLayout mainContent={<DashboardSkeleton />} />;
  }

  return (
    <>
    {showModal && (
      <AddFavouriteModal
        existingPaths={existingPaths}
        onAdd={handleAdd}
        onClose={() => setShowModal(false)}
      />
    )}
    <DashboardLayout
      mainContent={
        <div className="w-full min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6 lg:p-10 space-y-8">

          {/* Hero card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 shadow-2xl">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute top-8 right-48 w-20 h-20 bg-white/5 rounded-full" />

            <div className="relative px-8 py-10 lg:px-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl lg:text-3xl font-bold text-white">
                          {user.branch_name || 'Branch'}
                        </h1>
                        {user.branchCode && (
                          <span className="px-2.5 py-0.5 bg-white/20 text-white text-sm font-bold rounded-lg border border-white/30">
                            {user.branchCode}
                          </span>
                        )}
                      </div>
                      <p className="text-blue-100 text-sm mt-0.5">{user.address || 'Branch Address'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-4 py-2">
                    <Calendar className="w-4 h-4 text-blue-200" />
                    <div>
                      <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wide">Working Date</p>
                      <p className="text-white text-sm font-bold">{user.workingdate || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-4 py-2">
                    <Clock className="w-4 h-4 text-blue-200" />
                    <div>
                      <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wide">Session</p>
                      <p className="text-white text-sm font-bold">{user.sessionInfo || '—'}</p>
                    </div>
                  </div>
                  {user.isSu && (
                    <div className="flex items-center gap-2 bg-amber-400/20 border border-amber-300/30 rounded-xl px-4 py-2">
                      <ShieldCheck className="w-4 h-4 text-amber-300" />
                      <p className="text-amber-200 text-sm font-bold">Super User</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Branch info chips */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <InfoChip icon={<Hash className="w-4 h-4" />}   label="Branch Code" value={user.branchCode} />
            <InfoChip icon={<User2 className="w-4 h-4" />}  label="User"        value={user.name} />
            <InfoChip icon={<Phone className="w-4 h-4" />}  label="Contact"     value={user.contact} />
            <InfoChip icon={<Mail className="w-4 h-4" />}   label="Email"       value={user.email} />
            <InfoChip icon={<MapPin className="w-4 h-4" />} label="Address"     value={user.address} />
          </div>

          {/* Favourites */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Favourites</h2>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Favourite
              </button>
            </div>

            {favourites.length === 0 ? (
              <div
                onClick={() => setShowModal(true)}
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl py-10 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
              >
                <Star className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400 font-medium">No favourites yet</p>
                <p className="text-xs text-slate-300 mt-1">Click to pin your most-used screens here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {favourites.map(fav => (
                  <FavTile key={fav.id} fav={fav} onRemove={handleRemove} />
                ))}
                <button
                  onClick={() => setShowModal(true)}
                  className="border-2 border-dashed border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Quick access */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Access</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickActions.map(a => (
                <QuickCard key={a.to} {...a} />
              ))}
            </div>
          </div>

        </div>
      }
    />
    </>
  );
};

export default Dashboard;
