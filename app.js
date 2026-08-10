const FALLBACK = [];
const STORAGE = 'maloneyTracker.v3';
const CFG = window.MALONEY_CONFIG || {};
let EPISODES = [];
let PRIVATE = {entries:{}};
let YOUTUBE = {entries:{}};
let state = load();
let currentId = null;

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem('maloneyTracker.v2')||localStorage.getItem('maloneyTracker.v1')||'{}');
    return {progress:x.progress||{}};
  }catch{return {progress:{}}}
}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function p(id){return state.progress[id]||{heard:false,date:'',rating:'',notes:'',fav:false}}
function setp(id,patch){state.progress[id]={...p(id),...patch};save();render()}
const $=s=>document.querySelector(s);
const fmt=d=>d?new Intl.DateTimeFormat('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(d+'T12:00:00')):'';
function today(){return new Date().toISOString().slice(0,10)}
function yearOf(e){return e.firstYear || (e.firstDate?Number(e.firstDate.slice(0,4)):null)}
function meta(e){const bits=[];if(e.number)bits.push(`Folge ${e.number}`);if(yearOf(e))bits.push(`Erstausstrahlung ${yearOf(e)}`);if(e.airDate)bits.push(`SRF ${fmt(e.airDate)}`);return bits.join(' · ')||'Philip Maloney'}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function escAttr(s){return esc(s)}

async function safeJson(url, fallback){
  try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(r.status);return await r.json()}catch{return fallback}
}
async function loadEpisodes(){
  try{
    const [j, priv, yt] = await Promise.all([
      safeJson('./episodes.json', null),
      safeJson(CFG.privateAudioManifest||'./private-audio.json',{entries:{}}),
      safeJson(CFG.youtubeManifest||'./youtube.json',{entries:{}})
    ]);
    if(!j)throw new Error('episodes.json');
    PRIVATE=priv||{entries:{}};YOUTUBE=yt||{entries:{}};
    EPISODES=(j.episodes||[]).map(enrichSources);
    const direct=EPISODES.filter(e=>e.sources.some(s=>s.direct)).length;
    const ytCount=EPISODES.filter(e=>e.sources.some(s=>s.type==='youtube')).length;
    $('#dataStatus').textContent=`${EPISODES.length} Folgen · ${direct} direkt abspielbar · ${ytCount} mit YouTube`;
  }catch(e){EPISODES=FALLBACK;$('#dataStatus').textContent='Folgenliste konnte nicht geladen werden.'}
  initYears();render();
}
function enrichSources(e){
  const sources=[];
  if(e.audioUrl) sources.push({type:'srf',label:'SRF',url:e.audioUrl,direct:true,externalUrl:e.srfUrl||''});
  const priv=(PRIVATE.entries||{})[e.id];
  if(priv?.url) sources.push({type:'private',label:priv.label||'Privates Audio',url:priv.url,direct:true});
  const yt=(YOUTUBE.entries||{})[e.id];
  if(yt?.videoId) sources.push({type:'youtube',label:yt.label||'YouTube',videoId:yt.videoId,direct:false});
  const order=CFG.sourcePriority||['srf','private','youtube'];
  sources.sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type));
  return {...e,sources};
}
function preferred(e){return e.sources?.[0]||null}
function sourceBadges(e){
  return (e.sources||[]).map(s=>`<span class="source-badge source-${s.type}">${s.type==='srf'?'SRF':s.type==='private'?'Privat':'YouTube'}</span>`).join('');
}
function directPlayer(s, compact=false){
  if(!s?.direct)return '';
  return `<div class="inline-player ${compact?'compact':''}"><audio controls preload="none" playsinline src="${escAttr(s.url)}"></audio><div class="player-label">${esc(s.label)}</div></div>`;
}
function youtubeEmbed(s){
  if(!s?.videoId)return '';
  const host=CFG.youtubePrivacyEnhanced===false?'www.youtube.com':'www.youtube-nocookie.com';
  return `<div class="youtube-wrap"><iframe src="https://${host}/embed/${escAttr(s.videoId)}?playsinline=1&rel=0" title="YouTube-Player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
}
function playerFor(e, compact=false){
  const s=preferred(e);
  if(!s)return '';
  if(s.direct)return directPlayer(s,compact);
  if(s.type==='youtube'&&!compact)return youtubeEmbed(s);
  return '';
}

function render(){
  const heard=EPISODES.filter(e=>p(e.id).heard).length,fav=EPISODES.filter(e=>p(e.id).fav).length,total=EPISODES.length,pct=total?Math.round(heard/total*100):0;
  $('#progressText').textContent=`${heard} / ${total} gehört`;$('#progressPct').textContent=`${pct} %`;$('#progressBar').style.width=pct+'%';$('#heardCount').textContent=heard;$('#openCount').textContent=total-heard;$('#favCount').textContent=fav;
  renderNext();renderList();
}
function renderNext(){
  const open=EPISODES.find(e=>!p(e.id).heard),box=$('#nextCase');if(!open){box.classList.add('hidden');return}
  box.classList.remove('hidden');const pref=preferred(open);
  box.innerHTML=`<div class="eyebrow">ALS NÄCHSTES</div><h2>${esc(open.title)}</h2><div class="muted">${esc(meta(open))}</div><div class="source-row">${sourceBadges(open)}</div>${pref?.direct?directPlayer(pref,true):''}<div class="next-actions"><button data-open-next="${escAttr(open.id)}">▶ Öffnen</button><button data-hear="${escAttr(open.id)}">✓ Als gehört markieren</button></div>`;
  box.querySelector('[data-open-next]').onclick=()=>openDialog(open.id);box.querySelector('[data-hear]').onclick=()=>setp(open.id,{heard:true,date:today()});
}
function renderList(){
  const q=$('#searchInput').value.trim().toLowerCase(),status=$('#statusFilter').value,year=$('#yearFilter').value;let arr=EPISODES.filter(e=>!q||e.title.toLowerCase().includes(q)||String(e.number||'').includes(q));
  if(status==='open')arr=arr.filter(e=>!p(e.id).heard);if(status==='heard')arr=arr.filter(e=>p(e.id).heard);if(status==='fav')arr=arr.filter(e=>p(e.id).fav);if(status==='direct')arr=arr.filter(e=>e.sources.some(s=>s.direct));if(status==='private')arr=arr.filter(e=>e.sources.some(s=>s.type==='private'));if(status==='youtube')arr=arr.filter(e=>e.sources.some(s=>s.type==='youtube'));if(year!=='all')arr=arr.filter(e=>String(yearOf(e))===year);
  const list=$('#episodeList');if(!arr.length){list.innerHTML='<div class="empty">Keine passenden Folgen gefunden.</div>';return}
  list.innerHTML=arr.map(e=>{const pr=p(e.id);return `<article class="episode ${pr.heard?'heard':''}"><input class="episode-check" type="checkbox" ${pr.heard?'checked':''} data-check="${escAttr(e.id)}" aria-label="Gehört"><div class="episode-main" data-open="${escAttr(e.id)}"><div class="episode-title">${e.number?`<span class="epno">#${e.number}</span> `:''}${esc(e.title)}</div><div class="episode-meta">${esc(meta(e))}</div><div class="source-row">${sourceBadges(e)}</div><div class="episode-badges">${pr.date?`<span class="badge">gehört ${fmt(pr.date)}</span>`:''}${pr.rating?`<span class="badge">${'★'.repeat(Number(pr.rating))}</span>`:''}</div></div><button class="fav" data-fav="${escAttr(e.id)}" aria-label="Favorit">${pr.fav?'★':'☆'}</button></article>`}).join('');
  list.querySelectorAll('[data-check]').forEach(x=>x.onchange=()=>setp(x.dataset.check,{heard:x.checked,date:x.checked?(p(x.dataset.check).date||today()):''}));list.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openDialog(x.dataset.open));list.querySelectorAll('[data-fav]').forEach(x=>x.onclick=ev=>{ev.stopPropagation();setp(x.dataset.fav,{fav:!p(x.dataset.fav).fav})});
}
function sourceButtons(e){
  const buttons=(e.sources||[]).map((s,i)=>`<button type="button" class="source-btn ${i===0?'active':''}" data-source-index="${i}">${s.type==='srf'?'▶ SRF':s.type==='private'?'▶ Privates Audio':'▶ YouTube'}</button>`).join('');
  return buttons||'<span class="muted">Keine Audioquelle hinterlegt.</span>';
}
function selectSource(e,index){
  const s=e.sources?.[index];const host=$('#dialogPlayer');
  document.querySelectorAll('.source-btn').forEach((b,i)=>b.classList.toggle('active',i===index));
  if(!s){host.innerHTML='<div class="muted">Keine Audioquelle verfügbar.</div>';return}
  if(s.direct){host.innerHTML=directPlayer(s,false)+(s.type==='private'?'<div class="muted audio-note">Wird von deinem privaten HTTPS-Audioserver gestreamt.</div>':'<div class="muted audio-note">Wird direkt vom offiziellen SRF-Medienserver gestreamt.</div>');}
  else if(s.type==='youtube'){host.innerHTML=youtubeEmbed(s)+'<div class="muted audio-note">YouTube wird über den offiziellen eingebetteten Player abgespielt.</div>';}
}
function openDialog(id){
  currentId=id;const e=EPISODES.find(x=>x.id===id),pr=p(id);$('#dialogTitle').textContent=e.title;$('#dialogMeta').textContent=meta(e);$('#dialogHeard').checked=pr.heard;$('#dialogDate').value=pr.date||'';$('#dialogRating').value=pr.rating||'';$('#dialogNotes').value=pr.notes||'';$('#dialogFav').checked=pr.fav;
  $('#dialogSources').innerHTML=sourceButtons(e);$('#dialogSources').querySelectorAll('[data-source-index]').forEach(b=>b.onclick=()=>selectSource(e,Number(b.dataset.sourceIndex)));selectSource(e,0);
  const links=[];if(e.srfUrl)links.push(`<a class="secondary-link" href="${escAttr(e.srfUrl)}" target="_blank" rel="noopener">↗ SRF-Seite</a>`);if(e.archiveUrl)links.push(`<a class="secondary-link" href="${escAttr(e.archiveUrl)}" target="_blank" rel="noopener">↗ Folgenarchiv</a>`);$('#dialogLinks').innerHTML=links.join('');
  $('#episodeDialog').showModal();
}
$('#dialogSave').onclick=(ev)=>{ev.preventDefault();if(!currentId)return;const heard=$('#dialogHeard').checked;setp(currentId,{heard,date:heard?($('#dialogDate').value||today()):'',rating:$('#dialogRating').value,notes:$('#dialogNotes').value.trim(),fav:$('#dialogFav').checked});$('#episodeDialog').close()};
$('#episodeDialog').addEventListener('close',()=>{$('#dialogPlayer').innerHTML=''});
$('#dialogHeard').onchange=()=>{if($('#dialogHeard').checked&&!$('#dialogDate').value)$('#dialogDate').value=today()};
$('#searchInput').oninput=renderList;$('#statusFilter').onchange=renderList;$('#yearFilter').onchange=renderList;
$('#randomBtn').onclick=()=>{const open=EPISODES.filter(e=>!p(e.id).heard),pool=open.length?open:EPISODES;if(pool.length)openDialog(pool[Math.floor(Math.random()*pool.length)].id)};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({version:3,exportedAt:new Date().toISOString(),progress:state.progress},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`maloney-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)};
$('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j.progress)throw new Error();state={progress:j.progress};save();render();alert('Backup importiert.')}catch{alert('Die Datei konnte nicht importiert werden.')}e.target.value=''};
$('#resetBtn').onclick=()=>{if(confirm('Wirklich alle Markierungen, Bewertungen und Notizen löschen?')){state={progress:{}};save();render()}};
function initYears(){const ys=[...new Set(EPISODES.map(yearOf).filter(Boolean))].sort((a,b)=>b-a);$('#yearFilter').innerHTML='<option value="all">Alle Jahre</option>'+ys.map(y=>`<option value="${y}">${y}</option>`).join('')}
loadEpisodes();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
