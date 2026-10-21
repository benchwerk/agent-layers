// Budget page: how much is left of the monthly budget.
function remaining(items, budget) {
  let spent = 0;
  for (const item of items) spent = spent + item.amount;
  return budget - spent;
}
module.exports = { remaining };
