const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collator = new Intl.Collator('sv', {sensitivity:'base', numeric:true});
const num = n => new Intl.NumberFormat('sv-SE', {maximumFractionDigits:1}).format(n);
const university = u => u==='Aalto' ? 'Aalto-universitetet' : 'Lapplands universitet';
const language = lang => ({fi:'finska',fin:'finska',en:'engelska',eng:'engelska',sv:'svenska',swe:'svenska'}[lang] || lang);
const fold = t => String(t??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const qp = params => './?'+new URLSearchParams(params).toString();
let records=[];

try {
  const response = await fetch('data/theses.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const dataset=await response.json();records=dataset.records;
  if(document.body.dataset.page==='catalogue') catalogue();
  else {const r=await fetch('data/analysis.json');if(!r.ok)throw new Error('Analysdata saknas');analysis(await r.json());}
} catch(error) {
  const target=$('#results') || $('#insights');
  if(target)target.innerHTML='<p class="error-state">Materialet kunde inte laddas. Försök ladda om sidan, eller <a href="https://github.com/tdufva/examnesarbete/tree/main/docs/data">läs datamaterialet på GitHub</a>.</p>';
  if($('#result-count'))$('#result-count').textContent='Ett fel uppstod vid hämtningen.';
  console.error(error);
}

function catalogue(){
  const open=records.filter(r=>r.open_pdf).length;
  $('#hero-stats').innerHTML=[[records.length,'examensarbeten'],[2,'universitet'],[open,'med öppen PDF'],[records.length-open,'utan öppen PDF']].map(([n,t])=>`<p class="stat"><strong>${n}</strong><span>${t}</span></p>`).join('');
  for(const [selector,key] of [['#method','primary_method'],['#theme','themes']]){
    const values=[...new Set(records.flatMap(r=>Array.isArray(r[key])?r[key]:[r[key]]))].filter(Boolean).sort(collator.compare);
    $(selector).insertAdjacentHTML('beforeend',values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join(''));
  }
  const params=new URLSearchParams(location.search);
  const keys=['search','university','year','method','theme','availability','sort'];
  keys.forEach(k=>{if(params.has(k))$('#'+k).value=params.get(k);});
  const searchText=new Map(records.map(r=>[r.id,fold([r.original_title,r.title_sv,r.original_abstract,r.abstract_sv,r.authors,...r.keywords,...r.keywords_sv,r.topic_sv,r.primary_method,...r.themes].join(' '))]));
  function render(){
    const search=fold($('#search').value.trim()),uni=$('#university').value,year=$('#year').value,method=$('#method').value,theme=$('#theme').value,access=$('#availability').value;
    const terms=search.split(/\s+/).filter(Boolean);
    const filtered=records.filter(r=>(!uni||r.university===uni)&&(!year||r.year===Number(year))&&(!method||r.primary_method===method)&&(!theme||r.themes.includes(theme))&&(!access||(access==='open'?r.open_pdf:!r.open_pdf))&&terms.every(t=>searchText.get(r.id).includes(t)));
    const sort=$('#sort').value;
    filtered.sort((a,b)=>sort==='year-asc'?a.year-b.year||collator.compare(a.authors,b.authors):sort==='university'?collator.compare(a.university,b.university)||b.year-a.year||collator.compare(a.authors,b.authors):sort==='title'?collator.compare(a.original_title,b.original_title):sort==='author'?collator.compare(a.authors,b.authors):b.year-a.year||collator.compare(a.university,b.university)||collator.compare(a.authors,b.authors));
    $('#result-count').textContent=`Visar ${filtered.length} av ${records.length} arbeten · ${filtered.filter(r=>r.open_pdf).length} med öppen PDF`;
    $('#results').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty-state"><h3>Inga arbeten matchar ditt urval.</h3><p>Prova ett annat sökord eller rensa något av filtren.</p></div>';
    const url=new URL(location.href);url.search='';keys.forEach(k=>{const value=$('#'+k).value;if(value && !(k==='sort'&&value==='year-desc'))url.searchParams.set(k,value);});
    history.replaceState(null,'',url);
  }
  $('#filters').addEventListener('submit',e=>e.preventDefault());
  $('#filters').addEventListener('input',render);$('#sort').addEventListener('change',render);
  $('#reset').addEventListener('click',()=>{$('#filters').reset();$('#sort').value='year-desc';render();});
  $('#results').addEventListener('click',e=>{const button=e.target.closest('[data-work]');if(button)openWork(button.dataset.work);});
  const dialog=$('#work-dialog');
  $('.close-dialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{const url=new URL(location.href);url.hash='';history.replaceState(null,'',url);});
  function hashOpen(){const id=new URLSearchParams(location.hash.slice(1)).get('arbete');if(id&&records.some(r=>r.id===id))openWork(id);}
  window.addEventListener('hashchange',hashOpen);
  render();hashOpen();
}

function card(r){
  const translated=fold(r.title_sv)!==fold(r.original_title);
  return `<article class="work-card ${r.university==='Lappland'?'lappland':''}"><div class="card-meta"><span><i class="university-dot" aria-hidden="true"></i>${esc(r.university==='Aalto'?'Aalto':'Lappland')}</span><span>${r.year}</span></div><h3 lang="${esc(r.language.slice(0,2))}">${esc(r.original_title)}</h3>${translated?`<p class="translated-title"><span class="translation-label">Svensk översättning · AI</span>${esc(r.title_sv)}</p>`:''}<p class="card-author">${esc(r.authors)}</p><p class="topic-line">${esc(r.topic_sv)}</p><div><span class="method-chip">${esc(r.primary_method)}</span></div><div class="card-bottom"><button class="read-button" type="button" data-work="${esc(r.id)}" aria-label="Läs abstrakt och metoder: ${esc(r.original_title)}">Abstrakt & metoder <span aria-hidden="true">↗</span></button><span class="access-label ${r.open_pdf?'':'closed'}">${r.open_pdf?'Öppen PDF':'Ingen öppen PDF'}</span></div></article>`;
}

function openWork(id){
  const r=records.find(r=>r.id===id);if(!r)return;
  const isSwedish=r.abstract_language?.startsWith('sv');
  const titleTranslated=fold(r.title_sv)!==fold(r.original_title);
  const basisName=m=>m.basis==='pdf'?`PDF, sida ${m.pdf_page} i filen`:'Författarens abstrakt';
  const kinds={design:'Forskningsdesign',insamling:'Datainsamling',analys:'Analys',perspektiv:'Teoretiskt perspektiv'};
  $('#dialog-body').innerHTML=`<p class="eyebrow">${esc(university(r.university))} / ${r.year}</p><h2 id="dialog-title" lang="${esc(r.language.slice(0,2))}">${esc(r.original_title)}</h2>${titleTranslated?`<div class="dialog-title-sv"><span class="translation-label">Svensk översättning · AI</span>${esc(r.title_sv)}</div>`:''}<div class="dialog-meta"><span>${esc(r.authors)}</span><span>Arbetets språk: ${esc(language(r.language))}</span><span>${r.open_pdf?'Öppen fulltext':'PDF inte öppet tillgänglig'}</span></div><div class="source-actions"><a href="${esc(r.source_url)}" target="_blank" rel="noopener">Originalpost i arkivet ↗</a>${r.pdf_urls.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${r.pdf_urls.length>1?'PDF '+(i+1):'Öppna PDF'} ↗</a>`).join('')}</div><section class="detail-section"><h3>Abstrakt</h3><div class="abstract-block"><p class="language-label">Original · ${esc(language(r.abstract_language))}</p><div class="abstract-text abstract-original" lang="${esc(r.abstract_language.slice(0,2))}">${esc(r.original_abstract)}</div></div>${!isSwedish?`<div class="abstract-block"><p class="language-label">Svenska · ${r.translation_kind==='original_sv'?'författarens befintliga svenska abstrakt':'AI-översättning, inte författargranskad'}</p><div class="abstract-text">${esc(r.abstract_sv)}</div></div>`:''}</section><section class="detail-section"><h3>Nyckelord</h3><p class="keyword-group" lang="${esc(r.language.slice(0,2))}"><strong>Original från arkivet</strong>${r.keywords.map(esc).join(' · ')||'Nyckelord saknas i arkivposten.'}</p><p class="keyword-group"><strong>Svenska · AI-översättning</strong>${r.keywords_sv.map(esc).join(' · ')||'Inga nyckelord att översätta.'}</p></section><section class="detail-section"><h3>Metoder och belägg</h3><p class="language-label">Kodad huvuddesign: ${esc(r.primary_method)}</p>${r.methods.length?r.methods.map(m=>`<div class="method-evidence"><strong>${esc(m.label)}</strong><small>${esc(kinds[m.kind]||m.kind)} · ${m.basis==='pdf'&&r.method_pdf_url?`<a href="${esc(r.method_pdf_url)}#page=${m.pdf_page}" target="_blank" rel="noopener">${esc(basisName(m))} ↗</a>`:esc(basisName(m))} · parafras</small><p>${esc(m.evidence_sv)}</p></div>`).join(''):'<p>Forskningsmetoden kunde inte fastställas i det tillgängliga underlaget.</p>'}<p class="method-note">${esc(r.method_note_sv)} Metodkodningen är AI-assisterad; den är inte författarens godkännande av vår klassificering.</p></section><section class="detail-section"><h3>Teman i vår läsning</h3><p class="muted">Överlappande, tolkade kategorier. Skilda från författarens nyckelord.</p><div class="theme-tags">${r.themes.map(t=>`<a href="${esc(qp({theme:t}))}">${esc(t)} →</a>`).join('')}</div></section><section class="detail-section"><p class="permalink">Permanent länk: <a href="#arbete=${encodeURIComponent(r.id)}">detta examensarbete</a> · <a href="https://github.com/tdufva/examnesarbete/issues/new?template=korrigering.yml&title=${encodeURIComponent('Korrigering: '+r.original_title)}">föreslå en korrigering</a></p><p class="permalink">Metadata: universitetsarkivet. Originalets rättigheter: ${esc(r.rights?.join(' · ')||'se arkivposten')}. Länkarna leder till originalutgivaren; PDF-filer återpubliceras inte här.</p></section>`;
  const dialog=$('#work-dialog');if(!dialog.open)dialog.showModal();
  dialog.scrollTop=0;
  const url=new URL(location.href);url.hash='arbete='+encodeURIComponent(r.id);history.replaceState(null,'',url);
}

function rankRows(rows,total,key,limit=99){
  const max=Math.max(1,...rows.map(r=>r.count));
  return rows.slice(0,limit).map(r=>`<div class="rank-row"><div><span class="rank-label">${key?`<a href="${esc(qp({[key]:r.label}))}">${esc(r.label)}</a>`:esc(r.label)}</span><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${r.count/max*100}%"></div></div></div><span class="rank-value">${r.count}<br><span class="muted">${num(r.count/total*100)} %</span></span></div>`).join('');
}

function analysis(a){
  const topMethod=a.primary_methods[0],topTheme=a.themes[0],topKeyword=a.keywords[0];
  $('#insights').innerHTML=[
    ['Vanligaste huvuddesign',`${topMethod.count} / ${a.total}`,topMethod.label,`${num(topMethod.count/a.total*100)} % av alla arbeten. En huvudkategori per post.`],
    ['Mest förekommande temakod',`${topTheme.count} / ${a.total}`,topTheme.label,'Ett tolkat, överlappande tema – inte ett exakt författarvalt ämnesord.'],
    ['Vanligaste nyckelord',`${topKeyword.count} arbeten`,topKeyword.label,'Författarnas ord i svensk översättning. Synonymer hålls isär.']
  ].map(([k,n,t,p])=>`<article class="insight"><p class="insight-kicker">${esc(k)}</p><p class="insight-number">${esc(n)}</p><h3>${esc(t)}</h3><p>${esc(p)}</p></article>`).join('');
  $('#university-readings').innerHTML=['Aalto','Lappland'].map(u=>{
    const g=a.universities[u],lead=g.themes.slice(0,2),method=g.primary_methods[0];
    return `<article><h3>${university(u)} · ${g.total} arbeten</h3><p>I vår kodning är ${lead.map(t=>`<strong>${esc(t.label.toLowerCase())}</strong> (${t.count}/${g.total})`).join(' och ')} de vanligaste temana. Den vanligaste huvuddesignen är <strong>${esc(method.label.toLowerCase())}</strong> (${method.count}/${g.total}).</p><p class="muted">Detta beskriver det insamlade materialet; skillnaderna förklarar inte varför utbildningarna skiljer sig åt.</p></article>`;
  }).join('');
  let metric='percent';
  function comparison(){
    const rows=a.themes.slice(0,8);const max=metric==='percent'?100:Math.max(1,...rows.flatMap(t=>['Aalto','Lappland'].map(u=>a.universities[u].theme_counts[t.label]||0)));
    $('#comparison-chart').innerHTML='<div class="compare-key"><span><i class="swatch"></i>Aalto-universitetet</span><span><i class="swatch lappland"></i>Lapplands universitet</span></div>'+rows.map(t=>`<div class="comparison-row"><a class="comparison-label" href="${esc(qp({theme:t.label}))}">${esc(t.label)}</a><div class="bar-pair">${['Aalto','Lappland'].map(u=>{const g=a.universities[u],n=g.theme_counts[t.label]||0;const value=metric==='percent'?n/g.total*100:n;return `<div class="bar-line" aria-label="${esc(university(u))}: ${n} av ${g.total}, ${num(n/g.total*100)} procent"><div class="bar-track" aria-hidden="true"><div class="bar-fill ${u==='Lappland'?'lappland':''}" style="width:${value/max*100}%"></div></div><span class="bar-value">${metric==='percent'?num(value)+' %':n+' st.'} <span class="muted">(${n}/${g.total})</span></span></div>`;}).join('')}</div></div>`).join('');
  }
  $$('[data-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.metric;$$('[data-metric]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));comparison();$('#analysis-status').textContent=metric==='percent'?'Diagrammet visar andelar per universitet.':'Diagrammet visar antal arbeten.';}));comparison();
  $('#year-table').innerHTML='<table><caption>Arkivposter och öppen tillgång per universitet och år</caption><thead><tr><th scope="col">Universitet</th><th scope="col">År</th><th scope="col">Arbeten</th><th scope="col">Öppen PDF</th><th scope="col">Ingen öppen PDF</th></tr></thead><tbody>'+a.by_year.map(g=>`<tr><th scope="row">${university(g.university)}</th><td>${g.year}</td><td>${g.total}</td><td>${g.open}</td><td>${g.total-g.open}</td></tr>`).join('')+'</tbody></table>';
  $('#method-university-table').innerHTML='<table><caption>En huvuddesign per arbete; andelar inom universitetet</caption><thead><tr><th scope="col">Huvuddesign</th><th scope="col">Aalto (n = 48)</th><th scope="col">Lappland (n = 50)</th></tr></thead><tbody>'+a.primary_methods.map(m=>'<tr><th scope="row">'+esc(m.label)+'</th>'+['Aalto','Lappland'].map(u=>{const g=a.universities[u];const n=g.primary_methods.find(x=>x.label===m.label)?.count||0;return '<td>'+n+' ('+num(n/g.total*100)+' %)</td>';}).join('')+'</tr>').join('')+'</tbody></table>';
  $('#method-chart').innerHTML=rankRows(a.primary_methods,a.total,'method');
  $('#technique-chart').innerHTML=rankRows(a.techniques,a.total,null,10);
  $('#theme-chart').innerHTML=rankRows(a.themes,a.total,'theme');
  $('#keyword-list').innerHTML=a.keywords.slice(0,24).map(k=>`<a href="${esc(qp({search:k.label}))}">${esc(k.label)}<span>${k.count}</span></a>`).join('');
  $('#method-coverage').innerHTML=`<strong>Källunderlaget är olika stort.</strong> ${a.method_coverage.with_pdf_evidence} arbeten har minst ett metodbelägg från ett utvalt PDF-avsnitt. ${a.method_coverage.abstract_only} har metodbelägg enbart från abstrakt. För ${a.method_coverage.no_methods} saknas tillräckligt metodbelägg. Metodbeläggen är inte en systematisk fulltextgranskning.`;
  $('#access-chart').innerHTML=['Aalto','Lappland'].map(u=>{const g=a.universities[u];return `<div class="access-row ${u==='Lappland'?'lappland':''}"><p class="access-name"><strong>${university(u)}</strong><span>${g.open}/${g.total} öppna · ${num(g.open/g.total*100)} %</span></p><div class="access-track" role="img" aria-label="${g.open} av ${g.total} arbeten har öppen PDF"><span style="width:${g.open/g.total*100}%"></span></div></div>`;}).join('')+'<p class="access-legend">Färgad yta = öppen PDF · sandfärgad yta = inte öppet tillgänglig</p>';
}
