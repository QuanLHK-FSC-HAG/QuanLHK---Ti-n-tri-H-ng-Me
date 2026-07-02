/**
 * Shared Types for the Lottery Predictor Web App
 */

export interface LotteryRecord {
  date: string; // YYYY-MM-DD
  special: number;
  prize1: number;
  prize8: number; // Giải Tám (2-digit) for XSMN
  prizes: number[]; // All 18 two-digit numbers for the date
  raw: Record<string, number>; // The original raw JSON structure
}

export interface ScoreBreakdown {
  shortTermScore: number;
  frequencyScore: number;
  neighborBonus: number;
  cycleBonus: number;
  absenceBonus: number;
  lastDayDeduction: number;
  repeatPenalty: number;
  total: number;
}

export interface PredictionItem {
  number: string; // "00" to "99" (or "01" to "45" / "55")
  score: number;
  breakdown: ScoreBreakdown;
  probability?: number; // Calculated probability in percentage, e.g., 18.5
}

export interface PredictionResponse {
  date: string;
  algorithmId: string;
  algorithmName: string;
  predictions: PredictionItem[]; // Top 10 predictions
  allScores: { number: string; score: number }[]; // All 100 sorted
  actualResult?: {
    special: string;
    prize8: string;
    prizes: string[];
    hits: string[]; // Which of the predicted top 10 matched actual results
    isSpecialHit: boolean; // If predicted top 1 hit the special prize
    isPrize8Hit?: boolean; // If predicted top 3 hit the prize 8
  };
}

export interface PerformanceDayResult {
  date: string;
  predictedTop3: string[];
  predictedTop5: string[];
  predictedTop10: string[];
  actualPrizes: string[];
  actualSpecial: string;
  hits3: string[];
  hits5: string[];
  hits10: string[];
  isSpecialHit: boolean;
}

export interface PerformanceResponse {
  startDate: string;
  endDate: string;
  totalDays: number;
  activeDaysWithData: number;
  hitsRateTop3: number;  // percentage
  hitsRateTop5: number;  // percentage
  hitsRateTop10: number; // percentage
  specialHitCount: number;
  dailyResults: PerformanceDayResult[];
}

export interface OptimizationResult {
  parameters: Record<string, any>;
  hitsRateTop3: number;
  hitsRateTop5: number;
  hitsRateTop10: number;
  score: number; // combined score
}

export interface GeminiResponse {
  explanation: string;
  suggestedParameters: Record<string, any>;
  customHypothesisName: string;
}
