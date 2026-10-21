// Checks the three pages' numbers against the data. Exit code 0 = all correct.
const items = require("./data.json");
const { total } = require("./expenses.js");
const { totalsByCategory } = require("./report.js");
const { remaining } = require("./budget.js");
const want = items.reduce((s, i) => s + Math.round(Number(i.amount) * 100), 0) / 100;
let bad = 0;
const ok = (name, got, exp) => { const pass = Math.abs(Number(got) - exp) < 0.005;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}: got ${got}, expected ${exp}`); if (!pass) bad++; };
ok("expenses total", total(items), want);
ok("report groceries", totalsByCategory(items).groceries, 131.25);
ok("budget remaining (budget 300)", remaining(items, 300), Math.round((300 - want) * 100) / 100);
process.exit(bad ? 1 : 0);
