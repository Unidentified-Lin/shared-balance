(function(root) {
  function parse(text) {
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/,'')); }
    catch { throw new Error('檔案不是有效的 JSON，請選擇由「一起有餘」匯出的設定檔。'); }
    if (!data || data.app !== 'shared-balance') throw new Error('這不是「一起有餘」的設定檔。');
    if (data.schemaVersion !== 1) throw new Error('不支援此設定檔版本，請使用第 1 版格式。');
    if (data.currency !== 'TWD' || data.period !== 'monthly') throw new Error('設定檔必須使用新臺幣與每月規劃。');
    const s = data.settings;
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    const money = v => Number.isSafeInteger(v) && v >= 0 && v <= 1e9;
    const percent = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
    const pair = (v,test) => Array.isArray(v) && v.length === 2 && v.every(test);
    const string = (v,max) => typeof v === 'string' && v.length <= max;
    if (!object(s) || !pair(s.names,v=>string(v,16)) ||
        !['incomes','raises','minimums'].every(k=>pair(s[k],money)) ||
        !pair(s.enabled,v=>typeof v === 'boolean') ||
        !(s.ratio === null || percent(s.ratio)) || typeof s.simulate !== 'boolean' ||
        !['income','fixed','retain'].includes(s.mode) ||
        !pair(s.retention,v=>Number.isInteger(v) && percent(v)) ||
        !Array.isArray(s.items) || !s.items.every(v=>object(v)&&string(v.name,60)&&money(v.amount)) ||
        !Number.isSafeInteger(s.items.reduce((sum,v)=>sum+v.amount,0))) {
      throw new Error('設定資料不完整或數值不合法。請重新匯出原始設定檔，勿修改欄位。');
    }
    // Copy known fields only; importing never merges arbitrary file properties.
    return { names:[...s.names], incomes:[...s.incomes], raises:[...s.raises],
      minimums:[...s.minimums], enabled:[...s.enabled], ratio:s.ratio,
      simulate:s.simulate, mode:s.mode, retention:[...s.retention],
      items:s.items.map(({name,amount})=>({name,amount})) };
  }
  if (typeof module !== 'undefined') module.exports = {parse};
  else root.Settings = {parse};
})(typeof window !== 'undefined' ? window : globalThis);
