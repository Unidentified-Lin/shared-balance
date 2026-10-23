(function (root) {
  const money = n => Math.max(0, Math.min(1e9, Math.round(Number(n) || 0)));
  function calculate(incomes, minimums, total, requested) {
    const sum = incomes[0] + incomes[1];
    const incomeRatio = sum ? incomes[0] / sum * 100 : 50;
    const capacity = incomes.map((v, i) => v - minimums[i]);
    const feasible = capacity.every(v => v >= 0) && capacity[0] + capacity[1] >= total;
    const lowAmount = Math.max(0, total - capacity[1]);
    const highAmount = Math.min(total, capacity[0]);
    const low = total ? lowAmount / total * 100 : 0;
    const high = total ? highAmount / total * 100 : 100;
    const target = requested == null ? incomeRatio : Math.max(0, Math.min(100, requested));
    const ratio = feasible ? Math.max(low, Math.min(high, target)) : target;
    const a = Math.round(total * ratio / 100);
    const expenses = feasible ? [a, total - a] : [null, null];
    return { incomeRatio, ratio, low, high, feasible, expenses,
      remaining: expenses.map((v, i) => v == null ? null : incomes[i] - v),
      adjusted: feasible && Math.abs(target - ratio) > 1e-7,
      shortfall: Math.max(0, total - Math.max(0, capacity[0]) - Math.max(0, capacity[1])),
      minimumShortfall: capacity.map(v => Math.max(0, -v)) };
  }
  const percent = n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  function simulate(incomes, minimums, total, base, raises, mode, retention = [40, 40]) {
    const raised = incomes.map((v, i) => v + raises[i]);
    if (mode !== 'retain') return calculate(raised, minimums, total, mode === 'fixed' ? base.ratio : null);
    const guaranteed = raises.map((v, i) => Math.ceil(v * percent(retention[i]) / 100));
    if (!base.feasible) {
      return { ...calculate(raised, minimums, total, null), feasible: false,
        expenses: [null, null], remaining: [null, null], reason: 'no_baseline', guaranteed };
    }
    const floors = minimums.map((v, i) => Math.max(v, base.remaining[i] + guaranteed[i]));
    return { ...calculate(raised, floors, total, null), guaranteed, floors };
  }
  const api = { money, percent, calculate, simulate };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Budget = api;
})(typeof window !== 'undefined' ? window : globalThis);
