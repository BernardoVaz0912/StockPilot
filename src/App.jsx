import { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Trash2, Search, X, AlertTriangle, PackagePlus, FolderPlus, Boxes } from 'lucide-react';

const STORAGE_KEY = 'inventario-dados-v1';

const seedData = {
  sectors: [
    { id: 's1', name: 'Almoxarifado' },
    { id: 's2', name: 'Produção' },
    { id: 's3', name: 'Expedição' },
  ],
  items: [
    { id: 'i1', name: 'Parafuso M6', sku: 'PRF-006', sectorId: 's1', quantity: 480, unit: 'un', minStock: 100 },
    { id: 'i2', name: 'Luva de Proteção', sku: 'EPI-014', sectorId: 's2', quantity: 12, unit: 'par', minStock: 20 },
    { id: 'i3', name: 'Caixa Papelão G', sku: 'EMB-021', sectorId: 's3', quantity: 60, unit: 'un', minStock: 30 },
    { id: 'i4', name: 'Fita Adesiva', sku: 'EMB-005', sectorId: 's3', quantity: 8, unit: 'rolo', minStock: 15 },
  ],
};

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

// Camada de persistência local. Troque por chamadas a uma API/backend
// se quiser que o inventário fique disponível para vários usuários/dispositivos.
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Falha ao carregar dados locais', e);
  }
  return null;
}

function saveData(sectors, items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sectors, items }));
  } catch (e) {
    console.error('Falha ao salvar dados locais', e);
  }
}

export default function App() {
  const [sectors, setSectors] = useState([]);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeSector, setActiveSector] = useState('all');
  const [query, setQuery] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSector, setShowAddSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [form, setForm] = useState({ name: '', sku: '', sectorId: '', quantity: '', unit: 'un', minStock: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const existing = loadData();
    if (existing) {
      setSectors(existing.sectors || []);
      setItems(existing.items || []);
    } else {
      setSectors(seedData.sectors);
      setItems(seedData.items);
      saveData(seedData.sectors, seedData.items);
    }
    setLoaded(true);
  }, []);

  const persist = (nextSectors, nextItems) => {
    saveData(nextSectors, nextItems);
  };

  const addSector = () => {
    const name = newSectorName.trim();
    if (!name) return;
    const next = [...sectors, { id: uid('s'), name }];
    setSectors(next);
    persist(next, items);
    setNewSectorName('');
    setShowAddSector(false);
  };

  const removeSector = (sectorId) => {
    const nextSectors = sectors.filter((s) => s.id !== sectorId);
    const nextItems = items.map((it) => (it.sectorId === sectorId ? { ...it, sectorId: '' } : it));
    setSectors(nextSectors);
    setItems(nextItems);
    persist(nextSectors, nextItems);
    if (activeSector === sectorId) setActiveSector('all');
  };

  const addItem = () => {
    const name = form.name.trim();
    const qty = Number(form.quantity);
    if (!name) { setFormError('Informe o nome do item.'); return; }
    if (form.quantity === '' || isNaN(qty) || qty < 0) { setFormError('Informe uma quantidade válida.'); return; }
    const newItem = {
      id: uid('i'),
      name,
      sku: form.sku.trim(),
      sectorId: form.sectorId,
      quantity: qty,
      unit: form.unit.trim() || 'un',
      minStock: form.minStock === '' ? 0 : Math.max(0, Number(form.minStock)),
    };
    const next = [...items, newItem];
    setItems(next);
    persist(sectors, next);
    setForm({ name: '', sku: '', sectorId: '', quantity: '', unit: 'un', minStock: '' });
    setFormError('');
    setShowAddItem(false);
  };

  const removeItem = (id) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    persist(sectors, next);
  };

  const adjustQty = (id, delta) => {
    const next = items.map((it) =>
      it.id === id ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it
    );
    setItems(next);
    persist(sectors, next);
  };

  const sectorMap = useMemo(() => {
    const m = {};
    sectors.forEach((s) => (m[s.id] = s.name));
    return m;
  }, [sectors]);

  const sectorCounts = useMemo(() => {
    const counts = {};
    sectors.forEach((s) => (counts[s.id] = { items: 0, qty: 0 }));
    let unassigned = { items: 0, qty: 0 };
    items.forEach((it) => {
      if (it.sectorId && counts[it.sectorId]) {
        counts[it.sectorId].items += 1;
        counts[it.sectorId].qty += it.quantity;
      } else {
        unassigned.items += 1;
        unassigned.qty += it.quantity;
      }
    });
    return { counts, unassigned };
  }, [sectors, items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((it) => {
        if (activeSector === 'all') return true;
        if (activeSector === 'none') return !it.sectorId || !sectorMap[it.sectorId];
        return it.sectorId === activeSector;
      })
      .filter((it) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();
        return it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, activeSector, query, sectorMap]);

  const totalItems = items.length;
  const totalUnits = items.reduce((sum, it) => sum + it.quantity, 0);
  const lowStockCount = items.filter((it) => it.quantity <= it.minStock).length;

  return (
    <div className="inv-app min-h-screen w-full" style={{ background: 'var(--paper)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .inv-app {
          --paper: #EEF0E7;
          --paper-line: #D8DBCC;
          --ink: #1E2A33;
          --ink-soft: #5B6660;
          --card: #FBFCF8;
          --amber: #C97A1E;
          --amber-deep: #A85F12;
          --alert: #A8402F;
          --alert-bg: #F4E3DE;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          background-image:
            radial-gradient(var(--paper-line) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .inv-display { font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.01em; }
        .inv-mono { font-family: 'IBM Plex Mono', monospace; }
        .inv-card {
          background: var(--card);
          border: 1px solid var(--paper-line);
        }
        .inv-btn-primary {
          background: var(--ink);
          color: var(--card);
        }
        .inv-btn-primary:hover { background: #0f171d; }
        .inv-btn-outline {
          background: transparent;
          border: 1px solid var(--ink);
          color: var(--ink);
        }
        .inv-btn-outline:hover { background: var(--ink); color: var(--card); }
        .inv-sector-btn.active {
          background: var(--ink);
          color: var(--card);
        }
        .inv-sector-btn {
          border: 1px solid var(--paper-line);
          color: var(--ink-soft);
          background: var(--card);
        }
        .inv-stamp {
          font-family: 'IBM Plex Mono', monospace;
          border: 2px solid currentColor;
          border-radius: 9999px;
          transform: rotate(-4deg);
          letter-spacing: 0.06em;
        }
        .inv-input {
          background: var(--card);
          border: 1px solid var(--paper-line);
          color: var(--ink);
        }
        .inv-input:focus { outline: 2px solid var(--amber); outline-offset: 1px; }
        .inv-divider {
          border-top: 1px dashed var(--paper-line);
        }
        .inv-modal-backdrop {
          background: rgba(20, 26, 22, 0.45);
        }
      `}</style>

      {/* Header / ficha de inventário */}
      <header className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 pb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="inv-mono text-xs tracking-widest uppercase" style={{ color: 'var(--amber-deep)' }}>
                Controle de estoque · por setor
              </p>
              <h1 className="inv-display text-3xl sm:text-4xl font-700 mt-1" style={{ color: 'var(--ink)' }}>
                Ficha de Inventário
              </h1>
            </div>
            <div className="flex gap-6 inv-mono text-sm pt-1">
              <div>
                <div className="text-2xl inv-display font-600">{totalItems}</div>
                <div className="text-xs uppercase" style={{ color: 'var(--ink-soft)' }}>itens cadastrados</div>
              </div>
              <div>
                <div className="text-2xl inv-display font-600">{totalUnits}</div>
                <div className="text-xs uppercase" style={{ color: 'var(--ink-soft)' }}>unidades em estoque</div>
              </div>
              <div>
                <div className="text-2xl inv-display font-600" style={{ color: lowStockCount ? 'var(--alert)' : 'var(--ink)' }}>
                  {lowStockCount}
                </div>
                <div className="text-xs uppercase" style={{ color: 'var(--ink-soft)' }}>estoque baixo</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar: setores */}
        <aside className="md:w-60 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="inv-mono text-xs uppercase tracking-widest" style={{ color: 'var(--ink-soft)' }}>Setores</h2>
            <button
              onClick={() => setShowAddSector(true)}
              className="inv-btn-outline rounded-full p-1.5"
              aria-label="Adicionar setor"
              title="Adicionar setor"
            >
              <FolderPlus size={14} />
            </button>
          </div>

          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-1">
            <button
              onClick={() => setActiveSector('all')}
              className={`inv-sector-btn shrink-0 md:w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 ${activeSector === 'all' ? 'active' : ''}`}
            >
              <span>Todos os setores</span>
              <span className="inv-mono text-xs opacity-70">{totalItems}</span>
            </button>
            {sectors.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSector(s.id)}
                className={`inv-sector-btn shrink-0 md:w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 group ${activeSector === s.id ? 'active' : ''}`}
              >
                <span className="truncate">{s.name}</span>
                <span className="flex items-center gap-2">
                  <span className="inv-mono text-xs opacity-70">{sectorCounts.counts[s.id]?.items || 0}</span>
                  <Trash2
                    size={12}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100"
                    onClick={(e) => { e.stopPropagation(); removeSector(s.id); }}
                  />
                </span>
              </button>
            ))}
            {sectorCounts.unassigned.items > 0 && (
              <button
                onClick={() => setActiveSector('none')}
                className={`inv-sector-btn shrink-0 md:w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 ${activeSector === 'none' ? 'active' : ''}`}
              >
                <span>Sem setor</span>
                <span className="inv-mono text-xs opacity-70">{sectorCounts.unassigned.items}</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main: lista de itens */}
        <section className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="inv-input w-full pl-9 pr-3 py-2 rounded-md text-sm"
              />
            </div>
            <button
              onClick={() => setShowAddItem(true)}
              className="inv-btn-primary rounded-md px-4 py-2 text-sm font-500 flex items-center justify-center gap-2 shrink-0"
            >
              <PackagePlus size={15} /> Adicionar item
            </button>
          </div>

          {!loaded ? (
            <div className="inv-card rounded-lg p-8 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
              Carregando ficha de inventário...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="inv-card rounded-lg p-10 text-center">
              <Boxes size={26} className="mx-auto mb-3" style={{ color: 'var(--ink-soft)' }} />
              <p className="text-sm font-500">Nenhum item encontrado.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                Ajuste a busca ou o setor selecionado, ou cadastre um novo item.
              </p>
            </div>
          ) : (
            <div className="inv-card rounded-lg divide-y" style={{ borderColor: 'var(--paper-line)' }}>
              {filteredItems.map((it) => {
                const low = it.quantity <= it.minStock;
                return (
                  <div key={it.id} className="inv-divider first:border-t-0 px-4 sm:px-5 py-3.5 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-600 text-sm truncate">{it.name}</span>
                        {it.sku && <span className="inv-mono text-xs" style={{ color: 'var(--ink-soft)' }}>#{it.sku}</span>}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                        {it.sectorId && sectorMap[it.sectorId] ? sectorMap[it.sectorId] : 'Sem setor'}
                        {it.minStock > 0 && <span> · mínimo {it.minStock} {it.unit}</span>}
                      </div>
                    </div>

                    {low && (
                      <span
                        className="inv-stamp text-[10px] uppercase px-2.5 py-1 shrink-0 flex items-center gap-1"
                        style={{ color: 'var(--alert)' }}
                      >
                        <AlertTriangle size={11} /> baixo
                      </span>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => adjustQty(it.id, -1)}
                        className="inv-btn-outline rounded p-1.5"
                        aria-label={`Retirar unidade de ${it.name}`}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="inv-mono text-sm w-16 text-center font-600">
                        {it.quantity} <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{it.unit}</span>
                      </span>
                      <button
                        onClick={() => adjustQty(it.id, 1)}
                        className="inv-btn-outline rounded p-1.5"
                        aria-label={`Adicionar unidade de ${it.name}`}
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="rounded p-1.5 ml-1"
                        style={{ color: 'var(--alert)' }}
                        aria-label={`Remover ${it.name} do inventário`}
                        title="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal: novo setor */}
      {showAddSector && (
        <div className="inv-modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50" onClick={() => setShowAddSector(false)}>
          <div className="inv-card rounded-lg p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="inv-display font-600 text-lg">Novo setor</h3>
              <button onClick={() => setShowAddSector(false)} aria-label="Fechar"><X size={16} /></button>
            </div>
            <label className="text-xs uppercase inv-mono" style={{ color: 'var(--ink-soft)' }}>Nome do setor</label>
            <input
              autoFocus
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSector()}
              placeholder="Ex: Manutenção"
              className="inv-input w-full mt-1 mb-4 px-3 py-2 rounded-md text-sm"
            />
            <button onClick={addSector} className="inv-btn-primary w-full rounded-md py-2 text-sm font-500">
              Criar setor
            </button>
          </div>
        </div>
      )}

      {/* Modal: novo item */}
      {showAddItem && (
        <div className="inv-modal-backdrop fixed inset-0 flex items-center justify-center p-4 z-50" onClick={() => { setShowAddItem(false); setFormError(''); }}>
          <div className="inv-card rounded-lg p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="inv-display font-600 text-lg">Adicionar item</h3>
              <button onClick={() => { setShowAddItem(false); setFormError(''); }} aria-label="Fechar"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase inv-mono" style={{ color: 'var(--ink-soft)' }}>Nome do item *</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Caixa de parafusos"
                  className="inv-input w-full mt-1 px-3 py-2 rounded-md text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase inv-mono" style={{ color: 'var(--ink-soft)' }}>Código (SKU)</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Opcional"
                    className="inv-input w-full mt-1 px-3 py-2 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase inv-mono" style={{ color: 'var(--ink-soft)' }}>Setor</label>
                  <select
                    value={form.sectorId}
                    onChange={(e) => setForm({ ...form, sectorId: e.target.value })}
                    className="inv-input w-full mt-1 px-3 py-2 rounded-md text-sm"
                  >
                    <option value="">Sem setor</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs uppercase inv-mono" style={{ color: 'var(--ink-soft)' }}>Quantidade *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="0"
                    className="inv-input w-full mt-1 px-3 py-2 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase inv-mono" style={{ color: 'var(--ink-soft)' }}>Unidade</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="un"
                    className="inv-input w-full mt-1 px-3 py-2 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase inv-mono" style={{ color: 'var(--ink-soft)' }}>Estoque mín.</label>
                  <input
                    type="number"
                    min="0"
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    placeholder="0"
                    className="inv-input w-full mt-1 px-3 py-2 rounded-md text-sm"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs px-3 py-2 rounded-md" style={{ background: 'var(--alert-bg)', color: 'var(--alert)' }}>
                  {formError}
                </p>
              )}

              <button onClick={addItem} className="inv-btn-primary w-full rounded-md py-2 text-sm font-500 mt-1">
                Adicionar ao estoque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
