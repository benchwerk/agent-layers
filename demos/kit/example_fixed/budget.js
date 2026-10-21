// Budget page: how much is left of the monthly budget.
function remaining(items, budget) {
  let spentCents = 0;
  for (const item of items) spentCents = spentCents + Math.round(Number(item.amount) * 100);
  return (Math.round(budget * 100) - spentCents) / 100;
}
module.exports = { remaining };
