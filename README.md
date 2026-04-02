# FinCalci — All-in-One Calculator for India

**20 calculators. 60+ tools. Zero ads. Free forever.**

[Try it live →](https://fin-calci.vercel.app)

---

## What's inside

| Category | Calculators |
|----------|-------------|
| Financial | EMI, SIP (6 modes), GST, Income Tax (Old vs New), Gold & Silver, Currency Converter, FD/RD, Compound Interest, PPF/EPF |
| Career | Salary CTC Breakdown, Retirement FIRE Calculator |
| Business | Khata Book (digital credit/debit), Expense Tracker, Bill Splitter |
| Health | BMI + Body Fat, Calorie Tracker |
| Utility | Age Calculator, Date Calculator, Unit Converter (13 categories), Percentage Calculator |

## Tech stack

- **Language:** TypeScript (incremental migration — 64 source files, 39 with @ts-nocheck)
- **Frontend:** React 18 + Vite 5 (esbuild minification)
- **Styling:** Design tokens (3 colors, 2 weights, 6 spacings) — no CSS framework
- **Charts:** Canvas-based MiniChart (area, bar, donut, gauge, sparkline, hbar)
- **State:** localStorage + IndexedDB (auto-migration for large data)
- **APIs:** 5 free public APIs (currency, gold, mutual funds, stocks, food nutrition)
- **PWA:** Service worker with versioned caching, offline fallback, update banner
- **Hosting:** Vercel (free tier) — ₹0/month
- **Quality gate:** 52 automated checks block deployment on any regression

## Quick start

```bash
git clone <repo>
cd fincalci
npm install
npm run dev       # http://localhost:5173
npm run deploy    # quality gate → tsc → vite build
```

## Project structure

```
src/
├── types.ts              # 30+ shared interfaces
├── App.tsx               # Router shell (~494 lines)
├── main.tsx              # Entry point
├── design/               # tokens.ts, theme.ts, styles.ts
├── utils/                # 14 modules
│   ├── constants.ts      # KEYS, API config, FINANCE, ROUTES, SLIDER, CLAMP
│   ├── data.ts           # CALCULATORS (20), FOOD_DB (43), UNIT_CATS (13)
│   ├── validate.ts       # 24 guard functions + 9 date-safe helpers
│   ├── liveData.ts       # LRU-cached API clients (MF, Stock, Food, Rates)
│   ├── router.ts         # All URL manipulation (zero window.history elsewhere)
│   ├── logger.ts         # logError (survives prod), logWarn, logDebug
│   ├── format.ts         # currency, pct, num, decimal, duration
│   └── ...               # db, storage, sound, haptics, helpers, inputMemory, firebase
├── hooks/                # 7 hooks
│   ├── useAppState.ts    # Navigation, lifecycle, toast, connectivity
│   ├── useCalcHelpers.ts # useDebouncedPersist, useAsyncSearch, openPrintWindow
│   ├── NavContext.ts     # React context for navigation (zero window globals)
│   └── ...               # usePreferences, useHistory, useAnalytics, useValidatedInput
├── components/           # 11 shared (.tsx, all React.memo)
│   ├── CalcWrapper.tsx   # 5-tier error boundary with retry + go-home
│   ├── ErrorBoundaries   # App → Section → Calc (3-tier, Sentry-ready)
│   └── ...               # HeroNumber, MiniChart, SliderInput, Loader, UIStates...
└── calculators/          # 20 calculators + index.tsx (lazy loader with retry UI)
```

## Quality gate (57 checks)

```bash
npm run deploy
# Runs: quality-check.sh → vite build
```

## Tests

```bash
npm test          # 121 tests, 4 suites
npm run test:watch  # watch mode
```

| Suite | Tests | Covers |
|-------|-------|--------|
| validate.test.ts | 74 | safeNum, safeDate, safeDateDiff, safeEMI, safeSIPFV, safeCompound, safeGST, safePow, safeDivide, safeFixed, validateCalcInputs, hashResult |
| integrity.test.ts | 18 | CALC_MAP entries match CALCULATORS, ROUTES match, no dead files, no duplicate IDs |
| helpers.test.ts | 13 | safeParse, sanitize, escHtml, validateArray, validateStats |
| format.test.ts | 16 | currency, pct, num, decimal, currencyCompact |

**What's not tested (known gap):**
No component tests, no hook tests, no e2e tests. `@testing-library/react` is installed but unused. Coverage is limited to pure utility functions and data integrity. Calculator UI, navigation, API services, and user flows have zero automated test coverage.

## External API dependencies

All live data comes from free, unauthenticated third-party APIs with no SLA or contract. Any can break without notice.

| API | Used for | Auth | Fallback if dead |
|-----|----------|------|------------------|
| fawazahmed0/currency-api (jsdelivr CDN) | Currency rates (20+ pairs) | None | Static `FALLBACK_CURRENCY` rates in constants.ts |
| fawazahmed0/currency-api (Pages fallback) | Currency rates backup | None | Same static fallback |
| fawazahmed0/currency-api (XAU endpoint) | Gold/silver spot price | None | Static `FALLBACK_GOLD` rates in constants.ts |
| api.mfapi.in | Mutual fund NAV + returns | None | **None — feature breaks** |
| stock.indianapi.in | Stock prices + fundamentals | None | **None — feature breaks** |
| world.openfoodfacts.org | Food nutrition data | None (ODbL license) | **None — feature breaks** |

**Risks:** API owners can add authentication, change endpoints, rate-limit aggressively, or shut down at any time. Currency/Gold degrade to static rates. MF, Stock, and Food features will show error states with no data.

**When you have revenue:** Replace with authenticated APIs (e.g. RapidAPI currency, NSE official data feed, USDA nutrition API) that have SLAs and uptime guarantees.

## Security

CSP hardened, HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy. All inputs sanitized (`sanitize()` + `escHtml()`). No `unsafe-eval`. No `dangerouslySetInnerHTML`. No `confirm()` dialogs.

## Build output

| Chunk | Size | Gzip |
|-------|------|------|
| Main app shell | 104KB | ~31KB |
| React vendor | 141KB | ~45KB |
| 20 lazy calc chunks | 2-18KB each | 1-5KB |
| **Total** | **554KB** | **~120KB** |

## Cost

| Item | Cost |
|------|------|
| Monthly hosting + APIs | ₹0 |
| Play Store (one-time) | ₹2,100 |

## Contact

FinCalci Apps — fincalci.help@gmail.com
