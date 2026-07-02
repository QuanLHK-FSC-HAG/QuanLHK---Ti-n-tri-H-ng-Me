import { LotteryRecord, PredictionItem, ScoreBreakdown } from '../types';

/**
 * Maps XSMB 27 prizes structure into a realistic XSMN 18 prizes structure.
 */
export function extractXsmnNumbersFromRecord(raw: Record<string, any>): {
  special: number;
  prize1: number;
  prize2: number;
  prize3: number[];
  prize4: number[];
  prize5: number;
  prize6: number[];
  prize7: number;
  prize8: number;
  allPrizes: number[];
} {
  const get2D = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const valStr = String(val).trim();
    if (valStr.length >= 2) {
      const num = parseInt(valStr.slice(-2), 10);
      return isNaN(num) ? 0 : num;
    } else {
      const num = parseInt(valStr, 10);
      return isNaN(num) ? 0 : num;
    }
  };

  // 1. Special (1 prize) -> raw.special
  const special = get2D(raw.special);

  // 2. Prize 1 (1 prize) -> raw.prize1
  const prize1 = get2D(raw.prize1);

  // 3. Prize 2 (1 prize) -> raw.prize2_1
  const prize2 = get2D(raw.prize2_1);

  // 4. Prize 3 (2 prizes) -> raw.prize2_2, raw.prize3_1
  const prize3 = [
    get2D(raw.prize2_2),
    get2D(raw.prize3_1)
  ];

  // 5. Prize 4 (7 prizes) -> raw.prize3_2, raw.prize3_3, raw.prize3_4, raw.prize3_5, raw.prize3_6, raw.prize4_1, raw.prize4_2
  const prize4 = [
    get2D(raw.prize3_2),
    get2D(raw.prize3_3),
    get2D(raw.prize3_4),
    get2D(raw.prize3_5),
    get2D(raw.prize3_6),
    get2D(raw.prize4_1),
    get2D(raw.prize4_2)
  ];

  // 6. Prize 5 (1 prize) -> raw.prize4_3
  const prize5 = get2D(raw.prize4_3);

  // 7. Prize 6 (3 prizes) -> raw.prize4_4, raw.prize5_1, raw.prize5_2
  const prize6 = [
    get2D(raw.prize4_4),
    get2D(raw.prize5_1),
    get2D(raw.prize5_2)
  ];

  // 8. Prize 7 (1 prize) -> raw.prize5_3
  const prize7 = get2D(raw.prize5_3);

  // 9. Prize 8 (1 prize) -> raw.prize5_4
  const prize8 = get2D(raw.prize5_4);

  // Combine all into the 18 prizes list in standard order of XSMN (Giải Đặc Biệt, Giải Nhất, Giải Nhì, Giải Ba, Giải Tư, Giải Năm, Giải Sáu, Giải Bảy, Giải Tám)
  const allPrizes = [
    special,
    prize1,
    prize2,
    ...prize3,
    ...prize4,
    prize5,
    ...prize6,
    prize7,
    prize8
  ];

  return {
    special,
    prize1,
    prize2,
    prize3,
    prize4,
    prize5,
    prize6,
    prize7,
    prize8,
    allPrizes
  };
}

/**
 * Parses and maps raw JSON records into our optimized LotteryRecord format for XSMN.
 */
export function parseLotteryRecords(rawData: any[]): LotteryRecord[] {
  return rawData.map((item) => {
    // Standardize date to YYYY-MM-DD
    const isoDate = item.date || '';
    const dateOnly = isoDate.split('T')[0]; // "2005-10-01"
    
    const mapped = extractXsmnNumbersFromRecord(item);

    return {
      date: dateOnly,
      special: mapped.special,
      prize1: mapped.prize1,
      prize8: mapped.prize8,
      prizes: mapped.allPrizes,
      raw: item
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// ==========================================
// ALGORITHM 1: History & Frequency Multi-Factor (Core)
// ==========================================

export const DEFAULT_MULTI_FACTOR_PARAMS = {
  short_term_days: 14,
  frequency_window_short: 45,
  frequency_window_long: 180,
  base_point_short: 3.5,
  base_point_long: 0.3,
  frequency_weight_short: 0.5,
  frequency_weight_long: 0.25,
  neighbor_bonus: 1.2,
  neighbor_range: 5,
  increment: 0.005,
  bonus_after_3_days: 0.07,
  bonus_long_absence: 0.8,
  deduction_if_appeared_last_day: -0.02,
  repeat_penalty_top: -0.5,
  repeat_window: 7,
  repeat_threshold_penalty: -2.0,
  repeat_threshold: 2,
  repeat_streak_penalty: -0.8,
  bonus_freq_5: 0.25,
  cycle_7_bonus: 0.2,
  cycle_30_bonus: 0.3,
  special_multiplier: 2.0,
  special_freq_multiplier: 3.0
};

export function runMultiFactorPredict(
  targetDateStr: string,
  allHistory: LotteryRecord[],
  customParams?: Partial<typeof DEFAULT_MULTI_FACTOR_PARAMS>,
  simulatePreviousTops: boolean = true,
  lotteryType: 'xsmn' | 'power_655' | 'mega_645' = 'xsmn'
): PredictionItem[] {
  const params = { ...DEFAULT_MULTI_FACTOR_PARAMS, ...customParams };
  const targetDate = new Date(targetDateStr);

  const startNum = (lotteryType === 'power_655' || lotteryType === 'mega_645') ? 1 : 0;
  const endNum = lotteryType === 'power_655' ? 55 : (lotteryType === 'mega_645' ? 45 : 99);

  // Filter history strictly before targetDate
  const history = allHistory.filter(r => r.date < targetDateStr);
  if (history.length === 0) {
    return Array.from({ length: (endNum - startNum + 1) }, (_, i) => {
      const num = i + startNum;
      const numStr = String(num).padStart(2, '0');
      return {
        number: numStr,
        score: 100.0,
        breakdown: createEmptyBreakdown(100.0),
        probability: lotteryType === 'power_655' ? 10.9 : (lotteryType === 'mega_645' ? 13.3 : 18.0)
      };
    });
  }

  // Initialize detailed scores
  const scoreDetails: Record<string, ScoreBreakdown> = {};
  for (let i = startNum; i <= endNum; i++) {
    const key = String(i).padStart(2, '0');
    scoreDetails[key] = {
      shortTermScore: 0,
      frequencyScore: 0,
      neighborBonus: 0,
      cycleBonus: 0,
      absenceBonus: 0,
      lastDayDeduction: 0,
      repeatPenalty: 0,
      total: 100.0 // Starting base score is 100.0
    };
  }

  // 1. Short-term Score (within last short_term_days)
  const shortTermCutoff = new Date(targetDate);
  shortTermCutoff.setDate(shortTermCutoff.getDate() - params.short_term_days);
  const shortTermCutoffStr = shortTermCutoff.toISOString().split('T')[0];

  const shortTermHistory = history.filter(r => r.date >= shortTermCutoffStr);
  for (const day of shortTermHistory) {
    const dayDate = new Date(day.date);
    const daysAgo = Math.ceil((targetDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Extracted numbers in that day
    const uniqueNums = Array.from(new Set(day.prizes));
    const specialNum = day.special;

    for (const num of uniqueNums) {
      if (num < startNum || num > endNum) continue;
      const numStr = String(num).padStart(2, '0');
      let point = params.base_point_short * (1 - 0.08 * daysAgo);
      if (num === specialNum) {
        point *= params.special_multiplier;
      }
      scoreDetails[numStr].shortTermScore += point;
    }
  }

  // 2. Frequency (Short & Long Windows)
  const freqShortCutoff = new Date(targetDate);
  freqShortCutoff.setDate(freqShortCutoff.getDate() - params.frequency_window_short);
  const freqShortCutoffStr = freqShortCutoff.toISOString().split('T')[0];

  const freqLongCutoff = new Date(targetDate);
  freqLongCutoff.setDate(freqLongCutoff.getDate() - params.frequency_window_long);
  const freqLongCutoffStr = freqLongCutoff.toISOString().split('T')[0];

  const countShort: Record<number, number> = {};
  const countLong: Record<number, number> = {};
  const specialCountShort: Record<number, number> = {};

  for (let i = startNum; i <= endNum; i++) {
    countShort[i] = 0;
    countLong[i] = 0;
    specialCountShort[i] = 0;
  }

  for (const day of history) {
    const isShort = day.date >= freqShortCutoffStr;
    const isLong = day.date >= freqLongCutoffStr;

    if (isShort) {
      day.prizes.forEach(n => {
        if (n >= startNum && n <= endNum) countShort[n] = (countShort[n] || 0) + 1;
      });
      if (day.special >= startNum && day.special <= endNum) {
        specialCountShort[day.special] = (specialCountShort[day.special] || 0) + 1;
      }
    }
    if (isLong) {
      day.prizes.forEach(n => {
        if (n >= startNum && n <= endNum) countLong[n] = (countLong[n] || 0) + 1;
      });
    }
  }

  for (let i = startNum; i <= endNum; i++) {
    const numStr = String(i).padStart(2, '0');
    let freqScore = (params.frequency_weight_short * countShort[i]) + (params.frequency_weight_long * countLong[i]);
    
    if (countShort[i] > 5) {
      freqScore += params.bonus_freq_5;
    }
    if (specialCountShort[i] > 5) {
      freqScore += params.special_freq_multiplier;
    }
    scoreDetails[numStr].frequencyScore += freqScore;
  }

  // 3. Neighbor Bonus of Last Day Special Number
  const lastDay = history[history.length - 1];
  const lastSpecial = lastDay.special;
  if (lastSpecial >= startNum && lastSpecial <= endNum) {
    const modulo = (endNum - startNum + 1);
    for (let offset = -params.neighbor_range; offset <= params.neighbor_range; offset++) {
      if (offset !== 0) {
        const neighbor = ((lastSpecial - startNum + offset + modulo) % modulo) + startNum;
        const neighborStr = String(neighbor).padStart(2, '0');
        const bonus = params.neighbor_bonus * (1 - 0.1 * Math.abs(offset));
        if (scoreDetails[neighborStr]) {
          scoreDetails[neighborStr].neighborBonus += bonus;
        }
      }
    }
  }

  // 4. Cycle Bonus (Multiples of 7 and 30 days)
  for (const day of history) {
    const dayDate = new Date(day.date);
    const daysAgo = Math.ceil((targetDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAgo % 7 === 0 && daysAgo <= 28) {
      const uniqueNums = Array.from(new Set(day.prizes));
      for (const num of uniqueNums) {
        if (num >= startNum && num <= endNum) {
          scoreDetails[String(num).padStart(2, '0')].cycleBonus += params.cycle_7_bonus;
        }
      }
    }
    if (daysAgo % 30 === 0 && daysAgo <= 180) {
      const uniqueNums = Array.from(new Set(day.prizes));
      for (const num of uniqueNums) {
        if (num >= startNum && num <= endNum) {
          scoreDetails[String(num).padStart(2, '0')].cycleBonus += params.cycle_30_bonus;
        }
      }
    }
  }

  // 5. Long Absence Bonus (Lô Khan)
  for (let i = startNum; i <= endNum; i++) {
    const numStr = String(i).padStart(2, '0');
    let daysSince = 0;
    
    for (let hIndex = history.length - 1; hIndex >= 0; hIndex--) {
      const day = history[hIndex];
      if (day.prizes.includes(i)) {
        break;
      }
      daysSince++;
    }

    let absenceScore = daysSince * params.increment;
    if (daysSince >= 3) {
      absenceScore += params.bonus_after_3_days;
    }
    if (daysSince >= 15 && countLong[i] > 10) {
      absenceScore += params.bonus_long_absence;
    }
    scoreDetails[numStr].absenceBonus += absenceScore;
  }

  // 6. Last Day Deduction
  const lastDayPrizes = lastDay.prizes;
  for (const num of lastDayPrizes) {
    if (num >= startNum && num <= endNum) {
      const numStr = String(num).padStart(2, '0');
      scoreDetails[numStr].lastDayDeduction += params.deduction_if_appeared_last_day;
    }
  }

  // 7. Penalty for Repeats in previous Predicted Top 3
  if (simulatePreviousTops) {
    const previousTops: string[][] = [];
    const windowSize = params.repeat_window;
    for (let offset = windowSize; offset >= 1; offset--) {
      const prevDate = new Date(targetDate);
      prevDate.setDate(prevDate.getDate() - offset);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      
      const prevHistory = history.filter(r => r.date < prevDateStr);
      if (prevHistory.length > 0) {
        const prevPreds = runMultiFactorPredict(prevDateStr, allHistory, params, false, lotteryType);
        const top3 = prevPreds.slice(0, 3).map(p => p.number);
        previousTops.push(top3);
      }
    }

    const repeatCounts: Record<string, number> = {};
    const streakCounts: Record<string, number> = {};

    for (let i = 0; i < previousTops.length; i++) {
      const prevTop = previousTops[i];
      for (const numStr of prevTop) {
        repeatCounts[numStr] = (repeatCounts[numStr] || 0) + 1;
        
        if (i === 0) {
          streakCounts[numStr] = 1;
        } else {
          const inPrevPrev = previousTops[i - 1].includes(numStr);
          if (inPrevPrev) {
            streakCounts[numStr] = (streakCounts[numStr] || 0) + 1;
          } else {
            streakCounts[numStr] = 1;
          }
        }
      }
    }

    for (let i = startNum; i <= endNum; i++) {
      const numStr = String(i).padStart(2, '0');
      const repeatCount = repeatCounts[numStr] || 0;
      const streakCount = streakCounts[numStr] || 0;

      if (repeatCount > 0) {
        let penalty = params.repeat_penalty_top * repeatCount;
        if (repeatCount >= params.repeat_threshold) {
          penalty += params.repeat_threshold_penalty;
        }
        if (streakCount > 1) {
          penalty += params.repeat_streak_penalty * (streakCount - 1);
        }
        scoreDetails[numStr].repeatPenalty += penalty;
      }
    }
  }

  // Calculate final totals and construct items
  const results: PredictionItem[] = [];
  let maxScoreVal = -999999;
  let minScoreVal = 999999;

  for (let i = startNum; i <= endNum; i++) {
    const numStr = String(i).padStart(2, '0');
    const details = scoreDetails[numStr];
    
    const total = 100.0 + 
      details.shortTermScore + 
      details.frequencyScore + 
      details.neighborBonus + 
      details.cycleBonus + 
      details.absenceBonus + 
      details.lastDayDeduction + 
      details.repeatPenalty;

    details.total = Math.round(total * 1000) / 1000;

    details.shortTermScore = Math.round(details.shortTermScore * 1000) / 1000;
    details.frequencyScore = Math.round(details.frequencyScore * 1000) / 1000;
    details.neighborBonus = Math.round(details.neighborBonus * 1000) / 1000;
    details.cycleBonus = Math.round(details.cycleBonus * 1000) / 1000;
    details.absenceBonus = Math.round(details.absenceBonus * 1000) / 1000;
    details.lastDayDeduction = Math.round(details.lastDayDeduction * 1000) / 1000;
    details.repeatPenalty = Math.round(details.repeatPenalty * 1000) / 1000;

    if (details.total > maxScoreVal) maxScoreVal = details.total;
    if (details.total < minScoreVal) minScoreVal = details.total;

    results.push({
      number: numStr,
      score: details.total,
      breakdown: details
    });
  }

  // Normalise probability based on lottery type
  const scoreSpan = maxScoreVal - minScoreVal || 1;
  results.forEach(item => {
    const relScore = (item.score - minScoreVal) / scoreSpan; // 0 to 1
    let prob = 0;
    if (lotteryType === 'power_655') {
      prob = 6.0 + relScore * 11.5; // 6% to 17.5%
    } else if (lotteryType === 'mega_645') {
      prob = 8.0 + relScore * 13.5; // 8% to 21.5%
    } else {
      prob = 11.0 + relScore * 18.0; // 11% to 29.0%
    }
    item.probability = Math.round(prob * 100) / 100;
  });

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}

// ==========================================
// ALGORITHM 2: Absence Milestone (Lô Khan)
// ==========================================

export const DEFAULT_ABSENT_PARAMS = {
  base_increment_per_day: 0.1,
  milestone_bonus: 0.1,
  milestones: [3, 7, 10, 15],
  last_day_multiplier: 0.05,
  progressive_start_day: 15,
  progressive_increment: 0.1
};

export function runAbsentPredict(
  targetDateStr: string,
  allHistory: LotteryRecord[],
  customParams?: Partial<typeof DEFAULT_ABSENT_PARAMS>,
  lotteryType: 'xsmn' | 'power_655' | 'mega_645' = 'xsmn'
): PredictionItem[] {
  const params = { ...DEFAULT_ABSENT_PARAMS, ...customParams };
  const history = allHistory.filter(r => r.date < targetDateStr);
  
  const startNum = (lotteryType === 'power_655' || lotteryType === 'mega_645') ? 1 : 0;
  const endNum = lotteryType === 'power_655' ? 55 : (lotteryType === 'mega_645' ? 45 : 99);

  if (history.length === 0) {
    return Array.from({ length: (endNum - startNum + 1) }, (_, i) => {
      const num = i + startNum;
      const numStr = String(num).padStart(2, '0');
      return {
        number: numStr,
        score: 100.0,
        breakdown: createEmptyBreakdown(100.0),
        probability: lotteryType === 'power_655' ? 10.9 : (lotteryType === 'mega_645' ? 13.3 : 18.0)
      };
    });
  }

  const results: PredictionItem[] = [];

  // Calculate days since last appearance
  const daysSinceAppearance: Record<number, number> = {};
  for (let num = startNum; num <= endNum; num++) {
    let found = false;
    for (let i = 0; i < history.length; i++) {
      const idx = history.length - 1 - i; // newest day is index history.length - 1
      const day = history[idx];
      if (day.prizes.includes(num)) {
        daysSinceAppearance[num] = i; // 0 = appeared yesterday
        found = true;
        break;
      }
    }
    if (!found) {
      daysSinceAppearance[num] = history.length;
    }
  }

  const milestonesSorted = [...params.milestones].sort((a, b) => a - b);

  let maxScoreVal = -999999;
  let minScoreVal = 999999;

  for (let num = startNum; num <= endNum; num++) {
    const numStr = String(num).padStart(2, '0');
    const daysAbsent = daysSinceAppearance[num];

    // 1. Base Score from absent days
    let baseAbsentScore = daysAbsent * params.base_increment_per_day;

    // 2. Milestone bonuses
    let milestoneBonusTotal = 0;
    for (const ms of milestonesSorted) {
      if (daysAbsent >= ms) {
        milestoneBonusTotal += params.milestone_bonus;
      }
    }

    // 3. Progressive bonus
    let progressiveBonus = 0;
    if (daysAbsent >= params.progressive_start_day) {
      const daysPast = daysAbsent - params.progressive_start_day + 1;
      const seriesSum = ((daysPast - 1) * daysPast) / 2;
      progressiveBonus = seriesSum * params.progressive_increment;
    }

    // Combine as Absence Bonus, while base is 100
    const finalAbsenceScore = baseAbsentScore + milestoneBonusTotal + progressiveBonus;
    const finalScore = 100.0 + finalAbsenceScore;

    if (finalScore > maxScoreVal) maxScoreVal = finalScore;
    if (finalScore < minScoreVal) minScoreVal = finalScore;
    
    results.push({
      number: numStr,
      score: Math.round(finalScore * 1000) / 1000,
      breakdown: {
        shortTermScore: 0,
        frequencyScore: 0,
        neighborBonus: 0,
        cycleBonus: 0,
        absenceBonus: Math.round(finalAbsenceScore * 1000) / 1000,
        lastDayDeduction: 0,
        repeatPenalty: 0,
        total: Math.round(finalScore * 1000) / 1000
      }
    });
  }

  // Normalise probability based on lottery type
  const scoreSpan = maxScoreVal - minScoreVal || 1;
  results.forEach(item => {
    const relScore = (item.score - minScoreVal) / scoreSpan; // 0 to 1
    let prob = 0;
    if (lotteryType === 'power_655') {
      prob = 6.0 + relScore * 11.5; // 6% to 17.5%
    } else if (lotteryType === 'mega_645') {
      prob = 8.0 + relScore * 13.5; // 8% to 21.5%
    } else {
      prob = 11.0 + relScore * 18.0; // 11% to 29.0%
    }
    item.probability = Math.round(prob * 100) / 100;
  });

  return results.sort((a, b) => b.score - a.score);
}

// ==========================================
// ALGORITHM 3: Prize Position Penalty
// ==========================================

export const DEFAULT_POSITION_PARAMS = {
  penalty_multiplier: 0.1
};

// Priority map for XSMN prize keys (reverse position from 1 to 18)
const PRIZE_REVERSE_POSITION_MAP: Record<string, number> = {
  special: 18,
  prize1: 17,
  prize2_1: 16,
  prize2_2: 15, prize3_1: 14,
  prize3_2: 13, prize3_3: 12, prize3_4: 11, prize3_5: 10, prize3_6: 9, prize4_1: 8, prize4_2: 7,
  prize4_3: 6,
  prize4_4: 5, prize5_1: 4, prize5_2: 3,
  prize5_3: 2,
  prize5_4: 1
};

export function runPositionPredict(
  targetDateStr: string,
  allHistory: LotteryRecord[],
  customParams?: Partial<typeof DEFAULT_POSITION_PARAMS>,
  lotteryType: 'xsmn' | 'power_655' | 'mega_645' = 'xsmn'
): PredictionItem[] {
  const params = { ...DEFAULT_POSITION_PARAMS, ...customParams };
  const history = allHistory.filter(r => r.date < targetDateStr);
  
  const startNum = (lotteryType === 'power_655' || lotteryType === 'mega_645') ? 1 : 0;
  const endNum = lotteryType === 'power_655' ? 55 : (lotteryType === 'mega_645' ? 45 : 99);

  if (history.length === 0) {
    return Array.from({ length: (endNum - startNum + 1) }, (_, i) => {
      const num = i + startNum;
      const numStr = String(num).padStart(2, '0');
      return {
        number: numStr,
        score: 100.0,
        breakdown: createEmptyBreakdown(100.0),
        probability: lotteryType === 'power_655' ? 10.9 : (lotteryType === 'mega_645' ? 13.3 : 18.0)
      };
    });
  }

  const results: PredictionItem[] = [];
  const lastDay = history[history.length - 1];

  // Map each number to its position penalty on the last day
  const penalties: Record<number, number> = {};
  for (let i = startNum; i <= endNum; i++) {
    penalties[i] = 0;
  }

  // Find where each number appeared on the last day and assign penalties
  if (lastDay.raw) {
    for (const [key, val] of Object.entries(lastDay.raw)) {
      if (key === 'date') continue;
      const valStr = String(val).trim();
      const num = parseInt(valStr.slice(-2), 10);
      if (!isNaN(num) && num >= startNum && num <= endNum) {
        const revPos = PRIZE_REVERSE_POSITION_MAP[key] || 1;
        penalties[num] += revPos * params.penalty_multiplier;
      }
    }
  }

  let maxScoreVal = -999999;
  let minScoreVal = 999999;

  for (let num = startNum; num <= endNum; num++) {
    const numStr = String(num).padStart(2, '0');
    const penalty = penalties[num];
    const finalScore = 100.0 - penalty;

    if (finalScore > maxScoreVal) maxScoreVal = finalScore;
    if (finalScore < minScoreVal) minScoreVal = finalScore;
    
    results.push({
      number: numStr,
      score: Math.round(finalScore * 1000) / 1000,
      breakdown: {
        shortTermScore: 0,
        frequencyScore: 0,
        neighborBonus: 0,
        cycleBonus: 0,
        absenceBonus: 0,
        lastDayDeduction: Math.round(-penalty * 1000) / 1000,
        repeatPenalty: 0,
        total: Math.round(finalScore * 1000) / 1000
      }
    });
  }

  // Normalise probability based on lottery type
  const scoreSpan = maxScoreVal - minScoreVal || 1;
  results.forEach(item => {
    const relScore = (item.score - minScoreVal) / scoreSpan; // 0 to 1
    let prob = 0;
    if (lotteryType === 'power_655') {
      prob = 6.0 + relScore * 11.5; // 6% to 17.5%
    } else if (lotteryType === 'mega_645') {
      prob = 8.0 + relScore * 13.5; // 8% to 21.5%
    } else {
      prob = 11.0 + relScore * 18.0; // 11% to 29.0%
    }
    item.probability = Math.round(prob * 100) / 100;
  });

  return results.sort((a, b) => b.score - a.score);
}

// Helpers
function createEmptyBreakdown(total: number): ScoreBreakdown {
  return {
    shortTermScore: 0,
    frequencyScore: 0,
    neighborBonus: 0,
    cycleBonus: 0,
    absenceBonus: 0,
    lastDayDeduction: 0,
    repeatPenalty: 0,
    total
  };
}
