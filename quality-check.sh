#!/bin/bash
# FinCalci — Quality Gate v2.0
# Runs before every build. Catches every pattern-based issue automatically.
# Usage: bash quality-check.sh

MOD="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
PASS=0; FAIL=0; WARN=0

pass() { echo -e "  ${GREEN}✅${NC} $1: $2"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}❌${NC} $1: $2 ${3:+(expected $3)}"; FAIL=$((FAIL + 1)); }

check_zero() {
  if [ "$2" -eq 0 ]; then pass "$1" "0"; else fail "$1" "$2" "0"; fi
}
check_eq() {
  if [ "$2" -eq "$3" ]; then pass "$1" "$2"; else fail "$1" "$2" "$3"; fi
}
check_gte() {
  if [ "$2" -ge "$3" ]; then pass "$1" "$2"; else fail "$1" "$2" ">=$3"; fi
}

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   FinCalci Quality Gate v2.0        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ━━━ CRITICAL ━━━
echo "━━━ CRITICAL ━━━"

# Lockfile must exist — without it, npm ci fails and versions float
if [ -f "$MOD/package-lock.json" ]; then pass "package-lock.json exists" "yes"; else fail "package-lock.json MISSING" "no" "required"; fi

# Financial constants review date
NEXT_REVIEW=$(grep "NEXT_REVIEW:" "$MOD/src/utils/constants.ts" | grep -oP '\d{4}-\d{2}-\d{2}')
FY=$(grep "FY:" "$MOD/src/utils/constants.ts" | grep -oP "'[^']+'" | tr -d "'")
if [ -n "$NEXT_REVIEW" ]; then
  TODAY=$(date +%Y-%m-%d)
  if [[ "$TODAY" > "$NEXT_REVIEW" ]]; then
    echo -e "  ${RED}⚠️  FINANCE constants overdue for review (next: $NEXT_REVIEW, FY: $FY)${NC}"
    echo -e "  ${RED}     Update tax slabs, PPF/EPF rates, FD rates, loan presets in constants.ts${NC}"
    WARN=$((WARN + 1))
  else
    echo -e "  ${GREEN}✅${NC} Finance constants reviewed for FY $FY (next review: $NEXT_REVIEW)"
  fi
fi

# Production deps must be pinned (no ^)
caret_prod=$(node -e "const p=JSON.parse(require('fs').readFileSync('$MOD/package.json')); const d=p.dependencies||{}; console.log(Object.values(d).filter(v=>v.startsWith('^')).length)")
check_zero "Caret (^) in production dependencies" "$caret_prod"

c=$(grep -rn "window\.storage" "$MOD/src/" --include="*.tsx" --include="*.ts" --include="*.ts" 2>/dev/null | grep -v "comment\|NOT" | wc -l)
check_zero "window.storage (artifact API)" "$c"

c=$(grep -c "lazyCalc(() =>" "$MOD/src/calculators/index.tsx" 2>/dev/null)
check_eq "CALC_MAP entries" "$c" 20

c=$(sed -n '/export const CALCULATORS/,/^];/p' "$MOD/src/utils/data.ts" | grep -c 'id:')
check_eq "CALCULATORS array" "$c" 20

c=$(grep -c "terser" "$MOD/vite.config.ts" 2>/dev/null)
check_zero "terser (not in deps)" "$c"

c=$(grep -c "{ slug: '" "$MOD/src/utils/constants.ts" 2>/dev/null)
check_eq "ROUTES entries" "$c" 20

# ━━━ ARITHMETIC SAFETY ━━━
echo ""; echo "━━━ ARITHMETIC SAFETY ━━━"
c=$(grep -rn '/ 100\b' "$MOD/src/calculators/"*.tsx 2>/dev/null | grep -v 'safePct\|safeRate\|safeGST\|safeDivide\|import\|//\|style\|font\|width\|height\|padding\|border' | wc -l)
check_zero "Raw /100 in calculators" "$c"

c=$(grep -rn 'Math\.pow' "$MOD/src/calculators/"*.tsx 2>/dev/null | grep -v 'safePow\|import' | wc -l)
check_zero "Raw Math.pow" "$c"

c=$(grep -c 'export const safe\|export const isRecord' "$MOD/src/utils/validate.ts" 2>/dev/null)
check_gte "Guard functions" "$c" 22

# ━━━ INPUT VALIDATION ━━━
echo ""; echo "━━━ INPUT VALIDATION ━━━"
c=$(grep -rn 'type="number"' "$MOD/src/calculators/"*.tsx 2>/dev/null | grep -v "clampInput\|safeRange\|safeNum\|clamp\|Math.min\|Math.max" | wc -l)
check_zero "Unguarded number inputs" "$c"

c=$(grep -rn "SliderInput" "$MOD/src/calculators/"*.tsx 2>/dev/null | grep -oP 'min=\{[0-9]' | wc -l)
if [ "$c" -le 6 ]; then pass "Hardcoded slider props (6 dynamic OK)" "$c"; else fail "Hardcoded slider props" "$c" "<=6"; fi

# ━━━ TYPE SAFETY ━━━
echo ""; echo "━━━ TYPE SAFETY ━━━"
c=$(grep -rn ': any\|:any\|<any>' "$MOD/src/" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l)
check_zero "any type in .ts files" "$c"

# ━━━ PERFORMANCE ━━━
echo ""; echo "━━━ PERFORMANCE ━━━"
memo=$(grep -rl "React.memo" "$MOD/src/components/"*.tsx 2>/dev/null | wc -l)
total=$(ls "$MOD/src/components/"*.tsx 2>/dev/null | wc -l)
class=$(grep -rl "extends React.Component" "$MOD/src/components/"*.tsx 2>/dev/null | wc -l)
unmemo=$((total - memo - class))
check_zero "Unmemoized functional components" "$unmemo"

# ━━━ ERROR HANDLING ━━━
echo ""; echo "━━━ ERROR HANDLING ━━━"
check_gte "AppErrorBoundary refs" "$(grep -c 'AppErrorBoundary' "$MOD/src/App.tsx" 2>/dev/null)" 1
check_gte "SectionBoundary refs" "$(grep -c 'SectionBoundary' "$MOD/src/App.tsx" 2>/dev/null)" 5
check_gte "CalcWrapper refs" "$(grep -c 'CalcWrapper' "$MOD/src/App.tsx" 2>/dev/null)" 1

# ━━━ BRAND & COPY ━━━
echo ""; echo "━━━ BRAND & COPY ━━━"
c=$(grep -rn 'Fincalci\b' "$MOD/src/" "$MOD/public/" "$MOD/index.html" --include="*.tsx" --include="*.ts" --include="*.ts" --include="*.html" --include="*.json" 2>/dev/null | grep -v 'node_modules\|FinCalci' | wc -l)
check_zero "Wrong brand (Fincalci)" "$c"

c=$(grep -rn '19.*calculator\|calculator.*19' "$MOD/src/" "$MOD/public/" --include="*.tsx" --include="*.ts" --include="*.html" --include="*.json" 2>/dev/null | grep -v 'node_modules\|Aquarius\|Vite\|comment\|Dosa\|food' | wc -l)
check_zero "Stale '19 calculators'" "$c"

# ━━━ CODE HYGIENE ━━━
echo ""; echo "━━━ CODE HYGIENE ━━━"
c=$(grep -rn '"fincalci-' "$MOD/src/" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v 'constants\.\|KEYS\.\|firebase.*895de\|startsWith\|idb-migrated' | wc -l)
check_zero "Hardcoded storage keys" "$c"

c=$(grep -rn 'Nunito\|Outfit' "$MOD/src/" --include="*.tsx" --include="*.ts" --include="*.ts" 2>/dev/null | grep -v 'node_modules\|upgrade' | wc -l)
check_zero "Old fonts" "$c"

c=$(grep -rn 'fontWeight:[[:space:]]*[6789]' "$MOD/src/" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l)
check_zero "Heavy font weights (600+)" "$c"

c=$(grep -rn 'console\.\(log\|warn\)' "$MOD/src/" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v 'node_modules\|Silent\|logger.ts' | wc -l)
check_zero "console.log/warn in production (excl logger)" "$c"

c=$(grep -c 'unsafe-eval' "$MOD/index.html" 2>/dev/null)
check_zero "unsafe-eval in CSP" "$c"

# Dead files (check by basename without extension, since imports strip extensions)
dead=0
for f in "$MOD/src/utils/"*.ts "$MOD/src/components/"*.tsx "$MOD/src/design/"*.ts "$MOD/src/hooks/"*.ts; do
  [ ! -f "$f" ] && continue
  stem=$(basename "$f" | sed 's/\.[^.]*$//')
  imports=$(grep -rn "/$stem'" "$MOD/src/" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l)
  imports2=$(grep -rn "/$stem\"" "$MOD/src/" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l)
  total=$((imports + imports2))
  if [ "$total" -eq 0 ]; then
    dead=$((dead + 1))
    echo -e "    ${RED}DEAD:${NC} $(basename $f)"
  fi
done
check_zero "Dead files" "$dead"

# ━━━ ACCESSIBILITY ━━━
echo ""; echo "━━━ ACCESSIBILITY ━━━"
total_btns=$(grep -c '<button ' "$MOD/src/App.tsx" 2>/dev/null)
labeled_btns=$(grep -c 'aria-label' "$MOD/src/App.tsx" 2>/dev/null)
if [ "$labeled_btns" -ge "$total_btns" ]; then pass "Buttons with aria-label" "$labeled_btns/$total_btns"; else fail "Buttons missing aria-label" "$((total_btns - labeled_btns))" "0"; fi

# ━━━ ANALYTICS ━━━
echo ""; echo "━━━ ANALYTICS ━━━"
c=$(grep -rn "FA\.track\|analytics\.track" "$MOD/src/" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules\|import\|comment\|could" | wc -l)
check_gte "Analytics tracking points" "$c" 30

# ━━━ SEO ━━━
echo ""; echo "━━━ SEO ━━━"
c=$(grep -c '<url>' "$MOD/public/sitemap.xml" 2>/dev/null)
check_gte "Sitemap URLs" "$c" 22
check_gte "Canonical link" "$(grep -c 'canonical' "$MOD/index.html" 2>/dev/null)" 1
check_gte "JSON-LD schema" "$(grep -c 'application/ld+json' "$MOD/index.html" 2>/dev/null)" 1
fake_rating=$(grep -c "aggregateRating" "$MOD/index.html" 2>/dev/null)
check_zero "Fake aggregate rating in structured data" "$fake_rating"

# ━━━ API INTEGRITY ━━━
echo ""; echo "━━━ API INTEGRITY ━━━"
api_calcs="CurrencyCalc GoldCalc SIPCalc CalorieTracker"
missing_disc=0
for calc in $api_calcs; do
  has=$(grep -ci "indicative\|not.*advi\|verify\|not guaranteed\|approximate\|community\|derived.*spot\|will vary" "$MOD/src/calculators/${calc}.tsx" 2>/dev/null)
  if [ "$has" -eq 0 ]; then
    echo -e "    ${RED}MISSING:${NC} ${calc} has no API data disclaimer"
    missing_disc=$((missing_disc + 1))
  fi
done
check_zero "API calcs without data disclaimer" "$missing_disc"


# ━━━ WINDOW POLLUTION ━━━
echo ""; echo "━━━ WINDOW POLLUTION ━━━"
customs=$(grep -rn "window\._" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v "// " | wc -l)
check_zero "Custom window._ properties" "$customs"

direct_hist=$(grep -rn "window\.history\.\|window\.location\." "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules\|router.ts" | wc -l)
check_zero "Direct window.history/location (excl router.ts)" "$direct_hist"

dyn_inject=$(grep -rn "document\.createElement.*style\|document\.head\.append.*style" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
check_zero "Dynamic <style> injection (should be in App.tsx)" "$dyn_inject"

dyn_font=$(grep -rn "document\.createElement.*link.*font\|document\.head\.append.*link" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
check_zero "Dynamic font injection (should be in index.html)" "$dyn_font"

# ━━━ ERROR VISIBILITY ━━━
echo ""; echo "━━━ ERROR VISIBILITY ━━━"
silent=$(grep -rn "catch {}$" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
check_zero "Silent catch {} (no log, no comment)" "$silent"

logged=$(grep -rn "logError(" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "export\|import\|logger.ts" | wc -l)
check_gte "logError() calls" "$logged" 20

api_logged=$(grep -rn "logError\|logWarn" "$MOD/src/utils/liveData.ts" "$MOD/src/utils/mfService.ts" "$MOD/src/utils/stockService.ts" "$MOD/src/utils/foodService.ts" 2>/dev/null | grep -v "import" | wc -l)
check_gte "API error logging (all services)" "$api_logged" 20

please_wait=$(grep -rn "'Please wait'" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
check_zero "Dead 'Please wait' errors (should auto-wait)" "$please_wait"

# ━━━ DATE SAFETY ━━━
echo ""; echo "━━━ DATE SAFETY ━━━"
utc_today=$(grep -rn 'toISOString().split.*T.*\[0\]' "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules\|Backup" | wc -l)
check_zero "UTC-unsafe today patterns" "$utc_today"

today_callers=$(grep -rn "todayISO()" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "export\|validate.ts" | wc -l)
check_gte "todayISO() callers" "$today_callers" 5

ddmm_callers=$(grep -rn "parseDDMMYYYY" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "export\|validate.ts" | wc -l)
check_gte "parseDDMMYYYY callers (MF dates)" "$ddmm_callers" 1

# ━━━ MEMORY SAFETY ━━━
echo ""; echo "━━━ MEMORY SAFETY ━━━"
adds=$(grep -rn "addEventListener" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
removes=$(grep -rn "removeEventListener" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
if [ "$adds" -le "$removes" ]; then pass "Listener cleanup (add=$adds, remove=$removes)" "$adds/$removes"; else fail "Listener LEAK: $adds adds but only $removes removes" "$adds" "<=$removes"; fi

mounted=$(grep -rn "mountedRef" "$MOD/src/hooks/useAppState.ts" 2>/dev/null | wc -l)
check_gte "Unmount guard (mountedRef)" "$mounted" 5

timer_track=$(grep -c "timers.push" "$MOD/src/hooks/useAppState.ts" 2>/dev/null)
check_gte "Timer tracking (timers.push)" "$timer_track" 3

idle_cancel=$(grep -c "cancelIdleCallback" "$MOD/src/hooks/useAppState.ts" 2>/dev/null)
check_gte "IdleCallback cleanup" "$idle_cancel" 1

unbounded=$(grep -rn "_cache: {}" "$MOD/src/utils/" --include="*.ts" 2>/dev/null | wc -l)
check_zero "Unbounded in-memory caches" "$unbounded"

lru_count=$(grep -rn "new LRUCache" "$MOD/src/utils/" --include="*.ts" 2>/dev/null | wc -l)
check_gte "LRU bounded caches" "$lru_count" 4

evict_calls=$(grep -c "evictOldCache()" "$MOD/src/utils/liveData.ts" 2>/dev/null)
check_gte "localStorage eviction wired" "$evict_calls" 1

# ━━━ IMPORT SAFETY ━━━
echo ""; echo "━━━ IMPORT SAFETY ━━━"
missing_imports=0
for func in todayISO thisMonthISO offsetMonth formatMonth parseDDMMYYYY useDebouncedPersist useAsyncSearch logError logWarn pushCalcRoute pushHome getCurrentRoute forceReload updatePageMeta searchFunds getScheme searchStock searchFood; do
  files=$(grep -rln "\b$func\b" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "validate.ts\|logger.ts\|router.ts\|useCalcHelpers.ts\|NavContext.ts\|mfService.ts\|stockService.ts\|foodService.ts\|node_modules")
  for f in $files; do
    has=$(grep -c "import.*$func" "$f" 2>/dev/null)
    if [ "$has" -eq 0 ]; then
      echo -e "    ${RED}MISSING:${NC} $(basename $f) → $func"
      missing_imports=$((missing_imports + 1))
    fi
  done
done
check_zero "Missing imports (runtime crash)" "$missing_imports"

# .js/.jsx import extensions (must be zero in TypeScript project)
js_imports=$(grep -rn "from '.*\.js'\|from '.*\.jsx'" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
check_zero "Stale .js/.jsx import extensions" "$js_imports"

# Inline style tracking (decreasing target — track regression)
inline_styles=$(grep -rn "style={{" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
echo -e "  ${GREEN}📊${NC} Inline style={{}} count: $inline_styles (target: <400)"

# ━━━ TYPESCRIPT COMPLETENESS ━━━
echo ""; echo "━━━ TYPESCRIPT ━━━"
js_files=$(find "$MOD/src" -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l)
check_zero "Remaining .js/.jsx files" "$js_files"

allow_js=$(grep -c "allowJs" "$MOD/tsconfig.json" 2>/dev/null)
check_zero "allowJs in tsconfig (must stay out)" "$allow_js"

ts_nocheck=$(grep -rl "@ts-nocheck" "$MOD/src/" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)
total_ts=$(find "$MOD/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
typed=$((total_ts - ts_nocheck))
echo -e "  ${GREEN}📊${NC} Type-checked files: $typed / $total_ts (@ts-nocheck: $ts_nocheck — decreasing target)"

tsc_errors=$(cd "$MOD" && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l)
echo -e "  ${GREEN}📊${NC} TSC errors: $tsc_errors (decreasing target)"

c=$(grep -rn "confirm(" "$MOD/src/" --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
check_zero "Native confirm() dialogs" "$c"

c=$(grep -rn 'console\.error' "$MOD/src/components/ErrorBoundaries.tsx" "$MOD/src/components/CalcWrapper.tsx" 2>/dev/null | wc -l)
check_gte "Error boundary console.error" "$c" 3

c=$(grep -c "pure:.*console\.log" "$MOD/vite.config.ts" 2>/dev/null)
if [ "$c" -gt 0 ]; then pass "Vite preserves console.error" "yes"; else fail "Vite drops ALL console" "check esbuild config"; fi

# ━━━ SUMMARY ━━━
echo ""
echo "══════════════════════════════════════"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}PASS:${NC} $PASS  ${RED}FAIL:${NC} $FAIL  (total: $TOTAL checks)"
echo "══════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo -e "\n  ${RED}❌ QUALITY GATE FAILED — fix $FAIL issue(s) before deploying${NC}\n"
  exit 1
else
  echo -e "\n  ${GREEN}✅ QUALITY GATE PASSED — safe to build${NC}\n"
  exit 0
fi
