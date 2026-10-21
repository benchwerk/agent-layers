// Monthly report page: total per category.
function totalsByCategory(items) {
  const cents = {};
  for (const item of items) {
    cents[item.category] = (cents[item.category] || 0) + Math.round(Number(item.amount) * 100);
  }
  const out = {};
  for (const category in cents) out[category] = cents[category] / 100;
  return out;
}
module.exports = { totalsByCategory };
