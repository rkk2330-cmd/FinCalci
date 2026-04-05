#!/usr/bin/env node
// scripts/policy-watchdog.mjs
// Searches news for Indian financial policy changes that affect FinCalci.
// If changes detected → creates a GitHub Issue with details.
// Run monthly via GitHub Action or manually: node scripts/policy-watchdog.mjs

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── What to watch for ───
const WATCHLIST = [
  {
    id: 'tax-slabs',
    keywords: ['income tax slab change', 'new tax regime change 2026', 'budget tax slab revision'],
    component: 'Tax Calculator (TaxCalc.tsx)',
    file: 'src/utils/constants.ts → TAX_SLABS_OLD / TAX_SLABS_NEW',
    lastKnown: 'FY 2025-26 slabs (unchanged for FY 2026-27)',
  },
  {
    id: 'gst-rates',
    keywords: ['GST council rate change', 'GST slab revision 2026', 'new GST rate notification'],
    component: 'GST Calculator (GSTCalc.tsx)',
    file: 'src/utils/constants.ts → GST_RATES',
    lastKnown: 'GST 2.0: [0, 0.25, 3, 5, 18, 40] effective Sep 22 2025',
  },
  {
    id: 'ppf-rate',
    keywords: ['PPF interest rate quarterly', 'small savings rate April 2026', 'PPF rate revision'],
    component: 'PPF Calculator (PPFCalc.tsx)',
    file: 'src/calculators/PPFCalc.tsx → default ppfRate',
    lastKnown: '7.1% (Q1 FY 2026-27, April-June 2026)',
  },
  {
    id: 'wage-code',
    keywords: ['new wage code implementation', 'basic salary 50 percent CTC', 'labour code salary structure'],
    component: 'Salary Calculator (SalaryCalc.tsx)',
    file: 'src/utils/constants.ts → BASIC_PCT',
    lastKnown: '50% basic (Code on Wages effective April 1, 2026)',
  },
  {
    id: 'standard-deduction',
    keywords: ['standard deduction change budget', 'section 80C limit increase', 'tax deduction limit revision'],
    component: 'Tax Calculator (TaxCalc.tsx)',
    file: 'src/utils/constants.ts → STANDARD_DEDUCTION_*, SECTION_80C_MAX',
    lastKnown: '₹75K new / ₹50K old, 80C ₹1.5L, 80D ₹25K/50K',
  },
  {
    id: 'repo-rate',
    keywords: ['RBI repo rate change', 'RBI MPC rate decision', 'repo rate cut hike'],
    component: 'EMI Calculator loan presets',
    file: 'src/utils/constants.ts → LOAN_PRESETS rates',
    lastKnown: 'Repo 5.25% (paused). Home 8.5%, Car 9%, Personal 12%',
  },
];

// ─── Search for news ───
async function searchNews(query) {
  try {
    // Use Google News RSS (no API key needed)
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' India')}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinCalci-Watchdog/1.0)' },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Extract titles and dates from RSS
    const items = [];
    const titleMatches = xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g);
    const dateMatches = xml.matchAll(/<pubDate>(.*?)<\/pubDate>/g);
    const titles = [...titleMatches].map(m => m[1]);
    const dates = [...dateMatches].map(m => m[1]);

    for (let i = 0; i < Math.min(titles.length, 5); i++) {
      const pubDate = dates[i] ? new Date(dates[i]) : null;
      const daysAgo = pubDate ? Math.floor((Date.now() - pubDate.getTime()) / 86400000) : 999;
      if (daysAgo <= 30) { // Only last 30 days
        items.push({ title: titles[i], daysAgo });
      }
    }
    return items;
  } catch {
    return [];
  }
}

// ─── Create GitHub Issue ───
async function createIssue(title, body) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log('\n📋 ISSUE (not created — no GITHUB_TOKEN):');
    console.log(`   Title: ${title}`);
    console.log(`   Body:\n${body}`);
    return;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['policy-update', 'automated'],
      }),
    });
    if (res.ok) console.log(`✅ GitHub Issue created: ${title}`);
    else console.warn(`⚠️ Failed to create issue: ${res.status}`);
  } catch (err) {
    console.warn(`⚠️ Issue creation failed: ${err.message}`);
  }
}

// ─── Main ───
async function main() {
  console.log('🔍 FinCalci Policy Watchdog');
  console.log(`   Checking ${WATCHLIST.length} policy areas...\n`);

  const alerts = [];

  for (const item of WATCHLIST) {
    console.log(`📌 ${item.id}...`);
    let allNews = [];

    for (const keyword of item.keywords) {
      const news = await searchNews(keyword);
      allNews.push(...news);
      // Rate limit: 1 second between requests
      await new Promise(r => setTimeout(r, 1000));
    }

    // Deduplicate by title
    const seen = new Set();
    const unique = allNews.filter(n => {
      const key = n.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length > 0) {
      console.log(`   ⚠️ ${unique.length} recent news items found!`);
      unique.slice(0, 3).forEach(n => console.log(`      • "${n.title}" (${n.daysAgo}d ago)`));
      alerts.push({ ...item, news: unique.slice(0, 5) });
    } else {
      console.log(`   ✅ No recent changes detected`);
    }
  }

  if (alerts.length === 0) {
    console.log('\n✅ All clear — no policy changes detected in the last 30 days.');
    return;
  }

  // Build issue body
  const body = `## FinCalci Policy Update Alert

The automated watchdog detected **${alerts.length}** policy area(s) with recent news that may require updates to hardcoded values.

### Action required:
${alerts.map(a => `
#### ${a.id}
- **Component:** ${a.component}
- **File:** \`${a.file}\`
- **Current value:** ${a.lastKnown}
- **Recent news:**
${a.news.map(n => `  - "${n.title}" (${n.daysAgo} days ago)`).join('\n')}

**TODO:** Verify if rates/slabs have changed and update \`constants.ts\` accordingly.
`).join('\n---\n')}

### How to update:
1. Check the news links above
2. Verify the new values from official government sources
3. Update \`src/utils/constants.ts\` with correct values
4. Update the \`FINANCE_REVIEW.LAST_VERIFIED\` date
5. Run \`npm run build\` to verify
6. Commit and push

*This issue was auto-generated by \`scripts/policy-watchdog.mjs\`*`;

  await createIssue(
    `🚨 Policy Update: ${alerts.map(a => a.id).join(', ')}`,
    body
  );

  console.log(`\n🚨 ${alerts.length} alert(s) raised. Check GitHub Issues.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
