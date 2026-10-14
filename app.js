/* Guia do Colaborador — Grupo Almeria
   Os cadastros vão para uma planilha Google do RH por meio de um Apps Script.
   A senha da área do RH é conferida no Apps Script, nunca aqui. */
const API_URL = "https://script.google.com/macros/s/AKfycbzS5M5CdAyml70mXYjf3fYIaLUSI82cusGkRLWPPmBBiPc_P0EkXXRslmH8QYxolzUi/exec";

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const toast = m => { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3500); };
const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const UNIDADES = ["Almeria Asa Sul (104 Sul)","Casa Almeria Delivery (Asa Sul)","Casa Noroeste","Almeria Beira Lago","Wine Garden","CPD (Almeria Matriz)","CSC (Almeria Holding)","Almeria Buffet e Eventos"];
const apiReady = () => /^https:\/\/script\.google\.com\//.test(API_URL);
async function api(body){
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

/* ---------- navegação entre telas ---------- */
const views = { gate: $('#viewGate'), form: $('#viewForm'), guide: $('#viewGuide'), rh: $('#viewRh') };
function go(v){
  Object.entries(views).forEach(([k, el]) => el.hidden = k !== v);
  if (v === 'guide' || v === 'form') store.set('almeria-entrada', '1');
  if (v === 'form') formStatus();
  if (v === 'rh') setTimeout(() => (rhSenha ? null : $('#rhPass').focus()), 50);
  history.replaceState(null, '', v === 'gate' ? location.pathname : '#' + (v === 'form' ? 'cadastro' : v === 'rh' ? 'rh' : 'guia'));
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { e.preventDefault(); go(b.dataset.go); } });
$('#goGuide').onclick = () => go('guide');
$('#goForm').onclick = () => go('form');
$('#gateRh').onclick = () => go('rh');

/* ---------- galeria de comunicados ---------- */
const COMS = [
  ["batidas4","Atenção: mínimo de 4 batidas diárias","01-atencao-4-batidas-diarias.jpg"],
  ["regrasponto","Regras gerais sobre registro de ponto","02-regras-gerais-registro-de-ponto.png"],
  ["impares","Regularização de batidas ímpares","03-regularizacao-batidas-impares.png"],
  ["horasextras","Realização de horas extras","04-realizacao-de-horas-extras.png"],
  ["homolog","Homologação de atestados","05-homologacao-de-atestados.jpg"],
  ["clinica","Clínica Expertise: homologação de atestados","06-clinica-expertise.png"],
  ["atestmed","Atestados médicos: comparecimento x afastamento","07-atestados-medicos.jpg"],
  ["atestfolga","Atestados: contagem a partir da emissão","08-atestados-contagem.png"],
  ["troca","Aviso importante: troca de plantão","09-troca-de-plantao-aviso.jpg"],
  ["qr","Formulário de troca de plantão","10-troca-de-plantao-formulario.png"],
  ["convivencia","Boa convivência no ambiente de trabalho","11-boa-convivencia.jpg"],
  ["consumo","Norma sobre consumo interno de alimentos","12-consumo-interno-de-alimentos.jpg"],
  ["higiene","Conduta e higiene no local de trabalho","13-conduta-e-higiene.png"],
  ["fumar","Proibido fumar nas dependências","14-proibido-fumar.jpg"],
  ["dispositivos","Uso de dispositivos e adornos","15-dispositivos-e-adornos.jpg"]
];
const thumb = k => k === 'clinica' ? 'img/clinica-expertise.jpg' : 'img/com-' + k + '.jpg';
const orig = f => 'img/originais/' + f;
const g = $('#gallery');
COMS.forEach(([k, t, f]) => {
  const card = document.createElement('div'); card.className = 'gitem rule';
  card.innerHTML = '<button type="button" class="thumb"><img alt="" loading="lazy"><span></span></button><a class="dlink">Baixar</a>';
  card.querySelector('img').src = thumb(k); card.querySelector('span').textContent = t;
  const a = card.querySelector('a'); a.href = orig(f); a.setAttribute('download', 'Grupo Almeria - ' + f.replace(/^\d+-/, ''));
  a.setAttribute('aria-label', 'Baixar comunicado: ' + t);
  card.querySelector('button').onclick = () => openLb(orig(f), t, f);
  g.appendChild(card);
});
const lb = $('#lb'), lbImg = $('#lbImg'), lbDl = $('#lbDl');
function openLb(src, t, f){ lbImg.src = src; lbImg.alt = t; lbDl.href = src; lbDl.setAttribute('download', 'Grupo Almeria - ' + (f || 'comunicado.jpg').replace(/^\d+-/, '')); lb.hidden = false; $('#lbClose').focus(); }
$('#lbClose').onclick = () => lb.hidden = true;
lb.addEventListener('click', e => { if (e.target === lb) lb.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });
$('#clinicImg').onclick = () => openLb(orig('06-clinica-expertise.png'), 'Clínica Expertise', '06-clinica-expertise.png');

/* ---------- copiar telefones ---------- */
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
  const v = b.dataset.copy;
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('Copiado: ' + v), () => { const r = document.createRange(); r.selectNodeContents(b); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
}));

/* ---------- próximas datas ---------- */
(function(){
  const now = new Date(); now.setHours(0,0,0,0);
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const mesesL = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const dias = ['dom','seg','ter','qua','qui','sex','sáb']; const ev = [];
  for (let m = -1; m < 3; m++){
    const y = now.getFullYear(), mo = now.getMonth() + m, d = day => new Date(y, mo, day), prev = new Date(y, mo - 1, 1);
    ev.push([d(5), 'Comissão da 2ª quinzena de ' + mesesL[prev.getMonth()] + ' (prazo final)']);
    ev.push([d(9), 'Começa o período de VT de 09 a 22']);
    ev.push([d(20), 'Comissão da 1ª quinzena de ' + mesesL[d(20).getMonth()] + ' (prazo final)']);
    ev.push([d(21), 'Fechamento do banco de horas']);
    ev.push([d(23), 'Começa o período de VT de 23 a 08']);
  }
  const ol = $('#nextList');
  ev.filter(e => e[0] >= now).sort((a,b) => a[0] - b[0]).slice(0, 5).forEach(([dt, t]) => {
    const n = Math.round((dt - now) / 864e5); const li = document.createElement('li');
    li.innerHTML = '<span class="d"></span><span></span><span class="in"></span>';
    li.children[0].textContent = dias[dt.getDay()] + ', ' + String(dt.getDate()).padStart(2,'0') + ' ' + meses[dt.getMonth()];
    li.children[1].textContent = t; li.children[2].textContent = n === 0 ? 'hoje' : n === 1 ? 'amanhã' : 'em ' + n + ' dias';
    ol.appendChild(li);
  });
  const li = document.createElement('li'); li.innerHTML = '<span class="d">5º dia útil</span><span>Salário</span><span class="in"></span>'; ol.appendChild(li);
})();

/* ---------- busca no guia ---------- */
const q = $('#q'), cnt = $('#count'), empty = $('#empty');
const rules = [...document.querySelectorAll('#main .rule')]; rules.forEach(r => r.dataset.t = norm(r.textContent));
q.addEventListener('input', () => {
  const v = norm(q.value.trim()); let shown = 0;
  rules.forEach(r => { const ok = !v || r.dataset.t.includes(v); r.hidden = !ok; if (ok) shown++; });
  document.querySelectorAll('#main [data-sec]').forEach(s => {
    const any = [...s.querySelectorAll('.rule')].some(r => !r.hidden); s.hidden = !!v && !any;
    s.querySelectorAll('.two,.rules').forEach(c => { if (!c.classList.contains('rule')) c.hidden = !!v && ![...c.querySelectorAll('.rule')].some(r => !r.hidden); });
  });
  document.querySelector('.next').hidden = !!v; empty.hidden = !v || shown > 0;
  cnt.textContent = v ? (shown + (shown === 1 ? ' resultado' : ' resultados')) : '';
});
const links = [...document.querySelectorAll('#toc a')];
const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }); }, { rootMargin: '-30% 0px -60% 0px' });
document.querySelectorAll('[data-sec]').forEach(s => io.observe(s));

/* ---------- formulário de registro ---------- */
const F = $('#regForm');
const fillU = sel => UNIDADES.forEach(u => { const o = document.createElement('option'); o.textContent = u; sel.appendChild(o); });
fillU($('#f_unid')); fillU($('#r_unid'));
const radio = n => (F.querySelector('input[name="' + n + '"]:checked') || {}).value || '';
function toggles(){
  $('#f_sexoOutro').hidden = radio('sexo') !== 'Outro';
  $('#pcdBox').hidden = radio('pcd') !== 'Sim';
  $('#parBox').hidden = radio('parente') !== 'Sim';
  $('#f_depQtd').hidden = radio('dependentes') !== 'Sim';
  $('#vtBox').hidden = radio('vt') !== 'Sim';
}
F.addEventListener('change', toggles);
$('#f_cpf').addEventListener('input', e => { const d = e.target.value.replace(/\D/g,'').slice(0,11); e.target.value = d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4'); });
function cpfOk(c){ c = c.replace(/\D/g,''); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false; let s = 0; for (let i = 0; i < 9; i++) s += +c[i] * (10 - i); let d = (s * 10) % 11 % 10; if (d !== +c[9]) return false; s = 0; for (let i = 0; i < 10; i++) s += +c[i] * (11 - i); d = (s * 10) % 11 % 10; return d === +c[10]; }

const FIELDS = [["enviadoEm","Enviado em"],["nome","Nome completo"],["nomeSocial","Nome social"],["cpf","CPF"],["email","E-mail"],["telefone","Telefone"],["nascimento","Nascimento"],["sexo","Sexo"],["racaCor","Raça/Cor"],["estadoCivil","Estado civil"],["escolaridade","Escolaridade"],["endereco","Endereço"],["pcd","PcD"],["pcdQual","PcD: qual"],["unidade","Unidade"],["cargo","Cargo"],["inicio","Início previsto"],["parente","Parente na empresa"],["parenteNome","Parente: nome"],["parenteGrau","Parente: grau"],["parenteUnidade","Parente: unidade"],["dependentes","Dependentes"],["dependentesQtd","Qtd. dependentes"],["vt","Usa VT"],["vtValor","VT valor diário"],["contaInter","Conta Inter / PIX"],["blusa","Blusa"],["calca","Calça"],["sapato","Sapato"]];

function collect(){
  const o = {};
  ['email','nome','nomeSocial','nascimento','cpf','estadoCivil','telefone','escolaridade','endereco','pcdQual','unidade','cargo','inicio','parenteNome','parenteGrau','parenteUnidade','dependentesQtd','vtValor','contaInter','blusa','calca','sapato'].forEach(n => { const el = F.elements[n]; o[n] = el ? String(el.value || '').trim() : ''; });
  ['pcd','parente','dependentes','vt','racaCor'].forEach(n => o[n] = radio(n));
  o.sexo = radio('sexo') === 'Outro' ? ('Outro: ' + $('#f_sexoOutro').value.trim()) : radio('sexo');
  if (o.pcd !== 'Sim') o.pcdQual = '';
  if (o.parente !== 'Sim') { o.parenteNome = ''; o.parenteGrau = ''; o.parenteUnidade = ''; }
  if (o.dependentes !== 'Sim') o.dependentesQtd = '';
  if (o.vt !== 'Sim') o.vtValor = '';
  return o;
}
function validate(o){
  F.querySelectorAll('.bad').forEach(x => x.classList.remove('bad')); F.querySelectorAll('.err').forEach(x => x.remove());
  const errs = []; const mark = (el, m) => { const f = el.closest('.field') || el.parentElement; f.classList.add('bad'); const s = document.createElement('span'); s.className = 'err'; s.textContent = m; f.appendChild(s); errs.push(el); };
  F.querySelectorAll('[required]').forEach(el => { if (!el.hidden && !String(el.value).trim()) mark(el, 'Campo obrigatório'); });
  F.querySelectorAll('[data-req]').forEach(gr => { if (!radio(gr.dataset.name)) mark(gr, 'Escolha uma opção'); });
  if (o.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) mark(F.elements.email, 'E-mail inválido');
  if (o.cpf && !cpfOk(o.cpf)) mark(F.elements.cpf, 'CPF inválido');
  if (o.parente === 'Sim') { if (!o.parenteNome) mark($('#f_parNome'), 'Informe o nome'); if (!o.parenteGrau) mark($('#f_parGrau'), 'Informe o grau'); }
  if (o.vt === 'Sim' && !o.vtValor) mark($('#f_vtValor'), 'Informe o valor ou escreva "não sei"');
  if (!$('#f_decl').checked) mark($('#f_decl'), 'Necessário para enviar');
  if (!$('#f_lgpd').checked) mark($('#f_lgpd'), 'Necessário para enviar');
  if (errs.length) { errs[0].scrollIntoView({ block: 'center' }); if (errs[0].focus && errs[0].tagName !== 'DIV') errs[0].focus({ preventScroll: true }); }
  return !errs.length;
}
function formStatus(){
  const blk = $('#formBlocked');
  if (!apiReady()) { blk.hidden = false; blk.textContent = 'O formulário ainda não está ligado à planilha do RH. Procure o RH para fazer seu cadastro.'; $('#sendBtn').disabled = true; }
  else { blk.hidden = true; $('#sendBtn').disabled = false; }
}
F.addEventListener('submit', async e => {
  e.preventDefault(); const err = $('#formErr'); err.hidden = true;
  const o = collect(); if (!validate(o)) return;
  if (!apiReady()) { formStatus(); return; }
  const btn = $('#sendBtn'); btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const r = await api({ action: 'cadastrar', dados: o });
    if (!r || !r.ok) throw new Error((r && r.erro) || 'falha');
    F.reset(); toggles();
    toast('Cadastro enviado. Bem-vindo(a) ao Grupo Almeria!'); go('guide');
  } catch (x) {
    err.hidden = false; err.textContent = 'Não foi possível enviar agora. Verifique a internet e tente de novo. Se continuar, procure o RH.';
  }
  btn.disabled = false; btn.textContent = 'Enviar e ir para o guia';
});

/* ---------- área do RH ---------- */
let rhSenha = null, ALL = [];
const colSel = new Set(FIELDS.map(f => f[0]));
const colBox = $('#rhCols');
FIELDS.forEach(([k, l]) => { const lab = document.createElement('label'); lab.className = 'opt'; lab.innerHTML = '<input type="checkbox" checked><span></span>'; lab.querySelector('span').textContent = l; const i = lab.querySelector('input'); i.id = 'col_' + k; i.onchange = () => { i.checked ? colSel.add(k) : colSel.delete(k); renderRh(); }; colBox.appendChild(lab); });
$('#colAll').onclick = () => { FIELDS.forEach(([k]) => { colSel.add(k); $('#col_' + k).checked = true; }); renderRh(); };
$('#colNone').onclick = () => { FIELDS.forEach(([k]) => { colSel.delete(k); $('#col_' + k).checked = false; }); renderRh(); };
const FIDS = ['r_de','r_ate','r_unid','r_nome','r_cargo','r_par','r_vt','r_pcd'];
FIDS.forEach(id => $('#' + id).addEventListener('input', renderRh));
$('#rhClear').onclick = () => { FIDS.forEach(id => $('#' + id).value = ''); renderRh(); };

$('#rhLogin').addEventListener('submit', async e => {
  e.preventDefault(); const msg = $('#rhLoginMsg'); msg.hidden = true;
  const senha = $('#rhPass').value; if (!senha) return;
  if (!apiReady()) { msg.hidden = false; msg.textContent = 'A área do RH ainda não está ligada à planilha. Configure o Apps Script primeiro.'; return; }
  const b = $('#rhEnter'); b.disabled = true; b.textContent = 'Entrando…';
  try {
    const r = await api({ action: 'listar', senha });
    if (r && r.ok) { rhSenha = senha; $('#rhPass').value = ''; ALL = r.cadastros || []; $('#rhLogin').hidden = true; $('#rhPanel').hidden = false; renderRh(); }
    else { msg.hidden = false; msg.textContent = r && r.erro === 'bloqueado' ? 'Muitas tentativas erradas. Aguarde 15 minutos.' : 'Senha incorreta.'; }
  } catch (x) { msg.hidden = false; msg.textContent = 'Não foi possível conectar à planilha. Tente de novo.'; }
  b.disabled = false; b.textContent = 'Entrar';
});
$('#rhOut').onclick = () => { rhSenha = null; ALL = []; $('#rhPanel').hidden = true; $('#rhLogin').hidden = false; renderRh(); go('gate'); };
$('#rhReload').onclick = async () => {
  if (!rhSenha) return; $('#rhStat').textContent = 'Atualizando…';
  try { const r = await api({ action: 'listar', senha: rhSenha }); if (r && r.ok) { ALL = r.cadastros || []; renderRh(); toast('Lista atualizada'); } else throw 0; }
  catch (x) { toast('Não foi possível atualizar'); renderRh(); }
};

const localDay = iso => { const d = new Date(iso); if (isNaN(d)) return ''; return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
const fmt = (k, v) => {
  if (v === undefined || v === null || v === '') return '';
  if (k === 'enviadoEm') { const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  if ((k === 'nascimento' || k === 'inicio') && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [a, m, d] = v.split('-'); return d + '/' + m + '/' + a; }
  return String(v);
};
function filtered(){
  const de = $('#r_de').value, ate = $('#r_ate').value, un = $('#r_unid').value, nm = norm($('#r_nome').value), cg = norm($('#r_cargo').value), par = $('#r_par').value, vt = $('#r_vt').value, pcd = $('#r_pcd').value;
  const nmD = nm.replace(/\D/g, '');
  return ALL.filter(r => {
    const day = r.enviadoEm ? localDay(r.enviadoEm) : '';
    if (de && day < de) return false; if (ate && day > ate) return false; if (un && r.unidade !== un) return false;
    if (nm && !(norm(r.nome).includes(nm) || norm(r.nomeSocial).includes(nm) || (nmD && String(r.cpf || '').replace(/\D/g, '').includes(nmD)))) return false;
    if (cg && !norm(r.cargo).includes(cg)) return false; if (par && r.parente !== par) return false; if (vt && r.vt !== vt) return false; if (pcd && r.pcd !== pcd) return false;
    return true;
  }).sort((a, b) => String(b.enviadoEm).localeCompare(String(a.enviadoEm)));
}
function renderRh(){
  const rows = filtered(), cols = FIELDS.filter(f => colSel.has(f[0]));
  const nPar = rows.filter(r => r.parente === 'Sim').length;
  $('#rhStat').innerHTML = ''; const b = document.createElement('b'); b.textContent = rows.length;
  $('#rhStat').append(b, document.createTextNode(' de ' + ALL.length + ' cadastros' + (nPar ? ' · ' + nPar + ' com parente na empresa' : '')));
  const th = $('#rhTable thead'), tb = $('#rhTable tbody'); th.innerHTML = ''; tb.innerHTML = '';
  const hr = document.createElement('tr'); cols.forEach(([, l]) => { const h = document.createElement('th'); h.textContent = l; hr.appendChild(h); }); hr.appendChild(document.createElement('th')); th.appendChild(hr);
  if (!rows.length) { const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = cols.length + 1; td.style.color = 'var(--muted)'; td.textContent = ALL.length ? 'Nenhum cadastro com esses filtros.' : 'Nenhum cadastro recebido ainda. Quando um novo funcionário enviar o formulário, ele aparece aqui.'; tr.appendChild(td); tb.appendChild(tr); return; }
  rows.forEach(r => {
    const tr = document.createElement('tr');
    cols.forEach(([k]) => { const td = document.createElement('td'); const v = fmt(k, r[k]); if (k === 'parente' && v === 'Sim') { const s = document.createElement('span'); s.className = 'flag'; s.textContent = 'Sim'; td.appendChild(s); } else td.textContent = v; td.title = v; tr.appendChild(td); });
    const td = document.createElement('td'); const del = document.createElement('button'); del.type = 'button'; del.className = 'rowdel'; del.textContent = 'Excluir';
    del.onclick = async () => {
      if (del.dataset.c !== '1') { del.dataset.c = '1'; del.textContent = 'Confirmar exclusão'; setTimeout(() => { del.dataset.c = ''; del.textContent = 'Excluir'; }, 4000); return; }
      try { const x = await api({ action: 'excluir', senha: rhSenha, id: r.id }); if (!x || !x.ok) throw 0; ALL = ALL.filter(y => y.id !== r.id); renderRh(); toast('Cadastro excluído'); }
      catch (e) { toast('Não foi possível excluir'); }
    };
    td.appendChild(del); tr.appendChild(td); tb.appendChild(tr);
  });
}
function tableData(){ const rows = filtered(), cols = FIELDS.filter(f => colSel.has(f[0])); return [cols.map(c => c[1]), ...rows.map(r => cols.map(([k]) => fmt(k, r[k])))]; }
const stamp = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
function saveBlob(name, blob){ const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
$('#rhCsv').onclick = () => {
  const t = tableData(); if (t.length < 2) { toast('Nenhuma linha para baixar'); return; }
  const csv = '﻿' + t.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  saveBlob('cadastros-novos-funcionarios-' + stamp() + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
};
function loadXlsx(){ return window.XLSX ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
$('#rhXlsx').onclick = async () => {
  const t = tableData(); if (t.length < 2) { toast('Nenhuma linha para baixar'); return; }
  try {
    await loadXlsx(); const ws = XLSX.utils.aoa_to_sheet(t);
    ws['!cols'] = t[0].map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...t.slice(1).map(r => String(r[i]).length)) + 2) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Cadastros');
    XLSX.writeFile(wb, 'cadastros-novos-funcionarios-' + stamp() + '.xlsx');
  } catch (x) { toast('Não foi possível gerar o Excel. Use o CSV.'); }
};

/* ---------- tela inicial ---------- */
(function(){
  const h = location.hash.slice(1);
  if (h === 'cadastro') go('form');
  else if (h === 'rh') go('rh');
  else if (h === 'guia') go('guide');
  else if (h && document.getElementById(h) && views.guide.contains(document.getElementById(h))) { go('guide'); setTimeout(() => document.getElementById(h).scrollIntoView(), 50); }
  else go(store.get('almeria-entrada') ? 'guide' : 'gate');
})();
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h === 'rh') go('rh'); else if (h === 'cadastro') go('form'); else if (h === 'guia') go('guide'); });
