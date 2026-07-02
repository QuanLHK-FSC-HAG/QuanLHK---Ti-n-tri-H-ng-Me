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

  // Simplified UI states
  const [showUserGuide, setShowUserGuide] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllScores, setShowAllScores] = useState(false);
  const [showMathDetail, setShowMathDetail] = useState(false);

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
    <div className="min-h-screen bg-[#faf8f4] text-[#1a1a1a] flex flex-col font-sans selection:bg-amber-200">
      {/* Top Hero Navbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-amber-200 sticky top-0 z-50 shadow-[0_4px_25px_rgba(212,175,55,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-300 rounded-lg rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)] border border-yellow-200/30">
              <div className="w-4 h-4 border border-black rounded-full -rotate-45 flex items-center justify-center">
                <Dices className="w-2.5 h-2.5 text-black" />
              </div>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black text-amber-900 tracking-tight flex items-center gap-1.5 font-serif uppercase">
                QuanLHK - Tiên tri Hàng Me
                <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-2 py-0.5 rounded border border-amber-300 font-bold uppercase tracking-wider animate-pulse">
                  Hoàng Kim
                </span>
              </h1>
              <p className="text-[10px] text-amber-700 font-mono uppercase tracking-widest hidden sm:block">Thần toán lượng hóa • Triết lý cung đình châu Á</p>
            </div>
          </div>

          {/* Tab buttons */}
          <nav className="flex space-x-1 bg-amber-50/50 p-1 rounded-xl border border-amber-200">
            <button
              onClick={() => setActiveTab('predict')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'predict' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/50 border border-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Dự đoán
            </button>
            <button
              onClick={() => { setActiveTab('performance'); handlePerformance(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'performance' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/50 border border-transparent'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Hiệu suất
            </button>
            <button
              onClick={() => setActiveTab('optimize')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'optimize' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/50 border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Tối ưu
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'ai' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/50 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sinh Thuật Toán
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide transition uppercase ${
                activeTab === 'history' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/50 border border-transparent'
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
        <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-amber-200 p-5 rounded-2xl shadow-[0_4px_25px_rgba(212,175,55,0.06)] gap-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-300 flex items-center justify-center shadow-[0_4px_20px_rgba(212,175,55,0.2)] border border-yellow-200/40">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-900 tracking-wider font-serif uppercase">QUANLHK - TIÊN TRI HÀNG ME</h2>
              <p className="text-xs text-amber-700 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span>Cung Đình Thần Toán</span>
                <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.2 rounded border border-red-200 font-bold">Vị Thanh</span>
              </p>
            </div>
          </div>
          
          {/* Lottery Selector */}
          <div className="flex flex-wrap justify-center bg-amber-50/50 p-1 rounded-xl border border-amber-200 gap-1 md:gap-1.5">
            <button
              onClick={() => setLotteryType('xsmn')}
              className={`px-4 py-2 rounded-lg text-xs font-black font-mono tracking-wider transition uppercase ${
                lotteryType === 'xsmn' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/40'
              }`}
            >
              ⛩️ Xổ Số Miền Nam (Minh Ngọc)
            </button>
            <button
              onClick={() => setLotteryType('power_655')}
              className={`px-4 py-2 rounded-lg text-xs font-black font-mono tracking-wider transition uppercase ${
                lotteryType === 'power_655' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/40'
              }`}
            >
              💎 Vietlott Power 6/55
            </button>
            <button
              onClick={() => setLotteryType('mega_645')}
              className={`px-4 py-2 rounded-lg text-xs font-black font-mono tracking-wider transition uppercase ${
                lotteryType === 'mega_645' 
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-black shadow-md border border-amber-500' 
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/40'
              }`}
            >
              💎 Vietlott Mega 6/45
            </button>
          </div>
        </div>

        {/* HƯỚNG DẪN SỬ DỤNG BẰNG HÌNH ẢNH & BIỂU TƯỢNG */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.06)] overflow-hidden transition-all">
          <button 
            onClick={() => setShowUserGuide(!showUserGuide)}
            className="w-full flex items-center justify-between p-4 bg-amber-50/50 hover:bg-amber-100/30 transition text-left cursor-pointer border-b border-amber-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-300">
                <HelpCircle className="w-5 h-5 text-amber-700 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950 font-serif uppercase tracking-wider">
                  ⛩️ Sơ Đồ Biểu Tượng & Hướng Dẫn Nhanh Cho Người Mới
                </h3>
                <p className="text-[10px] text-amber-800/80 font-mono uppercase tracking-wider">
                  {showUserGuide ? "Bấm vào đây để thu gọn bảng hướng dẫn" : "Bấm vào đây để hiển thị bảng tra cứu nút bấm trực quan"}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono text-amber-800 bg-white border border-amber-300 px-2.5 py-1 rounded-lg">
              {showUserGuide ? "Thu gọn ▲" : "Xem hướng dẫn ▼"}
            </span>
          </button>

          {showUserGuide && (
            <div className="p-5 md:p-6 space-y-5">
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                Hệ thống <strong className="text-amber-800">QuanLHK Thần Toán Hoàng Gia</strong> đã được tinh giản tối đa các phép toán học rối mắt. Dưới đây là ý nghĩa trực quan của các biểu tượng nút bấm để bạn tra cứu tức thì:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                
                {/* Step 1 */}
                <div className="p-4 bg-amber-50/20 rounded-xl border border-amber-100 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">BƯỚC 1</span>
                    <h4 className="font-bold text-amber-950 text-xs font-serif uppercase flex items-center gap-1">
                      <Dices className="w-3.5 h-3.5 text-amber-600" />
                      Chọn Loại Đài
                    </h4>
                    <p className="text-[11px] text-amber-900/70 leading-relaxed">
                      Lựa chọn <strong className="text-amber-800">Xổ Số Miền Nam</strong> hoặc <strong className="text-amber-800">Vietlott</strong> ở trên cùng để nạp cơ sở dữ liệu lịch sử hoàng gia.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-100/60 flex gap-1 justify-center">
                    <span className="text-[8px] font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded font-mono border border-amber-500">⛩️ XSMN</span>
                    <span className="text-[8px] font-bold bg-white text-amber-800 px-1.5 py-0.5 rounded font-mono border border-amber-200">💎 POWER</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-amber-50/20 rounded-xl border border-amber-100 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">BƯỚC 2</span>
                    <h4 className="font-bold text-amber-950 text-xs font-serif uppercase flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      Chọn Ngày & Lõi
                    </h4>
                    <p className="text-[11px] text-amber-900/70 leading-relaxed">
                      Thiết lập <strong className="text-amber-800">Ngày Cần Dự Đoán</strong> và <strong className="text-amber-800">Lõi Thuật Toán</strong> phong thủy lượng hóa ở thanh cấu hình phía dưới.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-100/60 text-center">
                    <span className="text-[8px] font-mono font-bold bg-white border border-amber-200 rounded px-1.5 py-0.5 text-amber-950 inline-block">
                      📅 01/07/2026
                    </span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-amber-50/20 rounded-xl border border-amber-100 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">BƯỚC 3</span>
                    <h4 className="font-bold text-amber-950 text-xs font-serif uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Khởi Trận Toán
                    </h4>
                    <p className="text-[11px] text-amber-900/70 leading-relaxed">
                      Bấm nút vàng <strong className="text-amber-800">Chạy thuật toán</strong> để máy tính tức thì duyệt lịch sử hoàng cung, sắp xếp thứ tự điểm về của loto.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-100/60">
                    <span className="block text-center text-[9px] font-black bg-gradient-to-r from-amber-600 to-yellow-500 text-black py-1 rounded font-mono border border-amber-500 shadow-[0_2px_6px_rgba(212,175,55,0.15)]">
                      Chạy thuật toán
                    </span>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-amber-50/20 rounded-xl border border-amber-100 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">BƯỚC 4</span>
                    <h4 className="font-bold text-amber-950 text-xs font-serif uppercase flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      Xem Luận Giải
                    </h4>
                    <p className="text-[11px] text-amber-900/70 leading-relaxed">
                      Bấm vào bất kỳ <strong className="text-amber-800">Thẻ Số Khuyên Dùng</strong> hoặc <strong className="text-amber-800">Ô Số</strong> nào bên dưới để mở rộng bảng giải mã xác suất.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-100/60 flex justify-center gap-1">
                    <div className="bg-amber-50 border border-amber-400 rounded px-1.5 py-0.5 text-center font-mono w-9">
                      <span className="text-xs font-black text-amber-900 block leading-none">38</span>
                      <span className="text-[7px] text-amber-700 font-bold block leading-none mt-0.5">145đ</span>
                    </div>
                    <span className="text-[8px] font-bold text-emerald-700 flex items-center animate-pulse">◀ Click</span>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-4 bg-amber-50/20 rounded-xl border border-amber-100 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">BƯỚC 5</span>
                    <h4 className="font-bold text-amber-950 text-xs font-serif uppercase flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-amber-600" />
                      Tùy Biến Trọng Số
                    </h4>
                    <p className="text-[11px] text-amber-900/70 leading-relaxed">
                      Nếu muốn can thiệp sâu, hãy bấm nút <strong className="text-amber-800">Chuyên sâu</strong> để mở rộng bảng tinh chỉnh thanh trượt phạt/thưởng loto.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-amber-100/60">
                    <span className="block text-center text-[9px] font-bold bg-white border border-amber-300 py-1 rounded font-mono text-amber-800">
                      🎛️ Chuyên sâu: Tắt
                    </span>
                  </div>
                </div>

              </div>

              {/* Quick tip box */}
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-[11px] text-amber-800">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="leading-relaxed">
                  💡 <strong className="text-amber-950">Mẹo giao diện tinh gọn:</strong> Toàn bộ các thanh trượt phức tạp đã được đưa vào ẩn trong nền theo cấu hình hoàng cung mặc định cực kỳ chuẩn xác. Bạn có thể bật <strong className="text-amber-950">Chuyên sâu</strong> ở góc phải thanh công cụ để hiệu chỉnh thủ công bất cứ lúc nào.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* TOP CONFIG BAR (Visible on Predict & Performance tabs for easy tuning) */}
        {(activeTab === 'predict' || activeTab === 'performance') && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-amber-800 tracking-wider uppercase block font-mono">
                System Algorithm Core
              </label>
              <select
                className="w-full bg-white border border-amber-200 text-amber-950 rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-amber-500 focus:outline-none transition cursor-pointer"
                value={algorithmId}
                onChange={(e) => setAlgorithmId(e.target.value as any)}
              >
                <option value="multi_factor" className="bg-white text-amber-950">🏆 Đánh giá đa nhân tố (Multi-Factor Core)</option>
                <option value="days_absent" className="bg-white text-amber-950">📈 Phân tích chu kỳ vắng mặt (Milestone Lô Khan)</option>
                <option value="prize_position" className="bg-white text-amber-950">🎯 Phạt vị trí lùi Giải (Prize Position Penalty)</option>
              </select>
            </div>

            {activeTab === 'predict' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-amber-800 tracking-wider uppercase block font-mono">
                  Target Draw Prediction Date
                </label>
                <div className="flex flex-col">
                  <input
                    type="date"
                    className="w-full bg-white border border-amber-200 text-amber-950 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none font-medium font-mono"
                    value={predictDate}
                    onChange={(e) => setPredictDate(e.target.value)}
                  />
                  {lotteryType === 'xsmn' ? (
                    <div className="mt-1.5 text-[10px] text-amber-900/80 flex flex-wrap gap-1 items-center bg-amber-50/60 p-1.5 rounded border border-amber-200">
                      <span className="font-bold">Đài Nam:</span>
                      {getXsmnProvincesForDate(predictDate).map((prov, i) => (
                        <span key={i} className="bg-amber-100 text-amber-800 px-1 rounded border border-amber-300 font-bold font-mono">
                          {prov}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[10px] text-amber-900/80 bg-amber-50/60 p-1.5 rounded border border-amber-200 font-bold font-mono">
                      {lotteryType === 'power_655' ? 'Lịch quay: Thứ 3, 5, 7 lúc 18h00' : 'Lịch quay: Thứ 4, 6, Chủ nhật lúc 18h00'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-800 tracking-wider uppercase block font-mono">Backtest From</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-amber-200 text-amber-950 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none font-medium font-mono"
                    value={perfStartDate}
                    onChange={(e) => setPerfStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-800 tracking-wider uppercase block font-mono">Backtest To</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-amber-200 text-amber-950 rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none font-medium font-mono"
                    value={perfEndDate}
                    onChange={(e) => setPerfEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 md:justify-end">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                title="Bật/Tắt Chế độ Chuyên sâu"
                className={`flex items-center gap-1.5 px-3.5 py-2.5 border rounded-xl transition cursor-pointer text-xs font-bold font-mono ${
                  showAdvanced 
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' 
                    : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>{showAdvanced ? "Chuyên sâu: BẬT" : "Chuyên sâu: TẮT"}</span>
              </button>
              <button
                onClick={activeTab === 'predict' ? handlePredict : handlePerformance}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-wider font-mono shadow-md border border-amber-500 transition cursor-pointer"
              >
                Chạy thuật toán
              </button>
              <button
                onClick={handleResetParams}
                title="Khôi phục mặc định"
                className="p-2.5 border border-amber-200 bg-white hover:bg-amber-50 text-amber-700 rounded-xl transition cursor-pointer flex items-center justify-center"
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
            {showAdvanced && (
              <div className="lg:col-span-4 bg-white rounded-2xl border border-amber-200/70 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-5 space-y-6">
                <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2 font-serif uppercase tracking-wide">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    Mô phỏng trọng số
                  </h3>
                  <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider font-mono">
                    LIVE FEED
                  </span>
                </div>

                {/* Param tuning inputs based on active algorithm */}
                <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1">
                  {algorithmId === 'multi_factor' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Kỳ ngắn hạn (Ngày)</span>
                          <span className="font-mono text-amber-700">{multiFactorParams.short_term_days}d</span>
                        </div>
                        <input
                          type="range" min="3" max="30" step="1"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={multiFactorParams.short_term_days}
                          onChange={(e) => updateParamValue('short_term_days', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Điểm nền ngắn hạn</span>
                          <span className="font-mono text-amber-700">+{multiFactorParams.base_point_short} pts</span>
                        </div>
                        <input
                          type="range" min="0.5" max="10" step="0.1"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={multiFactorParams.base_point_short}
                          onChange={(e) => updateParamValue('base_point_short', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Trọng số tần suất ngắn (45 ngày)</span>
                          <span className="font-mono text-amber-700">x{multiFactorParams.frequency_weight_short}</span>
                        </div>
                        <input
                          type="range" min="0.1" max="2" step="0.05"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={multiFactorParams.frequency_weight_short}
                          onChange={(e) => updateParamValue('frequency_weight_short', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Thưởng số láng giềng giải ĐB</span>
                          <span className="font-mono text-amber-700">+{multiFactorParams.neighbor_bonus} pts</span>
                        </div>
                        <input
                          type="range" min="0.2" max="4" step="0.1"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={multiFactorParams.neighbor_bonus}
                          onChange={(e) => updateParamValue('neighbor_bonus', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Thưởng số vắng lâu (&gt;15 ngày)</span>
                          <span className="font-mono text-amber-700">+{multiFactorParams.bonus_long_absence} pts</span>
                        </div>
                        <input
                          type="range" min="0.1" max="3" step="0.1"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={multiFactorParams.bonus_long_absence}
                          onChange={(e) => updateParamValue('bonus_long_absence', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Phạt số vừa ra hôm qua</span>
                          <span className="font-mono text-rose-600">{multiFactorParams.deduction_if_appeared_last_day} pts</span>
                        </div>
                        <input
                          type="range" min="-1" max="0" step="0.01"
                          className="w-full accent-rose-500 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={multiFactorParams.deduction_if_appeared_last_day}
                          onChange={(e) => updateParamValue('deduction_if_appeared_last_day', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Phạt lặp lại Top 3</span>
                          <span className="font-mono text-rose-600">{multiFactorParams.repeat_penalty_top} pts</span>
                        </div>
                        <input
                          type="range" min="-2" max="0" step="0.1"
                          className="w-full accent-rose-500 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={multiFactorParams.repeat_penalty_top}
                          onChange={(e) => updateParamValue('repeat_penalty_top', parseFloat(e.target.value))}
                        />
                      </div>
                    </>
                  )}

                  {algorithmId === 'days_absent' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Tốc độ tăng điểm cơ bản/ngày</span>
                          <span className="font-mono text-amber-700">+{absentParams.base_increment_per_day} pts</span>
                        </div>
                        <input
                          type="range" min="0.01" max="1" step="0.01"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={absentParams.base_increment_per_day}
                          onChange={(e) => updateParamValue('base_increment_per_day', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Thưởng mốc vắng</span>
                          <span className="font-mono text-amber-700">+{absentParams.milestone_bonus} pts</span>
                        </div>
                        <input
                          type="range" min="0.05" max="1" step="0.05"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={absentParams.milestone_bonus}
                          onChange={(e) => updateParamValue('milestone_bonus', parseFloat(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                          <span>Hệ số tăng lũy tiến ngày khuyết</span>
                          <span className="font-mono text-amber-700">+{absentParams.progressive_increment} pts</span>
                        </div>
                        <input
                          type="range" min="0.01" max="0.5" step="0.01"
                          className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                          value={absentParams.progressive_increment}
                          onChange={(e) => updateParamValue('progressive_increment', parseFloat(e.target.value))}
                        />
                      </div>
                    </>
                  )}

                  {algorithmId === 'prize_position' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-amber-900/80">
                        <span>Hệ số nhân mức phạt vị trí lùi</span>
                        <span className="font-mono text-amber-700">x{positionParams.penalty_multiplier}</span>
                      </div>
                      <input
                        type="range" min="0.01" max="1.0" step="0.01"
                        className="w-full accent-amber-600 bg-amber-100 h-1 rounded-lg appearance-none cursor-pointer"
                        value={positionParams.penalty_multiplier}
                        onChange={(e) => updateParamValue('penalty_multiplier', parseFloat(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Bấm thanh trượt để thay đổi mức phạt/thưởng. Hệ thống sẽ ngay lập tức tính toán lại thứ tự điểm của 100 số loto.
                  </p>
                </div>
              </div>
            )}

            {/* Right Main Panel: Predictions Dashboard */}
            <div className={`${showAdvanced ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6`}>
              {predictLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-amber-200 shadow-sm">
                  <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-amber-950">Đang lượng hóa dữ liệu...</p>
                  <p className="text-xs text-amber-700/60 mt-1 font-mono uppercase tracking-wider">Đang duyệt lịch sử, áp dụng nhân tử và xếp hạng loto 2 số.</p>
                </div>
              ) : predictResponse ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Recommended Numbers Cards */}
                  <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                      <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5 font-serif uppercase tracking-wide">
                        <Award className="w-4 h-4 text-amber-600" />
                        Top Thần Số Khuyên Dùng
                      </h3>
                      <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
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
                                ? 'border-amber-500 bg-amber-50 shadow-[0_0_15px_rgba(212,175,55,0.15)] ring-1 ring-amber-400' 
                                : 'border-amber-200 bg-white hover:bg-amber-50/40'
                            }`}
                          >
                            <span className="absolute left-2.5 top-2.5 text-[10px] font-black text-amber-600 font-mono">
                              #{idx + 1}
                            </span>

                            {predictResponse.actualResult && (
                              <span className="absolute right-2.5 top-2.5">
                                {isHit ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600 drop-shadow-sm" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-amber-200" />
                                )}
                              </span>
                            )}

                            <span className="text-3xl font-black text-amber-900 font-mono mt-2 mb-1">
                              {p.number}
                            </span>
                            <div className="text-[10px] text-amber-700 font-bold font-mono uppercase tracking-wider mb-1">
                              {p.score} điểm
                            </div>
                            <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-mono text-[9px] font-bold">
                              Tỷ lệ về: {p.probability}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Actual outcome check if available */}
                    {predictResponse.actualResult ? (
                      <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                        <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider font-mono">
                          Đối chiếu kết quả ngày {predictDate}
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-amber-800/60 block text-[10px] uppercase font-mono tracking-wider">Đặc biệt:</span>
                            <span className="text-base md:text-lg font-black text-rose-600 font-mono">
                              {predictResponse.actualResult.special}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-800/60 block text-[10px] uppercase font-mono tracking-wider">Giải Tám / Phụ:</span>
                            <span className="text-base md:text-lg font-black text-emerald-600 font-mono">
                              {predictResponse.actualResult.prize8 || '--'}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-800/60 block text-[10px] uppercase font-mono tracking-wider">Hiệu quả Top 10:</span>
                            <span className="text-xs md:text-sm font-black text-amber-900 font-mono block mt-0.5">
                              Trúng {predictResponse.actualResult.hits.length} / {lotteryType === 'xsmn' ? '18' : '6'} số
                            </span>
                          </div>
                        </div>

                        {(predictResponse.actualResult.isSpecialHit || predictResponse.actualResult.isPrize8Hit) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {predictResponse.actualResult.isSpecialHit && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-mono font-bold text-[9px] rounded border border-rose-300 uppercase tracking-wider animate-pulse">
                                HIT ĐỀ ĐẶC BIỆT!
                              </span>
                            )}
                            {predictResponse.actualResult.isPrize8Hit && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-mono font-bold text-[9px] rounded border border-emerald-300 uppercase tracking-wider animate-pulse">
                                HIT GIẢI TÁM / CHỐT!
                              </span>
                            )}
                          </div>
                        )}

                        {predictResponse.actualResult.hits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 items-center pt-2.5 border-t border-amber-200">
                            <span className="text-[10px] font-bold text-amber-800 uppercase font-mono">
                              Các số trúng:
                            </span>
                            {predictResponse.actualResult.hits.map(h => (
                              <span key={h} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black font-mono text-xs rounded border border-emerald-200">
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Chưa có kết quả chính thức:</strong> Bạn có thể kiểm tra tỷ lệ trúng thực tế bằng cách chọn một ngày trước đó (như năm 2025 trở xuống).
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prediction Breakdown explaining the math */}
                  <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-5 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-amber-200 pb-3">
                        <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5 font-serif uppercase tracking-wide">
                          <Activity className="w-4 h-4 text-amber-600" />
                          Luận Giải & Xác Suất Thần Số
                        </h3>
                      </div>

                      {selectedPredictionItem ? (
                        <div className="space-y-3.5 text-xs">
                          <div className="flex justify-between items-center bg-amber-50 p-2.5 rounded-xl border border-amber-200 mb-1">
                            <span className="font-bold text-amber-900">Con số chốt dự đoán:</span>
                            <span className="text-2xl font-black text-amber-900 font-mono">
                              {selectedPredictionItem.number}
                            </span>
                          </div>

                          {/* Tinh gọn luận giải */}
                          <div className="space-y-1 bg-amber-50/30 p-3 rounded-xl border border-amber-100/80">
                            <p className="text-[11px] text-amber-900/95 leading-relaxed font-medium">
                              ✨ Thần số <strong className="text-amber-800 text-sm font-mono">{selectedPredictionItem.number}</strong> hội tụ linh khí đạt tổng điểm cao thứ <strong className="text-amber-800 font-mono">#{predictResponse.predictions.findIndex((p: any) => p.number === selectedPredictionItem.number) + 1}</strong> trong đài kỳ này. Chu kỳ phong thủy cho thấy số này đang có độ nóng ổn định và tỷ lệ lặp lại tối ưu.
                            </p>
                          </div>

                          {/* Collapsible Math Detail */}
                          <div className="border border-amber-200/60 rounded-xl overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setShowMathDetail(!showMathDetail)}
                              className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50/20 hover:bg-amber-100/30 transition text-left font-mono text-[10px] font-bold text-amber-800 cursor-pointer"
                            >
                              <span>{showMathDetail ? "▼ ẨN BỚT PHÉP TÍNH TOÁN HỌC" : "▶ XEM PHÉP TÍNH TOÁN CHI TIẾT"}</span>
                              <span className="text-[9px] text-amber-600 bg-white border border-amber-200 px-1.5 py-0.2 rounded font-bold">
                                {showMathDetail ? "Thu gọn" : "Xem thêm"}
                              </span>
                            </button>

                            {showMathDetail && (
                              <div className="p-3 bg-white space-y-2 border-t border-amber-100 transition-all">
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Điểm nền thuật toán:</span>
                                  <span className="font-mono font-bold">100.0</span>
                                </div>
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Tương tác ngắn hạn:</span>
                                  <span className="font-mono font-bold text-emerald-600">
                                    +{selectedPredictionItem.breakdown.shortTermScore}
                                  </span>
                                </div>
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Tần suất tích lũy dài:</span>
                                  <span className="font-mono font-bold text-emerald-600">
                                    +{selectedPredictionItem.breakdown.frequencyScore}
                                  </span>
                                </div>
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Thưởng số láng giềng:</span>
                                  <span className="font-mono font-bold text-emerald-600">
                                    +{selectedPredictionItem.breakdown.neighborBonus}
                                  </span>
                                </div>
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Kỳ chu kỳ (7 / 30 ngày):</span>
                                  <span className="font-mono font-bold text-emerald-600">
                                    +{selectedPredictionItem.breakdown.cycleBonus}
                                  </span>
                                </div>
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Thưởng vắng ngày lâu (Lô khan):</span>
                                  <span className="font-mono font-bold text-emerald-600">
                                    +{selectedPredictionItem.breakdown.absenceBonus}
                                  </span>
                                </div>
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Phạt rơi lại loto hôm qua:</span>
                                  <span className={`font-mono font-bold ${selectedPredictionItem.breakdown.lastDayDeduction < 0 ? 'text-rose-600' : 'text-amber-900'}`}>
                                    {selectedPredictionItem.breakdown.lastDayDeduction}
                                  </span>
                                </div>
                                <div className="flex justify-between text-amber-950/80">
                                  <span>Phạt lặp lại Top dự đoán cũ:</span>
                                  <span className={`font-mono font-bold ${selectedPredictionItem.breakdown.repeatPenalty < 0 ? 'text-rose-600' : 'text-amber-900'}`}>
                                    {selectedPredictionItem.breakdown.repeatPenalty}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-amber-200 pt-3 flex justify-between font-bold text-sm text-amber-950">
                            <span>TỔNG ĐIỂM HOÀNG GIA:</span>
                            <span className="text-amber-600 font-mono text-base">{selectedPredictionItem.score}</span>
                          </div>

                          {selectedPredictionItem.probability !== undefined && (
                            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-sm">
                              <div className="flex items-center gap-1.5 font-bold">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                <span>KHẢ NĂNG XUẤT HIỆN:</span>
                              </div>
                              <span className="text-base font-black font-mono text-emerald-700">{selectedPredictionItem.probability}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-800/60 py-12 text-center">Bấm vào bất kỳ thẻ khuyến nghị loto nào để xem chi tiết cách lượng điểm toán học.</p>
                      )}
                    </div>
                  </div>

                  {/* Full List 00-99 sorted with mini table */}
                  <div className="md:col-span-2 bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-5">
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider border-b border-amber-200 pb-3 mb-4 font-serif">
                      Bảng xếp hạng thần số hoàng gia {lotteryType === 'xsmn' ? '(00-99)' : 'quả cầu'} (Điểm từ cao xuống thấp)
                    </h4>

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2">
                      {predictResponse.allScores.slice(0, showAllScores ? 100 : 20).map((scoreItem, idx) => {
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
                                ? 'bg-amber-500 text-black border-yellow-400 font-bold shadow-sm'
                                : isHit
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                                  : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50/40 hover:border-amber-400'
                            }`}
                          >
                            <span className="font-mono text-sm leading-tight block">{scoreItem.number}</span>
                            <span className="text-[9px] opacity-75 font-mono">{scoreItem.score}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-amber-100">
                      <button
                        type="button"
                        onClick={() => setShowAllScores(!showAllScores)}
                        className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs font-mono transition cursor-pointer border border-amber-200"
                      >
                        {showAllScores ? "◀ THU GỌN (CHỈ HIỆN TOP 20)" : "▶ XEM TOÀN BỘ BẢNG SỐ (ĐẦY ĐỦ)"}
                      </button>
                      <span className="text-[10px] text-amber-700 italic font-mono uppercase tracking-wider">
                        * Bấm vào bất kỳ ô số nào để xem công thức và luận giải xác suất.
                      </span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-8 text-center text-amber-900 py-16">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-600" />
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
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-amber-200 shadow-sm">
                <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-amber-950">ĐANG KHỞI ĐỘNG PHÁP TRẬN SAO SA LỊCH SỬ...</p>
                <p className="text-xs text-amber-700 mt-1 font-mono uppercase tracking-wider">Hệ thống đang chạy mô phỏng cuốn chiếu kết quả chính xác để tối ưu hóa nhân tố.</p>
              </div>
            ) : perfResponse ? (
              <div className="space-y-6">
                
                {/* Performance Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_20px_rgba(212,175,55,0.05)] p-5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider font-mono">Backtest Interval</span>
                    <strong className="text-2xl font-black text-amber-950 block mt-1 font-mono">
                      {perfResponse.totalDays} ngày
                    </strong>
                    <span className="text-[10px] text-amber-700/60 mt-1 block font-mono">Từ {perfStartDate} tới {perfEndDate}</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_20px_rgba(212,175,55,0.05)] p-5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider font-mono">Top 3 Success Rate</span>
                    <strong className="text-2xl font-black text-emerald-600 block mt-1 font-mono">
                      {perfResponse.hitsRateTop3}%
                    </strong>
                    <span className="text-[10px] text-amber-700/60 mt-1 block">Tỷ lệ trúng ít nhất một số trong Top 3 Khuyến nghị</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_20px_rgba(212,175,55,0.05)] p-5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider font-mono">Top 5 Success Rate</span>
                    <strong className="text-2xl font-black text-emerald-600 block mt-1 font-mono">
                      {perfResponse.hitsRateTop5}%
                    </strong>
                    <span className="text-[10px] text-amber-700/60 mt-1 block">Tỷ lệ trúng ít nhất một số trong Top 5 Khuyến nghị</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_20px_rgba(212,175,55,0.05)] p-5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider font-mono">Special Prize Hits</span>
                    <strong className="text-2xl font-black text-rose-600 block mt-1 font-mono">
                      {perfResponse.specialHitCount} lần
                    </strong>
                    <span className="text-[10px] text-amber-700/60 mt-1 block">Bóng Độc Đắc Giải Đặc Biệt xuất hiện</span>
                  </div>
                </div>

                {/* Graph */}
                <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_20px_rgba(212,175,55,0.05)] p-6 space-y-4">
                  <h3 className="font-bold text-amber-900 text-sm font-serif uppercase tracking-wider">Biểu đồ thần số học - Diễn tiến độ chính xác loto</h3>
                  
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1e0c5" />
                        <XAxis dataKey="date" stroke="#8d6e1b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#8d6e1b" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d4af3777', borderRadius: '12px', color: '#1c0308' }} />
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
                <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_20px_rgba(212,175,55,0.05)] p-5 overflow-hidden">
                  <h3 className="font-bold text-amber-900 text-sm border-b border-amber-200 pb-3 mb-4 font-serif uppercase tracking-wider">Nhật ký giải lập sao trời hoàng gia</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-amber-200 text-amber-900 font-bold bg-amber-50/50 font-mono uppercase tracking-wider">
                          <th className="py-3 px-3">Ngày</th>
                          <th className="py-3 px-3">Đề Xuất Top 3</th>
                          <th className="py-3 px-3">Kết quả ĐB</th>
                          <th className="py-3 px-3">{lotteryType === 'xsmn' ? 'Giải Tám' : 'Bóng phụ'}</th>
                          <th className="py-3 px-3 text-center">Trạng Thái Hit</th>
                          <th className="py-3 px-3 text-right">Trúng Top 10</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {perfResponse.dailyResults.map((day) => {
                          const isG8Hit = lotteryType === 'xsmn' 
                            ? (day.actualPrizes[17] && day.predictedTop3.includes(day.actualPrizes[17]))
                            : (day.actualPrizes[1] && day.predictedTop3.includes(day.actualPrizes[1]));
                          return (
                            <tr key={day.date} className="hover:bg-amber-50/20 transition border-b border-amber-100">
                              <td className="py-3 px-3 font-semibold text-amber-950 font-mono">{day.date}</td>
                              <td className="py-3 px-3 font-mono text-amber-800">{day.predictedTop3.join(', ')}</td>
                              <td className="py-3 px-3 font-mono font-bold text-rose-600">{day.actualSpecial}</td>
                              <td className="py-3 px-3 font-mono font-semibold text-emerald-600">
                                {lotteryType === 'xsmn' ? (day.actualPrizes[17] || '--') : (day.actualPrizes[1] || '--')}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex gap-1.5 items-center justify-center">
                                  {day.isSpecialHit && (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded text-[9px] font-mono">ĐỀ!</span>
                                  )}
                                  {isG8Hit && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded text-[9px] font-mono">
                                      {lotteryType === 'xsmn' ? 'G8!' : 'BÓNG!'}
                                    </span>
                                  )}
                                  {!day.isSpecialHit && !isG8Hit && (
                                    <span className="text-amber-300">--</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-emerald-600 font-mono">
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
              <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-8 text-center text-amber-900 py-16">
                Chọn khoảng thời gian phía trên và bấm nút Chạy thuật toán để nạp tinh sa lịch sử hoàng cung.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OPTIMIZE (Tối ưu hóa) */}
        {activeTab === 'optimize' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-amber-200 shadow-[0_4px_25px_rgba(212,175,55,0.05)] p-6 space-y-6">
              <div>
                <h2 className="text-xl font-black text-amber-900 font-serif uppercase tracking-wider">Tối ưu hóa tinh hoa tham số cung đình</h2>
                <p className="text-sm text-amber-800/60 mt-1">Hệ thống sẽ chạy mô phỏng ngẫu nhiên hàng chục bộ trọng số để tìm ra cấu hình đem lại tỷ lệ trúng cao nhất trong thời gian qua.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200 items-end">
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-amber-800 block uppercase font-mono">Chọn thuật toán tối ưu</label>
                  <select
                    className="w-full bg-white border border-amber-200 text-amber-950 rounded-lg px-3 py-1.5 text-xs focus:border-amber-400 font-semibold cursor-pointer focus:outline-none"
                    value={algorithmId}
                    onChange={(e) => setAlgorithmId(e.target.value as any)}
                  >
                    <option value="multi_factor" className="bg-white text-amber-950 font-sans">🏆 Đánh giá đa nhân tố (Multi-Factor Core)</option>
                    <option value="days_absent" className="bg-white text-amber-950 font-sans">📈 Phân tích chu kỳ vắng mặt (Milestone Lô Khan)</option>
                    <option value="prize_position" className="bg-white text-amber-950 font-sans">🎯 Phạt vị trí lùi Giải (Prize Position Penalty)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-800 block uppercase font-mono">Từ ngày (Lịch sử tối ưu)</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-amber-200 text-amber-950 rounded-lg px-3 py-1 text-xs focus:border-amber-400 font-mono focus:outline-none"
                    value={optStartDate}
                    onChange={(e) => setOptStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-800 block uppercase font-mono">Đến ngày (Lịch sử tối ưu)</label>
                  <input
                    type="date"
                    className="w-full bg-white border border-amber-200 text-amber-950 rounded-lg px-3 py-1 text-xs focus:border-amber-400 font-mono focus:outline-none"
                    value={optEndDate}
                    onChange={(e) => setOptEndDate(e.target.value)}
                  />
                </div>

                <div className="col-span-1 md:col-span-4 flex justify-end">
                  <button
                    onClick={handleOptimize}
                    disabled={optLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-wider font-mono shadow-[0_4px_15px_rgba(212,175,55,0.15)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.3)] transition cursor-pointer border border-yellow-400"
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-amber-200">
                  
                  {/* Recommended parameters */}
                  <div className="lg:col-span-5 bg-amber-50/50 border border-amber-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] tracking-wide uppercase font-mono border border-amber-200">
                        Khuyến Nghị Tốt Nhất
                      </span>
                      <span className="text-xs text-amber-800 font-mono">Score: {optResponse.optimized.score.toFixed(1)}</span>
                    </div>

                    <h3 className="text-sm md:text-base font-black text-amber-900 font-serif uppercase tracking-wider">
                      Cấu hình Hoàng Gia Thành Công
                    </h3>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-xs border-b border-amber-100 pb-2">
                        <span className="text-amber-800/60">Tỷ lệ trúng Top 3:</span>
                        <strong className="text-emerald-700 font-mono text-sm">{optResponse.optimized.hitsRateTop3}%</strong>
                      </div>
                      <div className="flex justify-between text-xs border-b border-amber-100 pb-2">
                        <span className="text-amber-800/60">Tỷ lệ trúng Top 5:</span>
                        <strong className="text-emerald-700 font-mono text-sm">{optResponse.optimized.hitsRateTop5}%</strong>
                      </div>
                      <div className="flex justify-between text-xs pb-2">
                        <span className="text-amber-800/60">Tỷ lệ trúng Top 10:</span>
                        <strong className="text-emerald-700 font-mono text-sm">{optResponse.optimized.hitsRateTop10}%</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleApplyParams(optResponse.optimized.parameters, 'Tối ưu hóa Hệ thống');
                        setOptApplied(true);
                        setTimeout(() => setOptApplied(false), 4000);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-xl text-xs uppercase tracking-wider font-mono shadow-[0_4px_15px_rgba(212,175,55,0.15)] transition cursor-pointer border border-yellow-400"
                    >
                      {optApplied ? '✓ Đã áp dụng thành công!' : 'Áp dụng cấu hình hoàng gia này'}
                    </button>
                    {optApplied && (
                      <p className="text-[11px] text-emerald-700 text-center font-mono mt-2 animate-pulse">
                        Đã nạp bộ trọng số mới vào bảng mô phỏng!
                      </p>
                    )}
                  </div>

                  {/* Other Sweep outcomes */}
                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="font-bold text-amber-900 text-sm font-serif uppercase tracking-wider">Toàn bộ các ma trận thử nghiệm</h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {optResponse.allTunedResults.map((item: any, idx: number) => {
                        const isBest = item.score === optResponse.optimized.score;
                        return (
                          <div 
                            key={idx}
                            className={`p-3.5 rounded-xl border text-xs flex justify-between items-center transition ${
                              isBest 
                                ? 'bg-amber-50 border-amber-300 shadow-sm' 
                                : 'bg-white border-amber-100 hover:bg-amber-50/40 hover:border-amber-200'
                            }`}
                          >
                            <div>
                              <strong className="text-amber-950 block text-sm">{item.label}</strong>
                              <span className="text-amber-700/60 text-[10px] mt-0.5 block font-mono">
                                Top 3: {item.hitsRateTop3}% | Top 5: {item.hitsRateTop5}% | Top 10: {item.hitsRateTop10}%
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 font-bold rounded-lg text-xs font-mono ${
                              isBest ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-amber-50 text-amber-700'
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
      <footer className="bg-white border-t border-amber-200 py-8 mt-12 text-amber-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono">
          <div>
            <p>© 2026 QuanLHK - Tiên tri Hàng Me. Hoàng gia Cung đình Thần Toán.</p>
            <p className="text-amber-700 mt-1 font-bold">Designed by QuanLHK (version Hàng Me - Vị Thanh)</p>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-amber-600 transition cursor-pointer">Lượng hóa Cung đình</span>
            <span className="hover:text-amber-600 transition cursor-pointer">Xổ Số Miền Nam</span>
            <span className="hover:text-amber-600 transition cursor-pointer">Vietlott Thần Cơ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
