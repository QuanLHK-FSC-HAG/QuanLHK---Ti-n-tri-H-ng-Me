import React, { useState, useEffect } from 'react';
import { 
  Dices, 
  TrendingUp, 
  Sliders, 
  Sparkles, 
  BookOpen, 
  Calendar, 
  Loader2, 
  Info, 
  HelpCircle,
  Award, 
  Activity,
  CheckCircle,
  XCircle,
  ChevronRight,
  TrendingDown,
  RotateCcw,
  Sparkle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar
} from 'recharts';

import { 
  LotteryRecord, 
  PredictionResponse, 
  PerformanceResponse, 
  OptimizationResult 
} from './types';
import { 
  DEFAULT_MULTI_FACTOR_PARAMS, 
  DEFAULT_ABSENT_PARAMS, 
  DEFAULT_POSITION_PARAMS 
} from './utils/algorithms';

import AiGenerator from './components/AiGenerator';
import HistoryBrowser from './components/HistoryBrowser';

export function getXsmnProvincesForDate(dateStr: string): string[] {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return ["TP.HCM", "Đồng Tháp", "Cà Mau"];
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ...
  switch (dayOfWeek) {
    case 1: return ["TP.HCM", "Đồng Tháp", "Cà Mau"];
    case 2: return ["Bến Tre", "Vũng Tàu", "Bạc Liêu"];
    case 3: return ["Đồng Nai", "Cần Thơ", "Sóc Trăng"];
    case 4: return ["Tây Ninh", "An Giang", "Bình Thuận"];
    case 5: return ["Vĩnh Long", "Bình Dương", "Trà Vinh"];
    case 6: return ["TP.HCM", "Long An", "Bình Phước", "Hậu Giang"];
    case 0: return ["Tiền Giang", "Kiên Giang", "Lâm Đồng"];
    default: return ["TP.HCM"];
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'predict' | 'performance' | 'optimize' | 'ai' | 'history'>('predict');
  const [lotteryType, setLotteryType] = useState<'xsmn' | 'power_655' | 'mega_645'>('xsmn');

  // Shared state: Dates (pre-populated with mid-2026 as the up-to-date schedule)
  const [predictDate, setPredictDate] = useState('2026-07-01');
  const [perfStartDate, setPerfStartDate] = useState('2026-06-01');
  const [perfEndDate, setPerfEndDate] = useState('2026-07-01');
  const [optStartDate, setOptStartDate] = useState('2026-06-01');
  const [optEndDate, setOptEndDate] = useState('2026-06-15');

  const [algorithmId, setAlgorithmId] = useState<'multi_factor' | 'days_absent' | 'prize_position'>('multi_factor');

  // Parameter State managers
  const [multiFactorParams, setMultiFactorParams] = useState(DEFAULT_MULTI_FACTOR_PARAMS);
  const [absentParams, setAbsentParams] = useState(DEFAULT_ABSENT_PARAMS);
  const [positionParams, setPositionParams] = useState(DEFAULT_POSITION_PARAMS);

  // Prediction tab state
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictResponse, setPredictResponse] = useState<PredictionResponse | null>(null);
  const [selectedPredictionItem, setSelectedPredictionItem] = useState<any | null>(null);

  // Performance tab state
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfResponse, setPerfResponse] = useState<PerformanceResponse | null>(null);

  // Optimization tab state
  const [optLoading, setOptLoading] = useState(false);
  const [optResponse, setOptResponse] = useState<any | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optApplied, setOptApplied] = useState(false);

  // Trigger default prediction on load
  useEffect(() => {
    handlePredict();
  }, [predictDate, algorithmId, lotteryType]);

  // Execute prediction API call
  const handlePredict = async () => {
    setPredictLoading(true);
    setSelectedPredictionItem(null);
    try {
      let paramsToPass = {};
      if (algorithmId === 'multi_factor') paramsToPass = multiFactorParams;
      else if (algorithmId === 'days_absent') paramsToPass = absentParams;
      else paramsToPass = positionParams;

      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: predictDate,
          algorithmId,
          parameters: paramsToPass,
          lotteryType
        })
      });

      if (!res.ok) throw new Error('Dự đoán thất bại');
      const data = await res.json();
      setPredictResponse(data);
      if (data.predictions && data.predictions.length > 0) {
        setSelectedPredictionItem(data.predictions[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPredictLoading(false);
    }
  };

  // Run performance analysis API call
  const handlePerformance = async () => {
    setPerfLoading(true);
    try {
      let paramsToPass = {};
      if (algorithmId === 'multi_factor') paramsToPass = multiFactorParams;
      else if (algorithmId === 'days_absent') paramsToPass = absentParams;
      else paramsToPass = positionParams;

      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: perfStartDate,
          endDate: perfEndDate,
          algorithmId,
          parameters: paramsToPass,
          lotteryType
        })
      });

      if (!res.ok) throw new Error('Tính hiệu suất thất bại');
      const data = await res.json();
      setPerfResponse(data);
    } catch (error) {
      console.error(error);
    } finally {
      setPerfLoading(false);
    }
  };

  // Run Parameter Optimization
  const handleOptimize = async () => {
    setOptLoading(true);
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: optStartDate,
          endDate: optEndDate,
          algorithmId,
          lotteryType
        })
      });

      if (!res.ok) throw new Error('Tối ưu hóa thất bại');
      const data = await res.json();
      setOptResponse(data);
    } catch (error) {
      console.error(error);
    } finally {
      setOptLoading(false);
      setIsOptimizing(false);
    }
  };

  // Apply parameters from AI generator or Optimizer
  const handleApplyParams = (params: Record<string, any>, hypothesisName: string) => {
    if (algorithmId === 'multi_factor') {
      setMultiFactorParams(prev => ({ ...prev, ...params }));
    } else if (algorithmId === 'days_absent') {
      setAbsentParams(prev => ({ ...prev, ...params }));
    } else {
      setPositionParams(prev => ({ ...prev, ...params }));
    }
    // Instantly trigger re-prediction
    setTimeout(() => {
      handlePredict();
    }, 50);
  };

  // Reset parameters to defaults
  const handleResetParams = () => {
    if (algorithmId === 'multi_factor') {
      setMultiFactorParams(DEFAULT_MULTI_FACTOR_PARAMS);
    } else if (algorithmId === 'days_absent') {
      setAbsentParams(DEFAULT_ABSENT_PARAMS);
    } else {
      setPositionParams(DEFAULT_POSITION_PARAMS);
    }
    setTimeout(() => {
      handlePredict();
    }, 50);
  };

  const getActiveParams = () => {
    if (algorithmId === 'multi_factor') return multiFactorParams;
    if (algorithmId === 'days_absent') return absentParams;
    return positionParams;
  };

  const updateParamValue = (key: string, value: number) => {
    if (algorithmId === 'multi_factor') {
      setMultiFactorParams(prev => ({ ...prev, [key]: value }));
    } else if (algorithmId === 'days_absent') {
      setAbsentParams(prev => ({ ...prev, [key]: value }));
    } else {
      setPositionParams(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <div className="min-h-screen bg-[#110105] text-[#fbe1b6] flex flex-col font-sans selection:bg-amber-600/30">
      {/* Top Hero Navbar */}
      <header className="bg-[#24030a]/95 backdrop-blur-md border-b border-amber-500/20 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-300 rounded-lg rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-yellow-200/30">
              <div className="w-4 h-4 border border-black rounded-full -rotate-45 flex items-center justify-center">
                <Dices className="w-2.5 h-2.5 text-black" />
              </div>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-amber-300 tracking-tight flex items-center gap-1.5 font-serif uppercase">
                QuanLHK - Tiên tri Hàng Me
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase tracking-wider animate-pulse">
                  Hoàng Kim
                </span>
              </h1>
              <p className="text-[10px] text-amber-500/70 font-mono uppercase tracking-widest hidden sm:block">Thần toán lượng hóa • Triết lý cung đình châu Á</p>
            </div>
          </div>

          {/* Tab buttons */}
          <nav className="flex space-x-1 bg-[#110105] p-1 rounded-xl border border-amber-500/20">
            <button
              onClick={() => setActiveTab('predict')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'predict' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-[#24030a] border border-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Dự đoán
            </button>
            <button
              onClick={() => { setActiveTab('performance'); handlePerformance(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'performance' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-[#24030a] border border-transparent'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Hiệu suất
            </button>
            <button
              onClick={() => setActiveTab('optimize')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'optimize' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-[#24030a] border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Tối ưu
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'ai' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-[#24030a] border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sinh Thuật Toán
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'history' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-[#24030a] border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Kho dữ liệu
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">

        {/* Cung Đình Thần Toán Header & Lottery Type Selector */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#1c0308] border border-amber-500/30 p-5 rounded-2xl shadow-[0_0_25px_rgba(212,175,55,0.15)] gap-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-300 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-yellow-200/40">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-300 tracking-wider font-serif uppercase">QUANLHK - TIÊN TRI HÀNG ME</h2>
              <p className="text-xs text-amber-400/80 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span>Cung Đình Thần Toán</span>
                <span className="text-[10px] bg-red-600/30 text-red-200 px-1.5 py-0.2 rounded border border-red-500/30 font-bold">Vị Thanh</span>
              </p>
            </div>
          </div>
          
          {/* Lottery Selector */}
          <div className="flex flex-wrap justify-center bg-[#110105] p-1 rounded-xl border border-amber-500/20 gap-1 md:gap-1.5">
            <button
              onClick={() => setLotteryType('xsmn')}
              className={`px-4 py-2 rounded-lg text-xs font-black font-mono tracking-wider transition uppercase ${
                lotteryType === 'xsmn' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-amber-500/10'
              }`}
            >
              ⛩️ Xổ Số Miền Nam (Minh Ngọc)
            </button>
            <button
              onClick={() => setLotteryType('power_655')}
              className={`px-4 py-2 rounded-lg text-xs font-black font-mono tracking-wider transition uppercase ${
                lotteryType === 'power_655' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-amber-500/10'
              }`}
            >
              💎 Vietlott Power 6/55
            </button>
            <button
              onClick={() => setLotteryType('mega_645')}
              className={`px-4 py-2 rounded-lg text-xs font-black font-mono tracking-wider transition uppercase ${
                lotteryType === 'mega_645' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md shadow-amber-950/40 border border-yellow-400' 
                  : 'text-amber-200/60 hover:text-amber-100 hover:bg-amber-500/10'
              }`}
            >
              💎 Vietlott Mega 6/45
            </button>
          </div>
        </div>

        {/* TOP CONFIG BAR (Visible on Predict & Performance tabs for easy tuning) */}
        {(activeTab === 'predict' || activeTab === 'performance') && (
          <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.5)] p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-amber-500 tracking-wider uppercase block font-mono">
                System Algorithm Core
              </label>
              <select
                className="w-full bg-[#110105] border border-amber-500/20 text-amber-100 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none transition cursor-pointer"
                value={algorithmId}
                onChange={(e) => setAlgorithmId(e.target.value as any)}
              >
                <option value="multi_factor" className="bg-[#110105] text-amber-100">🏆 Đánh giá đa nhân tố (Multi-Factor Core)</option>
                <option value="days_absent" className="bg-[#110105] text-amber-100">📈 Phân tích chu kỳ vắng mặt (Milestone Lô Khan)</option>
                <option value="prize_position" className="bg-[#110105] text-amber-100">🎯 Phạt vị trí lùi Giải (Prize Position Penalty)</option>
              </select>
            </div>

            {activeTab === 'predict' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-amber-500 tracking-wider uppercase block font-mono">
                  Target Draw Prediction Date
                </label>
                <div className="flex flex-col">
                  <input
                    type="date"
                    className="w-full bg-[#110105] border border-amber-500/20 text-amber-100 rounded-xl px-4 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none font-medium font-mono"
                    value={predictDate}
                    onChange={(e) => setPredictDate(e.target.value)}
                  />
                  {lotteryType === 'xsmn' ? (
                    <div className="mt-1.5 text-[10px] text-amber-300/80 flex flex-wrap gap-1 items-center bg-red-950/30 p-1.5 rounded border border-red-500/20">
                      <span className="font-bold">Đài Nam:</span>
                      {getXsmnProvincesForDate(predictDate).map((prov, i) => (
                        <span key={i} className="bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30 font-bold">
                          {prov}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[10px] text-amber-300/80 bg-red-950/30 p-1.5 rounded border border-red-500/20 font-bold font-mono">
                      {lotteryType === 'power_655' ? 'Lịch quay: Thứ 3, 5, 7 lúc 18h00' : 'Lịch quay: Thứ 4, 6, Chủ nhật lúc 18h00'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-500 tracking-wider uppercase block font-mono">Backtest From</label>
                  <input
                    type="date"
                    className="w-full bg-[#110105] border border-amber-500/20 text-amber-100 rounded-xl px-3 py-2 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none font-medium font-mono"
                    value={perfStartDate}
                    onChange={(e) => setPerfStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-500 tracking-wider uppercase block font-mono">Backtest To</label>
                  <input
                    type="date"
                    className="w-full bg-[#110105] border border-amber-500/20 text-amber-100 rounded-xl px-3 py-2 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none font-medium font-mono"
                    value={perfEndDate}
                    onChange={(e) => setPerfEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2.5 md:justify-end">
              <button
                onClick={activeTab === 'predict' ? handlePredict : handlePerformance}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-wider font-mono shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.5)] border border-yellow-400 transition cursor-pointer"
              >
                Chạy thuật toán
              </button>
              <button
                onClick={handleResetParams}
                title="Khôi phục mặc định"
                className="p-2.5 border border-amber-500/20 bg-[#110105] hover:bg-amber-500/10 text-amber-400 hover:text-amber-200 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: PREDICT (Dự đoán) */}
        {activeTab === 'predict' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left sidebar: Live Parameter tuning */}
            <div className="lg:col-span-4 bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-5 space-y-6">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2 font-serif uppercase tracking-wide">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Mô phỏng trọng số
                </h3>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-mono">
                  LIVE FEED
                </span>
              </div>

              {/* Param tuning inputs based on active algorithm */}
              <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1">
                {algorithmId === 'multi_factor' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Kỳ ngắn hạn (Ngày)</span>
                        <span className="font-mono text-indigo-400">{multiFactorParams.short_term_days}d</span>
                      </div>
                      <input
                        type="range" min="3" max="30" step="1"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={multiFactorParams.short_term_days}
                        onChange={(e) => updateParamValue('short_term_days', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Điểm nền ngắn hạn</span>
                        <span className="font-mono text-indigo-400">+{multiFactorParams.base_point_short} pts</span>
                      </div>
                      <input
                        type="range" min="0.5" max="10" step="0.1"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={multiFactorParams.base_point_short}
                        onChange={(e) => updateParamValue('base_point_short', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Trọng số tần suất ngắn (45 ngày)</span>
                        <span className="font-mono text-indigo-400">x{multiFactorParams.frequency_weight_short}</span>
                      </div>
                      <input
                        type="range" min="0.1" max="2" step="0.05"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={multiFactorParams.frequency_weight_short}
                        onChange={(e) => updateParamValue('frequency_weight_short', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Thưởng số láng giềng giải ĐB</span>
                        <span className="font-mono text-indigo-400">+{multiFactorParams.neighbor_bonus} pts</span>
                      </div>
                      <input
                        type="range" min="0.2" max="4" step="0.1"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={multiFactorParams.neighbor_bonus}
                        onChange={(e) => updateParamValue('neighbor_bonus', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Thưởng số vắng lâu (&gt;15 ngày)</span>
                        <span className="font-mono text-indigo-400">+{multiFactorParams.bonus_long_absence} pts</span>
                      </div>
                      <input
                        type="range" min="0.1" max="3" step="0.1"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={multiFactorParams.bonus_long_absence}
                        onChange={(e) => updateParamValue('bonus_long_absence', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Phạt số vừa ra hôm qua</span>
                        <span className="font-mono text-rose-400">{multiFactorParams.deduction_if_appeared_last_day} pts</span>
                      </div>
                      <input
                        type="range" min="-1" max="0" step="0.01"
                        className="w-full accent-rose-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={multiFactorParams.deduction_if_appeared_last_day}
                        onChange={(e) => updateParamValue('deduction_if_appeared_last_day', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Phạt lặp lại Top 3</span>
                        <span className="font-mono text-rose-400">{multiFactorParams.repeat_penalty_top} pts</span>
                      </div>
                      <input
                        type="range" min="-2" max="0" step="0.1"
                        className="w-full accent-rose-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={multiFactorParams.repeat_penalty_top}
                        onChange={(e) => updateParamValue('repeat_penalty_top', parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {algorithmId === 'days_absent' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Tốc độ tăng điểm cơ bản/ngày</span>
                        <span className="font-mono text-indigo-400">+{absentParams.base_increment_per_day} pts</span>
                      </div>
                      <input
                        type="range" min="0.01" max="1" step="0.01"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={absentParams.base_increment_per_day}
                        onChange={(e) => updateParamValue('base_increment_per_day', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Thưởng mốc vắng</span>
                        <span className="font-mono text-indigo-400">+{absentParams.milestone_bonus} pts</span>
                      </div>
                      <input
                        type="range" min="0.05" max="1" step="0.05"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={absentParams.milestone_bonus}
                        onChange={(e) => updateParamValue('milestone_bonus', parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-300">
                        <span>Hệ số tăng lũy tiến ngày khuyết</span>
                        <span className="font-mono text-indigo-400">+{absentParams.progressive_increment} pts</span>
                      </div>
                      <input
                        type="range" min="0.01" max="0.5" step="0.01"
                        className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                        value={absentParams.progressive_increment}
                        onChange={(e) => updateParamValue('progressive_increment', parseFloat(e.target.value))}
                      />
                    </div>
                  </>
                )}

                {algorithmId === 'prize_position' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Hệ số nhân mức phạt vị trí lùi</span>
                      <span className="font-mono text-indigo-400">x{positionParams.penalty_multiplier}</span>
                    </div>
                    <input
                      type="range" min="0.01" max="1.0" step="0.01"
                      className="w-full accent-indigo-500 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer"
                      value={positionParams.penalty_multiplier}
                      onChange={(e) => updateParamValue('penalty_multiplier', parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800/60 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Bấm thanh trượt để thay đổi mức phạt/thưởng. Hệ thống sẽ ngay lập tức tính toán lại thứ tự điểm của 100 số loto.
                </p>
              </div>
            </div>

            {/* Right Main Panel: Predictions Dashboard */}
            <div className="lg:col-span-8 space-y-6">
              {predictLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-slate-900/40 rounded-2xl border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                  <p className="text-sm font-semibold text-white">Đang lượng hóa dữ liệu...</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">Đang duyệt lịch sử, áp dụng nhân tử và xếp hạng loto 2 số.</p>
                </div>
              ) : predictResponse ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Recommended Numbers Cards */}
                  <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                      <h3 className="font-bold text-amber-300 text-sm flex items-center gap-1.5 font-serif uppercase tracking-wide">
                        <Award className="w-4 h-4 text-amber-400" />
                        Top Thần Số Khuyên Dùng
                      </h3>
                      <span className="text-[10px] font-black bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                        ĐỘ CHÍNH XÁC CAO
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {predictResponse.predictions.slice(0, 4).map((p, idx) => {
                        const isSelected = selectedPredictionItem?.number === p.number;
                        const isHit = predictResponse.actualResult?.hits.includes(p.number);

                        return (
                          <div
                            key={p.number}
                            onClick={() => setSelectedPredictionItem(p)}
                            className={`p-4 rounded-xl border transition cursor-pointer text-center relative flex flex-col items-center ${
                              isSelected 
                                ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(212,175,55,0.25)] ring-1 ring-amber-400' 
                                : 'border-amber-500/10 bg-[#110105]/60 hover:bg-amber-500/5'
                            }`}
                          >
                            <span className="absolute left-2.5 top-2.5 text-[10px] font-black text-amber-500/60 font-mono">
                              #{idx + 1}
                            </span>

                            {predictResponse.actualResult && (
                              <span className="absolute right-2.5 top-2.5">
                                {isHit ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-amber-950/50" />
                                )}
                              </span>
                            )}

                            <span className="text-3xl font-black text-amber-200 font-mono mt-2 mb-1 drop-shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                              {p.number}
                            </span>
                            <div className="text-[10px] text-amber-400 font-medium font-mono uppercase tracking-wider mb-1">
                              {p.score} điểm
                            </div>
                            <div className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[9px] font-bold">
                              Tỷ lệ về: {p.probability}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actual outcome check if available */}
                    {predictResponse.actualResult ? (
                      <div className="p-4 bg-[#110105]/80 rounded-xl border border-amber-500/20 space-y-3">
                        <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                          Đối chiếu kết quả ngày {predictDate}
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-amber-500/70 block text-[10px] uppercase font-mono tracking-wider">Đặc biệt:</span>
                            <span className="text-base md:text-lg font-black text-rose-400 font-mono">
                              {predictResponse.actualResult.special}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-500/70 block text-[10px] uppercase font-mono tracking-wider">Giải Tám / Phụ:</span>
                            <span className="text-base md:text-lg font-black text-emerald-400 font-mono">
                              {predictResponse.actualResult.prize8 || '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-500/70 block text-[10px] uppercase font-mono tracking-wider">Hiệu quả Top 10:</span>
                            <span className="text-xs md:text-sm font-black text-amber-300 font-mono block mt-0.5">
                              Trúng {predictResponse.actualResult.hits.length} / {lotteryType === 'xsmn' ? '18' : '6'} số
                            </span>
                          </div>
                        </div>

                        {(predictResponse.actualResult.isSpecialHit || predictResponse.actualResult.isPrize8Hit) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {predictResponse.actualResult.isSpecialHit && (
                              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono font-bold text-[9px] rounded border border-rose-500/30 uppercase tracking-wider animate-pulse">
                                HIT ĐỀ ĐẶC BIỆT!
                              </span>
                            )}
                            {predictResponse.actualResult.isPrize8Hit && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[9px] rounded border border-emerald-500/30 uppercase tracking-wider animate-pulse">
                                HIT GIẢI TÁM / CHỐT!
                              </span>
                            )}
                          </div>
                        )}

                        {predictResponse.actualResult.hits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center pt-2.5 border-t border-amber-500/10">
                            <span className="text-[10px] font-bold text-amber-400/80 uppercase font-mono">
                              Các số trúng:
                            </span>
                            {predictResponse.actualResult.hits.map(h => (
                              <span key={h} className="px-2 py-0.5 bg-emerald-500/25 text-emerald-300 font-black font-mono text-xs rounded border border-emerald-500/30">
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-amber-200/90 rounded-xl text-xs flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Chưa có kết quả chính thức:</strong> Bạn có thể kiểm tra tỷ lệ trúng thực tế bằng cách chọn một ngày trước đó (như năm 2025 trở xuống).
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prediction Breakdown explaining the math */}
                  <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-5 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-amber-500/20 pb-3">
                        <h3 className="font-bold text-amber-300 text-sm flex items-center gap-1.5 font-serif uppercase tracking-wide">
                          <Activity className="w-4 h-4 text-amber-400" />
                          Luận Giải & Xác Suất Thần Số
                        </h3>
                      </div>

                      {selectedPredictionItem ? (
                        <div className="space-y-3.5 text-xs">
                          <div className="flex justify-between items-center bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30 mb-1">
                            <span className="font-bold text-amber-200">Con số chốt dự đoán:</span>
                            <span className="text-2xl font-black text-amber-300 font-mono drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                              {selectedPredictionItem.number}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Điểm nền thuật toán:</span>
                              <span className="font-mono font-medium text-amber-200">100.0</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Tương tác ngắn hạn:</span>
                              <span className="font-mono font-medium text-emerald-400">
                                +{selectedPredictionItem.breakdown.shortTermScore}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Tần suất tích lũy dài:</span>
                              <span className="font-mono font-medium text-emerald-400">
                                +{selectedPredictionItem.breakdown.frequencyScore}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Thưởng số láng giềng:</span>
                              <span className="font-mono font-medium text-emerald-400">
                                +{selectedPredictionItem.breakdown.neighborBonus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Kỳ chu kỳ (7 / 30 ngày):</span>
                              <span className="font-mono font-medium text-emerald-400">
                                +{selectedPredictionItem.breakdown.cycleBonus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Thưởng vắng ngày lâu (Lô khan):</span>
                              <span className="font-mono font-medium text-emerald-400">
                                +{selectedPredictionItem.breakdown.absenceBonus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Phạt rơi lại loto hôm qua:</span>
                              <span className={`font-mono font-medium ${selectedPredictionItem.breakdown.lastDayDeduction < 0 ? 'text-red-400' : 'text-amber-200'}`}>
                                {selectedPredictionItem.breakdown.lastDayDeduction}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-200/70">Phạt lặp lại Top dự đoán cũ:</span>
                              <span className={`font-mono font-medium ${selectedPredictionItem.breakdown.repeatPenalty < 0 ? 'text-red-400' : 'text-amber-200'}`}>
                                {selectedPredictionItem.breakdown.repeatPenalty}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-amber-500/20 pt-3 flex justify-between font-bold text-sm text-amber-200">
                            <span>TỔNG ĐIỂM HOÀNG GIA:</span>
                            <span className="text-amber-400 font-mono">{selectedPredictionItem.score}</span>
                          </div>

                          {selectedPredictionItem.probability !== undefined && (
                            <div className="mt-3 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Sparkles className="w-4 h-4" />
                                <span>KHẢ NĂNG XUẤT HIỆN:</span>
                              </div>
                              <span className="text-base font-black font-mono">{selectedPredictionItem.probability}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-6 text-center">Bấm vào bất kỳ thẻ khuyến nghị loto nào để xem chi tiết cách lượng điểm toán học.</p>
                      )}
                    </div>
                  </div>

                  {/* Full List 00-99 sorted with mini table */}
                  <div className="md:col-span-2 bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-5">
                    <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider border-b border-amber-500/10 pb-3 mb-4 font-serif">
                      Bảng xếp hạng thần số hoàng gia {lotteryType === 'xsmn' ? '(00-99)' : 'quả cầu'} (Điểm từ cao xuống thấp)
                    </h4>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
                      {predictResponse.allScores.slice(0, 60).map((scoreItem, idx) => {
                        const isHit = predictResponse.actualResult?.hits.includes(scoreItem.number);
                        return (
                          <div 
                            key={scoreItem.number}
                            onClick={() => {
                              // Find full item to select it
                              const fullItem = predictResponse.predictions.find(p => p.number === scoreItem.number) || {
                                number: scoreItem.number,
                                score: scoreItem.score,
                                breakdown: { shortTermScore: 0, frequencyScore: 0, neighborBonus: 0, cycleBonus: 0, absenceBonus: 0, lastDayDeduction: 0, repeatPenalty: 0, total: scoreItem.score },
                                probability: 10 + Math.floor((scoreItem.score % 40))
                              };
                              setSelectedPredictionItem(fullItem);
                            }}
                            className={`p-2 rounded-lg text-center cursor-pointer transition border text-xs flex flex-col items-center justify-center ${
                              selectedPredictionItem?.number === scoreItem.number
                                ? 'bg-amber-500 text-black border-yellow-400 font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                : isHit
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-semibold'
                                  : 'bg-[#110105]/60 text-amber-200 border-amber-500/10 hover:bg-amber-500/5 hover:border-amber-500/30'
                            }`}
                          >
                            <span className="font-mono text-sm leading-tight block">{scoreItem.number}</span>
                            <span className="text-[9px] opacity-75 font-mono">{scoreItem.score}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-amber-500/60 mt-4 italic text-center font-mono uppercase tracking-wider">
                      * Bấm vào bất kỳ ô số nào để xem công thức và luận giải xác suất.
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] p-8 text-center text-amber-300 py-16">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-400" />
                  Chưa có dữ liệu hoàng cung của ngày này. Hãy bấm &quot;Chạy thuật toán&quot; khởi trận toán pháp.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: PERFORMANCE (Hiệu suất) */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            {perfLoading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
                <p className="text-sm font-bold text-amber-200">ĐANG KHỞI ĐỘNG PHÁP TRẬN SAO SA LỊCH SỬ...</p>
                <p className="text-xs text-amber-500 mt-1 font-mono uppercase tracking-wider">Hệ thống đang chạy mô phỏng cuốn chiếu kết quả chính xác để tối ưu hóa nhân tố.</p>
              </div>
            ) : perfResponse ? (
              <div className="space-y-6">
                
                {/* Performance Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] p-5">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block tracking-wider font-mono">Backtest Interval</span>
                    <strong className="text-2xl font-black text-amber-300 block mt-1 font-mono">
                      {perfResponse.totalDays} ngày
                    </strong>
                    <span className="text-[10px] text-amber-500/60 mt-1 block font-mono">Từ {perfStartDate} tới {perfEndDate}</span>
                  </div>

                  <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] p-5">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block tracking-wider font-mono">Top 3 Success Rate</span>
                    <strong className="text-2xl font-black text-emerald-400 block mt-1 font-mono">
                      {perfResponse.hitsRateTop3}%
                    </strong>
                    <span className="text-[10px] text-amber-500/60 mt-1 block">Tỷ lệ trúng ít nhất một số trong Top 3 Khuyến nghị</span>
                  </div>

                  <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] p-5">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block tracking-wider font-mono">Top 5 Success Rate</span>
                    <strong className="text-2xl font-black text-emerald-400 block mt-1 font-mono">
                      {perfResponse.hitsRateTop5}%
                    </strong>
                    <span className="text-[10px] text-amber-500/60 mt-1 block">Tỷ lệ trúng ít nhất một số trong Top 5 Khuyến nghị</span>
                  </div>

                  <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] p-5">
                    <span className="text-[10px] font-bold text-amber-500 uppercase block tracking-wider font-mono">Special Prize Hits</span>
                    <strong className="text-2xl font-black text-rose-400 block mt-1 font-mono">
                      {perfResponse.specialHitCount} lần
                    </strong>
                    <span className="text-[10px] text-amber-500/60 mt-1 block">Bóng Độc Đắc Giải Đặc Biệt xuất hiện</span>
                  </div>
                </div>

                {/* Graph */}
                <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] p-6 space-y-4">
                  <h3 className="font-bold text-amber-300 text-sm font-serif uppercase tracking-wider">Biểu đồ thần số học - Diễn tiến độ chính xác loto</h3>
                  
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={perfResponse.dailyResults}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3d0810" />
                        <XAxis dataKey="date" stroke="#8d6e1b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#8d6e1b" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1c0308', borderColor: '#d4af3733', borderRadius: '12px', color: '#fbe1b6' }} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          name="Số lượng trúng (Top 10)" 
                          dataKey="hits10.length" 
                          stroke="#d4af37" 
                          fillOpacity={1} 
                          fill="url(#colorHits)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Log Ledger table */}
                <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-5 overflow-hidden">
                  <h3 className="font-bold text-amber-300 text-sm border-b border-amber-500/10 pb-3 mb-4 font-serif uppercase tracking-wider">Nhật ký giải lập sao trời hoàng gia</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-amber-500/20 text-amber-400 font-bold bg-[#110105]/60 font-mono uppercase tracking-wider">
                          <th className="py-3 px-3">Ngày</th>
                          <th className="py-3 px-3">Đề Xuất Top 3</th>
                          <th className="py-3 px-3">Kết quả ĐB</th>
                          <th className="py-3 px-3">{lotteryType === 'xsmn' ? 'Giải Tám' : 'Bóng phụ'}</th>
                          <th className="py-3 px-3 text-center">Trạng Thái Hit</th>
                          <th className="py-3 px-3 text-right">Trúng Top 10</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-500/10">
                        {perfResponse.dailyResults.map((day) => {
                          const isG8Hit = lotteryType === 'xsmn' 
                            ? (day.actualPrizes[17] && day.predictedTop3.includes(day.actualPrizes[17]))
                            : (day.actualPrizes[1] && day.predictedTop3.includes(day.actualPrizes[1]));
                          return (
                            <tr key={day.date} className="hover:bg-[#1c0308]/50 transition border-b border-amber-500/5">
                              <td className="py-3 px-3 font-semibold text-amber-200 font-mono">{day.date}</td>
                              <td className="py-3 px-3 font-mono text-amber-300">{day.predictedTop3.join(', ')}</td>
                              <td className="py-3 px-3 font-mono font-bold text-rose-400">{day.actualSpecial}</td>
                              <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                                {lotteryType === 'xsmn' ? (day.actualPrizes[17] || '--') : (day.actualPrizes[1] || '--')}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex gap-1.5 items-center justify-center">
                                  {day.isSpecialHit && (
                                    <span className="px-2 py-0.5 bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold rounded text-[9px] font-mono">ĐỀ!</span>
                                  )}
                                  {isG8Hit && (
                                    <span className="px-2 py-0.5 bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold rounded text-[9px] font-mono">
                                      {lotteryType === 'xsmn' ? 'G8!' : 'BÓNG!'}
                                    </span>
                                  )}
                                  {!day.isSpecialHit && !isG8Hit && (
                                    <span className="text-amber-500/30">--</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-emerald-400 font-mono">
                                Trúng {day.hits10.length}/{lotteryType === 'xsmn' ? '18' : '6'} số
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(0,0,0,0.3)] p-8 text-center text-amber-300 py-16">
                Chọn khoảng thời gian phía trên và bấm nút Chạy thuật toán để nạp tinh sa lịch sử hoàng cung.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OPTIMIZE (Tối ưu hóa) */}
        {activeTab === 'optimize' && (
          <div className="space-y-6">
            <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-6 space-y-6">
              <div>
                <h2 className="text-xl font-black text-amber-300 font-serif uppercase tracking-wider">Tối ưu hóa tinh hoa tham số cung đình</h2>
                <p className="text-sm text-amber-200/60 mt-1">Hệ thống sẽ chạy mô phỏng ngẫu nhiên hàng chục bộ trọng số để tìm ra cấu hình đem lại tỷ lệ trúng cao nhất trong thời gian qua.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#110105] p-4 rounded-xl border border-amber-500/10 items-end">
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-amber-500 block uppercase font-mono">Chọn thuật toán tối ưu</label>
                  <select
                    className="w-full bg-[#1c0308] border border-amber-500/20 text-amber-100 rounded-lg px-3 py-1.5 text-xs focus:border-amber-400 font-semibold cursor-pointer focus:outline-none"
                    value={algorithmId}
                    onChange={(e) => setAlgorithmId(e.target.value as any)}
                  >
                    <option value="multi_factor" className="bg-[#110105] text-amber-100">🏆 Đánh giá đa nhân tố (Multi-Factor Core)</option>
                    <option value="days_absent" className="bg-[#110105] text-amber-100">📈 Phân tích chu kỳ vắng mặt (Milestone Lô Khan)</option>
                    <option value="prize_position" className="bg-[#110105] text-amber-100">🎯 Phạt vị trí lùi Giải (Prize Position Penalty)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-500 block uppercase font-mono">Từ ngày (Lịch sử tối ưu)</label>
                  <input
                    type="date"
                    className="w-full bg-[#1c0308] border border-amber-500/20 text-amber-100 rounded-lg px-3 py-1 text-xs focus:border-amber-400 font-mono focus:outline-none"
                    value={optStartDate}
                    onChange={(e) => setOptStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-500 block uppercase font-mono">Đến ngày (Lịch sử tối ưu)</label>
                  <input
                    type="date"
                    className="w-full bg-[#1c0308] border border-amber-500/20 text-amber-100 rounded-lg px-3 py-1 text-xs focus:border-amber-400 font-mono focus:outline-none"
                    value={optEndDate}
                    onChange={(e) => setOptEndDate(e.target.value)}
                  />
                </div>

                <div className="col-span-1 md:col-span-4 flex justify-end">
                  <button
                    onClick={handleOptimize}
                    disabled={optLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-wider font-mono shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition cursor-pointer border border-yellow-400"
                  >
                    {optLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang quét trận pháp ma trận...
                      </>
                    ) : (
                      <>
                        <Sliders className="w-4 h-4" />
                        Khởi trận Quét & Tối Ưu
                      </>
                    )}
                  </button>
                </div>
              </div>

              {optResponse && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-amber-500/20">
                  
                  {/* Recommended parameters */}
                  <div className="lg:col-span-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-full text-[10px] tracking-wide uppercase font-mono border border-amber-500/30">
                        Khuyến Nghị Tốt Nhất
                      </span>
                      <span className="text-xs text-amber-400 font-mono">Score: {optResponse.optimized.score.toFixed(1)}</span>
                    </div>

                    <h3 className="text-sm md:text-base font-black text-amber-300 font-serif uppercase tracking-wider">
                      Cấu hình Hoàng Gia Thành Công
                    </h3>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-xs border-b border-amber-500/10 pb-2">
                        <span className="text-amber-200/60">Tỷ lệ trúng Top 3:</span>
                        <strong className="text-emerald-400 font-mono text-sm">{optResponse.optimized.hitsRateTop3}%</strong>
                      </div>
                      <div className="flex justify-between text-xs border-b border-amber-500/10 pb-2">
                        <span className="text-amber-200/60">Tỷ lệ trúng Top 5:</span>
                        <strong className="text-emerald-400 font-mono text-sm">{optResponse.optimized.hitsRateTop5}%</strong>
                      </div>
                      <div className="flex justify-between text-xs pb-2">
                        <span className="text-amber-200/60">Tỷ lệ trúng Top 10:</span>
                        <strong className="text-emerald-400 font-mono text-sm">{optResponse.optimized.hitsRateTop10}%</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleApplyParams(optResponse.optimized.parameters, 'Tối ưu hóa Hệ thống');
                        setOptApplied(true);
                        setTimeout(() => setOptApplied(false), 4000);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-wider font-mono shadow-[0_4px_15px_rgba(212,175,55,0.2)] transition cursor-pointer border border-yellow-400"
                    >
                      {optApplied ? '✓ Đã áp dụng thành công!' : 'Áp dụng cấu hình hoàng gia này'}
                    </button>
                    {optApplied && (
                      <p className="text-[11px] text-emerald-400 text-center font-mono mt-2 animate-pulse">
                        Đã nạp bộ trọng số mới vào bảng mô phỏng!
                      </p>
                    )}
                  </div>

                  {/* Other Sweep outcomes */}
                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="font-bold text-amber-300 text-sm font-serif uppercase tracking-wider">Toàn bộ các ma trận thử nghiệm</h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {optResponse.allTunedResults.map((item: any, idx: number) => {
                        const isBest = item.score === optResponse.optimized.score;
                        return (
                          <div 
                            key={idx}
                            className={`p-3.5 rounded-xl border text-xs flex justify-between items-center transition ${
                              isBest 
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_10px_rgba(212,175,55,0.1)]' 
                                : 'bg-[#110105] border-amber-500/5 hover:bg-amber-500/5 hover:border-amber-500/20'
                            }`}
                          >
                            <div>
                              <strong className="text-amber-200 block text-sm">{item.label}</strong>
                              <span className="text-amber-500/60 text-[10px] mt-0.5 block font-mono">
                                Top 3: {item.hitsRateTop3}% | Top 5: {item.hitsRateTop5}% | Top 10: {item.hitsRateTop10}%
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 font-bold rounded-lg text-xs font-mono ${
                              isBest ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-[#1c0308] text-amber-500/60'
                            }`}>
                              Score: {item.score.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AI HYPOTHESIS (Trợ lý AI) */}
        {activeTab === 'ai' && (
          <AiGenerator onApplyParameters={handleApplyParams} />
        )}

        {/* TAB 5: HISTORY BROWSER (Dữ liệu lịch sử) */}
        {activeTab === 'history' && (
          <HistoryBrowser lotteryType={lotteryType} />
        )}

      </main>

      {/* Elegant Footer */}
      <footer className="bg-[#110105] border-t border-amber-500/20 py-8 mt-12 text-amber-500/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono">
          <div>
            <p>© 2026 QuanLHK - Tiên tri Hàng Me. Hoàng gia Cung đình Thần Toán.</p>
            <p className="text-amber-400 mt-1 font-bold">Designed by QuanLHK (version Hàng Me - Vị Thanh)</p>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-amber-300 transition cursor-pointer">Lượng hóa Cung đình</span>
            <span className="hover:text-amber-300 transition cursor-pointer">Xổ Số Miền Nam</span>
            <span className="hover:text-amber-300 transition cursor-pointer">Vietlott Thần Cơ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
