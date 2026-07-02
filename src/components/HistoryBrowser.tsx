import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { LotteryRecord } from '../types';
import { getClientHistory } from '../utils/clientLotteryService';

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
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        throw new Error('Backend API not available or did not return JSON');
      }
      const data = await res.json();
      setRecords(data.records);
      setTotalPages(data.pagination.totalPages);
      setTotalRecords(data.pagination.total);
    } catch (err) {
      console.warn('Backend history API failed, running history search client-side:', err);
      try {
        const clientData = getClientHistory(
          page,
          15,
          startDate,
          endDate,
          searchNumber.trim(),
          lotteryType
        );
        setRecords(clientData.records);
        setTotalPages(clientData.pagination.totalPages);
        setTotalRecords(clientData.pagination.total);
      } catch (clientErr) {
        console.error('Client-side history also failed:', clientErr);
      }
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
    <div className="bg-white rounded-2xl border border-amber-200/70 shadow-[0_4px_25px_rgba(212,175,55,0.06)] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-amber-900 font-serif uppercase tracking-wider flex items-center gap-2">
            <span>⛩️ KHO DỮ LIỆU</span>
            <span className="text-sm px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-300 font-mono font-bold">
              {getLotteryLabel()}
            </span>
          </h2>
          <p className="text-xs text-amber-900/60 mt-1">Tra cứu, đối chiếu và thống kê kết quả quay thưởng lịch sử cung đình chính xác.</p>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 px-3.5 py-1.5 border border-amber-300 hover:bg-amber-50 text-amber-800 hover:text-amber-900 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer bg-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Đặt lại bộ lọc
        </button>
      </div>

      {/* Filter panel */}
      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#fdfbf7] p-4 rounded-xl border border-amber-200/60 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-amber-800 block uppercase font-mono">Từ ngày</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-amber-600" />
            <input
              type="date"
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-amber-950 focus:outline-none focus:border-amber-500 font-mono"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-amber-800 block uppercase font-mono">Đến ngày</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-amber-600" />
            <input
              type="date"
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-amber-950 focus:outline-none focus:border-amber-500 font-mono"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-amber-800 block uppercase font-mono">
            {lotteryType === 'xsmn' ? 'Tìm số loto (00-99)' : 'Tìm quả cầu (01-55)'}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-amber-600" />
            <input
              type="text"
              maxLength={2}
              placeholder="Ví dụ: 09"
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-amber-950 focus:outline-none focus:border-amber-500 font-mono"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black rounded-lg text-xs font-mono uppercase tracking-wider border border-amber-500 shadow-md transition cursor-pointer"
          >
            Tìm kiếm kết quả
          </button>
        </div>
      </form>

      {/* Results table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-amber-50/10 rounded-xl border border-amber-200/50">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
          <p className="text-sm text-amber-800 font-semibold font-mono uppercase tracking-wider">Đang truy vấn kho thần số...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-amber-50/10 rounded-xl border border-amber-200/50">
          <p className="text-amber-800 text-sm font-bold uppercase tracking-wider font-mono">Không tìm thấy kết quả nào trùng khớp.</p>
          <p className="text-amber-700/60 text-xs mt-1">Hãy thử nới rộng khoảng thời gian hoặc đổi con số cần tra cứu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-amber-800 font-bold uppercase tracking-wider font-mono bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
            Thống kê: Tìm thấy {totalRecords} phiên quay thưởng trong lịch sử được ghi nhận
          </div>

          <div className="overflow-x-auto rounded-xl border border-amber-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-200 text-amber-800 text-xs font-bold uppercase bg-[#fdfbf7] font-mono tracking-wider">
                  <th className="py-3 px-4">Ngày quay thưởng</th>
                  <th className="py-3 px-4 text-rose-700">Đặc Biệt / Đỉnh Đề</th>
                  <th className="py-3 px-4 text-emerald-700">{lotteryType === 'xsmn' ? 'Giải Tám' : 'Bóng phụ'}</th>
                  <th className="py-3 px-4">Danh sách các số trúng thưởng ngày hôm đó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 bg-white">
                {records.map((r) => {
                  const d = new Date(r.date);
                  const formattedDate = d.toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });

                  return (
                    <tr key={r.date} className="hover:bg-amber-50/30 transition text-xs border-b border-amber-50/5">
                      <td className="py-4 px-4 font-semibold text-amber-950 flex items-center gap-2 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        {formattedDate}
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-rose-600 text-base">
                        {String(r.special).padStart(2, '0')}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-600 text-sm">
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
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                                    : isPrize8
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                                      : isSearchMatch
                                        ? 'bg-amber-400 text-black font-black ring-2 ring-amber-400 shadow-md'
                                        : 'bg-amber-50/50 text-amber-900 border border-amber-100'
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
            <div className="flex items-center justify-between border-t border-amber-200 pt-4 font-mono text-[11px]">
              <span className="text-amber-800/60">
                Trang {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-amber-200 bg-white hover:bg-amber-50 disabled:bg-amber-50/30 disabled:text-amber-300 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer text-amber-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-amber-200 bg-white hover:bg-amber-50 disabled:bg-amber-50/30 disabled:text-amber-300 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer text-amber-800"
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
