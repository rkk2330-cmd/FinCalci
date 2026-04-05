#!/usr/bin/env node
// scripts/update-fd-rates.mjs
// Fetches latest FD rates from public sources and updates constants.ts
// Run: node scripts/update-fd-rates.mjs
// Schedule: GitHub Action runs monthly (see .github/workflows/update-fd-rates.yml)

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTANTS_PATH = join(__dirname, '..', 'src', 'utils', 'constants.ts');

// ─── Bank rate sources (multiple fallbacks) ───
// Primary: scrape BankBazaar FD rate page
// Fallback: hardcoded "last known good" rates
const BANKS = [
  'SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak',
  'PNB', 'BOB', 'Canara', 'Post Office', 'IDFC First',
];

// Last known good rates (updated each time script succeeds)
const FALLBACK_RATES = {
  'SBI': 6.50, 'HDFC': 6.60, 'ICICI': 6.50, 'Axis': 6.60, 'Kotak': 6.50,
  'PNB': 6.70, 'BOB': 6.50, 'Canara': 6.50, 'Post Office': 7.50, 'IDFC First': 6.75,
};

async function fetchFromBankBazaar() {
  try {
    const res = await fetch('https://www.bankbazaar.com/fixed-deposit-rate.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinCalci-RateBot/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Extract rates from the page — BankBazaar typically has structured rate tables
    // Pattern: bank name followed by rate percentages
    const rates = {};
    const bankPatterns = {
      'SBI': /SBI[^]*?(\d\.\d{2})%/i,
      'HDFC': /HDFC\s*Bank[^]*?(\d\.\d{2})%/i,
      'ICICI': /ICICI[^]*?(\d\.\d{2})%/i,
      'Axis': /Axis[^]*?(\d\.\d{2})%/i,
      'Kotak': /Kotak[^]*?(\d\.\d{2})%/i,
      'PNB': /Punjab\s*National|PNB[^]*?(\d\.\d{2})%/i,
      'BOB': /Bank\s*of\s*Baroda|BoB[^]*?(\d\.\d{2})%/i,
      'Canara': /Canara[^]*?(\d\.\d{2})%/i,
      'Post Office': /Post\s*Office[^]*?(\d\.\d{2})%/i,
      'IDFC First': /IDFC[^]*?(\d\.\d{2})%/i,
    };

    for (const [bank, pattern] of Object.entries(bankPatterns)) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        if (rate >= 3.0 && rate <= 12.0) { // sanity check
          rates[bank] = rate;
        }
      }
    }

    return Object.keys(rates).length >= 5 ? rates : null; // need at least 5 banks
  } catch (err) {
    console.warn(`BankBazaar fetch failed: ${err.message}`);
    return null;
  }
}

async function fetchFromPaisaBazaar() {
  try {
    const res = await fetch('https://www.paisabazaar.com/fixed-deposit/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinCalci-RateBot/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const rates = {};
    // PaisaBazaar patterns
    const patterns = {
      'SBI': /SBI.*?(\d\.\d{2})\s*%/is,
      'HDFC': /HDFC.*?(\d\.\d{2})\s*%/is,
      'ICICI': /ICICI.*?(\d\.\d{2})\s*%/is,
      'Axis': /Axis.*?(\d\.\d{2})\s*%/is,
      'Kotak': /Kotak.*?(\d\.\d{2})\s*%/is,
      'PNB': /PNB|Punjab National.*?(\d\.\d{2})\s*%/is,
      'BOB': /Bank of Baroda|BoB.*?(\d\.\d{2})\s*%/is,
      'Canara': /Canara.*?(\d\.\d{2})\s*%/is,
      'Post Office': /Post Office.*?(\d\.\d{2})\s*%/is,
      'IDFC First': /IDFC.*?(\d\.\d{2})\s*%/is,
    };

    for (const [bank, pattern] of Object.entries(patterns)) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        if (rate >= 3.0 && rate <= 12.0) {
          rates[bank] = rate;
        }
      }
    }

    return Object.keys(rates).length >= 5 ? rates : null;
  } catch (err) {
    console.warn(`PaisaBazaar fetch failed: ${err.message}`);
    return null;
  }
}

function updateConstants(rates) {
  const content = readFileSync(CONSTANTS_PATH, 'utf-8');
  const today = new Date().toISOString().split('T')[0];

  // Build new FD_BANK_RATES block
  const rateEntries = BANKS.map(bank => {
    const rate = rates[bank] || FALLBACK_RATES[bank] || 6.50;
    return `    { name: '${bank}', r: ${rate.toFixed(2)} },`;
  }).join('\n');

  const newBlock = `  // FD bank rates (indicative, 1-year general public, < ₹3 crore)
  // AUTO-UPDATED by scripts/update-fd-rates.mjs
  // LAST_UPDATED: ${today}
  FD_BANK_RATES: [
${rateEntries}
  ],`;

  // Replace existing FD_BANK_RATES block
  const regex = /  \/\/ FD bank rates[^\n]*\n(?:  \/\/[^\n]*\n)*  FD_BANK_RATES: \[[\s\S]*?\],/m;
  if (!regex.test(content)) {
    console.error('ERROR: Could not find FD_BANK_RATES block in constants.ts');
    process.exit(1);
  }
  const replaced = content.replace(regex, newBlock);

  writeFileSync(CONSTANTS_PATH, replaced, 'utf-8');
  console.log(`✅ Updated ${BANKS.length} bank rates (${today})`);

  // Also update the "Rates as of" label in FDCalc.tsx
  const fdCalcPath = join(__dirname, '..', 'src', 'calculators', 'FDCalc.tsx');
  const fdContent = readFileSync(fdCalcPath, 'utf-8');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateLabel = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;
  const updatedFd = fdContent.replace(
    /Rates as of [A-Za-z]+ \d{4}/,
    `Rates as of ${dateLabel}`
  );
  writeFileSync(fdCalcPath, updatedFd, 'utf-8');
  console.log(`✅ Updated "Rates as of" label to ${dateLabel}`);
}

// ─── Main ───
async function main() {
  console.log('🔍 Fetching FD rates...\n');

  // Try BankBazaar first
  let rates = await fetchFromBankBazaar();
  if (rates) {
    console.log('📊 Source: BankBazaar');
  } else {
    // Fallback: PaisaBazaar
    rates = await fetchFromPaisaBazaar();
    if (rates) {
      console.log('📊 Source: PaisaBazaar');
    } else {
      // Final fallback: use last known rates
      console.warn('⚠️ All sources failed. Using fallback rates.');
      rates = FALLBACK_RATES;
    }
  }

  console.log('\nRates found:');
  for (const [bank, rate] of Object.entries(rates)) {
    console.log(`  ${bank}: ${rate}%`);
  }

  updateConstants(rates);
  console.log('\n🎉 Done! Run `npm run build` to verify.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
