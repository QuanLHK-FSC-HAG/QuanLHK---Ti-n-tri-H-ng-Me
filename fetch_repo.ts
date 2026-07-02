import fs from 'fs';
import https from 'https';

const FILES = [
  'algorithms/base.py',
  'algorithms/thuat_toan_01.py',
  'algorithms/thuat_toan_test_01.py',
  'algorithms/thuat_toan_test_02.py',
  'algorithms/thuat_toan_test_03.py'
];

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
  console.log('Downloading files...');
  if (!fs.existsSync('temp_download')) {
    fs.mkdirSync('temp_download');
    fs.mkdirSync('temp_download/algorithms');
  }

  for (const file of FILES) {
    const url = `https://raw.githubusercontent.com/QuanLHK-FSC-HAG/lottery-predictor/main/${file}`;
    const dest = `temp_download/${file}`;
    console.log(`Downloading ${url} to ${dest}...`);
    try {
      await download(url, dest);
    } catch (e) {
      console.error(`Error downloading ${file}:`, e);
    }
  }

  // Also fetch the first 2000 bytes of data/xsmb-2-digits.json
  const jsonUrl = 'https://raw.githubusercontent.com/QuanLHK-FSC-HAG/lottery-predictor/main/data/xsmb-2-digits.json';
  console.log(`Fetching sample from ${jsonUrl}...`);
  https.get(jsonUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      if (data.length < 5000) {
        data += chunk;
      }
    });
    res.on('end', () => {
      fs.writeFileSync('temp_download/sample_xsmb.json', data.slice(0, 5000));
      console.log('Finished downloading files');
    });
  });
}

main();
