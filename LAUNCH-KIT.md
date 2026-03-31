# FinCalci v2.0 — Complete Launch Kit

---

## 1. DEPLOYMENT CHECKLIST (do this first)

### Step 1: Build verification
```bash
cd fincalci
npm install
npm run test          # 121 tests must pass
npm run build         # tsc --noEmit && vite build
npm run preview       # open localhost:4173, test manually
```

### Step 2: Local device testing
Open on 3 devices minimum:
- [ ] Android Chrome (primary market)
- [ ] iOS Safari (PWA install is manual — Add to Home Screen)
- [ ] Desktop Chrome (for sharing links)

Test checklist per device:
- [ ] Splash screen shows and fades
- [ ] Home grid renders all 20 tiles
- [ ] EMI calculator: change slider → hero number updates
- [ ] SIP calculator: MF search returns results
- [ ] Gold calculator: live rates load (or fallback shows)
- [ ] Expense tracker: add entry → persists on reload
- [ ] Khata Book: add customer → add transaction → balance correct
- [ ] Settings: toggle theme → entire app switches
- [ ] Settings: change accent → color updates everywhere
- [ ] Backup: download → clear storage → restore → data returns
- [ ] Share: tap share → WhatsApp-formatted text appears
- [ ] PWA: install banner shows (Android only)
- [ ] Offline: airplane mode → app still works, calcs still calculate
- [ ] Back button: navigates correctly (calc → home → double-tap exit)

### Step 3: Deploy to Vercel
```bash
# Option A: Vercel CLI
npm i -g vercel
vercel --prod

# Option B: Git push (if repo connected)
git add -A
git commit -m "FinCalci v2.0 — full rebuild"
git push origin main
```

### Step 4: Verify production
- [ ] https://fincalci.vercel.app loads
- [ ] Service worker registers (DevTools → Application → Service Workers)
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Open Graph preview works (paste URL in WhatsApp/Twitter/Facebook)
- [ ] sitemap.xml accessible at /sitemap.xml
- [ ] robots.txt accessible at /robots.txt
- [ ] Privacy policy at /privacy-policy.html

---

## 2. PLAY STORE LISTING

### App name (30 chars max)
```
FinCalci: EMI SIP GST Tax Calc
```

### Short description (80 chars max)
```
20 free calculators: EMI, SIP, GST, Tax, Gold, Khata Book & more. No ads.
```

### Full description (4000 chars max)
```
FinCalci — India's free all-in-one calculator app.

20 calculators. 60+ tools. Zero ads. Works offline. No login required.

━━━ FINANCIAL CALCULATORS ━━━
🏦 EMI Calculator — Home loan, car loan, personal loan, education loan. Compare banks side-by-side. Prepayment savings calculator. Full amortization schedule. Download PDF report.

📈 SIP Calculator — Monthly SIP, Step-up SIP, Lumpsum, SWP (Systematic Withdrawal Plan). Live mutual fund NAV lookup. Compare SIP vs FD returns. Goal-based SIP planner.

🧾 GST Calculator — Exclusive, inclusive, reverse GST. Multi-item invoice with CGST + SGST + IGST breakdown. All GST slabs (0%, 0.25%, 3%, 5%, 12%, 18%, 28%).

💰 Income Tax — Old regime vs New regime comparison (FY 2025-26). Section 80C, 80D, NPS deductions. HRA exemption calculator.

🥇 Gold & Silver — Live rates with import duty. Purity selection (24K, 22K, 18K, 14K). Making charges + GST. Weight converter (grams, tola, oz, kg).

💱 Currency Converter — 20+ currencies with live exchange rates. Custom rate input. Quick conversion table.

🏛️ FD & RD Calculator — Fixed deposit and recurring deposit. Compare across banks (SBI, HDFC, ICICI, Axis, Post Office). Quarterly compounding.

💼 Salary Calculator — CTC to take-home breakdown. PF, HRA, tax deduction. Compare two job offers.

🏖️ Retirement (FIRE) — Corpus needed, inflation adjustment, shortfall analysis. Monthly SIP recommendation.

🇮🇳 PPF & EPF — Public Provident Fund (7.1% rate). Employee Provident Fund with employer match.

📊 Compound Interest — Monthly additions, Rule of 72, growth projection chart.

━━━ BUSINESS TOOLS ━━━
💵 Khata Book — Track credit and debit with customers. Add transactions, view balances. Digital udhaar register for shopkeepers.

💸 Expense Tracker — Categories (food, transport, shopping, bills, health). Monthly budgets. Recurring expenses. Payment mode tracking (cash, UPI, card).

👥 Bill Splitter — Create groups for trips and roommates. Add shared expenses. Auto-calculate who owes whom. Settle and track.

━━━ HEALTH & UTILITY ━━━
🏋️ BMI Calculator — Body Mass Index with gauge chart. Body fat estimator (US Navy method). Daily calorie calculator.

🍎 Calorie Tracker — 60+ Indian foods database. Online food search. Meal-wise tracking (breakfast, lunch, dinner, snacks). Daily goal.

🎂 Age Calculator — Exact age in years, months, days. Life statistics. Birthday countdown. Zodiac sign.

📅 Date Calculator — Days between two dates. Add or subtract days.

📏 Unit Converter — 13 categories: length, weight, area, temperature, volume, speed, time, data, energy, pressure, fuel, cooking, number systems.

% Percentage Calculator — Basic percentage, % change, profit margin & markup.

━━━ WHY FINCALCI? ━━━
✅ 100% Free — No premium, no paywall, no hidden charges
✅ No Ads — Clean, distraction-free experience
✅ Works Offline — All calculators work without internet
✅ No Login — No account needed, no personal data collected
✅ Fast — Instant calculations, smooth animations
✅ Secure — No data sent to servers, everything stays on your device
✅ Beautiful — Premium dark mode with 8 accent colors
✅ Achievements — Earn badges, build streaks, unlock all 20 calculators

Made with ❤️ for India.
Contact: fincalci.help@gmail.com
```

### Category
```
Finance
```

### Tags (Play Store tags, pick 5)
```
Calculator, Finance, EMI, Tax, Investment
```

### Content rating
```
Everyone (ESRB: E)
No violence, no sexual content, no gambling, no profanity
```

### Data safety declaration
```
Data collected: Analytics (anonymous usage data, device info)
Data shared: None
Data encrypted in transit: Yes (HTTPS)
Data deletable: Yes (clear app data in Settings)
No account required
```

---

## 3. ASO (App Store Optimization)

### Target keywords (India, high volume, low competition)
Primary:
- EMI calculator
- SIP calculator
- GST calculator
- income tax calculator India
- gold rate calculator

Secondary:
- loan EMI calculator
- mutual fund calculator
- salary calculator India
- FD calculator
- currency converter India

Long-tail:
- EMI calculator home loan India
- SIP vs FD comparison
- GST inclusive exclusive calculator
- income tax old vs new regime calculator
- khata book digital udhaar

### Title variants to A/B test
A: `FinCalci: EMI SIP GST Tax Calc`
B: `FinCalci — All-in-One Calculator`
C: `FinCalci: EMI Loan Tax SIP Gold`

### Screenshot order (Play Store, 5 minimum)
1. Home screen — "20 calculators in your pocket" overlay
2. EMI Calculator — showing hero number + chart
3. SIP Calculator — showing growth chart + goal planner
4. Tax Calculator — Old vs New regime comparison
5. Khata Book — customer list + transaction view
6. (Optional) Expense Tracker — category donut chart
7. (Optional) Settings — dark theme + accent colors
8. (Optional) Gold Calculator — live rates + weight converter

### Screenshot specifications
- Size: 1080 x 1920 pixels (portrait, 9:16)
- Format: PNG or JPEG
- Max file size: 8MB each
- Background: #0B0F1A (app's dark theme)
- Add thin device frame (optional, Google Play Console has built-in frames)
- Add overlay text: bold, white, 2-3 words per screen

### Feature graphic
- Size: 1024 x 500 pixels
- Content: "FinCalci" logo + "20 Calculators. Zero Ads. Free Forever." + 3-4 calculator icons
- Background: gradient from #0B0F1A to #111827
- Colors: teal accent (#4ECDC4) for text highlights

---

## 4. TWA (Trusted Web Activity) SETUP

### Generate signing key
```bash
keytool -genkey -v -keystore fincalci-release.keystore \
  -alias fincalci -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_SECURE_PASSWORD \
  -dname "CN=FinCalci Apps, O=FinCalci, L=India, C=IN"
```

### Get SHA-256 fingerprint
```bash
keytool -list -v -keystore fincalci-release.keystore -alias fincalci | grep SHA256
```

### Create assetlinks.json
Replace `YOUR_SHA256_FINGERPRINT` with actual value:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.vercel.fincalci.twa",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```
Place at: `public/.well-known/assetlinks.json`

### Build TWA using Bubblewrap
```bash
npm i -g @nicolo-ribaudo/bubblewrap

bubblewrap init --manifest="https://fincalci.vercel.app/manifest.json"
# Edit twa-manifest.json:
#   packageId: "app.vercel.fincalci.twa"
#   signingKey: path to fincalci-release.keystore

bubblewrap build
# Output: app-release-signed.apk + app-release-signed.aab
```

### Upload to Play Console
1. Go to https://play.google.com/console
2. Create app → name: "FinCalci" → category: Finance → free
3. Upload .aab file (not .apk)
4. Fill store listing (copy from section 2 above)
5. Upload screenshots
6. Set content rating → complete questionnaire
7. Set data safety → use declaration from section 2
8. Set pricing → Free
9. Select countries → India (primary) + all countries
10. Submit for review (takes 1-7 days)

---

## 5. SOCIAL MEDIA LAUNCH COPY

### Twitter/X launch thread

**Tweet 1 (hook):**
```
I built a free calculator app with 20 tools for India.

No ads. No login. Works offline.

EMI, SIP, GST, Tax, Gold, Khata Book + 14 more.

Thread 🧵👇
```

**Tweet 2 (problem):**
```
The problem: I needed to calculate EMI for a home loan, check gold rates, do GST math, and compare old vs new tax regime.

That's 4 different apps. Each with ads. Each wanting my phone number.

So I built one app that does everything. For free.
```

**Tweet 3 (features):**
```
What's inside FinCalci:

🏦 EMI — compare banks, prepayment savings
📈 SIP — step-up, SWP, MF NAV lookup
🧾 GST — inclusive/exclusive/reverse
💰 Tax — old vs new regime FY 2025-26
🥇 Gold — live rates + making charges
💵 Khata Book — digital udhaar for shopkeepers

+ 14 more tools
```

**Tweet 4 (tech):**
```
Built with:
- React + Vite (PWA)
- TypeScript foundation
- Canvas charts (not SVG — faster)
- Zero backend, zero cost
- 87 files, ~7000 lines
- 121 automated tests (4 suites)

Hosting: Vercel free tier
Total cost: ₹0/month
```

**Tweet 5 (CTA):**
```
Try it now → fincalci.vercel.app

Add to home screen for the app experience.

Play Store listing coming this week.

If you find it useful, share it with one friend who does financial calculations. That's all I ask.

🧮 #FinCalci #MadeInIndia
```

### Reddit post (r/IndiaInvestments)

**Title:** I built a free all-in-one financial calculator — EMI, SIP, GST, Tax, Gold + 15 more tools

**Body:**
```
Hey everyone,

I got tired of using 5 different apps for EMI, SIP, tax, and GST calculations — each full of ads and wanting my phone number.

So I built FinCalci — a single free app with 20 calculators and 60+ tools:

- EMI with bank comparison and prepayment savings
- SIP with step-up, SWP, and live MF NAV lookup
- GST (inclusive, exclusive, reverse) with invoice
- Income Tax old vs new regime (FY 2025-26) with 80C/80D/HRA
- Gold & silver with live rates and making charges
- Currency converter with 20+ currencies
- Khata Book for shopkeepers (digital credit/debit tracking)
- Expense tracker with categories and budgets
- And 12 more (FD, salary, PPF, retirement, BMI, calorie, age, date, unit converter, compound interest, percentage, bill splitter)

It's a PWA — works in your browser, installable on home screen, works offline.

No ads. No login. No data sent anywhere. Everything stays on your device.

Try it: https://fincalci.vercel.app

Happy to take feedback. What calculators or features would make this more useful for you?
```

### WhatsApp forward message (viral loop)
```
Check out FinCalci — 20 free calculators in one app! 🧮

🏦 EMI with bank comparison
📈 SIP with mutual fund lookup
🧾 GST inclusive/exclusive
💰 Tax old vs new regime
🥇 Gold & silver live rates
💵 Khata Book for shopkeepers
💸 Expense tracker
+ 13 more tools

✅ No ads
✅ No login
✅ Works offline
✅ 100% free forever

Try now 👉 fincalci.vercel.app
```

### Instagram bio
```
FinCalci — 20 free calculators for India 🇮🇳
EMI • SIP • GST • Tax • Gold • Khata Book
No ads. Works offline. Free forever.
👇 Try it now
fincalci.vercel.app
```

---

## 6. GROWTH STRATEGY (FIRST 90 DAYS)

### Week 1: Seed (target: 100 users)
- [ ] Deploy to Vercel
- [ ] Share in 5 WhatsApp groups (personal finance, shopkeeper, college, family, startup)
- [ ] Post Twitter thread
- [ ] Post on r/IndiaInvestments
- [ ] Post on r/developersIndia (technical angle)
- [ ] Share on LinkedIn (if applicable)
- [ ] Send to 10 friends personally, ask for 1 screenshot of feedback

### Week 2: Play Store (target: 500 users)
- [ ] Build TWA and submit to Play Store
- [ ] Create 5 screenshots + feature graphic
- [ ] Respond to all Play Store reviews within 24 hours
- [ ] Post on r/india, r/IndianGaming (utility category)

### Week 3-4: Content (target: 1,000 users)
- [ ] Write 3 blog posts (Medium or personal blog):
  - "How I calculate if I can afford a home loan (EMI breakdown)"
  - "Old vs New tax regime — which saves you more? (interactive)"
  - "I replaced 5 finance apps with one free calculator"
- [ ] Share blog posts on social media
- [ ] Join 3 Telegram groups about personal finance

### Month 2: Iterate (target: 5,000 users)
- [ ] Analyze Firebase Analytics — which calcs are most used?
- [ ] Fix bugs from user feedback
- [ ] Add top-requested feature (likely cloud sync or more food items)
- [ ] Submit to Product Hunt (prepare launch assets)
- [ ] Reach out to 5 personal finance YouTubers/bloggers

### Month 3: Scale (target: 10,000 users)
- [ ] Product Hunt launch
- [ ] Google Ads experiment (₹500 budget, target "EMI calculator" keyword)
- [ ] Evaluate Supabase backend (if sync requested frequently)
- [ ] Consider premium tier (₹99/month for cloud sync + PDF export)

---

## 7. COST BREAKDOWN

| Item | Cost | When |
|------|------|------|
| Play Store developer account | ₹2,100 (one-time) | Before Play Store submission |
| Vercel hosting | ₹0 (free tier) | Always |
| Domain (optional: fincalci.app) | ~₹800/year | When revenue starts |
| Firebase Analytics | ₹0 (free tier up to 500 events/day) | Always |
| Google Ads experiment | ₹500 (optional) | Month 2 |
| **Total to launch** | **₹2,100** | |
| **Monthly running cost** | **₹0** | |

---

## 8. METRICS TO TRACK

### Week 1
- Daily active users (Firebase)
- Top 5 calculators by opens
- Install rate (PWA install events)
- Bounce rate (users who open and leave immediately)

### Month 1
- Weekly active users
- Session duration (avg time per visit)
- Calculator completion rate (opened → saved result)
- Share events
- Play Store rating

### Month 3
- Monthly active users (MAU)
- Retention: Day 1, Day 7, Day 30
- Organic search traffic (Google Search Console)
- Play Store search ranking for target keywords
- Feature requests (from reviews + feedback)

---

## 9. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Build fails (import errors, TS errors) | High | Blocking | Fix immediately, it's the #1 priority |
| Free APIs rate-limit or shut down | Medium | High | Fallback data built in, can proxy via Vercel Edge Functions |
| Play Store rejection (TWA issues) | Medium | Medium | assetlinks.json must match exactly, test with Bubblewrap |
| iOS Safari PWA bugs (splash, install) | Medium | Low | PWA install is manual on iOS — document in FAQ |
| Low-end Android performance | Medium | Medium | Canvas charts (not SVG), lazy loading, prefetch top 5 calcs |
| User data loss (localStorage cleared) | Low | High | Backup/restore feature exists, IndexedDB layer built |
| Competitor copies the app | Low | Low | First-mover advantage, brand recognition, iterate faster |
| Tax slab changes (budget 2026) | Certain | Low | Update FINANCE.TAX_SLABS_NEW in constants.ts, redeploy |

---

*Generated for FinCalci v2.0 — March 2026*
*Publisher: FinCalci Apps (fincalci.help@gmail.com)*
