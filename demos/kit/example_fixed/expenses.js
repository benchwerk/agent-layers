// Expenses page: the list and the total.
function total(items) {
  const cents = items.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0);
  return cents / 100;
}
module.exports = { total };
