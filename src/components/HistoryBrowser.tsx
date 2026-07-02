import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { LotteryRecord } from '../types';

export default function HistoryBrowser({ lotteryType }: { lotteryType: 'xsmn' | 'power_655' | 'mega_645' }) {
  const [records, setRecords] = useState<LotteryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters - default based on lotteryType
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-07-01');
  const [searchNumber, setSearchNumber] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        startDate,
        endDate,
        searchNumber: searchNumber.trim(),
        lotteryType
      });
      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tải lịch sử xổ số');
      const data = await res.json();
      setRecords(data.records);
      setTotalPages(data.pagination.totalPages);
      setTotalRecords(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, searchNumber, lotteryType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const resetFilters = () => {
    setStartDate('2026-01-01');
    setEndDate('2026-07-01');
    setSearchNumber('');
    setPage(1);
  };

  const getLotteryLabel = () => {
    if (lotteryType === 'power_655') return 'Vietlott Power 6/55';
    if (lotteryType === 'mega_645') return 'Vietlott Mega 6/45';
    return 'Xổ Số Miền Nam (Minh Ngọc)';
  };

  return (
    <div className="bg-[#1c0308]/90 rounded-2xl border border-amber-500/20 shadow-[0_0_20px_rgba(212,175,55,0.05)] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-300 font-serif uppercase tracking-wider flex items-center gap-2">
            <span>⛩️ KHO DỮ LIỆU</span>
            <span className="text-sm px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-mono font-bold">
              {getLotteryLabel()}
            </span>
          </h2>
          <p className="text-xs text-amber-200/60 mt-1">Tra cứu, đối chiếu và thống kê kết quả quay thưởng lịch sử cung đình chính xác.</p>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 px-3.5 py-1.5 border border-amber-500/20 hover:bg-[#24030a] text-amber-300 hover:text-amber-100 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Đặt lại bộ lọc
        </button>
      </div>

      {/* Filter panel */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#110105] p-4 rounded-xl border border-amber-500/10">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-amber-500 block uppercase font-mono">Từ ngày</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-amber-500" />
            <input
              type="date"
              className="w-full pl-9 pr-3 py-1.5 bg-[#1c0308] border border-amber-500/20 rounded-lg text-xs text-amber-100 focus:outline-none focus:border-amber-400 font-mono"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-amber-500 block uppercase font-mono">Đến ngày</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-amber-500" />
            <input
              type="date"
              className="w-full pl-9 pr-3 py-1.5 bg-[#1c0308] border border-amber-500/20 rounded-lg text-xs text-amber-100 focus:outline-none focus:border-amber-400 font-mono"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-amber-500 block uppercase font-mono">
            {lotteryType === 'xsmn' ? 'Tìm số loto (00-99)' : 'Tìm quả cầu (01-55)'}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-500" />
            <input
              type="text"
              maxLength={2}
              placeholder="Ví dụ: 09"
              className="w-full pl-9 pr-3 py-1.5 bg-[#1c0308] border border-amber-500/20 rounded-lg text-xs text-amber-100 focus:outline-none focus:border-amber-400 font-mono"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-lg text-xs font-mono uppercase tracking-wider border border-yellow-400 shadow-md transition cursor-pointer"
          >
            Tìm kiếm kết quả
          </button>
        </div>
      </form>

      {/* Results table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#110105]/40 rounded-xl border border-amber-500/10">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
          <p className="text-sm text-amber-200 font-semibold font-mono uppercase tracking-wider">Đang truy vấn kho thần số...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[#110105]/40 rounded-xl border border-amber-500/10">
          <p className="text-amber-500/80 text-sm font-bold uppercase tracking-wider font-mono">Không tìm thấy kết quả nào trùng khớp.</p>
          <p className="text-amber-500/50 text-xs mt-1">Hãy thử nới rộng khoảng thời gian hoặc đổi con số cần tra cứu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wider font-mono bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl">
            Thống kê: Tìm thấy {totalRecords} phiên quay thưởng trong lịch sử được ghi nhận
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-500/20 text-amber-400 text-xs font-bold uppercase bg-[#110105]/60 font-mono tracking-wider">
                  <th className="py-3 px-4">Ngày quay thưởng</th>
                  <th className="py-3 px-4 text-rose-400">Đặc Biệt / Đỉnh Đề</th>
                  <th className="py-3 px-4 text-emerald-400">{lotteryType === 'xsmn' ? 'Giải Tám' : 'Bóng phụ'}</th>
                  <th className="py-3 px-4">Danh sách các số trúng thưởng ngày hôm đó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10 bg-[#110105]/20">
                {records.map((r) => {
                  const d = new Date(r.date);
                  const formattedDate = d.toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });

                  return (
                    <tr key={r.date} className="hover:bg-[#1c0308]/50 transition text-xs border-b border-amber-500/5">
                      <td className="py-4 px-4 font-semibold text-amber-200 flex items-center gap-2 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {formattedDate}
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-rose-400 text-base">
                        {String(r.special).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-sm">
                        {String(r.prize8).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {r.prizes.map((p, idx) => {
                            const valStr = String(p).padStart(2, '0');
                            const isSpecial = idx === 0;
                            const isPrize8 = lotteryType === 'xsmn' ? (idx === 17) : (idx === 1);
                            const isSearchMatch = searchNumber && valStr === searchNumber;

                            return (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                  isSpecial
                                    ? 'bg-rose-500/25 text-rose-300 border border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                                    : isPrize8
                                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                      : isSearchMatch
                                        ? 'bg-amber-400 text-black font-black ring-2 ring-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                        : 'bg-[#1c0308] text-amber-200/80 border border-amber-500/10'
                                }`}
                              >
                                {valStr}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-amber-500/10 pt-4 font-mono text-[11px]">
              <span className="text-amber-500/60">
                Trang {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-amber-500/20 hover:bg-[#24030a] disabled:bg-[#110105] disabled:text-amber-900 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer text-amber-400 hover:text-amber-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-amber-500/20 hover:bg-[#24030a] disabled:bg-[#110105] disabled:text-amber-900 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer text-amber-400 hover:text-amber-100"
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
