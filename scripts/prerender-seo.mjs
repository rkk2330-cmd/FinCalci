#!/usr/bin/env node
// FinCalci — Pre-render SEO shells
// Generates one HTML file per calculator route with correct:
//   <title>, og:title, og:description, canonical URL, <h1>
//
// Why: SPA serves one index.html for all routes. Bots (WhatsApp, Twitter,
// Google) read meta tags without running JS. Without this, every shared
// link shows "FinCalci — All-in-One Calculator" instead of "EMI Calculator".
//
// How: Copies dist/index.html, replaces meta tags, writes to dist/{slug}/index.html.
// React hydrates on top — user sees the full app after JS loads.
//
// Run: node scripts/prerender-seo.mjs (called automatically by build script)

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';
const BASE_URL = 'https://fincalci.vercel.app';

// Route data (must match src/utils/constants.ts ROUTES)
const ROUTES = {
  emi:        { slug: 'emi-calculator',          title: 'EMI Calculator — Home Loan, Car Loan, Personal Loan | FinCalci',            description: 'Calculate home loan EMI, compare banks, check prepayment savings. Free online EMI calculator for India.' },
  sip:        { slug: 'sip-calculator',          title: 'SIP Calculator — Mutual Fund, Step-up SIP, SWP | FinCalci',                description: 'SIP calculator with step-up, lumpsum, SWP, mutual fund NAV lookup. Plan your investments.' },
  gst:        { slug: 'gst-calculator',          title: 'GST Calculator — Inclusive, Exclusive, Reverse | FinCalci',                description: 'GST calculator — inclusive, exclusive, reverse. Multi-item invoice with CGST SGST IGST breakdown.' },
  tax:        { slug: 'income-tax-calculator',   title: 'Income Tax Calculator — Old vs New Regime FY 2025-26 | FinCalci',          description: 'Income tax calculator FY 2025-26. Compare old vs new regime. HRA, 80C, 80D deductions.' },
  gold:       { slug: 'gold-calculator',         title: 'Gold & Silver Calculator — Live Rates, Making Charges | FinCalci',         description: 'Gold and silver price calculator with live rates, making charges, and GST. Updated daily.' },
  currency:   { slug: 'currency-converter',      title: 'Currency Converter — 20+ Currencies, Live Rates | FinCalci',              description: 'Free currency converter with 20+ currencies and live exchange rates. USD, EUR, GBP to INR and more.' },
  fd:         { slug: 'fd-rd-calculator',        title: 'FD & RD Calculator — Fixed Deposit, Recurring Deposit | FinCalci',        description: 'Calculate FD and RD maturity with bank rate comparison. Fixed deposit and recurring deposit calculator.' },
  salary:     { slug: 'salary-calculator',       title: 'Salary CTC Calculator — Take-Home Breakdown | FinCalci',                  description: 'CTC to take-home salary calculator. See basic, HRA, PF, tax deductions and in-hand salary.' },
  retire:     { slug: 'retirement-calculator',   title: 'Retirement FIRE Calculator — Corpus Planning | FinCalci',                 description: 'Retirement and FIRE calculator. Plan your corpus, SIP, and monthly expenses for early retirement.' },
  compound:   { slug: 'compound-interest',       title: 'Compound Interest Calculator — With Monthly Addition | FinCalci',         description: 'Compound interest calculator with monthly addition. See yearly growth chart and total interest earned.' },
  ppf:        { slug: 'ppf-epf-calculator',      title: 'PPF & EPF Calculator — Maturity Amount | FinCalci',                      description: 'PPF and EPF calculator. Calculate maturity amount, yearly interest, and total corpus.' },
  bmi:        { slug: 'bmi-calculator',          title: 'BMI Calculator — Body Mass Index, Ideal Weight | FinCalci',               description: 'BMI calculator with body fat estimate, ideal weight range, and daily calorie needs.' },
  age:        { slug: 'age-calculator',          title: 'Age Calculator — Exact Age in Years, Months, Days | FinCalci',            description: 'Calculate exact age in years, months, and days. Compare two ages. Find next birthday countdown.' },
  percent:    { slug: 'percentage-calculator',   title: 'Percentage Calculator — Increase, Decrease, Margin | FinCalci',           description: 'Percentage calculator — increase, decrease, profit margin, markup. Quick percentage calculations.' },
  unit:       { slug: 'unit-converter',          title: 'Unit Converter — Length, Weight, Temperature & More | FinCalci',          description: 'Unit converter with 13 categories. Length, weight, temperature, speed, data, time and more.' },
  tip:        { slug: 'bill-splitter',           title: 'Bill Splitter — Split Expenses with Friends | FinCalci',                  description: 'Split bills and expenses with friends. Track who owes whom. Perfect for trips and shared living.' },
  expense:    { slug: 'expense-tracker',         title: 'Expense Tracker — Categories, Budget, Analysis | FinCalci',               description: 'Track daily expenses by category. Set budgets, view trends, manage recurring payments.' },
  calorie:    { slug: 'calorie-tracker',         title: 'Calorie Tracker — Food Search, Daily Log | FinCalci',                    description: 'Track daily calories with food database search. Log breakfast, lunch, dinner, snacks.' },
  khata:      { slug: 'khata-book',              title: 'Khata Book — Digital Credit Debit Ledger | FinCalci',                    description: 'Digital khata book for shopkeepers. Track customer credit and debit with transaction history.' },
  date:       { slug: 'date-calculator',         title: 'Date Calculator — Days Between, Add/Subtract Days | FinCalci',           description: 'Calculate days between two dates. Add or subtract days from any date.' },
};

// Read the base HTML
const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf8');

// Generic values to replace
const GENERIC_TITLE = 'FinCalci — Free EMI, SIP, GST, Tax Calculator for India';
const GENERIC_OG_TITLE = 'FinCalci — Free EMI, SIP, GST, Tax Calculator for India';
const GENERIC_OG_DESC = '20 calculators, 60+ tools. EMI, SIP, GST, Income Tax, Gold, Currency, FD, Salary, Khata Book, Expense Tracker and more. Free, no ads, works offline.';
const GENERIC_CANONICAL = `${BASE_URL}/`;

let generated = 0;

for (const [id, route] of Object.entries(ROUTES)) {
  let html = baseHtml;

  // Replace <title>
  html = html.replace(
    `<title>${GENERIC_TITLE}</title>`,
    `<title>${route.title}</title>`
  );

  // Replace og:title
  html = html.replace(
    `property="og:title" content="${GENERIC_OG_TITLE}"`,
    `property="og:title" content="${route.title}"`
  );

  // Replace og:description
  html = html.replace(
    `property="og:description" content="${GENERIC_OG_DESC}"`,
    `property="og:description" content="${route.description}"`
  );

  // Replace meta description
  html = html.replace(
    /name="description" content="[^"]+"/,
    `name="description" content="${route.description}"`
  );

  // Replace canonical URL
  html = html.replace(
    `href="${GENERIC_CANONICAL}"`,
    `href="${BASE_URL}/${route.slug}"`
  );

  // Replace og:url
  html = html.replace(
    `property="og:url" content="${BASE_URL}"`,
    `property="og:url" content="${BASE_URL}/${route.slug}"`
  );

  // Replace twitter:title
  html = html.replace(
    `name="twitter:title" content="${GENERIC_TITLE}"`,
    `name="twitter:title" content="${route.title}"`
  );

  // Replace twitter:description
  html = html.replace(
    `name="twitter:description" content="${GENERIC_OG_DESC}"`,
    `name="twitter:description" content="${route.description}"`
  );

  // Write to dist/{slug}/index.html
  const dir = join(DIST, route.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  generated++;
}

console.log(`✅ Pre-rendered ${generated} SEO shells`);
