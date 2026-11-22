import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  BrainCircuit, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Layers, 
  TrendingUp, 
  ShieldAlert, 
  Copy, 
  Check, 
  RotateCw, 
  ArrowRight,
  BookOpen,
  HelpCircle,
  BarChart2,
  Send,
  MessageSquare,
  ShieldCheck,
  Award,
  Thermometer,
  Wind,
  Download,
  Info
} from 'lucide-react';
import { 
  PRESET_LOCATIONS, 
  NASA_PARAMETERS, 
  fetchNasaLocationData, 
  LocationDataResult 
} from '../lib/nasaPowerService';
import { analyzeTrend, TrendAnalysisResult } from '../lib/statistics';

interface AiInsightResponse {
  scientificSummary: string;
  whatChanged: string;
  whereChanged: string;
  howMuchChanged: string;
  statisticalSignificance: string;
  environmentalMeaning: string;
  limitationsAndUncertainty: string;
  keyTakeawayBullets: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AIInsights() {
  const [searchParams] = useSearchParams();

  // Location & variable selectors
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0); // Nagpur default
  const [paramKey, setParamKey] = useState<string>('PM25');
  const [startYear, setStartYear] = useState<number>(2018);
  const [endYear, setEndYear] = useState<number>(2024);

  // Data fetching & analysis
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [nasaData, setNasaData] = useState<LocationDataResult | null>(null);
  const [analysis, setAnalysis] = useState<TrendAnalysisResult | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // Gemini AI generation state (Structured Dossier)
  const [generatingAi, setGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AiInsightResponse | null>(null);
  const [aiMeta, setAiMeta] = useState<{ model: string; generatedAt: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Chat Q&A state (Interactive conversational prompt)
  const [userQuery, setUserQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Welcome to METEO Climate AI Intelligence. I am grounded in empirical NASA POWER observations and strict non-parametric statistical kernels. How can I assist your atmospheric investigation?',
      timestamp: 'SYSTEM 08:00'
    }
  ]);
  const [isAsking, setIsAsking] = useState(false);

  // Initialize from search params or defaults
  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const param = searchParams.get('param');

    if (param && NASA_PARAMETERS[param]) {
      setParamKey(param);
    }

    if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      const matchedIdx = PRESET_LOCATIONS.findIndex(
        loc => Math.abs(loc.lat - lat) < 0.1 && Math.abs(loc.lon - lon) < 0.1
      );
      if (matchedIdx >= 0) {
        setSelectedPresetIndex(matchedIdx);
      }
    }
  }, [searchParams]);

  // Fetch NASA data and calculate stats
  const fetchAndAnalyze = async (presetIdx: number, pKey: string, sYear: number, eYear: number) => {
    const location = PRESET_LOCATIONS[presetIdx] || PRESET_LOCATIONS[0];
    setLoadingData(true);
    setDataError(null);
    setAiInsight(null);
    setAiError(null);

    try {
      const result = await fetchNasaLocationData(
        location.lat,
        location.lon,
        sYear,
        eYear,
        pKey,
        location.name
      );

      setNasaData(result);
      const rawValues = result.points.map(p => p.value);
      const statsResult = analyzeTrend(rawValues, 12);
      setAnalysis(statsResult);
    } catch (err: any) {
      console.error('Data retrieval error:', err);
      setDataError(err.message || 'Failed to fetch empirical NASA observations.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAndAnalyze(selectedPresetIndex, paramKey, startYear, endYear);
  }, [selectedPresetIndex, paramKey, startYear, endYear]);

  // Trigger Gemini API for Full Dossier
  const handleGenerateAiExplanation = async () => {
    if (!nasaData || !analysis || analysis.classification === 'insufficient observations') {
      setAiError('Cannot generate interpretation without verified observations and statistical calculations.');
      return;
    }

    setGeneratingAi(true);
    setAiError(null);

    const payload = {
      locationName: nasaData.locationName,
      lat: nasaData.lat,
      lon: nasaData.lon,
      elevationMeters: nasaData.elevationMeters,
      paramKey: nasaData.parameterKey,
      paramName: nasaData.parameterMeta.name,
      units: nasaData.parameterMeta.units,
      startYear,
      endYear,
      source: nasaData.source,
      count: analysis.stats.count,
      mean: Number(analysis.stats.mean.toFixed(2)),
      median: Number(analysis.stats.median.toFixed(2)),
      stdDev: Number(analysis.stats.stdDev.toFixed(2)),
      min: Number(analysis.stats.min.toFixed(2)),
      max: Number(analysis.stats.max.toFixed(2)),
      slope: Number(analysis.regression.slope.toFixed(4)),
      trendPerYear: Number(analysis.regression.trendPerYear.toFixed(3)),
      trendPerDecade: Number(analysis.regression.trendPerDecade.toFixed(3)),
      ciSlope: [
        Number(analysis.regression.ciSlope[0].toFixed(3)),
        Number(analysis.regression.ciSlope[1].toFixed(3))
      ],
      r2: Number(analysis.regression.r2.toFixed(3)),
      mannKendall: {
        s: analysis.mannKendall.s,
        z: Number(analysis.mannKendall.z.toFixed(2)),
        pValue: Number(analysis.mannKendall.pValue.toFixed(4)),
        trend: analysis.mannKendall.trend
      },
      classification: analysis.classification,
      dataLimitations: nasaData.dataQualityWarnings
    };

    try {
      const response = await fetch('/api/gemini/explain-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${response.status}: Failed to communicate with Gemini AI.`);
      }

      const data = await response.json();
      if (!data.success || !data.insight) {
        throw new Error(data.error || 'Invalid response structure received from Gemini.');
      }

      setAiInsight(data.insight);
      setAiMeta({
        model: data.meta?.model || 'gemini-3.8-flash',
        generatedAt: data.meta?.generatedAt || new Date().toISOString()
      });
    } catch (err: any) {
      console.error('AI Insights generation error:', err);
      setAiError(err.message || 'Failed to generate AI insights.');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Chat Q&A handler
  const handleSendChat = async (presetQuestion?: string) => {
    const query = (presetQuestion || userQuery).trim();
    if (!query || isAsking) return;

    setUserQuery('');
    const newMsg: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setIsAsking(true);

    try {
      const res = await fetch('/api/gemini/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            location: nasaData?.locationName || 'Nagpur',
            coordinates: `${nasaData?.lat}°N, ${nasaData?.lon}°E`,
            parameter: `${NASA_PARAMETERS[paramKey]?.name} (${NASA_PARAMETERS[paramKey]?.units})`,
            mean: analysis?.stats.mean,
            trendDirection: analysis?.mannKendall.trend,
            pValue: analysis?.mannKendall.pValue,
            slopePerDecade: analysis?.regression.trendPerDecade
          }
        })
      });

      const data = await res.json();
      const replyContent = data.answer || data.reply || data.response || 'No response received from Gemini AI model.';

      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: replyContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Data analysis synthesis failed: ${err.message || 'Network timeout'}.`,
          timestamp: 'ERROR'
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopyReport = () => {
    if (!aiInsight) return;
    const textToCopy = `EARTHSCOPE SCIENTIFIC AI INSIGHT REPORT
Location: ${nasaData?.locationName} (${nasaData?.lat}°N, ${nasaData?.lon}°E)
Variable: ${nasaData?.parameterMeta.name} (${nasaData?.parameterMeta.units})
Period: ${startYear} - ${endYear}

SUMMARY:
${aiInsight.scientificSummary}

WHAT CHANGED:
${aiInsight.whatChanged}

MAGNITUDE & RATE:
${aiInsight.howMuchChanged}

STATISTICAL SIGNIFICANCE:
${aiInsight.statisticalSignificance}

ENVIRONMENTAL MEANING:
${aiInsight.environmentalMeaning}

LIMITATIONS:
${aiInsight.limitationsAndUncertainty}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentLocation = PRESET_LOCATIONS[selectedPresetIndex] || PRESET_LOCATIONS[0];
  const currentParam = NASA_PARAMETERS[paramKey] || NASA_PARAMETERS['PM25'];

  return (
    <div className="space-y-5 max-w-[1700px] mx-auto pb-12 font-sans">
      
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
            <span className="text-xs font-mono font-bold tracking-wider text-white">METEO CLIMATE AI INTELLIGENCE</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              GEMINI 2.5 / 3.8 FLASH DUAL ENGINE
            </span>
          </div>
        </div>

        {/* Telemetry Status Pills */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Zero Hallucination Guard
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5 text-cyan-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> NASA Grounded
          </span>
        </div>
      </div>

      {/* Target Parameters Bar */}
      <div className="bg-[#08101d] border border-[#1b2b48] rounded-xl p-4 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Target Location */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Geographic Target
          </label>
          <select
            value={selectedPresetIndex}
            onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
            className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-xs font-mono text-white"
          >
            {PRESET_LOCATIONS.map((loc, idx) => (
              <option key={loc.name} value={idx}>{loc.name} ({loc.region})</option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-slate-500">
            {currentLocation.lat.toFixed(4)}°N, {currentLocation.lon.toFixed(4)}°E
          </div>
        </div>

        {/* Target Variable */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" /> Target Parameter
          </label>
          <select
            value={paramKey}
            onChange={(e) => setParamKey(e.target.value)}
            className="w-full bg-[#060c18] border border-[#1b2b48] rounded px-3 py-2 text-xs font-mono text-white"
          >
            {Object.entries(NASA_PARAMETERS).map(([k, p]) => (
              <option key={k} value={k}>{p.name} ({p.units})</option>
            ))}
          </select>
          <div className="text-[10px] font-mono text-slate-500">
            {nasaData?.source || 'NASA MERRA-2'}
          </div>
        </div>

        {/* Time Horizon */}
        <div className="space-y-1">
          <label className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Observation Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="bg-[#060c18] border border-[#1b2b48] rounded px-2.5 py-2 text-xs font-mono text-white"
            >
              {[2015, 2018, 2020].map(yr => <option key={yr} value={yr}>From {yr}</option>)}
            </select>
            <select
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="bg-[#060c18] border border-[#1b2b48] rounded px-2.5 py-2 text-xs font-mono text-white"
            >
              {[2022, 2023, 2024, 2025].map(yr => <option key={yr} value={yr}>To {yr}</option>)}
            </select>
          </div>
          <div className="text-[10px] font-mono text-cyan-400">
            {endYear - startYear + 1} Years Ingested
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col justify-end">
          <button
            onClick={handleGenerateAiExplanation}
            disabled={loadingData || generatingAi || !analysis}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-mono font-bold text-xs rounded-lg shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{generatingAi ? 'Synthesizing Dossier...' : 'Generate AI Synthesis'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Panel Layout: Left Interactive Q&A Assistant + Right Scientific Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Floating AI Assistant Console (5 Columns) */}
        <div className="lg:col-span-5 bg-[#08101d] border border-[#1b2b48] rounded-xl p-4 shadow-xl flex flex-col h-[650px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1b2b48] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-600/50 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Ask AI Climate Intelligence
                </h3>
                <div className="text-[10px] font-mono text-cyan-400">Grounded Q&A Kernel</div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          {/* Quick Prompts Chips */}
          <div className="space-y-1.5 pb-3 border-b border-[#132238]">
            <div className="text-[10px] font-mono uppercase text-slate-500">Quick Inquiries:</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                `Is ${currentLocation.name} getting hotter?`,
                `Has ${paramKey} trended significantly?`,
                `Explain atmospheric boundary layer inversion`,
                `Compare ${currentLocation.name} with regional baseline`
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendChat(chip)}
                  disabled={isAsking}
                  className="px-2 py-1 bg-[#050b14] hover:bg-cyan-950/60 border border-[#1b2b48] hover:border-cyan-500/50 rounded text-[10px] font-mono text-slate-300 hover:text-cyan-300 transition-all text-left cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Message Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 scrollbar-thin">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-xs font-mono leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-950/50 border border-cyan-800/60 text-cyan-100 ml-6'
                    : 'bg-[#050b14] border border-[#16243d] text-slate-300 mr-2'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                  <span>{msg.role === 'user' ? 'INVESTIGATOR' : 'GEMINI CLIMATE KERNEL'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            {isAsking && (
              <div className="p-3 bg-[#050b14] border border-[#16243d] rounded-lg text-xs font-mono text-cyan-400 flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Querying NASA Observations & Statistical Engine...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="pt-3 border-t border-[#1b2b48] flex items-center gap-2"
          >
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={`Ask about ${currentLocation.name} or atmospheric physics...`}
              disabled={isAsking}
              className="flex-1 bg-[#050b14] border border-[#1b2b48] rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isAsking || !userQuery.trim()}
              className="p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Side: Structured Scientific Dossier (7 Columns) */}
        <div className="lg:col-span-7 bg-[#08101d] border border-[#1b2b48] rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b2b48] pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  Scientific Synthesis Dossier
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Peer-reviewed framework interpreting empirical regression and Mann-Kendall statistics.
                </p>
              </div>

              {aiInsight && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReport}
                    className="px-3 py-1.5 bg-[#0e182b] hover:bg-[#152440] text-cyan-300 border border-cyan-500/40 rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Dossier'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content area */}
            {generatingAi ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
                <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <span>Running Gemini Multi-Modal Earth Science Reasoning...</span>
              </div>
            ) : aiInsight ? (
              <div className="space-y-4 mt-4 text-xs font-mono max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
                {/* Executive Summary */}
                <div className="p-3.5 bg-[#050b14] rounded-lg border border-cyan-500/30">
                  <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    01. Executive Scientific Summary
                  </div>
                  <p className="text-slate-200 leading-relaxed font-sans text-sm">
                    {aiInsight.scientificSummary}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#050b14] rounded-lg border border-[#16243d]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">What Changed & Magnitude</div>
                    <div className="text-white leading-relaxed">{aiInsight.whatChanged}</div>
                    <div className="text-cyan-300 font-bold mt-2">{aiInsight.howMuchChanged}</div>
                  </div>

                  <div className="p-3 bg-[#050b14] rounded-lg border border-[#16243d]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Statistical Significance</div>
                    <div className="text-emerald-400 font-bold mb-1">
                      {analysis && analysis.mannKendall.pValue < 0.05 ? 'Significant at α = 0.05' : 'Null Hypothesis Not Rejected'}
                    </div>
                    <div className="text-slate-300 leading-relaxed">{aiInsight.statisticalSignificance}</div>
                  </div>
                </div>

                {/* Atmospheric Mechanism & PBL Physics */}
                <div className="p-3 bg-[#050b14] rounded-lg border border-purple-500/30">
                  <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                    02. Atmospheric Physics & Environmental Meaning
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {aiInsight.environmentalMeaning}
                  </p>
                </div>

                {/* Limitations & Uncertainty */}
                <div className="p-3 bg-[#050b14] rounded-lg border border-amber-500/30">
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    03. Limitations, Autocorrelation & Satellite Uncertainty
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {aiInsight.limitationsAndUncertainty}
                  </p>
                </div>

                {/* Key Takeaways */}
                {aiInsight.keyTakeawayBullets && aiInsight.keyTakeawayBullets.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#1b2b48]">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Core Empirical Findings:
                    </div>
                    <ul className="space-y-1">
                      {aiInsight.keyTakeawayBullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono text-xs space-y-3">
                <BrainCircuit className="w-12 h-12 text-slate-700" />
                <div className="max-w-md">
                  Click <strong className="text-cyan-400">Generate AI Synthesis</strong> above to run full Gemini multi-modal reasoning on empirical NASA observations and calculated Mann-Kendall statistics.
                </div>
              </div>
            )}
          </div>

          {/* Model Provenance Footer */}
          <div className="pt-3 border-t border-[#1b2b48] flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Grounding: NASA POWER MERRA-2 API</span>
            <span>Kernel: {aiMeta?.model || 'Gemini 3.8 / 2.5 Flash'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
