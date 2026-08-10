const FALLBACK = [];
const STORAGE='maloneyTracker.v2';
let EPISODES=[];
let state=load(); let currentId=null;

function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem('maloneyTracker.v1')||'{}');return {progress:x.progress||{}}}catch{return {progress:{}}}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function p(id){return state.progress[id]||{heard:false,date:'',rating:'',notes:'',fav:false}}
function setp(id,patch){state.progress[id]={...p(id),...patch};save();render()}
const $=s=>document.querySelector(s);
const fmt=d=>d?new Intl.DateTimeFormat('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d+'T12:00:00')):'';
function today(){return new Date().toISOString().slice(0,10)}
function yearOf(e){return e.firstYear || (e.firstDate?Number(e.firstDate.slice(0,4)):null)}
function meta(e){const bits=[]; if(e.number)bits.push(`Folge ${e.number}`); if(yearOf(e))bits.push(`Erstausstrahlung ${yearOf(e)}`); if(e.airDate)bits.push(`SRF ${fmt(e.airDate)}`); return bits.join(' · ') || 'Philip Maloney'}

async function loadEpisodes(){
 try{
   const r=await fetch('./episodes.json',{cache:'no-store'}); if(!r.ok)throw new Error(r.status); const j=await r.json(); EPISODES=j.episodes||[];
   $('#dataStatus').textContent=`${EPISODES.length} Folgen · ${EPISODES.filter(x=>x.audioUrl).length} aktuell direkt abspielbar`;
 }catch(e){EPISODES=FALLBACK;$('#dataStatus').textContent='Folgenliste konnte nicht geladen werden.'}
 initYears(); render();
}

function render(){
 const heard=EPISODES.filter(e=>p(e.id).heard).length, fav=EPISODES.filter(e=>p(e.id).fav).length, total=EPISODES.length, pct=total?Math.round(heard/total*100):0;
 $('#progressText').textContent=`${heard} / ${total} gehört`; $('#progressPct').textContent=`${pct} %`; $('#progressBar').style.width=pct+'%'; $('#heardCount').textContent=heard; $('#openCount').textContent=total-heard; $('#favCount').textContent=fav;
 renderNext(); renderList();
}
function playerMarkup(e,compact=false){
 if(!e.audioUrl)return '';
 return `<div class="inline-player ${compact?'compact':''}"><audio controls preload="none" playsinline src="${escAttr(e.audioUrl)}"></audio></div>`;
}
function renderNext(){const open=EPISODES.find(e=>!p(e.id).heard);const box=$('#nextCase'); if(!open){box.classList.add('hidden');return} box.classList.remove('hidden');box.innerHTML=`<div class="eyebrow">ALS NÄCHSTES</div><h2>${esc(open.title)}</h2><div class="muted">${esc(meta(open))}</div>${playerMarkup(open,true)}<div class="next-actions">${open.srfUrl?`<a href="${escAttr(open.srfUrl)}" target="_blank" rel="noopener">↗ SRF</a>`:''}<button data-hear="${escAttr(open.id)}">✓ Als gehört markieren</button></div>`;box.querySelector('[data-hear]').onclick=()=>setp(open.id,{heard:true,date:today()})}
function renderList(){const q=$('#searchInput').value.trim().toLowerCase(), status=$('#statusFilter').value, year=$('#yearFilter').value;let arr=EPISODES.filter(e=>!q||e.title.toLowerCase().includes(q)||String(e.number||'').includes(q)); if(status==='open')arr=arr.filter(e=>!p(e.id).heard);if(status==='heard')arr=arr.filter(e=>p(e.id).heard);if(status==='fav')arr=arr.filter(e=>p(e.id).fav);if(status==='audio')arr=arr.filter(e=>!!e.audioUrl);if(year!=='all')arr=arr.filter(e=>String(yearOf(e))===year);const list=$('#episodeList'); if(!arr.length){list.innerHTML='<div class="empty">Keine passenden Folgen gefunden.</div>';return}list.innerHTML=arr.map(e=>{const pr=p(e.id);return `<article class="episode ${pr.heard?'heard':''}"><input class="episode-check" type="checkbox" ${pr.heard?'checked':''} data-check="${escAttr(e.id)}" aria-label="Gehört"><div class="episode-main" data-open="${escAttr(e.id)}"><div class="episode-title">${e.number?`<span class="epno">#${e.number}</span> `:''}${esc(e.title)} ${e.audioUrl?'<span class="audio-dot" title="Audio verfügbar">●</span>':''}</div><div class="episode-meta">${esc(meta(e))}</div><div class="episode-badges">${pr.date?`<span class="badge">gehört ${fmt(pr.date)}</span>`:''}${pr.rating?`<span class="badge">${'★'.repeat(Number(pr.rating))}</span>`:''}</div></div><button class="fav" data-fav="${escAttr(e.id)}" aria-label="Favorit">${pr.fav?'★':'☆'}</button></article>`}).join('');list.querySelectorAll('[data-check]').forEach(x=>x.onchange=()=>setp(x.dataset.check,{heard:x.checked,date:x.checked?(p(x.dataset.check).date||today()):''}));list.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openDialog(x.dataset.open));list.querySelectorAll('[data-fav]').forEach(x=>x.onclick=ev=>{ev.stopPropagation();setp(x.dataset.fav,{fav:!p(x.dataset.fav).fav})})}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function escAttr(s){return esc(s)}
function openDialog(id){currentId=id;const e=EPISODES.find(x=>x.id===id),pr=p(id);$('#dialogTitle').textContent=e.title;$('#dialogMeta').textContent=meta(e);$('#dialogHeard').checked=pr.heard;$('#dialogDate').value=pr.date||'';$('#dialogRating').value=pr.rating||'';$('#dialogNotes').value=pr.notes||'';$('#dialogFav').checked=pr.fav;
 const audio=$('#dialogAudio'); audio.innerHTML=e.audioUrl?`<audio controls preload="none" playsinline src="${escAttr(e.audioUrl)}"></audio><div class="muted audio-note">Audio wird direkt vom offiziellen SRF-Medienserver gestreamt.</div>`:`<div class="muted">Diese Folge ist bei SRF derzeit nicht direkt als Audio verfügbar.</div>`;
 const link=$('#dialogLink'); if(e.srfUrl){link.href=e.srfUrl;link.textContent='↗ Bei SRF öffnen';link.hidden=false}else if(e.archiveUrl){link.href=e.archiveUrl;link.textContent='↗ Im Folgenarchiv öffnen';link.hidden=false}else link.hidden=true;
 $('#episodeDialog').showModal()}
$('#dialogSave').onclick=(ev)=>{ev.preventDefault();if(!currentId)return;const heard=$('#dialogHeard').checked;setp(currentId,{heard,date:heard?($('#dialogDate').value||today()):'',rating:$('#dialogRating').value,notes:$('#dialogNotes').value.trim(),fav:$('#dialogFav').checked});$('#episodeDialog').close()};
$('#dialogHeard').onchange=()=>{if($('#dialogHeard').checked&&!$('#dialogDate').value)$('#dialogDate').value=today()};
$('#searchInput').oninput=renderList;$('#statusFilter').onchange=renderList;$('#yearFilter').onchange=renderList;
$('#randomBtn').onclick=()=>{const open=EPISODES.filter(e=>!p(e.id).heard);const pool=open.length?open:EPISODES;if(pool.length)openDialog(pool[Math.floor(Math.random()*pool.length)].id)};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),progress:state.progress},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`maloney-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j.progress)throw new Error();state={progress:j.progress};save();render();alert('Backup importiert.')}catch{alert('Die Datei konnte nicht importiert werden.')}e.target.value=''};
$('#resetBtn').onclick=()=>{if(confirm('Wirklich alle Markierungen, Bewertungen und Notizen löschen?')){state={progress:{}};save();render()}};
function initYears(){const ys=[...new Set(EPISODES.map(yearOf).filter(Boolean))].sort((a,b)=>b-a);$('#yearFilter').innerHTML='<option value="all">Alle Jahre</option>'+ys.map(y=>`<option value="${y}">${y}</option>`).join('')}
loadEpisodes();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
