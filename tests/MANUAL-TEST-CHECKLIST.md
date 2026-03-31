# CalcHub — Manual Testing Checklist

Complete this checklist before every release. Test on at least 2 devices (Android phone + desktop Chrome).

---

## 1. FIRST LAUNCH & ONBOARDING

- [ ] Splash screen shows with animation and spinner
- [ ] Splash auto-dismisses after ~2 seconds
- [ ] Onboarding shows 4 slides with correct content
- [ ] "Next" button advances through all slides
- [ ] "Skip" button jumps to home screen
- [ ] "Let's Go" on last slide opens home screen
- [ ] Reopening app does NOT show onboarding again
- [ ] Clear storage → reopen → onboarding shows again

---

## 2. HOME SCREEN

- [ ] App title "CalcHub" displays with gradient text
- [ ] All 16 calculator cards are visible
- [ ] Each card shows correct icon, label, and description
- [ ] Cards have staggered slide-up animation on load
- [ ] Tapping a card opens that calculator
- [ ] Share (📤) button works on home screen
- [ ] Achievement (🏆) button toggles achievements panel

---

## 3. SEARCH

- [ ] Search bar accepts text input
- [ ] Typing "emi" filters to show EMI calculator
- [ ] Typing "tax" shows Income Tax
- [ ] Typing gibberish shows "No results" message
- [ ] Clearing search restores all calculators
- [ ] Search is limited to 30 characters
- [ ] Typing HTML tags (e.g. `<script>`) doesn't break UI

---

## 4. EACH CALCULATOR (repeat for all 16)

### EMI Calculator
- [ ] Sliders move smoothly
- [ ] Number inputs accept typed values
- [ ] Donut chart updates in real-time
- [ ] EMI value looks correct (verify: ₹5L at 8.5% for 60mo ≈ ₹10,242)
- [ ] Total interest = total amount - principal
- [ ] Result cards display formatted Indian numbers

### SIP Calculator
- [ ] Donut chart shows invested vs returns
- [ ] ₹5,000/mo at 12% for 10yr ≈ ₹11.6L total value
- [ ] Returns = total value - invested

### GST Calculator
- [ ] Exclusive/Inclusive toggle works
- [ ] 18% GST on ₹1,000 exclusive = ₹1,180 total
- [ ] CGST + SGST = Total GST
- [ ] Switching modes recalculates correctly

### Age Calculator
- [ ] Date picker opens and works
- [ ] Shows correct years, months, days
- [ ] "Next Birthday" countdown is accurate
- [ ] Total days lived is reasonable

### Discount Calculator
- [ ] 20% off ₹2,000 = ₹1,600 final price
- [ ] You save = ₹400
- [ ] Strikethrough original price shows

### BMI Calculator
- [ ] 70kg, 170cm → BMI ≈ 24.2 (Normal)
- [ ] Color-coded gauge moves correctly
- [ ] Category badge updates (Underweight/Normal/Overweight/Obese)

### Tip Calculator
- [ ] ₹1,000 bill, 15% tip, 2 people → ₹575 each
- [ ] Changing people count recalculates

### Percentage Calculator
- [ ] All 3 modes work (X% of Y, X is ?% of Y, % Change)
- [ ] Mode buttons switch correctly

### Loan Compare
- [ ] Two rates produce different EMIs
- [ ] "You save" shows correct difference
- [ ] Identifies which loan is cheaper

### Currency Converter
- [ ] Swap (⇄) button exchanges from/to
- [ ] 1000 USD → ~83,500 INR
- [ ] "Rates are approximate" disclaimer shows

### Expense Splitter
- [ ] Can add members (name + avatar assigned)
- [ ] Can add expenses (description + amount + payer)
- [ ] Can remove members and expenses
- [ ] Summary shows correct per-person share
- [ ] Settlements show who owes whom
- [ ] Balances sum to zero
- [ ] "Clear All" resets expenses
- [ ] Can't remove below 2 members

### Calorie Tracker
- [ ] Progress ring updates as food is added
- [ ] Search finds food from database
- [ ] Manual entry form works
- [ ] Macros (P/C/F) update correctly
- [ ] Goal can be edited (500–10,000 range)
- [ ] Food can be removed from meals
- [ ] Each meal section (Breakfast/Lunch/Dinner/Snacks) works
- [ ] History tab shows previous days

### Compound Interest
- [ ] Yearly/Half-Yearly/Quarterly/Monthly buttons work
- [ ] Monthly compounding > Yearly (same rate/period)
- [ ] Donut chart shows principal vs interest

### Income Tax
- [ ] Shows Old vs New regime side-by-side
- [ ] New regime is cheaper for most incomes
- [ ] Effective tax rate percentages are shown
- [ ] FY 2025-26 disclaimer shows

### Unit Converter
- [ ] All 6 categories work (Length/Weight/Temp/Speed/Area/Volume)
- [ ] 0°C = 32°F = 273.15K
- [ ] Swap button exchanges units
- [ ] Negative temperatures work

### EMI vs Lump Sum
- [ ] Shows EMI route vs Investment route
- [ ] Verdict tells which option wins
- [ ] Down payment slider affects calculations

---

## 5. FAVORITES

- [ ] Tap ☆ in any calculator → becomes ⭐
- [ ] Tap ⭐ again → removes from favorites
- [ ] Favorites appear in horizontal row on home screen
- [ ] Favorites tab shows all starred calculators
- [ ] Tapping favorite in list opens that calculator
- [ ] Favorites persist after closing and reopening app

---

## 6. HISTORY

- [ ] Tap 💾 in any calculator → saves to history
- [ ] History tab shows saved entries with timestamp
- [ ] Each entry shows calculator name + results
- [ ] ✕ button deletes individual entries
- [ ] "Clear All" removes everything
- [ ] History persists after app restart
- [ ] Max 50 entries (add 55, verify only 50 show)

---

## 7. RECENTLY USED

- [ ] Using a calculator adds it to "Recently Used" row
- [ ] Most recent appears first
- [ ] Max 5 items shown
- [ ] "Clear" link removes all recent items
- [ ] Tapping a recent item opens that calculator

---

## 8. SETTINGS

- [ ] Theme toggle switches dark ↔ light mode
- [ ] All UI elements update colors correctly in both modes
- [ ] 8 accent colors are clickable
- [ ] Selected accent color highlights with white border
- [ ] Accent color changes reflect across the app
- [ ] Stats show correct calculation count, types, and streak
- [ ] "Share CalcHub" button works
- [ ] About section shows correct version

---

## 9. SWIPE NAVIGATION

- [ ] Swipe left → opens next calculator
- [ ] Swipe right → opens previous calculator
- [ ] Dot indicators update on swipe
- [ ] Small/accidental swipes (<80px) don't navigate
- [ ] Swipe wraps from last to first calculator

---

## 10. ACHIEVEMENTS

- [ ] 🏆 panel shows 8 achievements
- [ ] Unlocked achievements are highlighted
- [ ] Locked achievements are dimmed
- [ ] "First Calc!" unlocks after first use
- [ ] "On Fire" unlocks after 5 calculations
- [ ] "Explorer" unlocks after 5 different calculators
- [ ] Streak counter shows in achievements panel
- [ ] Achievement popup banner appears on unlock
- [ ] Popup auto-dismisses after 3 seconds

---

## 11. SECURITY TESTING

### Input Injection
- [ ] Type `<script>alert('xss')</script>` as member name → sanitized, no alert
- [ ] Type `<img src=x onerror=alert(1)>` as expense description → sanitized
- [ ] Type `javascript:void(0)` in food search → no execution
- [ ] Type very long string (500+ chars) in any text input → truncated

### Number Abuse
- [ ] Type `999999999999` in EMI amount → clamped to max (1 crore)
- [ ] Type `-5000` in SIP investment → clamped to minimum
- [ ] Type `NaN` or `Infinity` in any field → shows 0 or fallback
- [ ] Type `e` or `--` in number field → no crash
- [ ] Leave fields empty → calculations show 0, no errors

### Storage Tampering
- [ ] Manually corrupt storage data → app loads with defaults, no crash
- [ ] Delete all storage → app shows onboarding, works fresh
- [ ] Storage size stays under 100KB normal usage

---

## 12. PWA TESTING

### Install
- [ ] Open in Chrome on Android → "Add to Home Screen" banner appears
- [ ] CalcHub install banner shows in-app
- [ ] "Install Now" button triggers browser install prompt
- [ ] "Later" dismisses the banner
- [ ] After install, app icon appears on home screen
- [ ] Installed app opens in standalone mode (no browser bar)

### Offline
- [ ] Open app → toggle airplane mode → app still works
- [ ] All calculators function offline
- [ ] Favorites, history, settings persist offline
- [ ] Reconnecting doesn't lose any data

### Updates
- [ ] Deploy new version with updated CACHE_NAME
- [ ] Revisit app → new version loads on next visit
- [ ] Old cache is cleaned up

### Splash Screen (installed app)
- [ ] Opening installed app shows dark background (#0c1222)
- [ ] App theme color shows in status bar

---

## 13. PERFORMANCE

- [ ] App loads in under 2 seconds on 4G
- [ ] Slider interactions are smooth (60fps)
- [ ] No visible lag when switching calculators
- [ ] Search filtering is instant
- [ ] Animations don't jank on mid-range phones
- [ ] Run Lighthouse → aim for 90+ Performance, 100 PWA

---

## 14. CROSS-BROWSER / DEVICE

- [ ] Chrome Android — all features work
- [ ] Chrome Desktop — all features work
- [ ] Safari iOS — calculators work (PWA install may differ)
- [ ] Firefox Android — calculators work
- [ ] Samsung Internet — calculators work
- [ ] Small screen (320px wide) — no horizontal overflow
- [ ] Tablet (768px) — layout looks reasonable
- [ ] Landscape mode — usable (scrollable)

---

## 15. ACCESSIBILITY

- [ ] All inputs have visible labels
- [ ] Color contrast is sufficient (check with DevTools)
- [ ] Touch targets are at least 44×44px
- [ ] Date picker is accessible
- [ ] No text smaller than 11px
- [ ] Screen reader can identify calculator cards

---

## Sign-off

| Tester | Date | Device | Browser | Result |
|--------|------|--------|---------|--------|
|        |      |        |         | ☐ Pass / ☐ Fail |
|        |      |        |         | ☐ Pass / ☐ Fail |
|        |      |        |         | ☐ Pass / ☐ Fail |

### Notes:
_Write any bugs or issues found here._
