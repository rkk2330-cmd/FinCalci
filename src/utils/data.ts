// FinCalci — Runtime data constants (typed)
// Large arrays for calculator registry, food database, unit conversions, etc.
// Separated from config constants (KEYS, API, FINANCE, etc.) for clarity.
import { tokens } from '../design/tokens';
import type { CalcMeta, UserStats } from '../types';

// ─── Calculator registry (20 tiles) ───
export const CALCULATORS: CalcMeta[] = [
  { id: "emi", icon: "🏠", label: "EMI", desc: "Loan EMI", color: tokens.color.primary },
  { id: "sip", icon: "📈", label: "SIP", desc: "SIP & Invest", color: "#6366F1" },
  { id: "gst", icon: "🧾", label: "GST", desc: "GST Calc", color: "#F59E0B" },
  { id: "tax", icon: "💰", label: "Tax", desc: "Income Tax", color: "#EC4899" },
  { id: "gold", icon: "🪙", label: "Gold", desc: "Gold & Silver", color: "#F59E0B" },
  { id: "currency", icon: "💱", label: "FX", desc: "Currency", color: "#8B5CF6" },
  { id: "fd", icon: "🏦", label: "FD/RD", desc: "FD & RD", color: "#14B8A6" },
  { id: "salary", icon: "💼", label: "Salary", desc: "CTC Breakup", color: "#06B6D4" },
  { id: "ppf", icon: "🏛️", label: "PPF", desc: "PPF & EPF", color: "#10B981" },
  { id: "compound", icon: "📊", label: "CI", desc: "Compound Interest", color: "#3B82F6" },
  { id: "retire", icon: "🏖️", label: "FIRE", desc: "Retirement", color: "#F97316" },
  { id: "bmi", icon: "⚖️", label: "BMI", desc: "Body Health", color: "#10B981" },
  { id: "percentage", icon: "➗", label: "%", desc: "Percentage", color: "#A855F7" },
  { id: "age", icon: "🎂", label: "Age", desc: "Age Calc", color: "#F43F5E" },
  { id: "date", icon: "📅", label: "Date", desc: "Date Calc", color: "#0EA5E9" },
  { id: "unit", icon: "📐", label: "Units", desc: "Converter", color: "#8B5CF6" },
  { id: "cash", icon: "💵", label: "Cash", desc: "Khata Book", color: "#22C55E" },
  { id: "tip", icon: "🍽️", label: "Split", desc: "Bill Split", color: "#F59E0B" },
  { id: "expense", icon: "📒", label: "Expense", desc: "Tracker", color: "#EF4444" },
  { id: "calorie", icon: "🥗", label: "Calories", desc: "Food Track", color: "#22C55E" },
];

// ─── Achievements ───
export const ACHIEVEMENTS = [
  { id: "first_calc", icon: "🧮", title: "First Calc!", desc: "Complete your first calculation", check: (s: UserStats) => (s.totalCalcs ?? 0) >= 1 },
  { id: "five_calcs", icon: "🔥", title: "On Fire", desc: "5 calculations done", check: (s: UserStats) => (s.totalCalcs ?? 0) >= 5 },
  { id: "explorer", icon: "🗺️", title: "Explorer", desc: "Try 5 different types", check: (s: UserStats) => (s.uniqueCalcs ?? 0) >= 5 },
  { id: "all_star", icon: "🌟", title: "All Star", desc: "Try all 20 calculators", check: (s: UserStats) => (s.uniqueCalcs ?? 0) >= 20 },
  { id: "streak_3", icon: "📆", title: "3-Day Streak", desc: "Use FinCalci 3 days in a row", check: (s: UserStats) => (s.streak ?? 0) >= 3 },
  { id: "streak_7", icon: "🏆", title: "Weekly Warrior", desc: "7-day streak!", check: (s: UserStats) => (s.streak ?? 0) >= 7 },
  { id: "saver_10", icon: "💾", title: "Data Saver", desc: "Save 10 results", check: (s: UserStats) => (s.saved ?? 0) >= 10 },
];

// ─── Daily tips rotation ───
const TIPS = [
  "Tap any number on a slider to type exact values 💡",
  "Swipe left/right on a calculator to switch quickly ↔️",
  "Your data is saved automatically — works offline too 📴",
  "Try the Khata Book for tracking credit/debit with customers 📒",
  "Compare bank EMI rates side by side 🏦",
  "Use the SIP step-up calculator for realistic projections 📈",
  "Export any calculation as a PDF report 📄",
  "Gold calculator shows live prices from India markets 🪙",
  "Track your daily calories with the food search 🥗",
  "Set monthly budgets in the Expense Tracker 💰",
];
export const getTodayTip = (): string => TIPS[new Date().getDate() % TIPS.length];

// ─── Month names (for DatePicker) ───
export const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

// ─── Food database (CalorieTracker) ───
export const FOOD_DB = [
  {name:"Rice (1 cup, 158g)",cal:205,p:4.3,c:45,f:0.4},{name:"Chapati (1 pc, 40g)",cal:104,p:3.5,c:18,f:2.5},
  {name:"Dal (1 cup, 198g)",cal:230,p:12,c:34,f:1},{name:"Chicken Breast (100g)",cal:165,p:31,c:0,f:3.6},
  {name:"Paneer (100g)",cal:265,p:18,c:1.2,f:21},{name:"Egg (1 boiled, 50g)",cal:78,p:6.3,c:0.6,f:5.3},
  {name:"Banana (1 med, 118g)",cal:105,p:1.3,c:27,f:0.4},{name:"Apple (1 med, 182g)",cal:95,p:0.5,c:25,f:0.3},
  {name:"Milk (1 cup, 244g)",cal:149,p:8,c:12,f:8},{name:"Curd (1 cup, 245g)",cal:149,p:8.5,c:11,f:8},
  {name:"Idli (1 pc, 35g)",cal:39,p:1,c:8,f:0.2},{name:"Dosa (1 plain, 80g)",cal:133,p:4,c:19,f:5},
  {name:"Paratha (1 pc, 60g)",cal:200,p:4,c:23,f:10},{name:"Poha (1 cup, 180g)",cal:250,p:5,c:42,f:7},
  {name:"Upma (1 cup, 200g)",cal:210,p:5,c:30,f:8},{name:"Samosa (1 pc, 70g)",cal:262,p:4,c:24,f:17},
  {name:"Biryani (1 cup, 200g)",cal:250,p:10,c:35,f:8},{name:"Rajma (1 cup, 180g)",cal:225,p:15,c:40,f:1},
  {name:"Chole (1 cup, 180g)",cal:240,p:12,c:38,f:5},{name:"Oats (1 cup, 234g)",cal:154,p:6,c:27,f:2.5},
  {name:"Toast (1 slice, 30g)",cal:79,p:3,c:13,f:1},{name:"Almonds (10 pcs, 14g)",cal:69,p:2.5,c:2.5,f:6},
  {name:"Salad (1 bowl, 150g)",cal:45,p:2,c:8,f:0.5},{name:"Palak Paneer (1 cup)",cal:192,p:10,c:8,f:13},
  {name:"Butter Chicken (1 cup)",cal:320,p:28,c:10,f:18},{name:"Naan (1 pc, 90g)",cal:262,p:9,c:43,f:5},
  {name:"Lassi (1 glass, 250ml)",cal:170,p:6,c:24,f:5},{name:"Tea w/ Milk (1 cup)",cal:50,p:2,c:6,f:2},
  {name:"Coffee w/ Milk (1 cup)",cal:60,p:2,c:7,f:2.5},{name:"Protein Shake (1 scoop)",cal:120,p:24,c:3,f:1},
  {name:"Pizza Slice (1 pc)",cal:285,p:12,c:36,f:10},{name:"Burger (1 regular)",cal:354,p:17,c:29,f:19},
  {name:"French Fries (med)",cal:365,p:4,c:48,f:17},{name:"Ice Cream (1 scoop)",cal:137,p:2.3,c:16,f:7},
  {name:"Maggi (1 pack, 70g)",cal:313,p:7.5,c:44,f:12},{name:"Khichdi (1 cup, 200g)",cal:200,p:7,c:32,f:5},
  {name:"Sprouts (1 cup, 100g)",cal:85,p:7,c:14,f:0.5},{name:"Peanut Butter (1 tbsp)",cal:94,p:4,c:3.6,f:8},
  {name:"Mango (1 med, 200g)",cal:135,p:1.1,c:35,f:0.6},{name:"Watermelon (1 cup)",cal:46,p:0.9,c:11.5,f:0.2},
  {name:"Gulab Jamun (2 pcs)",cal:300,p:4,c:42,f:14},{name:"Rasgulla (2 pcs)",cal:190,p:3,c:38,f:2},
  {name:"Jalebi (50g)",cal:200,p:2,c:35,f:7},
] as const;

export const MEALS = [
  {id:"breakfast",icon:"🌅",label:"Breakfast"},
  {id:"lunch",icon:"☀️",label:"Lunch"},
  {id:"dinner",icon:"🌙",label:"Dinner"},
  {id:"snacks",icon:"🍿",label:"Snacks"},
] as const;

// ─── Expense categories ───
export const EXP_CATEGORIES = [
  {id:"food",label:"Food",icon:"🍔",color:"#F59E0B"},{id:"transport",label:"Transport",icon:"🚗",color:"#6366F1"},
  {id:"shopping",label:"Shopping",icon:"🛍️",color:"#EC4899"},{id:"bills",label:"Bills",icon:"📄",color:"#8B5CF6"},
  {id:"health",label:"Health",icon:"🏥",color:"#EF4444"},{id:"education",label:"Education",icon:"📚",color:"#3B82F6"},
  {id:"entertainment",label:"Entertainment",icon:"🎬",color:"#F97316"},{id:"rent",label:"Rent",icon:"🏠",color:"#14B8A6"},
  {id:"travel",label:"Travel",icon:"✈️",color:"#06B6D4"},{id:"groceries",label:"Groceries",icon:"🥬",color:"#22C55E"},
  {id:"emi",label:"EMI/Loan",icon:"🏦",color:"#A855F7"},{id:"investment",label:"Investment",icon:"📈",color:"#10B981"},
  {id:"gifts",label:"Gifts",icon:"🎁",color:"#F43F5E"},{id:"other",label:"Other",icon:"📦",color:"#64748B"},
] as const;
export const PAY_MODES = ["Cash","UPI","Card","Net Banking","Wallet","Other"] as const;
export const QUICK_AMTS = [50,100,200,500,1000,2000,5000] as const;

// ─── Unit converter categories ───
export const UNIT_CATS = [
  {name:"Length",icon:"📏",label:"Length",units:["Meter","Kilometer","Centimeter","Millimeter","Mile","Yard","Foot","Inch","Nautical Mile"],factors:{Meter:1,Kilometer:1000,Centimeter:0.01,Millimeter:0.001,Mile:1609.344,Yard:0.9144,Foot:0.3048,Inch:0.0254,"Nautical Mile":1852}},
  {name:"Weight",icon:"⚖️",label:"Weight",units:["Kilogram","Gram","Milligram","Metric Ton","Pound","Ounce","Stone","Tola"],factors:{Kilogram:1,Gram:0.001,Milligram:0.000001,"Metric Ton":1000,Pound:0.453592,Ounce:0.0283495,Stone:6.35029,Tola:0.011664}},
  {name:"Temperature",icon:"🌡️",label:"Temp",units:["Celsius","Fahrenheit","Kelvin"],factors:{}},
  {name:"Area",icon:"📐",label:"Area",units:["Sq Meter","Sq Kilometer","Hectare","Acre","Sq Foot","Sq Yard","Sq Mile"],factors:{"Sq Meter":1,"Sq Kilometer":1e6,Hectare:10000,Acre:4046.86,"Sq Foot":0.092903,"Sq Yard":0.836127,"Sq Mile":2.59e6}},
  {name:"Volume",icon:"🧪",label:"Volume",units:["Liter","Milliliter","Cubic Meter","Gallon (US)","Quart","Pint","Cup","Fl Oz"],factors:{Liter:1,Milliliter:0.001,"Cubic Meter":1000,"Gallon (US)":3.78541,Quart:0.946353,Pint:0.473176,Cup:0.236588,"Fl Oz":0.0295735}},
  {name:"Speed",icon:"💨",label:"Speed",units:["m/s","km/h","mph","knots"],factors:{"m/s":1,"km/h":0.277778,mph:0.44704,knots:0.514444}},
  {name:"Time",icon:"⏱️",label:"Time",units:["Second","Minute","Hour","Day","Week","Month","Year"],factors:{Second:1,Minute:60,Hour:3600,Day:86400,Week:604800,Month:2629746,Year:31557600}},
  {name:"Digital",icon:"💾",label:"Digital",units:["Bit","Byte","Kilobyte","Megabyte","Gigabyte","Terabyte"],factors:{Bit:1,Byte:8,Kilobyte:8192,Megabyte:8388608,Gigabyte:8589934592,Terabyte:8.796e12}},
  {name:"Fuel Economy",icon:"⛽",label:"Fuel",units:["km/L","L/100km","mpg"],factors:{}},
  {name:"Pressure",icon:"🔵",label:"Pressure",units:["Pascal","Bar","PSI","Atmosphere","Torr"],factors:{Pascal:1,Bar:100000,PSI:6894.76,Atmosphere:101325,Torr:133.322}},
  {name:"Energy",icon:"⚡",label:"Energy",units:["Joule","Calorie","kWh","BTU","eV"],factors:{Joule:1,Calorie:4.184,kWh:3.6e6,BTU:1055.06,eV:1.602e-19}},
  {name:"Power",icon:"🔋",label:"Power",units:["Watt","Kilowatt","Horsepower","BTU/hr"],factors:{Watt:1,Kilowatt:1000,Horsepower:745.7,"BTU/hr":0.293071}},
  {name:"Number Base",icon:"#️⃣",label:"Number",units:["Decimal","Binary","Octal","Hex"],factors:{}},
] as const;

// ─── Cash denominations (India) ───
export const DENOMINATIONS = [
  {label:"₹2000",value:2000},{label:"₹500",value:500},{label:"₹200",value:200},
  {label:"₹100",value:100},{label:"₹50",value:50},{label:"₹20",value:20},
  {label:"₹10",value:10},{label:"₹5",value:5},{label:"₹2",value:2},{label:"₹1",value:1},
] as const;
