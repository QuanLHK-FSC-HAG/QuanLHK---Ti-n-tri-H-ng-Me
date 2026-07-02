import fs from 'fs';
import https from 'https';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const FILE_PATH = path.join(DATA_DIR, 'xsmb-2-digits.json');
const URL = 'https://raw.githubusercontent.com/QuanLHK-FSC-HAG/lottery-predictor/main/data/xsmb-2-digits.json';

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading complete XSMB dataset...');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  try {
    await download(URL, FILE_PATH);
    console.log(`Successfully downloaded 4MB data to ${FILE_PATH}`);
    
    // Validate it is valid JSON
    const data = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    console.log(`Validated JSON! Contains ${parsed.length} lottery records.`);
  } catch (e) {
    console.error('Error downloading full dataset:', e);
  }
}

main();
