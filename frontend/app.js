import yaml from 'js-yaml';
import { validateDefinition, csvEscape } from '../shared/runtime.js';
import { api, uploadFile } from './api.js';

const $ = (s) => document.querySelector(s);
const root = $('#app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const APP_ICONS = { mattress_quote: '🛏️', workout: '🏋️', inspection: '🔍' };
const appIcon = (id) => APP_ICONS[id] || '📋';

let current = null; // current app id
let currentDef = null; // current app definition
let currentRecords = []; // current app records (from backend)

function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}

async function home() {
  current = null;
  root.innerHTML = '<p>載入中…</p>';
  let apps;
  try {
    apps = await api.listApps();
  } catch (e) {
    root.innerHTML = `<p class="error">無法連線到伺服器：${esc(errorMessage(e))}</p>`;
    return;
  }
  root.innerHTML = `<section class="hero"><h1>我的 App</h1><p>Definition-driven data collection。資料儲存在伺服器資料庫中。</p><div class="actions"><button id="paste">匯入 Spec</button></div></section><section><h2>Apps</h2>${
    apps.length
      ? `<div class="cards">${apps
          .map(
            (a) =>
              `<button class="card appcard" data-id="${esc(a.app.id)}"><span class="app-icon">${appIcon(a.app.id)}</span><b>${esc(a.app.name)}</b><span>${a.record_count} 筆紀錄</span></button>`
          )
          .join('')}</div>`
      : '<p class="empty-state">還沒有任何 App，使用上面的「匯入 Spec」開始。</p>'
  }</section>`;
  $('#paste').onclick = renderImportForm;
  document.querySelectorAll('.appcard').forEach((x) => (x.onclick = () => openApp(x.dataset.id)));
}

async function openApp(id) {
  current = id;
  root.innerHTML = '<p>載入中…</p>';
  try {
    currentDef = await api.getApp(id);
    currentRecords = await api.listRecords(id);
  } catch (e) {
    root.innerHTML = `<p class="error">無法載入 App：${esc(errorMessage(e))}</p>`;
    return;
  }
  renderApp();
}

function renderApp() {
  const d = currentDef;
  const rs = currentRecords;
  root.innerHTML = `<section><h1>${esc(d.app.name)}</h1><div class="actions"><button id="new">新增紀錄</button><button id="spec" class="secondary">查看 Spec</button><button id="json">匯出 JSON</button><button id="csv">匯出 CSV</button><button id="back" class="ghost">返回</button></div></section><section><h2>紀錄</h2>${
    rs.length
      ? `<div class="cards">${rs
          .map(
            (r) =>
              `<div class="card"><b>${esc(r.data.brand || r.data.store || r.id)}</b><span>${new Date(r.updated_at).toLocaleString()}</span><div class="actions"><button data-edit="${esc(r.id)}">編輯</button><button class="danger" data-del="${esc(r.id)}">刪除</button></div></div>`
          )
          .join('')}</div>`
      : '<p class="empty-state">尚無紀錄，點「新增紀錄」開始。</p>'
  }</section>`;
  $('#new').onclick = () => form();
  $('#spec').onclick = renderSpecView;
  $('#json').onclick = () => download(`${current}.json`, JSON.stringify(rs, null, 2), 'application/json');
  $('#csv').onclick = () => exportCsv(d, rs);
  $('#back').onclick = home;
  document.querySelectorAll('[data-edit]').forEach((x) => (x.onclick = () => form(x.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach(
    (x) =>
      (x.onclick = async () => {
        if (!confirm('確定刪除？')) return;
        try {
          await api.deleteRecord(current, x.dataset.del);
          await openApp(current);
        } catch (e) {
          alert('刪除失敗：' + errorMessage(e));
        }
      })
  );
}

function renderSpecView() {
  const yamlText = yaml.dump(currentDef, { noRefs: true, lineWidth: 100 });
  root.innerHTML = `<section><h1>${esc(currentDef.app.name)} — Spec</h1><p class="muted">這是這個 App 的 OpenForm Definition（YAML）。可以複製後貼給任何 LLM 當範例，請它照同樣的語法幫你產生自己想要收集的表單。</p><pre id="specText" class="spec-view">${esc(yamlText)}</pre><div class="actions"><button id="specCopy">複製</button><button id="specDownload" class="secondary">下載 YAML</button><button id="specBack" class="ghost">返回</button></div></section>`;
  $('#specCopy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(yamlText);
      $('#specCopy').textContent = '已複製';
      setTimeout(() => ($('#specCopy').textContent = '複製'), 1500);
    } catch {
      alert('複製失敗，請手動選取文字');
    }
  };
  $('#specDownload').onclick = () => download(`${currentDef.app.id}.definition.yaml`, yamlText, 'text/yaml;charset=utf-8');
  $('#specBack').onclick = () => renderApp();
}

const pathId = (p) => 'f_' + p.join('_');

function fieldHtml(f, v = '', p = [f.id]) {
  const id = pathId(p);
  if (f.type === 'collection') {
    const items = Array.isArray(v) ? v : [];
    return `<fieldset class="collection" data-collection="${esc(id)}"><legend>${esc(f.label)}</legend><div class="collection-items">${items
      .map((x, i) => collectionItem(f, x, [...p, i], i))
      .join('')}</div><button type="button" class="secondary add-item" data-path="${esc(p.join('.'))}">＋ 新增${esc(f.item_label || '項目')}</button></fieldset>`;
  }
  if (['image', 'video', 'audio'].includes(f.type)) {
    const accept = { image: 'image/*', video: 'video/*', audio: 'audio/*' }[f.type];
    return `<label>${esc(f.label)}<div class="media-field" data-media="${id}"><input type="hidden" id="${id}" value="${esc(v)}"><div class="media-preview">${mediaPreviewHtml(f.type, v)}</div><input type="file" accept="${accept}" class="media-input" data-target="${id}" data-type="${f.type}"><p class="media-status muted"></p></div></label>`;
  }
  if (f.type === 'textarea') return `<label>${esc(f.label)}<textarea id="${id}">${esc(v)}</textarea></label>`;
  if (f.type === 'boolean') return `<label><input id="${id}" type="checkbox" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
  if (f.type === 'select')
    return `<label>${esc(f.label)}<select id="${id}">${(f.options || [])
      .map((o) => `<option value="${esc(o.value)}" ${v == o.value ? 'selected' : ''}>${esc(o.label)}</option>`)
      .join('')}</select></label>`;
  if (f.type === 'multi_select')
    return `<label>${esc(f.label)}<select id="${id}" multiple>${(f.options || [])
      .map((o) => `<option value="${esc(o.value)}" ${Array.isArray(v) && v.includes(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`)
      .join('')}</select></label>`;
  const t = { number: 'number', rating: 'number', date: 'date', time: 'time', datetime: 'datetime-local', duration: 'number' }[f.type] || 'text';
  return `<label>${esc(f.label)}<input id="${id}" type="${t}" value="${esc(v)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}></label>`;
}

function mediaPreviewHtml(type, url) {
  if (!url) return '';
  if (type === 'image') return `<img src="${esc(url)}" alt="">`;
  if (type === 'video') return `<video src="${esc(url)}" controls></video>`;
  if (type === 'audio') return `<audio src="${esc(url)}" controls></audio>`;
  return '';
}

function bindMediaInputs() {
  document.querySelectorAll('.media-input').forEach((input) => {
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const wrapper = input.closest('.media-field');
      const hidden = document.getElementById(input.dataset.target);
      const preview = wrapper.querySelector('.media-preview');
      const status = wrapper.querySelector('.media-status');
      status.textContent = '上傳中… 0%';
      try {
        const url = await uploadFile(file, (p) => (status.textContent = `上傳中… ${Math.round(p * 100)}%`));
        hidden.value = url;
        preview.innerHTML = mediaPreviewHtml(input.dataset.type, url);
        status.textContent = '上傳完成';
      } catch (e) {
        status.textContent = '上傳失敗：' + errorMessage(e);
      }
    };
  });
}

function collectionItem(f, v, p, i) {
  return `<div class="collection-item" data-index="${i}"><div class="collection-head"><strong>${esc(f.item_label || '項目')} ${i + 1}</strong><button type="button" class="danger remove-item">移除</button></div>${(f.fields || [])
    .map((x) => fieldHtml(x, v?.[x.id], [...p, x.id]))
    .join('')}</div>`;
}

function getField(def, path) {
  let fs = def.fields;
  let f;
  for (const part of path) {
    if (/^\d+$/.test(part)) continue;
    f = fs.find((x) => x.id === part);
    if (f?.type === 'collection') fs = f.fields || [];
  }
  return f;
}

function bindCollections(def) {
  bindMediaInputs();
  document.querySelectorAll('.add-item').forEach(
    (b) =>
      (b.onclick = () => {
        const p = b.dataset.path.split('.');
        const f = getField(def, p);
        const box = b.closest('.collection').querySelector(':scope > .collection-items');
        const i = box.children.length;
        box.insertAdjacentHTML('beforeend', collectionItem(f, {}, [...p, i], i));
        bindCollections(def);
      })
  );
  document.querySelectorAll('.remove-item').forEach(
    (b) =>
      (b.onclick = () => {
        b.closest('.collection-item').remove();
        rebuildForm(def);
      })
  );
}

function readField(f, p = [f.id]) {
  if (f.type === 'collection') {
    const box = document.querySelector(`[data-collection="${pathId(p)}"] > .collection-items`);
    return [...box.children].map((_, i) => Object.fromEntries((f.fields || []).map((x) => [x.id, readField(x, [...p, i, x.id])])));
  }
  const el = $('#' + pathId(p));
  if (f.type === 'boolean') return el.checked;
  if (f.type === 'multi_select') return [...el.selectedOptions].map((o) => o.value);
  if (['number', 'rating', 'duration'].includes(f.type)) return el.value === '' ? null : Number(el.value);
  return el.value;
}

let draftDef, draftOld;

function rebuildForm(def) {
  const snapshot = Object.fromEntries(def.fields.map((f) => [f.id, readField(f)]));
  renderForm(def, draftOld, snapshot);
}

function renderForm(d, old, values = old?.data || {}) {
  root.innerHTML = `<section><h1>${old ? '編輯' : '新增'}紀錄</h1><form id="recordForm" class="form">${d.fields
    .map((f) => fieldHtml(f, values[f.id]))
    .join('')}<div class="actions"><button type="submit">儲存</button><button type="button" id="cancel" class="ghost">取消</button></div></form></section>`;
  bindCollections(d);
  $('#cancel').onclick = () => renderApp();
  $('#recordForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(d.fields.map((f) => [f.id, readField(f)]));
    try {
      if (old) {
        await api.updateRecord(current, old.id, data);
      } else {
        await api.createRecord(current, data);
      }
      await openApp(current);
    } catch (err) {
      alert('儲存失敗：' + errorMessage(err));
    }
  };
}

function form(recordId = null) {
  draftDef = currentDef;
  draftOld = recordId === null ? null : currentRecords.find((r) => r.id === recordId);
  renderForm(draftDef, draftOld);
}

function renderImportForm(draft = '') {
  root.innerHTML = `<section><h1>匯入 Spec</h1><p class="muted">貼上 OpenForm Definition（YAML 或 JSON），驗證通過後會先預覽再建立 App。</p><textarea id="importText" spellcheck="false" style="min-height:320px;font-family:ui-monospace,monospace;font-size:13px">${esc(draft)}</textarea><div id="importResult"></div><div class="actions"><button id="importValidate">驗證</button><button type="button" id="importCancel" class="ghost">取消</button></div></section>`;
  $('#importCancel').onclick = home;
  $('#importValidate').onclick = () => previewImport($('#importText').value);
}

function previewImport(raw) {
  const resultBox = $('#importResult');
  let d;
  try {
    d = yaml.load(raw);
  } catch (e) {
    resultBox.innerHTML = `<p class="error">無法解析：${esc(errorMessage(e))}</p>`;
    return;
  }
  const errs = validateDefinition(d);
  if (errs.length) {
    resultBox.innerHTML = `<div class="error"><b>驗證失敗</b><ul>${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
    return;
  }
  const fieldCount = d.fields.length;
  resultBox.innerHTML = `<div class="success"><b>${esc(d.app.name)}</b>（id: ${esc(d.app.id)}, version: ${d.app.version}）— ${fieldCount} 個欄位</div><div class="actions"><button id="importConfirm">確認建立</button></div>`;
  $('#importConfirm').onclick = async () => {
    try {
      await api.createApp(d);
      await openApp(d.app.id);
    } catch (e) {
      resultBox.innerHTML = `<p class="error">建立失敗：${esc(errorMessage(e))}</p>`;
    }
  };
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCsv(d, rs) {
  const ids = d.fields.map((f) => f.id);
  const rows = [ids.map(csvEscape).join(','), ...rs.map((r) => ids.map((id) => csvEscape(r.data[id])).join(','))];
  download(`${d.app.id}.csv`, rows.join('\n'), 'text/csv;charset=utf-8');
}

$('#homeBtn').onclick = home;
home();
