'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const base = window.TRAVEL_DATA;
  const KEY = 'travel-pages-v1';
  const regionName = r => ({europe:'EUROPE',asia:'ASIA',other:'WORLD'}[r]);
  const initial = () => ({version:1,custom:[],notes:{},saved:[],route:base.visited.map(p=>p.id),routeEdited:false});
  let state = initial(), region = 'all', expanded = false, mapView = 'world', routeDraft = [], pendingImport = null;
  let currentDetail = null, toastTimer, returnFocus = null;
  const places = () => [...base.visited,...state.custom];
  const byId = id => places().find(p=>p.id===id);
  const hasCoords = p => Number.isFinite(p.lat)&&Number.isFinite(p.lon);
  const art = p => p.photo?.src || `assets/${p.art || 'lake'}.svg`;
  const photoAlt = (p, personal) => esc(personal ? `${p.name} 나의 여행 사진` : p.photo?.caption || `${p.name} 여행 일러스트`);
  const photoCredit = p => p.photo ? `<p class="photo-credit" id="detail-credit">${esc(p.photo.caption)} · 사진: ${esc(p.photo.author)}<br><a href="${esc(p.photo.source)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons 원본 ↗</a> · <a href="${esc(p.photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.photo.license)}</a></p>` : '';
  function validate(s) {
    if (!s || s.version!==1 || !Array.isArray(s.custom) || s.custom.length>300 || !Array.isArray(s.saved) || !Array.isArray(s.route) || typeof s.notes!=='object' || !s.notes || Array.isArray(s.notes) || typeof s.routeEdited!=='boolean') throw Error('지원하지 않는 백업 형식입니다.');
    const ids = new Set(base.visited.map(p=>p.id));
    const clean = initial();
    clean.custom=s.custom.map(p=>{
      if (!p || typeof p.id!=='string'||!/^custom-[a-zA-Z0-9-]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>40||typeof p.country!=='string'||!p.country.trim()||p.country.length>40||!['europe','asia','other'].includes(p.region)||typeof p.description!=='string'||p.description.length>180) throw Error('여행지 데이터가 올바르지 않습니다.');
      if (!((p.lat===null&&p.lon===null)||(Number.isFinite(p.lat)&&Math.abs(p.lat)<=85&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180))) throw Error('지도 좌표를 확인해 주세요.');
      ids.add(p.id);return {id:p.id,name:p.name,en:String(p.en||'').slice(0,60),country:p.country,description:p.description,region:p.region,lat:p.lat,lon:p.lon,art:'lake',tags:['나의 여행'],spots:[],intro:p.description};
    });
    clean.saved=[...new Set(s.saved.filter(id=>base.recommendations.some(p=>p.id===id)))];
    clean.route=[...new Set(s.route.filter(id=>ids.has(id)))];clean.routeEdited=s.routeEdited;
    for (const [id,n] of Object.entries(s.notes)) {
      if (!ids.has(id)||!n||typeof n!=='object') continue;
      const text=typeof n.text==='string'?n.text.slice(0,10000):'';
      const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';
      const start=date(n.start),end=date(n.end);
      if (start&&end&&start>end) throw Error('여행 날짜 순서가 올바르지 않습니다.');
      const photo=typeof n.photo==='string'&&n.photo.length<3000000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(n.photo)?n.photo:'';
      clean.notes[id]={text,start,end,photo};
    }
    return clean;
  }
  let storageIssue = false;
  try { const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw)); } catch {storageIssue=true;}
  function persist(next=state) {
    try {localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}
    catch {toast('저장 공간 또는 브라우저 설정을 확인해 주세요. 기록 내보내기로 백업할 수 있습니다.');return false;}
  }
  function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
  function openDialog(id) {returnFocus=document.activeElement;$(id).showModal();}
  $$('.dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $$('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();});});
  function renderVisited() {
    const q=$('#search').value.trim().toLocaleLowerCase();
    const list=places().filter(p=>(region==='all'||p.region===region)&&[p.name,p.en,p.country,...p.tags].join(' ').toLocaleLowerCase().includes(q));
    const visible=expanded||q||region!=='all'?list:list.slice(0,4);
    $('#visited-grid').innerHTML=visible.length?visible.map(p=>{
      const n=state.notes[p.id];const index=places().findIndex(v=>v.id===p.id)+1;
      return `<article class="travel-card"><button class="card-image" data-detail="${esc(p.id)}" aria-label="${esc(p.name)} 여행 기록 열기"><img src="${n?.photo||art(p)}" alt="${photoAlt(p,n?.photo)}" loading="lazy"><span class="visited-badge">✓ 다녀온 곳</span><span class="card-index">${String(index).padStart(2,'0')}</span></button><div class="card-meta"><span>${regionName(p.region)} / ${esc(p.en)}</span><span>${esc(p.country)}</span></div><button class="card-title" data-detail="${esc(p.id)}">${esc(p.name)}<span>↗</span></button><p class="card-description">${esc(p.description)}</p><div class="card-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></article>`;
    }).join(''):`<div class="empty-state">조건에 맞는 여행 기록이 없어요.<br><button class="button" id="reset-search">전체 여행 보기</button></div>`;
    $('#show-more').hidden=!!q||region!=='all'||list.length<=4;
    $('#show-more').innerHTML=expanded?'여행 기록 접기 <span>↑</span>':`나머지 ${Math.max(0,list.length-4)}개의 여행 기록 펼치기 <span>↓</span>`;
    $('#record-count').textContent=`${visible.length} / ${list.length} PAGES`;
    $('#stat-places').textContent=String(places().length).padStart(2,'0');
    $('#stat-countries').textContent=String(new Set(places().map(p=>p.country.trim())).size).padStart(2,'0');
    const continents=new Set(places().map(p=>p.region).filter(r=>r!=='other')).size;
    $('.stats>div:nth-of-type(3) strong').textContent=String(continents).padStart(2,'0');
    $('.stats>div:nth-of-type(3) span').textContent=state.custom.some(p=>p.region==='other')?'확인된 대륙 · 그 외 별도':'발자취를 남긴 대륙';
    $$('#region-filters button').forEach(b=>{b.classList.toggle('active',b.dataset.region===region);b.setAttribute('aria-pressed',b.dataset.region===region);$('span',b).textContent=places().filter(p=>b.dataset.region==='all'||p.region===b.dataset.region).length;});
  }
  $('#region-filters').addEventListener('click',e=>{const b=e.target.closest('[data-region]');if(b){region=b.dataset.region;renderVisited();}});
  $('#search').addEventListener('input',renderVisited);
  $('#show-more').addEventListener('click',()=>{expanded=!expanded;renderVisited();if(!expanded)$('#journal').scrollIntoView({behavior:'smooth'});});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('dialog[open]')){e.preventDefault();$('#search').focus();}});
  function renderRecommendations() {
    const theme=$('#interest-filter').value;
    $('#recommend-grid').innerHTML=base.recommendations.filter(p=>theme==='all'||p.theme===theme).map(p=>`<article class="recommend-card"><button class="save-heart" data-save="${p.id}" aria-label="${p.name} 찜하기" aria-pressed="${state.saved.includes(p.id)}">${state.saved.includes(p.id)?'♥':'♡'}</button><button class="card-image" data-recommend="${p.id}" aria-label="${p.name} 추천 정보 보기"><img src="${art(p)}" alt="${photoAlt(p,false)}" loading="lazy"></button><div class="recommend-body"><p class="eyebrow">${p.en.toUpperCase()} · ${p.subtitle}</p><button class="card-title" data-recommend="${p.id}">${p.name}<span>↗</span></button><p>${p.description}</p><div class="recommend-reason">↳ ${p.reason}</div></div></article>`).join('');
    $('#saved-count').textContent=state.saved.length;
  }
  $('#interest-filter').addEventListener('change',renderRecommendations);
  function toggleSaved(id) {const next=structuredClone(state);next.saved=next.saved.includes(id)?next.saved.filter(v=>v!==id):[...next.saved,id];if(!persist(next))return;renderRecommendations();renderSaved();if(currentDetail?.type==='recommend')updateDetailSave();toast(next.saved.includes(id)?'가고 싶은 곳에 담았어요.':'찜 목록에서 제외했어요.');}
  function renderSaved(){const list=base.recommendations.filter(p=>state.saved.includes(p.id));$('#saved-list').innerHTML=list.length?list.map(p=>`<div class="saved-row"><img src="${art(p)}" alt=""><div><h3>${p.name}</h3><button data-recommend="${p.id}">여행 정보 보기 ↗</button></div><button data-save="${p.id}" aria-label="${p.name} 찜 해제">삭제 ×</button></div>`).join(''):'<div class="empty-state">아직 비어 있는 다음 페이지.<br>추천 여행지의 하트를 눌러 담아보세요.</div>';}
  $('#open-saved').addEventListener('click',()=>{renderSaved();openDialog('#saved-dialog');});
  function updateDetailSave(){const b=$('#detail-save');if(b&&currentDetail){const active=state.saved.includes(currentDetail.id);b.textContent=active?'♥ 가고 싶은 곳에 담았어요':'♡ 가고 싶은 곳에 담기';b.setAttribute('aria-pressed',active);}}
  function showDetail(id,recommended=false) {
    const p=recommended?base.recommendations.find(x=>x.id===id):byId(id);if(!p)return;
    if($('#saved-dialog').open)$('#saved-dialog').close();
    currentDetail={id,type:recommended?'recommend':'visited'};
    const n=state.notes[id]||{};
    $('#detail-content').innerHTML=`<img class="dialog-image" src="${n.photo||art(p)}" alt="${photoAlt(p,n.photo)}">${!n.photo?photoCredit(p):''}<div class="dialog-body"><p class="eyebrow">${esc(p.en).toUpperCase()} / ${recommended?'YOUR NEXT CHAPTER':'A PAGE OF MEMORIES'}</p><h2 id="detail-title">${esc(p.name)}</h2><p class="intro">${esc(p.intro)}</p>${recommended?`<dl class="detail-facts"><div><dt>여행 기간</dt><dd>${p.duration}</dd></div><div><dt>여행 시기</dt><dd>${p.season}</dd></div></dl><h3>이런 곳을 만나보세요</h3>`:'<h3>대표 여행 포인트</h3>'}<div class="detail-spots">${p.spots.map(x=>`<span>${esc(x)}</span>`).join('')}</div>${recommended?`<h3>이 여행을 추천하는 이유</h3><p class="intro">${p.reason}. 방문 목록에서 찾은 취향으로 고른 제안이며, 실제 선호도를 학습한 결과는 아닙니다.</p><div class="dialog-actions"><button class="button" id="detail-save" data-save="${p.id}"></button><a class="source-link" href="${p.source}" target="_blank" rel="noopener noreferrer">${p.sourceName} 공식 정보 ↗</a></div><p class="small muted" style="margin-top:18px">기간과 시기는 일정 구성을 위한 제안입니다. 실제 운영 정보는 공식 사이트에서 확인해 주세요.</p>`:`<h3>나만의 여행 기록</h3><form id="note-form"><div class="form-row"><label>여행 시작일<input name="start" type="date" value="${esc(n.start||'')}"></label><label>여행 종료일<input name="end" type="date" value="${esc(n.end||'')}"></label></div><label>기억하고 싶은 이야기<textarea name="text" maxlength="10000" placeholder="기억에 남는 장소, 맛있었던 음식, 다시 가고 싶은 이유…">${esc(n.text||'')}</textarea></label><label>내 여행 사진으로 바꾸기<input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label><p class="small muted">사진은 화면 표시용 크기로 줄여 이 브라우저에 저장합니다.</p><div class="dialog-actions"><span class="note-status">날짜와 메모를 직접 채워주세요.</span><button type="submit" class="button dark">기록 저장 <span>✓</span></button></div></form>`}</div>`;
    if(recommended)updateDetailSave();else $('#note-form').addEventListener('submit',saveNote);
    if(!$('#detail-dialog').open)openDialog('#detail-dialog');
  }
  async function resizePhoto(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw Error('15MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.');
    const url=URL.createObjectURL(file);
    try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1200/img.width,1200/img.height);const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fefffc';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.78);}finally{URL.revokeObjectURL(url);}
  }
  async function saveNote(e){e.preventDefault();const form=e.currentTarget;const id=currentDetail.id;const data=new FormData(form);const start=data.get('start'),end=data.get('end');if(start&&end&&end<start){toast('종료일은 시작일 이후로 선택해 주세요.');return;}const button=$('[type=submit]',form);button.disabled=true;try{let photo=state.notes[id]?.photo||'';const file=data.get('photo');if(file?.size)photo=await resizePhoto(file);const next=structuredClone(state);next.notes[id]={start,end,text:data.get('text'),photo};if(!persist(next))return;renderVisited();$('.note-status',form).textContent='이 브라우저에 저장했어요.';if(photo){$('.dialog-image').src=photo;$('.dialog-image').alt=photoAlt(byId(id),true);if($('#detail-credit'))$('#detail-credit').hidden=true;}toast('여행의 한 페이지를 저장했어요.');}catch(err){toast(err.message||'사진을 읽지 못했어요.');}finally{button.disabled=false;}}
  document.addEventListener('click',e=>{const detail=e.target.closest('[data-detail]'),rec=e.target.closest('[data-recommend]'),save=e.target.closest('[data-save]');if(detail)showDetail(detail.dataset.detail);else if(rec)showDetail(rec.dataset.recommend,true);else if(save)toggleSaved(save.dataset.save);if(e.target.closest('#reset-search')){region='all';$('#search').value='';renderVisited();}});
  $('#add-place').addEventListener('click',()=>{$('#place-form').reset();openDialog('#editor-dialog');});
  $('#place-form').addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.currentTarget);const lat=d.get('lat'),lon=d.get('lon');if((lat==='')!==(lon==='')){toast('위도와 경도를 함께 입력해 주세요.');return;}if(!d.get('name').trim()||!d.get('country').trim()||!d.get('description').trim()){toast('이름, 국가·지역, 한 줄 소개를 입력해 주세요.');return;}const id=`custom-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;const p={id,name:d.get('name').trim(),en:d.get('en').trim(),country:d.get('country').trim(),description:d.get('description').trim(),region:d.get('region'),lat:lat===''?null:Number(lat),lon:lon===''?null:Number(lon),art:'lake',tags:['나의 여행'],spots:[],intro:d.get('description').trim()};const next=structuredClone(state);next.custom.push(p);if(hasCoords(p))next.route.push(id);if(!persist(next))return;region='all';expanded=true;$('#search').value='';renderAll();$('#editor-dialog').close();showDetail(id);toast('새 여행지를 추가했어요.');});
  const project=(lon,lat)=>[(lon+180)/360*1000,(90-lat)/180*500];
  const mapTransforms={world:{x:0,y:0,k:1},europe:{x:-2297,y:-388,k:5.3},asia:{x:-1262,y:-113,k:2.15}};
  function renderMap(){
    $('#land').innerHTML=window.WORLD_LAND.map(d=>`<path d="${d}"/>`).join('');
    const t=mapTransforms[mapView];$('#map-content').setAttribute('transform',`translate(${t.x} ${t.y}) scale(${t.k})`);
    const list=places().filter(p=>hasCoords(p)&&(mapView==='world'||p.region===mapView));
    const route=state.route.map(byId).filter(p=>p&&hasCoords(p)&&(mapView==='world'||p.region===mapView));
    $('#route-lines').innerHTML=route.slice(1).map((p,i)=>{const a=project(route[i].lon,route[i].lat),b=project(p.lon,p.lat),height=Math.min(Math.abs(b[0]-a[0])*.22,45)/Math.sqrt(t.k);return `<path d="M${a[0]} ${a[1]} Q${(a[0]+b[0])/2} ${(a[1]+b[1])/2-height} ${b[0]} ${b[1]}"/>`;}).join('');
    $('#map-pins').innerHTML=list.map(p=>{const [x,y]=project(p.lon,p.lat);const showLabel=mapView!=='world'||p.region!=='europe'||p.id==='london'||p.id==='croatia';const left=p.id==='london'||p.id==='paris'||p.id==='switzerland';const dy=p.id==='annecy'?18:p.id==='south-france'?20:p.id==='switzerland'?-12:-9;return `<g class="map-pin" transform="translate(${x} ${y}) scale(${1/t.k})" tabindex="0" role="button" aria-label="${esc(p.name)} 여행 기록 열기" data-detail="${esc(p.id)}"><title>${esc(p.name)}</title><circle r="12" opacity="0"/><circle r="4"/>${showLabel?`<text x="${left?-9:9}" y="${dy}" text-anchor="${left?'end':'start'}">${esc(p.name)}</text>`:''}</g>`;}).join('');
    $('#route-list').innerHTML=route.length?route.map((p,i)=>`<li><button data-detail="${esc(p.id)}"><span>${esc(p.name)}</span><small>${String(i+1).padStart(2,'0')}</small></button></li>`).join(''):'<li>선택된 여행지가 없습니다.</li>';
    $('#route-title').textContent={world:'유럽에서 아시아까지',europe:'유럽의 페이지',asia:'아시아의 페이지'}[mapView];
    $('#route-status').textContent=state.routeEdited?'나의 루트':'예시 루트';$('#route-legend').textContent=state.routeEdited?'저장한 루트':'예시 연결선';
    $('#route-description').innerHTML=state.routeEdited?'직접 정한 순서로 이어진 여행.<br>새로운 추억이 생기면 이어보세요.':'방문지를 연결한 예시입니다.<br>실제 여행 순서에 맞게 편집해 보세요.';
    $$('.map-tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.map===mapView);b.setAttribute('aria-pressed',b.dataset.map===mapView);});
  }
  $('.map-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-map]');if(b){mapView=b.dataset.map;renderMap();}});
  $('#world-map').addEventListener('keydown',e=>{const pin=e.target.closest('[data-detail]');if(pin&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showDetail(pin.dataset.detail);}});
  $('#edit-route').addEventListener('click',()=>{const ids=places().filter(hasCoords).map(p=>p.id);routeDraft=[...state.route.filter(id=>ids.includes(id)).map(id=>({id,checked:true})),...ids.filter(id=>!state.route.includes(id)).map(id=>({id,checked:false}))];renderRouteEditor();openDialog('#route-dialog');});
  function renderRouteEditor(){ $('#route-editor-list').innerHTML=routeDraft.map((v,i)=>`<div class="route-editor-item"><label><input type="checkbox" data-route-id="${esc(v.id)}" ${v.checked?'checked':''}>${esc(byId(v.id).name)}</label><div><button data-move="-1" data-index="${i}" aria-label="${esc(byId(v.id).name)} 위로" ${i===0?'disabled':''}>↑</button><button data-move="1" data-index="${i}" aria-label="${esc(byId(v.id).name)} 아래로" ${i===routeDraft.length-1?'disabled':''}>↓</button></div></div>`).join(''); }
  $('#route-editor-list').addEventListener('change',e=>{const id=e.target.dataset.routeId;if(id)routeDraft.find(v=>v.id===id).checked=e.target.checked;});
  $('#route-editor-list').addEventListener('click',e=>{const b=e.target.closest('[data-move]');if(!b)return;const i=Number(b.dataset.index),j=i+Number(b.dataset.move);if(j<0||j>=routeDraft.length)return;[routeDraft[i],routeDraft[j]]=[routeDraft[j],routeDraft[i]];renderRouteEditor();$(`[data-index="${j}"][data-move="${b.dataset.move}"]`)?.focus();});
  $('#save-route').addEventListener('click',()=>{const next=structuredClone(state);next.route=routeDraft.filter(v=>v.checked).map(v=>v.id);next.routeEdited=true;if(!persist(next))return;renderMap();$('#route-dialog').close();toast('나의 여행 루트를 저장했어요.');});
  $('#export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`travel-pages-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('여행 기록 백업 파일을 내보냈어요.');});
  $('#import-data').addEventListener('click',()=>$('#import-file').click());
  $('#import-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>20*1024*1024)throw Error('20MB 이하의 백업 파일을 선택해 주세요.');pendingImport=validate(JSON.parse(await f.text()));openDialog('#import-dialog');}catch(err){toast(err instanceof SyntaxError?'JSON 백업 파일을 확인해 주세요.':err.message);}finally{e.target.value='';}});
  $('#cancel-import').addEventListener('click',()=>{pendingImport=null;$('#import-dialog').close();});
  $('#confirm-import').addEventListener('click',()=>{if(pendingImport&&persist(pendingImport)){pendingImport=null;region='all';$('#search').value='';renderAll();$('#import-dialog').close();toast('백업한 여행 기록을 불러왔어요.');}});
  function renderAll(){renderVisited();renderRecommendations();renderMap();}
  $('#year').textContent=new Date().getFullYear();renderAll();
  if(storageIssue)toast('저장된 기록을 읽지 못했습니다. 백업 파일이 있다면 불러와 주세요.');
})();
