import yaml from 'js-yaml';
import { validateDefinition, csvEscape, FIELD_TYPES } from '../shared/runtime.js';
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
  root.innerHTML = `<section class="hero"><h1>我的 App</h1><p>Definition-driven data collection。資料儲存在伺服器資料庫中。</p><div class="actions"><button id="paste">匯入 Spec</button><button id="build" class="secondary">視覺化建立</button></div></section><section><h2>Apps</h2>${
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
  $('#build').onclick = () => renderSpecEditor(null);
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
  root.innerHTML = `<section><h1>${esc(d.app.name)}</h1><div class="actions"><button id="new">新增紀錄</button><button id="spec" class="secondary">查看 Spec</button><button id="editSpec" class="secondary">編輯 Spec</button><button id="json">匯出 JSON</button><button id="csv">匯出 CSV</button><button id="back" class="ghost">返回</button></div></section><section><h2>紀錄</h2>${
    rs.length
      ? `<div class="cards">${rs
          .map(
            (r) =>
              `<div class="card"><b>${esc(r.data.brand || r.data.store || r.id)}</b><span>${new Date(r.updated_at).toLocaleString()}</span><div class="actions"><button class="secondary" data-view="${esc(r.id)}">檢視</button><button data-edit="${esc(r.id)}">編輯</button><button class="danger" data-del="${esc(r.id)}">刪除</button></div></div>`
          )
          .join('')}</div>`
      : '<p class="empty-state">尚無紀錄，點「新增紀錄」開始。</p>'
  }</section>`;
  $('#new').onclick = () => form();
  $('#spec').onclick = renderSpecView;
  $('#editSpec').onclick = () => renderSpecEditor(d);
  $('#json').onclick = () => download(`${current}.json`, JSON.stringify(rs, null, 2), 'application/json');
  $('#csv').onclick = () => exportCsv(d, rs);
  $('#back').onclick = home;
  document.querySelectorAll('[data-view]').forEach((x) => (x.onclick = () => renderView(x.dataset.view)));
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

function viewFieldHtml(f, v) {
  const empty = '<p class="muted">（無）</p>';
  if (f.type === 'collection') {
    const items = Array.isArray(v) ? v : [];
    return `<div class="view-field"><label>${esc(f.label)}</label>${
      items.length
        ? items
            .map(
              (item, i) =>
                `<div class="collection-item"><strong>${esc(f.item_label || '項目')} ${i + 1}</strong>${(f.fields || [])
                  .map((x) => viewFieldHtml(x, item?.[x.id]))
                  .join('')}</div>`
            )
            .join('')
        : empty
    }</div>`;
  }
  if (['image', 'video', 'audio'].includes(f.type)) {
    return `<div class="view-field"><label>${esc(f.label)}</label>${v ? mediaPreviewHtml(f.type, v) : empty}</div>`;
  }
  if (f.type === 'boolean') return `<div class="view-field"><label>${esc(f.label)}</label><p>${v ? '是' : '否'}</p></div>`;
  if (f.type === 'select') {
    const opt = (f.options || []).find((o) => String(o.value) === String(v));
    return `<div class="view-field"><label>${esc(f.label)}</label>${v == null || v === '' ? empty : `<p>${esc(opt ? opt.label : v)}</p>`}</div>`;
  }
  if (f.type === 'multi_select') {
    const vals = Array.isArray(v) ? v : [];
    if (!vals.length) return `<div class="view-field"><label>${esc(f.label)}</label>${empty}</div>`;
    const labels = vals.map((val) => (f.options || []).find((o) => String(o.value) === String(val))?.label ?? val);
    return `<div class="view-field"><label>${esc(f.label)}</label><p>${labels.map(esc).join('、')}</p></div>`;
  }
  return `<div class="view-field"><label>${esc(f.label)}</label>${v == null || v === '' ? empty : `<p>${esc(v)}</p>`}</div>`;
}

function renderView(recordId) {
  const r = currentRecords.find((x) => x.id === recordId);
  if (!r) return renderApp();
  root.innerHTML = `<section><h1>檢視紀錄</h1><div class="view-fields">${currentDef.fields
    .map((f) => viewFieldHtml(f, r.data[f.id]))
    .join('')}</div><div class="actions"><button id="viewEdit">編輯</button><button id="viewBack" class="ghost">返回</button></div></section>`;
  $('#viewEdit').onclick = () => form(recordId);
  $('#viewBack').onclick = () => renderApp();
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
  if (f.type === 'rating') {
    const min = f.min ?? 1;
    const max = f.max ?? 5;
    const opts = [];
    for (let n = min; n <= max; n++) opts.push(n);
    return `<label>${esc(f.label)}<div class="rating-control" data-rating="${id}"><input type="hidden" id="${id}" value="${esc(v)}">${opts
      .map((n) => `<button type="button" class="rating-btn${String(v) === String(n) ? ' active' : ''}" data-value="${n}">${n}</button>`)
      .join('')}</div></label>`;
  }
  if (f.type === 'text' && f.autocomplete && p.length === 1) {
    const dlId = `${id}_list`;
    const suggestions = [...new Set(currentRecords.map((r) => r.data[f.id]).filter((x) => x != null && x !== ''))];
    return `<label>${esc(f.label)}<input id="${id}" list="${dlId}" value="${esc(v)}">${
      suggestions.length ? `<datalist id="${dlId}">${suggestions.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>` : ''
    }</label>`;
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
  const t = { number: 'number', date: 'date', time: 'time', datetime: 'datetime-local', duration: 'number' }[f.type] || 'text';
  const hint = ['number', 'duration'].includes(f.type) ? numberHint(f) : '';
  return `<label>${esc(f.label)}<input id="${id}" type="${t}" value="${esc(v)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>${hint ? `<small class="field-hint">${esc(hint)}</small>` : ''}</label>`;
}

function numberHint(f) {
  if (f.min == null && f.max == null) return '';
  if (f.min != null && f.max != null) return `範圍：${f.min}–${f.max}`;
  return f.min != null ? `最小值：${f.min}` : `最大值：${f.max}`;
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

function bindRatingInputs() {
  document.querySelectorAll('.rating-control').forEach((wrapper) => {
    const hidden = wrapper.querySelector('input[type="hidden"]');
    wrapper.querySelectorAll('.rating-btn').forEach((btn) => {
      btn.onclick = () => {
        hidden.value = btn.dataset.value;
        wrapper.querySelectorAll('.rating-btn').forEach((b) => b.classList.toggle('active', b === btn));
      };
    });
  });
}

function bindNumberValidation() {
  document.querySelectorAll('input[type="number"]').forEach((el) => {
    const hint = el.parentElement.querySelector('.field-hint');
    if (!hint) return;
    const check = () => {
      const min = el.min !== '' ? Number(el.min) : null;
      const max = el.max !== '' ? Number(el.max) : null;
      const val = el.value === '' ? null : Number(el.value);
      const outOfRange = val !== null && ((min !== null && val < min) || (max !== null && val > max));
      hint.classList.toggle('invalid', outOfRange);
    };
    el.oninput = check;
    check();
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
  bindRatingInputs();
  bindNumberValidation();
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
  if (draftDef.app.interaction_mode === 'conversation') {
    startConversation(draftDef, draftOld);
  } else {
    renderForm(draftDef, draftOld);
  }
}

async function startConversation(d, old) {
  const data = old ? JSON.parse(JSON.stringify(old.data)) : {};
  await runFieldSequence(d.fields, data);
  renderConversationReview(d, old, data);
}

function askField(f, currentValue, progressText) {
  return new Promise((resolve) => {
    root.innerHTML = `<section class="conversation-step"><p class="convo-progress">${esc(progressText)}</p><h1>${esc(f.label)}</h1><form id="convoForm">${fieldHtml(
      f,
      currentValue,
      [f.id]
    )}<div class="actions"><button type="button" id="convoBack" class="ghost">上一步</button><button type="submit" id="convoNext">下一步</button></div></form></section>`;
    bindMediaInputs();
    bindRatingInputs();
    bindNumberValidation();
    const submit = (action) => resolve({ action, value: readField(f, [f.id]) });
    $('#convoForm').onsubmit = (e) => {
      e.preventDefault();
      submit('next');
    };
    $('#convoBack').onclick = () => submit('back');
  });
}

function askAddItem(f, count) {
  return new Promise((resolve) => {
    root.innerHTML = `<section class="conversation-step"><p class="convo-progress">${esc(f.label)}（目前 ${count} 筆）</p><h1>要新增一筆「${esc(
      f.item_label || '項目'
    )}」嗎？</h1><div class="actions"><button id="convoAddYes">新增</button><button id="convoAddNo" class="secondary">${count > 0 ? '不用了，繼續下一步' : '略過'}</button></div></section>`;
    $('#convoAddYes').onclick = () => resolve(true);
    $('#convoAddNo').onclick = () => resolve(false);
  });
}

async function runFieldSequence(fields, dataObj) {
  const total = fields.length;
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (f.type === 'collection') {
      dataObj[f.id] = Array.isArray(dataObj[f.id]) ? dataObj[f.id] : [];
      while (await askAddItem(f, dataObj[f.id].length)) {
        const item = {};
        await runFieldSequence(f.fields || [], item);
        dataObj[f.id].push(item);
      }
      i++;
    } else {
      const { action, value } = await askField(f, dataObj[f.id], `第 ${i + 1} / ${total} 題`);
      dataObj[f.id] = value;
      if (action === 'back' && i > 0) i--;
      else i++;
    }
  }
}

function renderConversationReview(d, old, data) {
  root.innerHTML = `<section><h1>確認紀錄</h1><p class="muted">檢查一下，沒問題再按「完成對話」儲存。</p><div class="view-fields">${d.fields
    .map((f) => viewFieldHtml(f, data[f.id]))
    .join('')}</div><div class="actions"><button id="convoFinish">完成對話</button><button type="button" id="convoEditForm" class="secondary">改用表單微調</button><button type="button" id="convoCancel" class="ghost">取消</button></div></section>`;
  $('#convoFinish').onclick = async () => {
    try {
      if (old) {
        await api.updateRecord(current, old.id, data);
      } else {
        await api.createRecord(current, data);
      }
      await openApp(current);
    } catch (e) {
      alert('儲存失敗：' + errorMessage(e));
    }
  };
  $('#convoEditForm').onclick = () => renderForm(d, old, data);
  $('#convoCancel').onclick = () => renderApp();
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

let editorState = null;
let editorIsNew = true;

function blankField() {
  return { id: '', label: '', type: 'text' };
}

function getFieldsRef(path) {
  let fields = editorState.fields;
  for (const idx of path) fields = fields[idx].fields;
  return fields;
}

function fieldAtPath(path) {
  return getFieldsRef(path.slice(0, -1))[path[path.length - 1]];
}

function renderSpecEditor(existingDef) {
  editorIsNew = !existingDef;
  editorState = existingDef
    ? { ...JSON.parse(JSON.stringify(existingDef)), app: { ...JSON.parse(JSON.stringify(existingDef.app)), version: existingDef.app.version + 1 } }
    : { spec: 'openform/definition/v1', app: { id: '', name: '', version: 1 }, fields: [] };
  renderEditor();
}

function optionsEditorHtml(f) {
  const opts = f.options || [];
  return `<div class="options-editor"><label>選項（value / label）</label>${opts
    .map(
      (o, oi) =>
        `<div class="row"><input class="ef-opt-value" data-oi="${oi}" placeholder="value" value="${esc(o.value)}"><input class="ef-opt-label" data-oi="${oi}" placeholder="label" value="${esc(o.label)}"><button type="button" class="danger ef-opt-remove" data-oi="${oi}">✕</button></div>`
    )
    .join('')}<button type="button" class="secondary ef-opt-add">＋ 新增選項</button></div>`;
}

function editorFieldHtml(f, path, index, count) {
  const p = [...path, index];
  const isCollection = f.type === 'collection';
  return `<div class="editor-field" data-path="${p.join(',')}"><div class="editor-field-head"><div class="reorder-btns"><button type="button" class="ghost move-up" ${index === 0 ? 'disabled' : ''}>▲</button><button type="button" class="ghost move-down" ${index === count - 1 ? 'disabled' : ''}>▼</button></div><input class="ef-label" placeholder="標籤" value="${esc(f.label)}"><select class="ef-type">${FIELD_TYPES.map(
    (t) => `<option value="${t}" ${f.type === t ? 'selected' : ''}>${t}</option>`
  ).join('')}</select><button type="button" class="danger ef-remove">刪除</button></div><div class="editor-field-body"><label>id（snake_case）<input class="ef-id" placeholder="brand" value="${esc(f.id)}"></label><label>semantic_type（選填）<input class="ef-semantic" value="${esc(f.semantic_type || '')}"></label><label>unit（選填）<input class="ef-unit" value="${esc(f.unit || '')}"></label>${
    ['number', 'rating', 'duration'].includes(f.type)
      ? `<label>min<input class="ef-min" type="number" value="${f.min ?? ''}"></label><label>max<input class="ef-max" type="number" value="${f.max ?? ''}"></label>`
      : ''
  }${
    f.type === 'text' ? `<label><input type="checkbox" class="ef-autocomplete" ${f.autocomplete ? 'checked' : ''}> 記住這個 App 過去輸入過的值（autocomplete）</label>` : ''
  }${['select', 'multi_select'].includes(f.type) ? optionsEditorHtml(f) : ''}${
    isCollection
      ? `<label>項目名稱（item_label）<input class="ef-itemlabel" value="${esc(f.item_label || '')}"></label><fieldset class="collection"><legend>子欄位</legend><div class="editor-fields">${(f.fields || [])
          .map((sf, si) => editorFieldHtml(sf, p, si, (f.fields || []).length))
          .join('')}</div><button type="button" class="secondary ef-add-subfield">＋ 新增子欄位</button></fieldset>`
      : ''
  }</div></div>`;
}

function renderEditor() {
  const d = editorState;
  root.innerHTML = `<section><h1>${editorIsNew ? '視覺化建立 App' : '編輯 Spec'}</h1><label>App 名稱<input id="edAppName" value="${esc(d.app.name)}"></label><label>App ID（snake_case，建立後不要再改）<input id="edAppId" value="${esc(
    d.app.id
  )}" ${editorIsNew ? '' : 'disabled'}></label><label>Version<input id="edAppVersion" type="number" min="1" value="${d.app.version}"></label><label>互動模式<select id="edInteractionMode"><option value="form" ${
    !d.app.interaction_mode || d.app.interaction_mode === 'form' ? 'selected' : ''
  }>表單（一次填完）</option><option value="conversation" ${d.app.interaction_mode === 'conversation' ? 'selected' : ''}>對話（一次一題）</option></select></label><h2>欄位</h2><div class="editor-fields">${d.fields
    .map((f, i) => editorFieldHtml(f, [], i, d.fields.length))
    .join('')}</div><button type="button" class="secondary" id="edAddField">＋ 新增欄位</button><div id="editorErrors"></div><div class="actions"><button id="edSave">儲存</button><button type="button" id="edCancel" class="ghost">取消</button></div></section>`;
  bindEditorEvents();
}

function bindEditorEvents() {
  $('#edAppName').oninput = (e) => (editorState.app.name = e.target.value);
  $('#edAppId').oninput = (e) => (editorState.app.id = e.target.value);
  $('#edAppVersion').oninput = (e) => (editorState.app.version = Number(e.target.value) || 1);
  $('#edInteractionMode').onchange = (e) => (editorState.app.interaction_mode = e.target.value);
  $('#edAddField').onclick = () => {
    getFieldsRef([]).push(blankField());
    renderEditor();
  };
  $('#edSave').onclick = saveEditor;
  $('#edCancel').onclick = () => (currentDef ? renderApp() : home());

  document.querySelectorAll('.editor-field').forEach((card) => {
    const path = card.dataset.path.split(',').map(Number);
    const f = fieldAtPath(path);
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    const head = card.querySelector(':scope > .editor-field-head');
    head.querySelector('.move-up').onclick = () => {
      const fields = getFieldsRef(parentPath);
      [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
      renderEditor();
    };
    head.querySelector('.move-down').onclick = () => {
      const fields = getFieldsRef(parentPath);
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      renderEditor();
    };
    head.querySelector('.ef-remove').onclick = () => {
      getFieldsRef(parentPath).splice(index, 1);
      renderEditor();
    };
    head.querySelector('.ef-label').oninput = (e) => (f.label = e.target.value);
    head.querySelector('.ef-type').onchange = (e) => {
      f.type = e.target.value;
      renderEditor();
    };

    const body = card.querySelector(':scope > .editor-field-body');
    body.querySelector('.ef-id').oninput = (e) => (f.id = e.target.value);
    body.querySelector('.ef-semantic').oninput = (e) => (f.semantic_type = e.target.value || undefined);
    body.querySelector('.ef-unit').oninput = (e) => (f.unit = e.target.value || undefined);
    const min = body.querySelector('.ef-min');
    if (min) min.oninput = (e) => (f.min = e.target.value === '' ? undefined : Number(e.target.value));
    const max = body.querySelector('.ef-max');
    if (max) max.oninput = (e) => (f.max = e.target.value === '' ? undefined : Number(e.target.value));
    const auto = body.querySelector('.ef-autocomplete');
    if (auto) auto.onchange = (e) => (f.autocomplete = e.target.checked || undefined);
    const itemLabel = body.querySelector('.ef-itemlabel');
    if (itemLabel) itemLabel.oninput = (e) => (f.item_label = e.target.value);

    const addSub = body.querySelector(':scope > .collection > .ef-add-subfield');
    if (addSub)
      addSub.onclick = () => {
        f.fields = f.fields || [];
        f.fields.push(blankField());
        renderEditor();
      };

    const optionsEditor = body.querySelector(':scope > .options-editor');
    if (optionsEditor) {
      optionsEditor.querySelector('.ef-opt-add').onclick = () => {
        f.options = f.options || [];
        f.options.push({ value: '', label: '' });
        renderEditor();
      };
      optionsEditor
        .querySelectorAll('.ef-opt-value')
        .forEach((el) => (el.oninput = (e) => (f.options[Number(el.dataset.oi)].value = e.target.value)));
      optionsEditor
        .querySelectorAll('.ef-opt-label')
        .forEach((el) => (el.oninput = (e) => (f.options[Number(el.dataset.oi)].label = e.target.value)));
      optionsEditor.querySelectorAll('.ef-opt-remove').forEach(
        (el) =>
          (el.onclick = () => {
            f.options.splice(Number(el.dataset.oi), 1);
            renderEditor();
          })
      );
    }
  });
}

async function saveEditor() {
  const errs = validateDefinition(editorState);
  const errBox = $('#editorErrors');
  if (errs.length) {
    errBox.innerHTML = `<div class="error"><b>驗證失敗</b><ul>${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
    return;
  }
  try {
    await api.createApp(editorState);
    await openApp(editorState.app.id);
  } catch (e) {
    errBox.innerHTML = `<p class="error">儲存失敗：${esc(errorMessage(e))}</p>`;
  }
}

$('#homeBtn').onclick = home;
home();
