const SEED = [
  {id:'20260607-politesse',title:'Die Politesse',airDate:'2026-06-07',firstYear:2005,url:'https://www.srf.ch/audio/maloney/die-politesse?id=AUDI20260607_NR_0005'},
  {id:'20260531-erpressung',title:'Eine seltsame Erpressung',airDate:'2026-05-31',firstYear:2017,url:'https://www.srf.ch/audio/maloney/eine-seltsame-erpressung?id=AUDI20260531_NR_0001'},
  {id:'20260517-vision',title:'Die Vision',airDate:'2026-05-17',firstYear:2009,url:'https://www.srf.ch/audio/maloney/die-vision?id=AUDI20260517_NR_0001'},
  {id:'20260322-postraub',title:'Der Postraub',airDate:'2026-03-22',firstYear:1994,url:'https://www.srf.ch/audio/maloney/der-postraub?id=AUDI20260322_NR_0004'},
  {id:'20260201-hund',title:'Der falsche Hund',airDate:'2026-02-01',firstYear:1996,url:'https://www.srf.ch/audio/maloney/der-falsche-hund?id=AUDI20260201_NR_0060'},
  {id:'20251228-schneckentempo',title:'Im Schneckentempo',airDate:'2025-12-28',firstYear:2009,url:'https://www.srf.ch/audio/maloney/im-schneckentempo?id=AUDI20251228_NR_0003'},
  {id:'20251130-balkonmoerder',title:'Der Balkonmörder',airDate:'2025-11-30',firstYear:2006,url:'https://www.srf.ch/audio/maloney/der-balkonmoerder?id=AUDI20251130_NR_0006'},
  {id:'20251019-stimme',title:'Die Stimme',airDate:'2025-10-19',firstYear:2009,url:'https://www.srf.ch/audio/maloney/die-haarstraeubenden-faelle-des-philip-maloney-in-der-hoerspiel-reihe-ermittelt-privatdetektiv-maloney-mit-schalk-charme-und-unverkennbarer-raubeinigkeit?id=AUDI20251019_NR_0007'},
  {id:'20250817-erfolg',title:'Der Schlüssel zum Erfolg',airDate:'2025-08-17',firstYear:2016,url:'https://www.srf.ch/audio/maloney/die-haarstraeubenden-faelle-des-philip-maloney-in-der-hoerspiel-reihe-ermittelt-privatdetektiv-maloney-mit-schalk-charme-und-unverkennbarer-raubeinigkeit?id=AUDI20250817_NR_0007'},
  {id:'20250727-bombenbastler',title:'Die Bombenbastler',airDate:'2025-07-27',firstYear:1996,url:'https://www.srf.ch/audio/maloney/die-bombenbastler?id=AUDI20250727_NR_0028'},
  {id:'20250713-verfolgungswahn',title:'Verfolgungswahn',airDate:'2025-07-13',firstYear:2005,url:'https://www.srf.ch/audio/maloney/verfolgungswahn?id=AUDI20250713_NR_0017'},
  {id:'20250622-zweiteich',title:'Das zweite Ich',airDate:'2025-06-22',firstYear:1998,url:'https://www.srf.ch/audio/maloney/das-zweite-ich?id=AUDI20250622_NR_0006'},
  {id:'20250608-ueberwachten',title:'Die Überwachten',airDate:'2025-06-08',firstYear:2016,url:'https://www.srf.ch/audio/maloney/die-ueberwachten?id=AUDI20250608_NR_0002'},
  {id:'20250601-schwarzgeld',title:'Schwarzgeld',airDate:'2025-06-01',firstYear:2004,url:'https://www.srf.ch/audio/maloney/schwarzgeld?id=AUDI20250601_NR_0004'},
  {id:'20250525-baum',title:'Der Baum',airDate:'2025-05-25',firstYear:1998,url:'https://www.srf.ch/audio/maloney/der-baum?id=AUDI20250525_NR_0006'},
  {id:'20250511-schmuckstuecke',title:'Schmuckstücke',airDate:'2025-05-11',firstYear:1999,url:'https://www.srf.ch/audio/maloney/schmuckstuecke?id=AUDI20250511_NR_0030'},
  {id:'20250504-suchtgefahr',title:'Suchtgefahr',airDate:'2025-05-04',firstYear:1993,url:'https://www.srf.ch/audio/maloney/suchtgefahr?id=AUDI20250504_NR_0033'},
  {id:'20250302-comeback',title:'Das Comeback',airDate:'2025-03-02',firstYear:1996,url:'https://www.srf.ch/audio/maloney/das-comeback?id=AUDI20250302_NR_0030'},
  {id:'20250223-tag',title:'Der besondere Tag',airDate:'2025-02-23',firstYear:2008,url:'https://www.srf.ch/audio/maloney/der-besondere-tag?id=AUDI20250223_NR_0028'},
  {id:'20250126-bestseller',title:'Der Bestseller',airDate:'2025-01-26',firstYear:1999,url:'https://www.srf.ch/audio/maloney/der-bestseller?id=AUDI20250126_NR_0028'},
  {id:'20240811-leben',title:'Ein neues Leben',airDate:'2024-08-11',firstYear:2019,url:'https://www.srf.ch/audio/maloney/ein-neues-leben?id=37fa32fe-15d2-49f6-bde6-92e7cc85761d'},
  {id:'20240324-verfolger',title:'Die Verfolger',airDate:'2024-03-24',firstYear:2019,url:'https://www.srf.ch/audio/maloney/die-verfolger?id=95932082-eb42-4ff9-a4f0-44a9654cdd95'}
];

const STORAGE='maloneyTracker.v1';
let state=load(); let currentId=null;
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'{}');return {progress:x.progress||{}}}catch{return {progress:{}}}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function p(id){return state.progress[id]||{heard:false,date:'',rating:'',notes:'',fav:false}}
function setp(id,patch){state.progress[id]={...p(id),...patch};save();render()}
const $=s=>document.querySelector(s);
const fmt=d=>d?new Intl.DateTimeFormat('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d+'T12:00:00')):'';
function today(){return new Date().toISOString().slice(0,10)}

function render(){
 const heard=SEED.filter(e=>p(e.id).heard).length, fav=SEED.filter(e=>p(e.id).fav).length, total=SEED.length, pct=total?Math.round(heard/total*100):0;
 $('#progressText').textContent=`${heard} / ${total} gehört`; $('#progressPct').textContent=`${pct} %`; $('#progressBar').style.width=pct+'%'; $('#heardCount').textContent=heard; $('#openCount').textContent=total-heard; $('#favCount').textContent=fav;
 renderNext(); renderList();
}
function renderNext(){const open=SEED.find(e=>!p(e.id).heard);const box=$('#nextCase'); if(!open){box.classList.add('hidden');return} box.classList.remove('hidden');box.innerHTML=`<div class="eyebrow">ALS NÄCHSTES</div><h2>${esc(open.title)}</h2><div class="muted">Erstausstrahlung ${open.firstYear} · SRF ${fmt(open.airDate)}</div><div class="next-actions"><a href="${open.url}" target="_blank" rel="noopener">▶ Anhören</a><button data-hear="${open.id}">✓ Als gehört markieren</button></div>`;box.querySelector('[data-hear]').onclick=()=>setp(open.id,{heard:true,date:today()})}
function renderList(){const q=$('#searchInput').value.trim().toLowerCase(), status=$('#statusFilter').value, year=$('#yearFilter').value;let arr=SEED.filter(e=>!q||e.title.toLowerCase().includes(q)); if(status==='open')arr=arr.filter(e=>!p(e.id).heard);if(status==='heard')arr=arr.filter(e=>p(e.id).heard);if(status==='fav')arr=arr.filter(e=>p(e.id).fav);if(year!=='all')arr=arr.filter(e=>String(e.firstYear)===year);const list=$('#episodeList'); if(!arr.length){list.innerHTML='<div class="empty">Keine passenden Folgen gefunden.</div>';return}list.innerHTML=arr.map(e=>{const pr=p(e.id);return `<article class="episode ${pr.heard?'heard':''}"><input class="episode-check" type="checkbox" ${pr.heard?'checked':''} data-check="${e.id}" aria-label="Gehört"><div class="episode-main" data-open="${e.id}"><div class="episode-title">${esc(e.title)}</div><div class="episode-meta">Erstausstrahlung ${e.firstYear} · SRF ${fmt(e.airDate)}</div><div class="episode-badges">${pr.date?`<span class="badge">gehört ${fmt(pr.date)}</span>`:''}${pr.rating?`<span class="badge">${'★'.repeat(Number(pr.rating))}</span>`:''}</div></div><button class="fav" data-fav="${e.id}" aria-label="Favorit">${pr.fav?'★':'☆'}</button></article>`}).join('');list.querySelectorAll('[data-check]').forEach(x=>x.onchange=()=>setp(x.dataset.check,{heard:x.checked,date:x.checked?(p(x.dataset.check).date||today()):''}));list.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openDialog(x.dataset.open));list.querySelectorAll('[data-fav]').forEach(x=>x.onclick=()=>setp(x.dataset.fav,{fav:!p(x.dataset.fav).fav}))}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function openDialog(id){currentId=id;const e=SEED.find(x=>x.id===id),pr=p(id);$('#dialogTitle').textContent=e.title;$('#dialogMeta').textContent=`${e.firstYear} · SRF ${fmt(e.airDate)}`;$('#dialogHeard').checked=pr.heard;$('#dialogDate').value=pr.date||'';$('#dialogRating').value=pr.rating||'';$('#dialogNotes').value=pr.notes||'';$('#dialogFav').checked=pr.fav;$('#dialogLink').href=e.url;$('#episodeDialog').showModal()}
$('#dialogSave').onclick=(ev)=>{ev.preventDefault();if(!currentId)return;const heard=$('#dialogHeard').checked;setp(currentId,{heard,date:heard?($('#dialogDate').value||today()):'',rating:$('#dialogRating').value,notes:$('#dialogNotes').value.trim(),fav:$('#dialogFav').checked});$('#episodeDialog').close()};
$('#dialogHeard').onchange=()=>{if($('#dialogHeard').checked&&!$('#dialogDate').value)$('#dialogDate').value=today()};
$('#searchInput').oninput=renderList;$('#statusFilter').onchange=renderList;$('#yearFilter').onchange=renderList;
$('#randomBtn').onclick=()=>{const open=SEED.filter(e=>!p(e.id).heard);const pool=open.length?open:SEED;openDialog(pool[Math.floor(Math.random()*pool.length)].id)};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),progress:state.progress},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`maloney-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j.progress)throw new Error();state={progress:j.progress};save();render();alert('Backup importiert.')}catch{alert('Die Datei konnte nicht importiert werden.')}e.target.value=''};
$('#resetBtn').onclick=()=>{if(confirm('Wirklich alle Markierungen, Bewertungen und Notizen löschen?')){state={progress:{}};save();render()}};
(function initYears(){const ys=[...new Set(SEED.map(e=>e.firstYear))].sort((a,b)=>b-a);$('#yearFilter').innerHTML+=[...ys].map(y=>`<option value="${y}">${y}</option>`).join('')})();
render();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
