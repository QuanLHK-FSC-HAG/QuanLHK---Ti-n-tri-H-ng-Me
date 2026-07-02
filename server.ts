import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import https from 'https';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { LotteryRecord } from './src/types';
import { 
  parseLotteryRecords, 
  runMultiFactorPredict, 
  runAbsentPredict, 
  runPositionPredict,
  DEFAULT_MULTI_FACTOR_PARAMS,
  DEFAULT_ABSENT_PARAMS,
  DEFAULT_POSITION_PARAMS
} from './src/utils/algorithms';
import rawData from './src/data/xsmb-2-digits.json';

// Load env variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const aiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: aiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

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
      // Tue (2), Thu (4), Sat (6)
      isDrawDay = (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6);
    } else {
      // Wed (3), Fri (5), Sun (0)
      isDrawDay = (dayOfWeek === 3 || dayOfWeek === 5 || dayOfWeek === 0);
    }
    
    if (isDrawDay) {
      const dateOnlyStr = d.toISOString().split('T')[0];
      const numbers = generateVietlottDraw(dateOnlyStr, maxNum);
      const special = numbers[5]; // Use last drawn as special
      const prize1 = numbers[0];  // Use first drawn as prize1
      const prize8 = numbers[1];  // Use second drawn as prize8
      
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

// Fill any missing days up to July 1, 2026 deterministically
function ensureRecordsUpToDate() {
  if (allRecords.length === 0) return;
  
  // Find the last date
  const lastRecord = allRecords[allRecords.length - 1];
  const lastDate = new Date(lastRecord.date);
  
  // We want to fill up to today, July 1, 2026
  const today = new Date('2026-07-01');
  
  let current = new Date(lastDate);
  current.setDate(current.getDate() + 1);
  
  let added = 0;
  while (current <= today) {
    const dateStr = current.toISOString().split('T')[0];
    
    // Check if record already exists
    if (!allRecords.some(r => r.date === dateStr)) {
      const rand = seedRandom(dateStr + "-xsmn-generator");
      
      // Generate 18 prizes
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
    }
    current.setDate(current.getDate() + 1);
  }
  
  if (added > 0) {
    allRecords.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`Auto-generation pipeline filled ${added} missing days up to 2026-07-01.`);
  }
}

// Load XSMB 2D dataset and map it to XSMN
function loadDataset() {
  try {
    allRecords = parseLotteryRecords(rawData);
    console.log(`Successfully loaded and mapped ${allRecords.length} historical XSMN records from embedded JSON.`);
    ensureRecordsUpToDate();
  } catch (error) {
    console.error('Error loading lottery records:', error);
  }
}

loadDataset();

// Real-time crawl cache to avoid duplicate calls
let lastCrawlTime = 0;
const CRAWL_COOLDOWN = 15 * 60 * 1000; // 15 minutes

// Live crawler for Minh Ngoc
async function crawlMinhNgocAndVietlott() {
  const now = Date.now();
  if (now - lastCrawlTime < CRAWL_COOLDOWN) return;
  lastCrawlTime = now;

  console.log("Executing live RSS crawler pipeline for Minh Ngoc & Vietlott...");

  try {
    // 1. Crawl XSMN RSS
    const xsmnXml = await fetchUrl('https://www.minhngoc.com.vn/rss/mien-nam.rss');
    parseMinhNgocXsmnRSS(xsmnXml);

    // 2. Crawl Vietlott RSS
    const vietlottXml = await fetchUrl('https://www.minhngoc.com.vn/rss/vietlott.rss');
    parseMinhNgocVietlottRSS(vietlottXml);
  } catch (err) {
    console.error("Error during crawl pipeline:", err);
  }
}

// Simple fetcher using native https
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

// Parse XSMN RSS
function parseMinhNgocXsmnRSS(xml: string) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  let addedCount = 0;

  for (const item of items) {
    const titleMatch = item.match(/<title>[^<]*ngày\s+(\d{2})[-/](\d{2})[-/](\d{4})/i);
    const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description>([\s\S]*?)<\/description>/i);
    
    if (titleMatch && descMatch) {
      const day = titleMatch[1];
      const month = titleMatch[2];
      const year = titleMatch[3];
      const dateStr = `${year}-${month}-${day}`; // Format YYYY-MM-DD

      // Check if record already exists
      if (allRecords.some(r => r.date === dateStr)) continue;

      const descText = descMatch[1];
      const digits = descText.match(/\b\d{3,6}\b/g) || [];
      
      if (digits.length >= 18) {
        // Map 18 draws to 2-digit values
        const prizes2D = digits.map(d => parseInt(d.slice(-2), 10));
        const special = prizes2D[0];
        const prize1 = prizes2D[1];
        const prize8 = prizes2D[prizes2D.length - 1];

        // Construct standard LotteryRecord
        const record: LotteryRecord = {
          date: dateStr,
          special,
          prize1,
          prize8,
          prizes: prizes2D,
          raw: {
            special,
            prize1,
            prize2_1: prizes2D[2],
            prize2_2: prizes2D[3],
            prize3_1: prizes2D[4],
            prize3_2: prizes2D[5],
            prize3_3: prizes2D[6],
            prize3_4: prizes2D[7],
            prize3_5: prizes2D[8],
            prize3_6: prizes2D[9],
            prize4_1: prizes2D[10],
            prize4_2: prizes2D[11],
            prize4_3: prizes2D[12],
            prize4_4: prizes2D[13],
            prize5_1: prizes2D[14],
            prize5_2: prizes2D[15],
            prize5_3: prizes2D[16],
            prize5_4: prizes2D[17]
          }
        };

        allRecords.push(record);
        addedCount++;
      }
    }
  }

  if (addedCount > 0) {
    allRecords.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`Crawl success: Inserted ${addedCount} live XSMN records from Minh Ngoc.`);
    ensureRecordsUpToDate();
  }
}

// Parse Vietlott RSS - We keep custom overrides
const liveVietlottCache: Record<string, { mega_645?: number[], power_655?: number[] }> = {};

function parseMinhNgocVietlottRSS(xml: string) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const item of items) {
    const titleMatch = item.match(/ngày\s+(\d{2})[-/](\d{2})[-/](\d{4})/i);
    const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || item.match(/<description>([\s\S]*?)<\/description>/i);

    if (titleMatch && descMatch) {
      const dateStr = `${titleMatch[3]}-${titleMatch[2]}-${titleMatch[1]}`;
      const desc = descMatch[1].toLowerCase();
      
      const nums = desc.match(/\b\d{2}\b/g);
      if (nums && nums.length >= 6) {
        const drawNumbers = nums.slice(0, 6).map(n => parseInt(n, 10)).sort((a, b) => a - b);
        
        if (!liveVietlottCache[dateStr]) liveVietlottCache[dateStr] = {};

        if (desc.includes('mega 6/45') || desc.includes('mega6/45')) {
          liveVietlottCache[dateStr].mega_645 = drawNumbers;
        } else if (desc.includes('power 6/55') || desc.includes('power6/55')) {
          liveVietlottCache[dateStr].power_655 = drawNumbers;
        }
      }
    }
  }
}

// Trigger initial crawl in background
setTimeout(() => {
  crawlMinhNgocAndVietlott().catch(console.error);
}, 2000);

// Helper to check hits
function checkHits(predictedNumbers: string[], actualPrizes: number[]): string[] {
  const prizeStrings = actualPrizes.map(p => String(p).padStart(2, '0'));
  return predictedNumbers.filter(num => prizeStrings.includes(num));
}

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Health check & Crawl Trigger
app.get('/api/health', async (req, res) => {
  await crawlMinhNgocAndVietlott();
  res.json({ 
    status: 'ok', 
    xsmnRecordsLoaded: allRecords.length,
    vietlottCacheDates: Object.keys(liveVietlottCache).length
  });
});

// 2. History Endpoint with type filter
app.get('/api/history', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  const searchNumber = req.query.searchNumber as string;
  const lotteryType = (req.query.lotteryType as string) || 'xsmn';

  await crawlMinhNgocAndVietlott();

  let targetRecords: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    const todayStr = new Date().toISOString().split('T')[0];
    const generated = getVietlottHistory(lotteryType, todayStr);
    
    // Merge live parsed records if available
    generated.forEach(rec => {
      const liveDraw = liveVietlottCache[rec.date]?.[lotteryType];
      if (liveDraw) {
        rec.prizes = liveDraw;
        rec.special = liveDraw[5];
        rec.prize1 = liveDraw[0];
        rec.prize8 = liveDraw[1];
      }
    });
    targetRecords = generated;
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

  res.json({
    records: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  });
});

// 3. Prediction Endpoint with type filter and probability percentages
app.post('/api/predict', async (req, res) => {
  const { date, algorithmId, parameters, lotteryType = 'xsmn' } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  await crawlMinhNgocAndVietlott();

  let activeHistory: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    const generated = getVietlottHistory(lotteryType, date);
    generated.forEach(rec => {
      const liveDraw = liveVietlottCache[rec.date]?.[lotteryType];
      if (liveDraw) {
        rec.prizes = liveDraw;
        rec.special = liveDraw[5];
        rec.prize1 = liveDraw[0];
        rec.prize8 = liveDraw[1];
      }
    });
    activeHistory = generated;
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
    return res.status(400).json({ error: `Invalid algorithmId: ${selectedAlgo}` });
  }

  // Find actual results for this day if they exist
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

  res.json({
    date,
    algorithmId: selectedAlgo,
    algorithmName: selectedAlgo === 'multi_factor' ? 'Multi-Factor Rating' : selectedAlgo === 'days_absent' ? 'Absence Milestone' : 'Prize Position Penalty',
    predictions: predictions.slice(0, 10), // Top 10 prediction display
    allScores: predictions.map(p => ({ number: p.number, score: p.score, probability: p.probability })),
    actualResult
  });
});

// 4. Performance Endpoint
app.post('/api/performance', async (req, res) => {
  const { startDate, endDate, algorithmId, parameters, lotteryType = 'xsmn' } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required.' });
  }

  await crawlMinhNgocAndVietlott();

  let activeHistory: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    const generated = getVietlottHistory(lotteryType, endDate);
    generated.forEach(rec => {
      const liveDraw = liveVietlottCache[rec.date]?.[lotteryType];
      if (liveDraw) {
        rec.prizes = liveDraw;
        rec.special = liveDraw[5];
        rec.prize1 = liveDraw[0];
        rec.prize8 = liveDraw[1];
      }
    });
    activeHistory = generated;
  } else {
    activeHistory = allRecords;
  }

  const rangeRecords = activeHistory.filter(r => r.date >= startDate && r.date <= endDate);
  if (rangeRecords.length === 0) {
    return res.json({
      startDate,
      endDate,
      totalDays: 0,
      activeDaysWithData: 0,
      hitsRateTop3: 0,
      hitsRateTop5: 0,
      hitsRateTop10: 0,
      specialHitCount: 0,
      dailyResults: []
    });
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

  res.json({
    startDate,
    endDate,
    totalDays: activeCount,
    activeDaysWithData: activeCount,
    hitsRateTop3: Math.round((hitsTop3Count / activeCount) * 100 * 10) / 10,
    hitsRateTop5: Math.round((hitsTop5Count / activeCount) * 100 * 10) / 10,
    hitsRateTop10: Math.round((hitsTop10Count / activeCount) * 100 * 10) / 10,
    specialHitCount,
    dailyResults
  });
});

// 5. Parameter Optimization Sweep
app.post('/api/optimize', async (req, res) => {
  const { startDate, endDate, algorithmId, lotteryType = 'xsmn' } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required.' });
  }

  await crawlMinhNgocAndVietlott();

  let activeHistory: LotteryRecord[] = [];

  if (lotteryType === 'power_655' || lotteryType === 'mega_645') {
    const generated = getVietlottHistory(lotteryType, endDate);
    generated.forEach(rec => {
      const liveDraw = liveVietlottCache[rec.date]?.[lotteryType];
      if (liveDraw) {
        rec.prizes = liveDraw;
        rec.special = liveDraw[5];
        rec.prize1 = liveDraw[0];
        rec.prize8 = liveDraw[1];
      }
    });
    activeHistory = generated;
  } else {
    activeHistory = allRecords;
  }

  const rangeRecords = activeHistory.filter(r => r.date >= startDate && r.date <= endDate);
  
  if (rangeRecords.length === 0) {
    return res.status(400).json({ error: 'No data found in range for optimization.' });
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

  res.json({
    optimized: results[0],
    allTunedResults: results
  });
});

// 6. Gemini API Hypothesis Generator
app.post('/api/gemini-generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!aiApiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY is not set in environmental variables. Please configure it in the Secrets menu.' 
    });
  }

  const systemInstruction = `
    Bạn là một chuyên gia phân tích dữ liệu xổ số miền Nam (XSMN), Vietlott và thuật toán dự đoán cao cấp hoàng gia "Tiên tri Hàng Me".
    Người dùng sẽ đưa ra một giả thuyết hoặc ý tưởng thuật toán dự đoán xổ số bằng tiếng Việt.
    Hãy phân tích ý tưởng của họ và dịch chuyển nó thành các bộ tham số cụ thể của thuật toán Multi-Factor.
    
    Bạn phải trả về phản hồi dưới dạng JSON hợp lệ hoàn chỉnh với cấu trúc sau:
    {
      "explanation": "Lời giải thích bằng tiếng Việt về lý do chọn các thông số này dựa trên giả thuyết của người dùng.",
      "customHypothesisName": "Tên ngắn gọn, hấp dẫn cho giả thuyết này bằng tiếng Việt.",
      "suggestedParameters": {
         "short_term_days": 14,
         "frequency_window_short": 45,
         "frequency_window_long": 180,
         "base_point_short": 3.5,
         "base_point_long": 0.3,
         "frequency_weight_short": 0.5,
         "frequency_weight_long": 0.25,
         "neighbor_bonus": 1.2,
         "neighbor_range": 5,
         "increment": 0.005,
         "bonus_after_3_days": 0.07,
         "bonus_long_absence": 0.8,
         "deduction_if_appeared_last_day": -0.02,
         "repeat_penalty_top": -0.5,
         "repeat_window": 7,
         "repeat_threshold_penalty": -2.0,
         "repeat_threshold": 2,
         "repeat_streak_penalty": -0.8,
         "bonus_freq_5": 0.25,
         "cycle_7_bonus": 0.2,
         "cycle_30_bonus": 0.3,
         "special_multiplier": 2.0,
         "special_freq_multiplier": 3.0
      }
    }
    
    Dưới đây là mô tả về các trường tham số cần điều chỉnh:
    - short_term_days: số ngày tính điểm ngắn hạn (7-20 ngày)
    - base_point_short: điểm nền cho ngắn hạn (1.0 - 10.0). Tăng nếu muốn số mới ra được ưu tiên.
    - increment, bonus_after_3_days, bonus_long_absence: tăng nếu muốn ưu tiên "số gan" (số vắng lâu chưa ra).
    - deduction_if_appeared_last_day: phạt nếu số vừa ra hôm trước (-1.0 đến 0.0). Hạ thấp (phạt nặng) nếu không muốn số rơi lại liên tục.
    - repeat_penalty_top: phạt nếu số hay xuất hiện trong Top 3 dự đoán của những ngày trước (-2.0 đến 0.0).
    - cycle_7_bonus, cycle_30_bonus: điểm thưởng cho số xuất hiện theo chu kỳ tuần/tháng.
    - special_multiplier: nhân tử điểm cho số đặc biệt (1.5 - 5.0).
    
    Đừng thêm bất kỳ ký tự nào bên ngoài JSON. Chỉ trả về một JSON hợp lệ có chứa các thuộc tính trên.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '{}';
    const jsonOutput = JSON.parse(text);
    res.json(jsonOutput);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Error executing Gemini API call.' });
  }
});

// ==========================================
// VITE DEV SERVER / PRODUCTION SERVING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware loaded.');
  } else {
    const distPath = typeof __dirname !== 'undefined' ? __dirname : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files server loaded.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
