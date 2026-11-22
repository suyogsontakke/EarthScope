import { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  Database, 
  Plus, 
  Trash2, 
  GitCompare, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Layers, 
  Image as ImageIcon,
  Table,
  Search,
  Tag,
  ArrowRight,
  ExternalLink,
  Info,
  Clock,
  BookOpen,
  Award,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  SavedInvestigation, 
  getSavedInvestigations, 
  saveInvestigation, 
  deleteInvestigation, 
  exportInvestigationToCsv, 
  exportSvgToPng 
} from '../lib/investigationStore';
import { 
  PRESET_LOCATIONS, 
  NASA_PARAMETERS, 
  fetchNasaLocationData 
} from '../lib/nasaPowerService';
import { analyzeTrend } from '../lib/statistics';

type ActiveTab = 'library' | 'viewer' | 'compare' | 'new';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [investigations, setInvestigations] = useState<SavedInvestigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<SavedInvestigation | null>(null);
  
  // Library filters
  const [searchQuery, setSearchQuery] = useState('');
  const [variableFilter, setVariableFilter] = useState('ALL');

  // Compare mode
  const [compareIdA, setCompareIdA] = useState<string>('');
  const [compareIdB, setCompareIdB] = useState<string>('');

  // New report builder states
  const [newPresetIdx, setNewPresetIdx] = useState<number>(0);
  const [newParamKey, setNewParamKey] = useState<string>('PM25');
  const [newStartYear, setNewStartYear] = useState<number>(2018);
  const [newEndYear, setNewEndYear] = useState<number>(2024);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newTags, setNewTags] = useState<string>('Atmospheric, Baseline');
  
  const [loadingNew, setLoadingNew] = useState<boolean>(false);
  const [newError, setNewError] = useState<string | null>(null);

  // SVG Chart reference for PNG export
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Load saved investigations
  useEffect(() => {
    const list = getSavedInvestigations();
    setInvestigations(list);
    if (list.length > 0 && !selectedInvestigation) {
      setSelectedInvestigation(list[0]);
    }
    if (list.length >= 2) {
      setCompareIdA(list[0].id);
      setCompareIdB(list[1].id);
    }
  }, []);

  const refreshList = () => {
    const updated = getSavedInvestigations();
    setInvestigations(updated);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    deleteInvestigation(id);
    refreshList();
    if (selectedInvestigation?.id === id) {
      const remaining = investigations.filter(i => i.id !== id);
      setSelectedInvestigation(remaining[0] || null);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingNew(true);
    setNewError(null);

    const loc = PRESET_LOCATIONS[newPresetIdx];
    const param = NASA_PARAMETERS[newParamKey];

    try {
      const dataRes = await fetchNasaLocationData(
        loc.lat,
        loc.lon,
        newStartYear,
        newEndYear,
        newParamKey,
        loc.name
      );

      const rawVals = dataRes.points.map(p => p.value);
      const trendResult = analyzeTrend(rawVals, 12);

      const defaultTitle = newTitle.trim() || `${loc.name} ${param.name} (${newStartYear}–${newEndYear}) Empirical Investigation`;
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);

      const saved = saveInvestigation({
        title: defaultTitle,
        notes: newNotes.trim() || 'Empirical environmental investigation generated via NASA POWER data.',
        tags: tagsArray.length > 0 ? tagsArray : ['Empirical', 'NASA POWER'],
        locationName: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        elevationMeters: dataRes.elevationMeters,
        parameterKey: newParamKey,
        parameterName: param.name,
        units: param.units,
        startYear: newStartYear,
        endYear: newEndYear,
        source: dataRes.source,
        retrievedAt: dataRes.retrievedAt,
        points: dataRes.points.map(p => ({
          period: p.period,
          dateLabel: p.dateLabel,
          value: p.value
        })),
        stats: trendResult.stats,
        regression: trendResult.regression,
        mannKendall: trendResult.mannKendall,
        classification: trendResult.classification,
        dataLimitations: dataRes.dataQualityWarnings
      });

      refreshList();
      setSelectedInvestigation(saved);
      setActiveTab('viewer');
    } catch (err: any) {
      console.error('Creation error:', err);
      setNewError(err.message || 'Failed to retrieve NASA data and compile investigation.');
    } finally {
      setLoadingNew(false);
    }
  };

  // Filtered investigations for library
  const filteredInvestigations = investigations.filter(inv => {
    const matchesSearch = 
      inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.tags && inv.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesVar = variableFilter === 'ALL' || inv.parameterKey === variableFilter;
    return matchesSearch && matchesVar;
  });

  // Comparison items
  const invA = investigations.find(i => i.id === compareIdA);
  const invB = investigations.find(i => i.id === compareIdB);

  return (
    <div className="space-y-5 max-w-[1700px] mx-auto pb-16 font-sans">
      {/* Printable CSS Hook */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: #FFFFFF !important;
            color: #0F172A !important;
          }
          aside, header, nav, .no-print {
            display: none !important;
          }
          .print-area {
            display: block !important;
            background: #FFFFFF !important;
            color: #0F172A !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          .print-card {
            background: #F8FAFC !important;
            border: 1px solid #CBD5E1 !important;
            color: #0F172A !important;
            box-shadow: none !important;
          }
        }
      `}} />

      {/* Screen-Only Header & Tabs */}
      <div className="no-print space-y-4">
        {/* Top Mac Window Control Bar */}
        <div className="bg-[#091122]/90 backdrop-blur-md border border-[#1b2b48] rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/40 rounded-md border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-white">EARTH SYSTEM SCIENTIFIC REPORTS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold">
                NASA TM FORMAT
              </span>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 bg-[#050913] p-1 rounded-lg border border-[#16243d]">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Report Library ({investigations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('viewer')}
              disabled={!selectedInvestigation}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                activeTab === 'viewer'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Technical Dossier</span>
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'compare'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Comparative Dossier</span>
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compile Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SAVED INVESTIGATIONS LIBRARY */}
      {activeTab === 'library' && (
        <div className="no-print space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-[#08101d] border border-[#1b2b48] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search title, station, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#060c18] border border-[#1b2b48] rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-mono">Variable:</span>
              <select
                value={variableFilter}
                onChange={(e) => setVariableFilter(e.target.value)}
                className="bg-[#060c18] border border-[#1b2b48] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Environmental Layers</option>
                {Object.values(NASA_PARAMETERS).map(p => (
                  <option key={p.key} value={p.key}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Investigations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvestigations.map((inv) => (
              <div
                key={inv.id}
                onClick={() => {
                  setSelectedInvestigation(inv);
                  setActiveTab('viewer');
                }}
                className={`bg-[#08101d] border rounded-xl p-5 hover:border-cyan-500/60 transition-all cursor-pointer flex flex-col justify-between group shadow-xl ${
                  selectedInvestigation?.id === inv.id ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-[#1b2b48]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                      {inv.parameterName}
                    </span>
                    <button
                      onClick={(e) => handleDelete(inv.id, e)}
                      title="Delete Report"
                      className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2.5 group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {inv.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" /> {inv.locationName}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-cyan-400" /> {inv.startYear}–{inv.endYear}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {inv.notes}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#132238] flex items-center justify-between text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    inv.mannKendall.trend === 'increasing' 
                      ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                      : inv.mannKendall.trend === 'decreasing'
                      ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-800/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    {inv.mannKendall.trend.toUpperCase()} ({inv.mannKendall.pValue < 0.05 ? 'SIG' : 'NS'})
                  </span>

                  <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TECHNICAL DOSSIER VIEWER */}
      {activeTab === 'viewer' && selectedInvestigation && (
        <div className="space-y-5">
          {/* Action Toolbar */}
          <div className="no-print bg-[#08101d] border border-[#1b2b48] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="text-cyan-400 font-bold">DOC ID:</span>
              <span className="text-slate-400">{selectedInvestigation.id}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportInvestigationToCsv(selectedInvestigation)}
                className="px-3 py-1.5 bg-[#060c18] hover:bg-[#0c1626] text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Dataset</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Report Paper Container */}
          <div className="print-area bg-[#08101d] border border-[#1b2b48] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* NASA TM Header */}
            <div className="border-b border-[#1b2b48] pb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <img 
                  src="/assets/aistudio/IMG_5789_2a1f8dc3.PNG" 
                  alt="EARTHSCOPE Logo" 
                  className="h-14 sm:h-16 w-auto object-contain shrink-0 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                />
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
                    NASA TECHNICAL MEMORANDUM · NASA-TM-2026-EARTHSCOPE
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {selectedInvestigation.title}
                  </h1>
                  <div className="text-xs font-mono text-slate-400 pt-1">
                    Location: {selectedInvestigation.locationName} ({selectedInvestigation.lat.toFixed(4)}°N, {selectedInvestigation.lon.toFixed(4)}°E) · Elevation: {selectedInvestigation.elevationMeters}m
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2 shrink-0 font-mono text-xs text-slate-400">
                <img 
                  src="/assets/aistudio/image_0bb54710.png" 
                  alt="NASA Space Apps Challenge" 
                  className="h-8 sm:h-9 w-auto object-contain opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" 
                />
                <div className="text-left md:text-right">
                  <div className="text-cyan-400 font-bold">STATUS: PUBLISHED</div>
                  <div>Archived: {new Date(selectedInvestigation.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Observational Statistics Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#050b14] border border-[#16243d] rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">Mean Value</div>
                <div className="text-lg font-mono font-bold text-white mt-0.5">
                  {selectedInvestigation.stats.mean.toFixed(2)} {selectedInvestigation.units}
                </div>
              </div>
              <div className="bg-[#050b14] border border-[#16243d] rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">Decadal Trend Rate</div>
                <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">
                  {selectedInvestigation.regression.trendPerDecade > 0 ? '+' : ''}{selectedInvestigation.regression.trendPerDecade.toFixed(2)} {selectedInvestigation.units}/dec
                </div>
              </div>
              <div className="bg-[#050b14] border border-[#16243d] rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">Mann-Kendall p-value</div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                  {selectedInvestigation.mannKendall.pValue.toFixed(4)}
                </div>
              </div>
              <div className="bg-[#050b14] border border-[#16243d] rounded-lg p-3">
                <div className="text-[10px] font-mono text-slate-400">R² Correlation</div>
                <div className="text-lg font-mono font-bold text-purple-300 mt-0.5">
                  {(selectedInvestigation.regression.r2 * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Time-Series Chart */}
            <div className="bg-[#050b14] border border-[#16243d] rounded-lg p-4 space-y-2" ref={chartContainerRef}>
              <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Monthly Observational Time-Series ({selectedInvestigation.startYear}–{selectedInvestigation.endYear})
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedInvestigation.points} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#132238" vertical={false} />
                    <XAxis dataKey="dateLabel" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} unit={` ${selectedInvestigation.units}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#070d18', borderColor: '#1e3352', fontFamily: 'monospace', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fill="#06b6d4" fillOpacity={0.2} name={selectedInvestigation.parameterName} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Methodology & Source Footnote */}
            <div className="border-t border-[#1b2b48] pt-4 text-xs font-mono text-slate-400 space-y-1">
              <div>Source: {selectedInvestigation.source}</div>
              <div>Retrieval Timestamp: {selectedInvestigation.retrievedAt}</div>
              <div>NASA Space Apps Challenge 2026 · Team 404 Err</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPARE MULTI-REPORT */}
      {activeTab === 'compare' && (
        <div className="bg-[#08101d] border border-[#1b2b48] rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1b2b48] pb-3">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-cyan-400" />
              Cross-Report Comparative Synthesis
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400">Report A:</label>
              <select
                value={compareIdA}
                onChange={(e) => setCompareIdA(e.target.value)}
                className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-xs font-mono text-white mt-1"
              >
                {investigations.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400">Report B:</label>
              <select
                value={compareIdB}
                onChange={(e) => setCompareIdB(e.target.value)}
                className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-xs font-mono text-white mt-1"
              >
                {investigations.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </div>
          </div>

          {invA && invB && (
            <div className="overflow-x-auto pt-3">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#050912] text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3 text-cyan-400">{invA.locationName}</th>
                    <th className="py-2 px-3 text-purple-400">{invB.locationName}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Variable</td>
                    <td className="py-2 px-3 text-cyan-300">{invA.parameterName}</td>
                    <td className="py-2 px-3 text-purple-300">{invB.parameterName}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Mean Value</td>
                    <td className="py-2 px-3 font-bold">{invA.stats.mean.toFixed(2)} {invA.units}</td>
                    <td className="py-2 px-3 font-bold">{invB.stats.mean.toFixed(2)} {invB.units}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Decadal Trend</td>
                    <td className="py-2 px-3 text-cyan-400">{invA.regression.trendPerDecade.toFixed(2)} / dec</td>
                    <td className="py-2 px-3 text-purple-400">{invB.regression.trendPerDecade.toFixed(2)} / dec</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-white">Significance</td>
                    <td className="py-2 px-3">{invA.mannKendall.pValue < 0.05 ? 'Significant' : 'Not Significant'}</td>
                    <td className="py-2 px-3">{invB.mannKendall.pValue < 0.05 ? 'Significant' : 'Not Significant'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMPILE NEW REPORT */}
      {activeTab === 'new' && (
        <div className="bg-[#08101d] border border-[#1b2b48] rounded-xl p-5 shadow-xl space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-[#1b2b48] pb-3">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Compile New Technical Investigation
            </h3>
          </div>

          <form onSubmit={handleCreateNew} className="space-y-4 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-slate-400">Target Geographical Station</label>
              <select
                value={newPresetIdx}
                onChange={(e) => setNewPresetIdx(Number(e.target.value))}
                className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-white"
              >
                {PRESET_LOCATIONS.map((loc, idx) => (
                  <option key={loc.name} value={idx}>{loc.name} ({loc.region})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Environmental Parameter</label>
              <select
                value={newParamKey}
                onChange={(e) => setNewParamKey(e.target.value)}
                className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-white"
              >
                {Object.entries(NASA_PARAMETERS).map(([k, p]) => (
                  <option key={k} value={k}>{p.name} ({p.units})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400">Start Year</label>
                <select
                  value={newStartYear}
                  onChange={(e) => setNewStartYear(Number(e.target.value))}
                  className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-white"
                >
                  {[2015, 2018, 2020].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-400">End Year</label>
                <select
                  value={newEndYear}
                  onChange={(e) => setNewEndYear(Number(e.target.value))}
                  className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-white"
                >
                  {[2022, 2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Custom Title (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank for auto-generated title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-white placeholder-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400">Scientific Notes / Hypotheses</label>
              <textarea
                rows={3}
                placeholder="Add observational context, localized sensor notes, or meteorology remarks..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-white placeholder-slate-600"
              />
            </div>

            {newError && (
              <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 rounded text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{newError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingNew}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingNew ? <RotateCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{loadingNew ? 'Ingesting NASA POWER Data...' : 'Compile & Archive Investigation'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
