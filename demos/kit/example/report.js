// Monthly report page: total per category.
function totalsByCategory(items) {
  const out = {};
  for (const item of items) {
    out[item.category] = (out[item.category] || 0) + item.amount;
  }
  return out;
}
module.exports = { totalsByCategory };
