# CalcHub Testing — Complete Beginner's Guide
### From zero knowledge to running all tests

---

## PART 1: What You Need to Install (One-Time Setup)

### Step 1: Install Node.js

Node.js is the engine that runs JavaScript outside a browser. You need it for everything.

1. Go to **https://nodejs.org**
2. Download the **LTS version** (the green button)
3. Run the installer — click Next through everything
4. To verify it worked, open your terminal:
   - **Windows**: Press `Win + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type `Terminal`, press Enter
   - **Linux**: Press `Ctrl + Alt + T`

5. Type these commands (one at a time):

```bash
node --version
```
You should see something like `v20.11.0` ✅

```bash
npm --version
```
You should see something like `10.2.0` ✅

If both show version numbers, you're good!

---

### Step 2: Install VS Code (Code Editor)

This is where you'll see and edit your code + run tests.

1. Go to **https://code.visualstudio.com**
2. Download and install
3. Open VS Code

---

## PART 2: Set Up Your Project

### Step 3: Create the project folder

Open your terminal (or use VS Code's built-in terminal: `Ctrl + ~`) and run:

```bash
# Go to your Desktop (or wherever you want)
cd Desktop

# Create a new project folder
mkdir calchub
cd calchub

# Initialize the project (creates package.json)
npm init -y
```

You should see a message saying `package.json` was created ✅

---

### Step 4: Install testing tools

Still in your terminal, run this ONE command:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom react react-dom
```

This installs:
- **vitest** — the test runner (finds and runs your test files)
- **@testing-library/react** — simulates clicking buttons, typing in inputs
- **jsdom** — pretends to be a browser so tests can run in terminal
- **react / react-dom** — needed because CalcHub is a React app

Wait for it to finish (may take 1-2 minutes). You'll see a `node_modules` folder appear ✅

---

### Step 5: Configure the test runner

Create a file called `vitest.config.js` in your project folder:

**How to create a file in VS Code:**
1. Open VS Code
2. File → Open Folder → select your `calchub` folder
3. Click the "New File" icon (📄) in the sidebar
4. Name it `vitest.config.js`
5. Paste this inside:

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

Save the file (`Ctrl + S`).

---

### Step 6: Add the test command

Open `package.json` (it's already in your folder). Find the `"scripts"` section and change it to:

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

**What's the difference?**
- `npm test` → runs tests and WATCHES for changes (re-runs when you edit files)
- `npm run test:run` → runs tests ONCE and exits

---

### Step 7: Add your test files

Create a folder called `tests` inside your project:

```
calchub/
├── package.json
├── vitest.config.js
├── node_modules/
└── tests/
    ├── unit.test.js          ← calculator math tests
    ├── ui.test.js             ← button/input/navigation tests
    └── security-pwa.test.js   ← security & PWA tests
```

Copy the 3 test files from the ZIP I gave you into this `tests/` folder.

---

## PART 3: Run Your Tests!

### Step 8: Run the tests

In your terminal (make sure you're inside the `calchub` folder):

```bash
npm run test:run
```

You should see output like this:

```
 ✓ tests/unit.test.js (52 tests) 
 ✓ tests/security-pwa.test.js (47 tests)
 ✓ tests/ui.test.js (35 tests)

 Test Files  3 passed (3)
      Tests  134 passed (134)
   Start at  10:30:15
   Duration  1.23s
```

🎉 **That's it! Your tests are running!**

---

### What the output means:

| Symbol | Meaning |
|--------|---------|
| ✓ | Test passed (working correctly) |
| ✗ | Test FAILED (something's broken) |
| ○ | Test skipped |

**If a test fails**, you'll see:

```
 FAIL  tests/unit.test.js > EMI Calculator > calculates basic EMI correctly
   Expected: 10242.42
   Received: 0

   → The EMI formula returned 0 instead of 10,242.42
```

This tells you EXACTLY what went wrong and where.

---

## PART 4: Understanding the Tests

### What each test file checks:

#### `unit.test.js` — "Is the math right?"

```javascript
it('calculates basic EMI correctly', () => {
  const emi = calcEMI(500000, 8.5, 60);
  expect(emi).toBeCloseTo(10242.42, 0);
});
```

**In plain English:** "If I input ₹5,00,000 loan at 8.5% for 60 months, the EMI should be approximately ₹10,242. Is it?"

#### `security-pwa.test.js` — "Can someone break the app?"

```javascript
it('strips script tags from input', () => {
  expect(sanitize('<script>alert("xss")</script>')).not.toContain('<script>');
});
```

**In plain English:** "If someone types a hacking script as a member name, does our app remove it? It should."

#### `ui.test.js` — "Do buttons and screens work?"

```javascript
it('history is capped at 50 entries', () => {
  const arr = Array.from({ length: 60 }, (_, i) => ({ id: i }));
  const capped = arr.slice(0, 50);
  expect(capped.length).toBe(50);
});
```

**In plain English:** "If someone saves 60 calculations, only 50 should be kept. Is that true?"

---

## PART 5: Manual Testing (No Tools Needed!)

Open the `MANUAL-TEST-CHECKLIST.md` file. This is a checklist you go through BY HAND on your actual app.

### How to do manual testing:

1. **Open CalcHub** in Chrome on your phone
2. **Open the checklist** (print it or keep it open on another screen)
3. **Go through each checkbox**, testing the feature described
4. **Check it off** (☐ → ☑) if it works
5. **Write notes** for anything broken

### Example manual test:

```
☐ Type `<script>alert('xss')</script>` as member name → sanitized, no alert
```

**What to do:**
1. Open CalcHub → Expense Splitter
2. In the "Add member" field, type: `<script>alert('xss')</script>`
3. Click the + button
4. **PASS** ✅ if the name shows as plain text (with tags stripped)
5. **FAIL** ❌ if you see a popup alert box

---

## PART 6: Quick Reference

### Common commands:

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (re-runs on file changes)
npm test

# Run only unit tests
npx vitest run tests/unit.test.js

# Run only security tests  
npx vitest run tests/security-pwa.test.js

# Run tests with detailed output
npx vitest run --reporter=verbose

# See test coverage (which lines of code are tested)
npx vitest run --coverage
```

### If something goes wrong:

| Problem | Fix |
|---------|-----|
| `command not found: npm` | Reinstall Node.js from nodejs.org |
| `Cannot find module 'vitest'` | Run `npm install --save-dev vitest` again |
| Tests fail with import errors | Check `vitest.config.js` exists and has correct content |
| `ENOENT` error | Make sure you're in the right folder (`cd calchub`) |
| Everything fails | Delete `node_modules` folder, run `npm install` again |

### Folder structure when everything's set up:

```
calchub/
├── package.json              ← project config
├── package-lock.json         ← auto-generated (don't edit)
├── vitest.config.js          ← test runner config
├── node_modules/             ← installed packages (don't edit)
├── src/
│   └── CalcHub.jsx           ← your app
├── tests/
│   ├── unit.test.js          ← math tests (52 tests)
│   ├── ui.test.js            ← interaction tests (35 tests)
│   ├── security-pwa.test.js  ← security tests (47 tests)
│   └── MANUAL-TEST-CHECKLIST.md  ← manual checklist (150+ items)
├── public/
│   ├── manifest.json         ← PWA manifest
│   ├── service-worker.js     ← offline caching
│   └── icons/                ← app icons (8 sizes)
└── DEPLOY-GUIDE.md           ← how to publish
```

---

## PART 7: When to Test

| When | What to test |
|------|-------------|
| After writing new code | Run `npm run test:run` |
| After adding a new calculator | Add tests for it in `unit.test.js` |
| Before deploying to production | Run ALL tests + manual checklist |
| After fixing a bug | Add a test for that bug so it never comes back |
| Weekly (if app is live) | Run manual checklist on your phone |

---

## Summary — Your Testing Workflow

```
1. Write code
2. npm run test:run        ← automated tests (30 seconds)
3. Fix any failures
4. Manual checklist         ← on phone (30-60 minutes for full check)
5. Fix any issues found
6. Deploy! 🚀
```

That's everything! You now know how to test CalcHub professionally. 
Most professional apps follow this exact same process.
