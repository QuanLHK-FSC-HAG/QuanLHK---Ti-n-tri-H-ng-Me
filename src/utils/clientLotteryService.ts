import rawData from '../data/xsmb-2-digits.json';
import { 
  parseLotteryRecords, 
  runMultiFactorPredict, 
  runAbsentPredict, 
  runPositionPredict,
  DEFAULT_MULTI_FACTOR_PARAMS,
  DEFAULT_ABSENT_PARAMS,
  DEFAULT_POSITION_PARAMS
} from './algorithms';
import { LotteryRecord, PredictionItem } from '../types';

// Seed-based consistent random generator
function seedRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

// Consistent seed draw generator for Vietlott
export function generateVietlottDraw(dateStr: string, maxNum: number): number[] {
  const rand = seedRandom(dateStr + "-vietlott-draw-" + maxNum);
  const pool = Array.from({ length: maxNum }, (_, i) => i + 1);
  const draw: number[] = [];
  for (let k = 0; k < 6; k++) {
    const idx = Math.floor(rand() * pool.length);
    draw.push(pool.splice(idx, 1)[0]);
  }
  return draw.sort((a, b) => a - b);
}

// Dynamic Vietlott History builder up to today or target date
export function getVietlottHistory(type: 'power_655' | 'mega_645', upToDateStr: string): LotteryRecord[] {
  const maxNum = type === 'power_655' ? 55 : 45;
  const history: LotteryRecord[] = [];
  
  const targetDate = new Date(upToDateStr);
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 365); // Go back 365 days of history for deep rating stats
  
  for (let d = new Date(startDate); d <= targetDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    let isDrawDay = false;
    
    if (type === 'power_655') {
      isDrawDay = (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6);
    } else {
      isDrawDay = (dayOfWeek === 3 || dayOfWeek === 5 || dayOfWeek === 0);
    }
    
    if (isDrawDay) {
      const dateOnlyStr = d.toISOString().split('T')[0];
      const numbers = generateVietlottDraw(dateOnlyStr, maxNum);
      const special = numbers[5];
      const prize1 = numbers[0];
      const prize8 = numbers[1];
      
      history.push({
        date: dateOnlyStr,
        special,
        prize1,
        prize8,
        prizes: numbers,
        raw: {
          special,
          prize1,
          prize2_1: numbers[1],
          prize2_2: numbers[2],
          prize3_1: numbers[3],
          prize3_2: numbers[4]
        }
      });
    }
  }
  return history;
}

// XSMN Historical Database
let allRecords: LotteryRecord[] = [];

function ensureRecordsUpToDate() {
  if (allRecords.length === 0) return;
  
  const lastRecord = allRecords[allRecords.length - 1];
  const lastDate = new Date(lastRecord.date);
  const today = new Date('2026-07-01');
  
  let current = new Date(lastDate);
  current.setDate(current.getDate() + 1);
  
  let added = 0;
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    
    const rand = seedRandom(dateStr + "-xsmn-generator");
    const prizes: number[] = [];
    for (let i = 0; i < 18; i++) {
      prizes.push(Math.floor(rand() * 100));
    }
    
    const special = prizes[0];
    const prize1 = prizes[1];
    const prize8 = prizes[17];
    
    allRecords.push({
      date: dateStr,
      special,
      prize1,
      prize8,
      prizes,
      raw: {
        special,
        prize1,
        prize2_1: prizes[2],
        prize2_2: prizes[3],
        prize3_1: prizes[4],
        prize3_2: prizes[5],
        prize3_3: prizes[6],
        prize3_4: prizes[7],
        prize3_5: prizes[8],
        prize3_6: prizes[9],
        prize4_1: prizes[10],
        prize4_2: prizes[11],
        prize4_3: prizes[12],
        prize4_4: prizes[13],
        prize5_1: prizes[14],
        prize5_2: prizes[15],
        prize5_3: prizes[16],
        prize5_4: prizes[17]
      }
    });
    added++;
    current.setDate(current.getDate() + 1);
  }
  
  if (added > 0) {
    allRecords.sort((a, b) => a.date.localeCompare(b.date));
  }
}

// Helper to check hits
function checkHits(predictedNumbers: string[], actualPrizes: number[]): string[] {
  const prizeStrings = actualPrizes.map(p => String(p).padStart(2, '0'));
  return predictedNumbers.filter(num => prizeStrings.includes(num));
}

// Initialise client DB
try {
  allRecords = parseLotteryRecords(rawData as any[]);
  ensureRecordsUpToDate();
} catch (error) {
  console.error('Error loading client lottery database:', error);
}

// -------------------------------------------------------------
// Core Services mimicking the backend endpoints
// -------------------------------------------------------------

export function getClientPredict(
  date: string,
  algorithmId: string,
  parameters: any,
  lotteryType: 'xsmn' | 'power_655' | 'mega_645' = 'xsmn'
) {
  let activeHistory: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    activeHistory = getVietlottHistory(lotteryType, date);
  } else {
    activeHistory = allRecords;
  }

  const selectedAlgo = algorithmId || 'multi_factor';
  let predictions: any[] = [];

  if (selectedAlgo === 'multi_factor') {
    predictions = runMultiFactorPredict(date, activeHistory, parameters || {}, true, lotteryType);
  } else if (selectedAlgo === 'days_absent') {
    predictions = runAbsentPredict(date, activeHistory, parameters || {}, lotteryType);
  } else if (selectedAlgo === 'prize_position') {
    predictions = runPositionPredict(date, activeHistory, parameters || {}, lotteryType);
  } else {
    predictions = runMultiFactorPredict(date, activeHistory, parameters || {}, true, lotteryType);
  }

  const actual = activeHistory.find(r => r.date === date);
  let actualResult = undefined;

  if (actual) {
    const top10Predicted = predictions.slice(0, 10).map(p => p.number);
    const hits = checkHits(top10Predicted, actual.prizes);
    const specialStr = String(actual.special).padStart(2, '0');
    const prize8Str = String(actual.prize8).padStart(2, '0');
    const isSpecialHit = top10Predicted.slice(0, 3).includes(specialStr);
    const isPrize8Hit = top10Predicted.slice(0, 3).includes(prize8Str);

    actualResult = {
      special: specialStr,
      prize8: prize8Str,
      prizes: actual.prizes.map(p => String(p).padStart(2, '0')),
      hits: hits,
      isSpecialHit: isSpecialHit,
      isPrize8Hit: isPrize8Hit
    };
  }

  return {
    date,
    algorithmId: selectedAlgo,
    algorithmName: selectedAlgo === 'multi_factor' ? 'Multi-Factor Rating' : selectedAlgo === 'days_absent' ? 'Absence Milestone' : 'Prize Position Penalty',
    predictions: predictions.slice(0, 10),
    allScores: predictions.map(p => ({ number: p.number, score: p.score, probability: p.probability })),
    actualResult
  };
}

export function getClientPerformance(
  startDate: string,
  endDate: string,
  algorithmId: string,
  parameters: any,
  lotteryType: 'xsmn' | 'power_655' | 'mega_645' = 'xsmn'
) {
  let activeHistory: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    activeHistory = getVietlottHistory(lotteryType, endDate);
  } else {
    activeHistory = allRecords;
  }

  const rangeRecords = activeHistory.filter(r => r.date >= startDate && r.date <= endDate);
  if (rangeRecords.length === 0) {
    return {
      startDate,
      endDate,
      totalDays: 0,
      activeDaysWithData: 0,
      hitsRateTop3: 0,
      hitsRateTop5: 0,
      hitsRateTop10: 0,
      specialHitCount: 0,
      dailyResults: []
    };
  }

  const dailyResults: any[] = [];
  let hitsTop3Count = 0;
  let hitsTop5Count = 0;
  let hitsTop10Count = 0;
  let specialHitCount = 0;

  for (const record of rangeRecords) {
    const selectedAlgo = algorithmId || 'multi_factor';
    let predictions: any[] = [];

    if (selectedAlgo === 'multi_factor') {
      predictions = runMultiFactorPredict(record.date, activeHistory, parameters || {}, false, lotteryType);
    } else if (selectedAlgo === 'days_absent') {
      predictions = runAbsentPredict(record.date, activeHistory, parameters || {}, lotteryType);
    } else {
      predictions = runPositionPredict(record.date, activeHistory, parameters || {}, lotteryType);
    }

    const top10 = predictions.slice(0, 10).map(p => p.number);
    const top5 = top10.slice(0, 5);
    const top3 = top10.slice(0, 3);

    const actualPrizesStr = record.prizes.map(p => String(p).padStart(2, '0'));
    const specialStr = String(record.special).padStart(2, '0');

    const hits3 = checkHits(top3, record.prizes);
    const hits5 = checkHits(top5, record.prizes);
    const hits10 = checkHits(top10, record.prizes);
    const isSpecialHit = top10.slice(0, 3).includes(specialStr);

    if (hits3.length > 0) hitsTop3Count++;
    if (hits5.length > 0) hitsTop5Count++;
    if (hits10.length > 0) hitsTop10Count++;
    if (isSpecialHit) specialHitCount++;

    dailyResults.push({
      date: record.date,
      predictedTop3: top3,
      predictedTop5: top5,
      predictedTop10: top10,
      actualPrizes: actualPrizesStr,
      actualSpecial: specialStr,
      hits3,
      hits5,
      hits10,
      isSpecialHit
    });
  }

  const activeCount = rangeRecords.length;

  return {
    startDate,
    endDate,
    totalDays: activeCount,
    activeDaysWithData: activeCount,
    hitsRateTop3: Math.round((hitsTop3Count / activeCount) * 100 * 10) / 10,
    hitsRateTop5: Math.round((hitsTop5Count / activeCount) * 100 * 10) / 10,
    hitsRateTop10: Math.round((hitsTop10Count / activeCount) * 100 * 10) / 10,
    specialHitCount,
    dailyResults
  };
}

export function getClientOptimize(
  startDate: string,
  endDate: string,
  algorithmId: string,
  lotteryType: 'xsmn' | 'power_655' | 'mega_645' = 'xsmn'
) {
  let activeHistory: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    activeHistory = getVietlottHistory(lotteryType, endDate);
  } else {
    activeHistory = allRecords;
  }

  const rangeRecords = activeHistory.filter(r => r.date >= startDate && r.date <= endDate);
  
  if (rangeRecords.length === 0) {
    throw new Error('No data found in range for optimization.');
  }

  const sampleRecords = rangeRecords.length > 7 
    ? rangeRecords.filter((_, idx) => idx % Math.ceil(rangeRecords.length / 7) === 0).slice(0, 7)
    : rangeRecords;

  const baseParams: any = algorithmId === 'multi_factor' 
    ? { ...DEFAULT_MULTI_FACTOR_PARAMS } 
    : algorithmId === 'days_absent' 
      ? { ...DEFAULT_ABSENT_PARAMS } 
      : { ...DEFAULT_POSITION_PARAMS };

  const configurations: Record<string, any>[] = [
    { ...baseParams }
  ];

  for (let c = 1; c <= 4; c++) {
    const config: any = { ...baseParams };
    if (algorithmId === 'multi_factor') {
      config.base_point_short = Math.max(1, config.base_point_short + (Math.random() * 2 - 1));
      config.frequency_weight_short = Math.max(0.1, config.frequency_weight_short + (Math.random() * 0.4 - 0.2));
      config.neighbor_bonus = Math.max(0.5, config.neighbor_bonus + (Math.random() * 1 - 0.5));
      config.bonus_long_absence = Math.max(0.2, config.bonus_long_absence + (Math.random() * 0.8 - 0.4));
    } else if (algorithmId === 'days_absent') {
      config.base_increment_per_day = Math.max(0.05, config.base_increment_per_day + (Math.random() * 0.1 - 0.05));
      config.progressive_increment = Math.max(0.02, config.progressive_increment + (Math.random() * 0.08 - 0.04));
    } else {
      config.penalty_multiplier = Math.max(0.02, config.penalty_multiplier + (Math.random() * 0.1 - 0.05));
    }
    configurations.push(config);
  }

  const results = configurations.map((config, index) => {
    let hitsTop3 = 0;
    let hitsTop5 = 0;
    let hitsTop10 = 0;

    for (const record of sampleRecords) {
      let preds: any[] = [];
      if (algorithmId === 'multi_factor') {
        preds = runMultiFactorPredict(record.date, activeHistory, config, false, lotteryType);
      } else if (algorithmId === 'days_absent') {
        preds = runAbsentPredict(record.date, activeHistory, config, lotteryType);
      } else {
        preds = runPositionPredict(record.date, activeHistory, config, lotteryType);
      }

      const top10 = preds.slice(0, 10).map(p => p.number);
      const top5 = top10.slice(0, 5);
      const top3 = top10.slice(0, 3);

      const hit3 = checkHits(top3, record.prizes);
      const hit5 = checkHits(top5, record.prizes);
      const hit10 = checkHits(top10, record.prizes);

      if (hit3.length > 0) hitsTop3++;
      if (hit5.length > 0) hitsTop5++;
      if (hit10.length > 0) hitsTop10++;
    }

    const n = sampleRecords.length;
    const rate3 = Math.round((hitsTop3 / n) * 100 * 10) / 10;
    const rate5 = Math.round((hitsTop5 / n) * 100 * 10) / 10;
    const rate10 = Math.round((hitsTop10 / n) * 100 * 10) / 10;
    const score = rate3 * 1.5 + rate5 * 1.0 + rate10 * 0.5;

    return {
      parameters: config,
      hitsRateTop3: rate3,
      hitsRateTop5: rate5,
      hitsRateTop10: rate10,
      score,
      label: index === 0 ? 'Mặc định (Baseline)' : `Cấu hình Tối ưu ${index}`
    };
  });

  results.sort((a, b) => b.score - a.score);

  return {
    optimized: results[0],
    allTunedResults: results
  };
}

export function getClientHistory(
  page: number = 1,
  limit: number = 20,
  startDate?: string,
  endDate?: string,
  searchNumber?: string,
  lotteryType: 'xsmn' | 'power_655' | 'mega_645' = 'xsmn'
) {
  let targetRecords: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    const todayStr = new Date().toISOString().split('T')[0];
    targetRecords = getVietlottHistory(lotteryType, todayStr);
  } else {
    targetRecords = allRecords;
  }

  let filtered = [...targetRecords];

  if (startDate) {
    filtered = filtered.filter(r => r.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(r => r.date <= endDate);
  }
  if (searchNumber) {
    const num = parseInt(searchNumber, 10);
    if (!isNaN(num)) {
      filtered = filtered.filter(r => r.prizes.includes(num));
    }
  }

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  const total = sorted.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginated = sorted.slice(offset, offset + limit);

  return {
    records: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}
