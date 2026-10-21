// Expenses page: the list and the total.
function total(items) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}
module.exports = { total };
