const $ = id => document.getElementById(id);
const defaults = () => ({ names: ['夥伴 A', '夥伴 B'], incomes: [60000, 45000], raises: [5000, 3000], minimums: [20000, 20000], enabled: [true, true], ratio: null, simulate: false, mode: 'income', retention: [40,40], items: [{name:'房租 / 房貸',amount:18000},{name:'日常伙食',amount:10000},{name:'水電瓦斯',amount:2500},{name:'網路與通訊',amount:1500},{name:'生活用品',amount:3000}] });
const KEY = 'together-budget-v1';
// Preserve the existing storage key so a product rename keeps saved settings.
let state = defaults(), storageAvailable = true;
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (s && Array.isArray(s.items) && ['incomes','raises','minimums','names','enabled'].every(k => Array.isArray(s[k]) && s[k].length === 2)) {
    state = {...state, ...s, items:s.items.filter(x=>x && typeof x.name==='string').map(x=>({name:x.name.slice(0,60),amount:Budget.money(x.amount)}))};
    ['incomes','raises','minimums'].forEach(k => state[k] = state[k].map(Budget.money));
    state.names = state.names.map(x => String(x).slice(0,16));
    state.enabled = state.enabled.map(Boolean);
    state.ratio = state.ratio == null ? null : Math.max(0,Math.min(100,Number(state.ratio)||0));
    state.simulate = !!state.simulate;
    state.mode = ['fixed','retain'].includes(state.mode) ? state.mode : 'income';
  }
} catch { storageAvailable = false; }
state.retention = Array.isArray(state.retention) && state.retention.length === 2 ? state.retention.map(Budget.percent) : [40,40];
const fmt = n => Math.round(n).toLocaleString('zh-TW');
const pct = n => Number(n.toFixed(2)).toString();
let base, future;
function save() {
  try { localStorage.setItem(KEY,JSON.stringify(state)); }
  catch { storageAvailable = false; }
  $('saveState').textContent = storageAvailable ? '已自動儲存 · 僅限此瀏覽器' : '無法儲存 · 關閉後資料將遺失';
}
function compared(el, before, after, suffix = '') {
  el.replaceChildren();
  if (before == null) el.append(document.createTextNode('—'));
  else el.append(document.createTextNode(fmt(before) + suffix));
  if (state.simulate && after != null) {
    const delta = document.createElement('span');
    delta.className = 'delta' + (before != null && after < before ? ' negative' : '');
    delta.textContent = before == null ? ' → ' + fmt(after) + suffix : (after >= before ? '＋' : '−') + fmt(Math.abs(after-before)) + suffix;
    el.append(delta);
  } else if (state.simulate && after == null) {
    const delta = document.createElement('span'); delta.className='delta negative';delta.textContent=' → 無可行分配';el.append(delta);
  }
}
function syncInputs() {
  for (let i=0;i<2;i++) {
    $('name'+i).value = state.names[i];
    $('income'+i).value = state.incomes[i]; $('raise'+i).value = state.raises[i];
    $('min'+i).value = state.minimums[i]; $('enableMin'+i).checked = state.enabled[i];
    $('retention'+i).value = (state.retention || [40,40])[i];
  }
  $('simulate').checked = state.simulate; $('scenarioMode').value = state.mode;
}
function render() {
  const total = state.items.reduce((s,x)=>s+x.amount,0);
  const minimums = state.minimums.map((v,i)=>state.enabled[i]?v:0);
  base = Budget.calculate(state.incomes,minimums,total,state.ratio);
  const raised = state.incomes.map((v,i)=>v+(state.simulate?state.raises[i]:0));
  future = Budget.simulate(state.incomes,minimums,total,base,state.simulate ? state.raises : [0,0],state.mode,state.retention);
  const retaining = state.simulate && state.mode === 'retain';
  document.body.classList.toggle('retain-mode',retaining);
  const active = state.simulate ? future : base;
  $('total').textContent = fmt(total); $('itemCount').textContent = state.items.length;
  $('dialogTotal').textContent = 'NT$ ' + fmt(total);
  document.querySelectorAll('.label-a').forEach(el=>el.textContent=state.names[0]||'A');
  document.querySelectorAll('.label-b').forEach(el=>el.textContent=state.names[1]||'B');
  $('incomeRatioText').textContent = pct(base.incomeRatio) + ' : ' + pct(100-base.incomeRatio) + (state.simulate ? ' → '+pct(future.incomeRatio)+' : '+pct(100-future.incomeRatio) : '');
  $('incomeRatioBar').firstElementChild.style.width = pct(state.simulate?future.incomeRatio:base.incomeRatio)+'%';
  const stripe = $('incomeRatioBar').lastElementChild;
  stripe.style.left = Math.min(base.incomeRatio,future.incomeRatio)+'%';
  stripe.style.width = (state.simulate?Math.abs(future.incomeRatio-base.incomeRatio):0)+'%';
  const max = Math.max(1,...raised,...state.incomes);
  for(let i=0;i<2;i++) {
    $('retentionField'+i).hidden = !retaining;
    $('retentionNote'+i).textContent = !base.feasible ? '先讓原始計畫符合保留金額底線' : '至少多留 '+fmt(future.guaranteed?.[i] || 0)+' 元給自己';
    $('min'+i).disabled = !state.enabled[i];
    $('incomeViz'+i).innerHTML = '<span></span><i></i>';
    $('incomeViz'+i).firstElementChild.style.width = state.incomes[i]/max*100+'%';
    $('incomeViz'+i).lastElementChild.style.width = (state.simulate?state.raises[i]:0)/max*100+'%';
    $('incomeNote'+i).textContent = state.simulate ? 'NT$ '+fmt(state.incomes[i])+' ＋ '+fmt(state.raises[i])+' · 斜線為加薪差額' : '占家庭收入 '+pct(i===0?base.incomeRatio:100-base.incomeRatio)+'%';
    compared($('expense'+i),base.expenses[i],future.expenses[i]);
    compared($('remaining'+i),base.remaining[i],future.remaining[i]);
    const remain = active.remaining[i];
    $('remainNote'+i).textContent = remain == null ? '目前無法滿足最低保留金額條件' : state.enabled[i] ? '高於保留金額底線 '+fmt(remain-minimums[i])+' 元' : '收入扣除家庭分攤後的金額';
  }
  // The controls always edit the original plan. The simulation is an explicit comparison.
  $('ratioA').value = pct(base.ratio); $('ratioB').value = pct(100-base.ratio);
  $('split').value = base.ratio;
  ['ratioA','ratioB','split'].forEach(id=>$(id).disabled=!base.feasible || total===0);
  const lo = base.feasible ? base.low : 0, hi = base.feasible ? base.high : 0;
  $('allowedTrack').style.background = `linear-gradient(to right,#e0e4dc 0% ${lo}%,#89a2b4 ${lo}% ${base.ratio}%,#d6b18e ${base.ratio}% ${hi}%,#e0e4dc ${hi}% 100%)`;
  $('split').setAttribute('aria-valuetext',pct(base.ratio)+'%，可調範圍 '+pct(lo)+' 至 '+pct(hi)+'%');
  let text;
  if (!base.feasible) text = problem(base);
  else if (!total) text = '尚無家庭支出；新增明細後即可調整比例。';
  else text = '⌑ A 可分攤 '+pct(lo)+'% – '+pct(hi)+'%'+(base.adjusted?' · 已依保留金額底線限制比例':' · 保障彼此的保留金額');
  $('constraint').textContent=text; $('constraint').classList.toggle('error',!base.feasible);
  const sum = state.incomes[0]+state.incomes[1]-total;
  compared($('houseRemaining'),sum,raised[0]+raised[1]-total);
  $('extraTotal').textContent = '＋'+fmt(state.simulate?state.raises[0]+state.raises[1]:0)+' 元';
  $('scenarioMode').disabled=!state.simulate;
  $('scenarioNote').classList.toggle('error',state.simulate&&!future.feasible);
  const modeLabel = {income:'依新收入重算',fixed:'維持原分攤比例',retain:'加薪保留比例'}[state.mode];
  $('scenarioNote').textContent = !state.simulate ? '開啟加薪模擬，數字將以「原金額 ＋／− 差額」呈現；加薪不會覆蓋原始收入。' : future.reason === 'no_baseline' ? '原始計畫無可行分配，無法計算加薪保留基準。請先調整原始收入、支出或個人最低保留金額；也可切換其他模擬模式。' : !future.feasible ? '加薪後仍無法分攤：'+problem(future) : '加薪後分攤 '+pct(future.ratio)+'% / '+pct(100-future.ratio)+'%（'+modeLabel+'）'+(retaining ? '。先保障原結餘＋約定加薪，再依新收入分配；實際保留可更多。' : (future.adjusted?'，已依個人最低保留金額調整。':'。')+'上方拖桿調整原始計畫；加薪結果以差額呈現。');
  save();
}
function problem(result) {
  const parts = result.minimumShortfall.map((v,i)=>v ? (state.names[i] || (i?'B':'A'))+' 收入低於最低保留金額 '+fmt(v)+' 元' : '').filter(Boolean);
  if(result.shortfall) parts.push('家庭支出尚缺 '+fmt(result.shortfall)+' 元');
  return parts.join('；')+'。請調整收入、支出或個人最低保留金額。';
}
function setRatio(value) {
  if (!base.feasible) return;
  state.ratio = Math.max(base.low,Math.min(base.high,Number(value)||0)); render();
}
for(let i=0;i<2;i++) {
  $('retention'+i).addEventListener('input',e=>{state.retention[i]=Budget.percent(e.target.value);render()});
  $('retention'+i).addEventListener('change',e=>{e.target.value=state.retention[i]});
  $('name'+i).addEventListener('input',e=>{state.names[i]=e.target.value;render()});
  [['income','incomes'],['raise','raises'],['min','minimums']].forEach(([id,key])=>{
    $(id+i).addEventListener('input',e=>{state[key][i]=Budget.money(e.target.value);render()});
    $(id+i).addEventListener('change',e=>e.target.value=state[key][i]);
  });
  $('enableMin'+i).addEventListener('change',e=>{state.enabled[i]=e.target.checked;render()});
}
$('split').addEventListener('input',e=>setRatio(e.target.value));
$('ratioA').addEventListener('change',e=>setRatio(e.target.value));
$('ratioB').addEventListener('change',e=>setRatio(100-Number(e.target.value)));
$('useIncome').addEventListener('click',()=>{state.ratio=null;render()});
$('simulate').addEventListener('change',e=>{state.simulate=e.target.checked;render()});
$('scenarioMode').addEventListener('change',e=>{state.mode=e.target.value;render()});
function renderItems() {
  $('itemsList').replaceChildren();
  if(!state.items.length){const p=document.createElement('p');p.className='empty';p.textContent='還沒有支出，從第一筆生活日常開始。';$('itemsList').append(p);}
  state.items.forEach((item,i)=>{
    const row=document.createElement('div');row.className='item-row';
    const name=document.createElement('input');name.value=item.name;name.maxLength=60;name.placeholder='支出項目';name.setAttribute('aria-label','第 '+(i+1)+' 筆支出名稱');name.addEventListener('input',()=>{item.name=name.value;save()});
    const amount=document.createElement('input');amount.type='number';amount.min=0;amount.max=1e9;amount.step=1;amount.value=item.amount;amount.setAttribute('aria-label','第 '+(i+1)+' 筆支出金額');amount.addEventListener('input',()=>{item.amount=Budget.money(amount.value);render()});amount.addEventListener('change',()=>amount.value=item.amount);
    const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','刪除第 '+(i+1)+' 筆支出');remove.addEventListener('click',()=>{state.items.splice(i,1);renderItems();render();const rows=$('itemsList').querySelectorAll('.item-row');if(rows.length)rows[Math.min(i,rows.length-1)].lastElementChild.focus();else $('addItem').focus()});
    row.append(name,amount,remove);$('itemsList').append(row);
  });
}
$('openItems').addEventListener('click',()=>{renderItems();$('itemsDialog').showModal()});
['closeItems','doneItems'].forEach(id=>$(id).addEventListener('click',()=>$('itemsDialog').close()));
$('addItem').addEventListener('click',()=>{state.items.push({name:'',amount:0});renderItems();render();$('itemsList').lastElementChild.firstElementChild.focus()});
$('reset').addEventListener('click',()=>{if(confirm('將清除這台裝置上的目前設定，還原範例。確定重設？')){state=defaults();syncInputs();render()}});
$('exportSettings').addEventListener('click',()=>{
  let url;
  let link;
  try {
    const now = new Date();
    const data = {
      app: 'shared-balance',
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      currency: 'TWD',
      period: 'monthly',
      settings: {
        names: [...state.names], incomes: [...state.incomes],
        raises: [...state.raises], minimums: [...state.minimums],
        enabled: [...state.enabled], ratio: state.ratio,
        simulate: state.simulate, mode: state.mode,
        retention: [...state.retention],
        items: state.items.map(({name,amount})=>({name,amount}))
      }
    };
    const pad = n => String(n).padStart(2,'0');
    const stamp = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+'_'+pad(now.getHours())+pad(now.getMinutes())+pad(now.getSeconds());
    url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json;charset=utf-8'}));
    link = document.createElement('a'); link.href = url;
    link.download = 'shared-balance-settings_'+stamp+'.json';
    document.body.append(link); link.click();
    $('exportStatus').textContent = '已產生 JSON 設定檔，請查看下載紀錄。';
  } catch {
    $('exportStatus').textContent = '無法匯出設定，請重新嘗試。';
  } finally {
    link?.remove();
    if(url) setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
});
syncInputs();render();
