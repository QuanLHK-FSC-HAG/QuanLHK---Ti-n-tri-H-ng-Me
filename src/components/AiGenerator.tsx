import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, HelpCircle, Loader2 } from 'lucide-react';
import { GeminiResponse } from '../types';

interface AiGeneratorProps {
  onApplyParameters: (params: Record<string, any>, name: string) => void;
}

export default function AiGenerator({ onApplyParameters }: AiGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeminiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setApplied(false);

    try {
      const res = await fetch('/api/gemini-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đã xảy ra lỗi khi gọi Gemini API');
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể kết nối với máy chủ AI');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyParameters(result.suggestedParameters, result.customHypothesisName);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const suggestPrompt = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-amber-300 font-serif uppercase tracking-wider">Trợ Lý AI Sinh Thuật Toán</h2>
          <p className="text-xs md:text-sm text-amber-200/60 mt-1">Mô tả ý tưởng dự đoán của bạn, Gemini AI sẽ chuyển đổi thành bộ tham số tối ưu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="prompt-input" className="text-xs font-bold text-amber-400 uppercase tracking-wide font-mono">Ý tưởng / Giả thuyết của bạn</label>
              <textarea
                id="prompt-input"
                rows={5}
                className="w-full px-4 py-3 bg-[#110105] border border-amber-500/20 rounded-xl text-amber-100 placeholder-amber-900 focus:outline-none focus:border-amber-400 text-sm resize-none font-sans"
                placeholder="Ví dụ: Tôi muốn ưu tiên cực mạnh các số chưa về trên 15 ngày (lô khan) và phạt nặng các số vừa ra hôm trước..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 disabled:from-amber-950/20 disabled:to-amber-900/10 disabled:text-amber-950/50 text-black font-black rounded-xl transition shadow-[0_4px_15px_rgba(212,175,55,0.1)] text-xs uppercase tracking-wider font-mono border border-yellow-400 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  Đang phân tích giả thuyết...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Phân tích bằng Gemini AI
                </>
              )}
            </button>
          </form>

          {/* Prompt Suggestions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-amber-500 tracking-wider uppercase font-mono">Gợi ý giả thuyết mẫu</h4>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => suggestPrompt("Ưu tiên cực mạnh các con số có tần suất xuất hiện cao trong 45 ngày qua và tăng nhẹ điểm cho các số vắng lâu từ 10 ngày trở lên.")}
                className="w-full text-left p-2.5 bg-[#110105] hover:bg-amber-500/5 rounded-lg text-xs text-amber-200/70 hover:text-amber-100 border border-amber-500/10 transition truncate block cursor-pointer font-mono"
              >
                💡 Tần suất xuất hiện cao & Ưu tiên lô khan nhẹ
              </button>
              <button
                type="button"
                onClick={() => suggestPrompt("Phạt cực nặng các con số đã rơi liên tiếp nhiều ngày qua để tránh lặp lại, đồng thời ưu tiên các con số láng giềng xung quanh số đặc biệt của hôm trước.")}
                className="w-full text-left p-2.5 bg-[#110105] hover:bg-amber-500/5 rounded-lg text-xs text-amber-200/70 hover:text-amber-100 border border-amber-500/10 transition truncate block cursor-pointer font-mono"
              >
                💡 Tránh số rơi liên tục & Ưu tiên số láng giềng giải ĐB
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Results display */}
        <div className="lg:col-span-7 flex flex-col justify-start">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-amber-500/20 rounded-xl bg-[#110105] h-full">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-amber-200">Gemini đang nghiên cứu số liệu...</p>
              <p className="text-xs text-amber-500 mt-1 max-w-xs text-center font-mono uppercase tracking-wide">Trợ lý AI đang chuyển đổi giả thuyết toán học thành các chỉ số trọng số thuật toán.</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-amber-500/20 rounded-xl bg-[#110105] h-full text-center p-6">
              <HelpCircle className="w-12 h-12 text-amber-500/30 mb-3" />
              <p className="text-sm font-bold text-amber-500/70 uppercase tracking-wide">Chưa có kết quả phân tích</p>
              <p className="text-xs text-amber-500/40 mt-1 max-w-xs">Nhập giả thuyết hoặc bấm vào gợi ý mẫu bên trái và bấm nút phân tích.</p>
            </div>
          )}

          {error && (
            <div className="p-5 border border-red-500/25 bg-red-500/5 text-red-300 rounded-xl text-sm h-full flex flex-col justify-center">
              <p className="font-bold text-red-400 uppercase tracking-wide mb-1">Cần cấu hình API Key</p>
              <p className="text-xs text-red-300/80 leading-relaxed font-mono">
                {error.includes("GEMINI_API_KEY") 
                  ? "GEMINI_API_KEY chưa được đặt. Hãy mở menu Settings > Secrets trong giao diện AI Studio và điền API key để kích hoạt tính năng thông minh này." 
                  : error}
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-5 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-bold rounded-full text-[10px] font-mono tracking-wide uppercase border border-amber-500/30">
                    Thuật toán AI tự động
                  </span>
                  <span className="text-xs font-mono text-amber-500">Model: Gemini 2.5 Flash</span>
                </div>

                <h3 className="text-base font-black text-amber-300 font-serif uppercase tracking-wider">{result.customHypothesisName}</h3>
                <p className="text-xs md:text-sm text-amber-100 leading-relaxed bg-[#110105] p-3 rounded-xl border border-amber-500/10">
                  {result.explanation}
                </p>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-400 tracking-wider uppercase font-mono">Bộ tham số đề xuất</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-[#110105] p-3 rounded-xl border border-amber-500/10">
                    <div className="text-xs">
                      <span className="text-amber-500/60 block font-mono">Kỳ ngắn hạn:</span>
                      <strong className="text-amber-200 font-mono">{result.suggestedParameters.short_term_days} ngày</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-amber-500/60 block font-mono">Điểm nền ngắn:</span>
                      <strong className="text-amber-200 font-mono">+{result.suggestedParameters.base_point_short}</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-amber-500/60 block font-mono">Thưởng láng giềng:</span>
                      <strong className="text-amber-200 font-mono">+{result.suggestedParameters.neighbor_bonus}</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-amber-500/60 block font-mono">Thưởng lô khan dài:</span>
                      <strong className="text-amber-200 font-mono">+{result.suggestedParameters.bonus_long_absence}</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-amber-500/60 block font-mono">Phạt số rơi hôm qua:</span>
                      <strong className="text-amber-200 font-mono">{result.suggestedParameters.deduction_if_appeared_last_day}</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-amber-500/60 block font-mono">Nhân tử Đặc Biệt:</span>
                      <strong className="text-amber-200 font-mono">{result.suggestedParameters.special_multiplier}x</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApply}
                disabled={applied}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3 ${
                  applied ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black border border-yellow-400 font-black'
                } font-bold rounded-xl transition shadow-md text-xs uppercase tracking-wider font-mono mt-4 cursor-pointer`}
              >
                {applied ? (
                  <>
                    <Check className="w-4 h-4 animate-bounce" />
                    Đã nạp cấu hình thuật toán AI!
                  </>
                ) : (
                  <>
                    Áp dụng thuật toán AI này
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
