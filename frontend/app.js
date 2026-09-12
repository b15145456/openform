import yaml from 'js-yaml';
import { validateDefinition, csvEscape, FIELD_TYPES } from '../shared/runtime.js';
import { api, uploadFile, AuthError } from './api.js';
import { authClient, setToken, getToken } from './auth-client.js';

const $ = (s) => document.querySelector(s);
const root = $('#app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const APP_ICONS = { mattress_quote: '🛏️', workout: '🏋️', inspection: '🔍' };
const appIcon = (id) => APP_ICONS[id] || '📋';

let currentUser = null; // { id, email, role }

let current = null; // current app id
let currentDef = null; // current app definition
let currentRecords = []; // current app records (from backend)

function errorMessage(e) {
  return e instanceof Error ? e.message : String(e);
}

const backBtnHtml = '<button type="button" id="pageBack" class="ghost back-btn">← 返回</button>';
function bindBack(fn) {
  const btn = $('#pageBack');
  if (btn) btn.onclick = fn;
}

const ROLE_LABEL = { admin: '管理者', user: '一般使用者', viewer: '只能檢視' };

function renderHeaderUser() {
  const el = $('#headerUser');
  if (!currentUser) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<span class="muted" style="margin-right:10px;font-size:13px">${esc(currentUser.email)}（${esc(ROLE_LABEL[currentUser.role] || currentUser.role)}）</span><button id="changePasswordBtn" class="ghost">變更密碼</button><button id="logoutBtn" class="ghost">登出</button>`;
  $('#changePasswordBtn').onclick = renderChangePassword;
  $('#logoutBtn').onclick = async () => {
    try {
      await authClient.signOut();
    } catch {
      /* ignore — we're clearing local state regardless */
    }
    setToken(null);
    currentUser = null;
    renderHeaderUser();
    renderLogin();
  };
}

function renderLogin(message = '') {
  currentUser = null;
  renderHeaderUser();
  root.innerHTML = `<section class="hero"><h1>登入</h1><p>請使用管理者建立的帳號登入 OpenForm。</p>${
    message ? `<div class="error">${esc(message)}</div>` : ''
  }<form id="loginForm"><label>Email<input id="loginEmail" type="email" required autocomplete="username"></label><label>密碼<input id="loginPassword" type="password" required autocomplete="current-password"></label><div class="actions"><button type="submit">登入</button></div></form></section>`;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value;
    const password = $('#loginPassword').value;
    try {
      const { data, error } = await authClient.signIn.email(
        { email, password },
        {
          onSuccess: (ctx) => setToken(ctx.response.headers.get('set-auth-token')),
        }
      );
      if (error || !data) {
        renderLogin(error?.message || '登入失敗，請確認 email/密碼是否正確');
        return;
      }
      currentUser = data.user;
      renderHeaderUser();
      await home();
    } catch (err) {
      renderLogin('登入失敗：' + errorMessage(err));
    }
  };
}

function renderChangePassword() {
  root.innerHTML = `<section class="hero">${backBtnHtml}<h1>變更密碼</h1><form id="changePasswordForm"><label>目前密碼<input id="cpCurrent" type="password" required autocomplete="current-password"></label><label>新密碼<input id="cpNew" type="password" required minlength="8" autocomplete="new-password"></label><label>確認新密碼<input id="cpConfirm" type="password" required minlength="8" autocomplete="new-password"></label><div class="actions"><button type="submit">變更密碼</button></div></form></section>`;
  bindBack(() => home());
  $('#changePasswordForm').onsubmit = async (e) => {
    e.preventDefault();
    const currentPassword = $('#cpCurrent').value;
    const newPassword = $('#cpNew').value;
    const confirm = $('#cpConfirm').value;
    if (newPassword !== confirm) {
      alert('兩次輸入的新密碼不一致');
      return;
    }
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword });
      if (error) {
        alert('變更密碼失敗：' + (error.message || '請確認目前密碼是否正確'));
        return;
      }
      alert('密碼已變更');
      await home();
    } catch (err) {
      alert('變更密碼失敗：' + errorMessage(err));
    }
  };
}

async function boot() {
  if (!getToken()) {
    renderLogin();
    return;
  }
  try {
    const { data } = await authClient.getSession();
    if (!data) {
      setToken(null);
      renderLogin();
      return;
    }
    currentUser = data.user;
    renderHeaderUser();
    await home();
  } catch {
    setToken(null);
    renderLogin();
  }
}

async function home() {
  current = null;
  root.innerHTML = '<p>載入中…</p>';
  let apps;
  try {
    apps = await api.listApps();
  } catch (e) {
    if (e instanceof AuthError) return renderLogin('登入已過期，請重新登入');
    root.innerHTML = `<p class="error">無法連線到伺服器：${esc(errorMessage(e))}</p>`;
    return;
  }
  const adminLinks =
    currentUser?.role === 'admin'
      ? `<button id="userAdmin" class="secondary">使用者管理</button><button id="auditLogBtn" class="secondary">稽核紀錄</button>`
      : '';
  root.innerHTML = `<section class="hero"><h1>我的 App</h1><p>Definition-driven data collection。資料儲存在伺服器資料庫中。</p><div class="actions"><button id="paste">匯入 Spec</button><button id="build" class="secondary">視覺化建立</button>${adminLinks}</div></section><section><h2>Apps</h2>${
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
  if ($('#userAdmin')) $('#userAdmin').onclick = renderUserAdmin;
  if ($('#auditLogBtn')) $('#auditLogBtn').onclick = renderAuditLog;
  document.querySelectorAll('.appcard').forEach((x) => (x.onclick = () => openApp(x.dataset.id)));
}

async function openApp(id) {
  current = id;
  root.innerHTML = '<p>載入中…</p>';
  const slowNotice = setTimeout(() => {
    if (root.innerHTML === '<p>載入中…</p>') root.innerHTML = '<p>載入中…（如果伺服器剛醒來，免費方案第一次喚醒約需 30–60 秒）</p>';
  }, 4000);
  try {
    [currentDef, currentRecords] = await Promise.all([api.getApp(id), api.listRecords(id)]);
  } catch (e) {
    clearTimeout(slowNotice);
    if (e instanceof AuthError) return renderLogin('登入已過期，請重新登入');
    root.innerHTML = `${backBtnHtml}<p class="error">無法載入 App：${esc(errorMessage(e))}</p>`;
    bindBack(home);
    return;
  } finally {
    clearTimeout(slowNotice);
  }
  renderApp();
}

async function refreshRecords() {
  currentRecords = await api.listRecords(current);
  renderApp();
}

function renderApp() {
  const d = currentDef;
  const rs = currentRecords;
  const access = d._access || { canEdit: true, canDelete: true };
  root.innerHTML = `${backBtnHtml}<section><h1>${esc(d.app.name)}</h1><div class="actions">${
    access.canEdit ? '<button id="new">新增紀錄</button>' : ''
  }<button id="spec" class="secondary">查看 Spec</button>${
    access.canEdit ? '<button id="editSpec" class="secondary">編輯 Spec</button>' : ''
  }${access.canDelete ? '<button id="shareApp" class="secondary">分享</button>' : ''}<button id="json">匯出 JSON</button><button id="csv">匯出 CSV</button>${
    access.canDelete ? '<button id="deleteApp" class="danger">刪除 App</button>' : ''
  }<button id="back" class="ghost">返回</button></div></section><section><h2>紀錄</h2>${
    rs.length
      ? `<div class="cards">${rs
          .map(
            (r) =>
              `<div class="card"><b>${esc(r.data.brand || r.data.store || r.id)}</b><span>${new Date(r.updated_at).toLocaleString()}</span><div class="actions"><button class="secondary" data-view="${esc(r.id)}">檢視</button>${
                access.canEdit
                  ? `<button data-edit="${esc(r.id)}">編輯</button><button class="danger" data-del="${esc(r.id)}">刪除</button>`
                  : ''
              }</div></div>`
          )
          .join('')}</div>`
      : '<p class="empty-state">尚無紀錄，點「新增紀錄」開始。</p>'
  }</section>`;
  if ($('#new')) $('#new').onclick = () => form();
  $('#spec').onclick = renderSpecView;
  if ($('#editSpec')) $('#editSpec').onclick = () => renderSpecEditor(d);
  if ($('#shareApp')) $('#shareApp').onclick = () => renderShareDialog(d);
  $('#json').onclick = () => download(`${current}.json`, JSON.stringify(rs, null, 2), 'application/json');
  $('#csv').onclick = () => exportCsv(d, rs);
  if ($('#deleteApp'))
    $('#deleteApp').onclick = async () => {
      if (!confirm(`確定要刪除「${d.app.name}」嗎？裡面的 ${rs.length} 筆紀錄會一起被永久刪除，無法復原。`)) return;
      try {
        await api.deleteApp(current);
        await home();
      } catch (e) {
        alert('刪除失敗：' + errorMessage(e));
      }
    };
  $('#back').onclick = home;
  bindBack(home);
  document.querySelectorAll('[data-view]').forEach((x) => (x.onclick = () => renderView(x.dataset.view)));
  document.querySelectorAll('[data-edit]').forEach((x) => (x.onclick = () => form(x.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach(
    (x) =>
      (x.onclick = async () => {
        if (!confirm('確定刪除？')) return;
        try {
          await api.deleteRecord(current, x.dataset.del);
          await refreshRecords();
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
  root.innerHTML = `${backBtnHtml}<section><h1>檢視紀錄</h1><div class="view-fields">${currentDef.fields
    .map((f) => viewFieldHtml(f, r.data[f.id]))
    .join('')}</div><div class="actions"><button id="viewEdit">編輯</button><button id="viewBack" class="ghost">返回</button></div></section>`;
  $('#viewEdit').onclick = () => form(recordId);
  $('#viewBack').onclick = () => renderApp();
  bindBack(() => renderApp());
}

function renderSpecView() {
  const yamlText = yaml.dump(currentDef, { noRefs: true, lineWidth: 100 });
  root.innerHTML = `${backBtnHtml}<section><h1>${esc(currentDef.app.name)} — Spec</h1><p class="muted">這是這個 App 的 OpenForm Definition（YAML）。可以複製後貼給任何 LLM 當範例，請它照同樣的語法幫你產生自己想要收集的表單。</p><pre id="specText" class="spec-view">${esc(yamlText)}</pre><div class="actions"><button id="specCopy">複製</button><button id="specDownload" class="secondary">下載 YAML</button><button id="specBack" class="ghost">返回</button></div></section>`;
  bindBack(() => renderApp());
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
  root.innerHTML = `${backBtnHtml}<section><h1>${old ? '編輯' : '新增'}紀錄</h1><form id="recordForm" class="form">${d.fields
    .map((f) => fieldHtml(f, values[f.id]))
    .join('')}<div class="actions"><button type="submit">儲存</button><button type="button" id="cancel" class="ghost">取消</button></div></form></section>`;
  bindCollections(d);
  $('#cancel').onclick = () => renderApp();
  bindBack(() => renderApp());
  $('#recordForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(d.fields.map((f) => [f.id, readField(f)]));
    try {
      if (old) {
        await api.updateRecord(current, old.id, data);
      } else {
        await api.createRecord(current, data);
      }
      await refreshRecords();
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
    root.innerHTML = `${backBtnHtml}<section class="conversation-step"><p class="convo-progress">${esc(progressText)}</p><h1>${esc(f.label)}</h1><form id="convoForm">${fieldHtml(
      f,
      currentValue,
      [f.id]
    )}<div class="actions"><button type="button" id="convoBack" class="ghost">上一步</button><button type="submit" id="convoNext">下一步</button></div></form></section>`;
    bindMediaInputs();
    bindRatingInputs();
    bindNumberValidation();
    bindBack(() => renderApp());
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
    root.innerHTML = `${backBtnHtml}<section class="conversation-step"><p class="convo-progress">${esc(f.label)}（目前 ${count} 筆）</p><h1>要新增一筆「${esc(
      f.item_label || '項目'
    )}」嗎？</h1><div class="actions"><button id="convoAddYes">新增</button><button id="convoAddNo" class="secondary">${count > 0 ? '不用了，繼續下一步' : '略過'}</button></div></section>`;
    bindBack(() => renderApp());
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
  root.innerHTML = `${backBtnHtml}<section><h1>確認紀錄</h1><p class="muted">檢查一下，沒問題再按「完成對話」儲存。</p><div class="view-fields">${d.fields
    .map((f) => viewFieldHtml(f, data[f.id]))
    .join('')}</div><div class="actions"><button id="convoFinish">完成對話</button><button type="button" id="convoEditForm" class="secondary">改用表單微調</button><button type="button" id="convoCancel" class="ghost">取消</button></div></section>`;
  bindBack(() => renderApp());
  $('#convoFinish').onclick = async () => {
    try {
      if (old) {
        await api.updateRecord(current, old.id, data);
      } else {
        await api.createRecord(current, data);
      }
      await refreshRecords();
    } catch (e) {
      alert('儲存失敗：' + errorMessage(e));
    }
  };
  $('#convoEditForm').onclick = () => renderForm(d, old, data);
  $('#convoCancel').onclick = () => renderApp();
}

function renderImportForm(draft = '') {
  root.innerHTML = `${backBtnHtml}<section><h1>匯入 Spec</h1><p class="muted">貼上 OpenForm Definition（YAML 或 JSON），驗證通過後會先預覽再建立 App。</p><textarea id="importText" spellcheck="false" style="min-height:320px;font-family:ui-monospace,monospace;font-size:13px">${esc(draft)}</textarea><div id="importResult"></div><div class="actions"><button id="importValidate">驗證</button><button type="button" id="importCancel" class="ghost">取消</button></div></section>`;
  $('#importCancel').onclick = home;
  $('#importValidate').onclick = () => previewImport($('#importText').value);
  bindBack(home);
}

async function previewImport(raw) {
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
  let existing = null;
  try {
    existing = await api.getApp(d.app.id);
  } catch {
    /* no existing app with this id, that's the normal case */
  }
  const warning = existing
    ? `<div class="error"><b>注意：</b>已經有一個 App「${esc(existing.app.name)}」用同樣的 id（${esc(
        d.app.id
      )}），建立後會覆蓋掉它的 Spec（裡面已存的紀錄不會被刪除，但欄位定義會換成這份新的）。</div>`
    : '';
  resultBox.innerHTML = `${warning}<div class="success"><b>${esc(d.app.name)}</b>（id: ${esc(d.app.id)}, version: ${d.app.version}）— ${fieldCount} 個欄位</div><div class="actions"><button id="importConfirm">${
    existing ? '確認覆蓋' : '確認建立'
  }</button></div>`;
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
  const labels = d.fields.map((f) => f.label);
  const rows = [labels.map(csvEscape).join(','), ...rs.map((r) => ids.map((id) => csvEscape(r.data[id])).join(','))];
  download(`${d.app.id}.csv`, rows.join('\n'), 'text/csv;charset=utf-8');
}

let editorState = null;
let editorIsNew = true;
let editorOriginalVersion = null;
let editorOriginalAppId = null;

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
  editorOriginalVersion = existingDef ? existingDef.app.version : null;
  editorOriginalAppId = existingDef ? existingDef.app.id : null;
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
  return `<div class="editor-field" data-path="${p.join(',')}"><div class="editor-field-head"><div class="reorder-btns"><button type="button" class="ghost move-up" ${index === 0 ? 'disabled' : ''}>▲</button><button type="button" class="ghost move-down" ${index === count - 1 ? 'disabled' : ''}>▼</button></div><input class="ef-label" placeholder="這個欄位叫什麼？" value="${esc(f.label)}"><select class="ef-type">${FIELD_TYPES.map(
    (t) => `<option value="${t}" ${f.type === t ? 'selected' : ''}>${t}</option>`
  ).join('')}</select><button type="button" class="danger ef-remove">刪除</button></div><div class="editor-field-body">${
    ['number', 'rating', 'duration'].includes(f.type)
      ? `<label>min<input class="ef-min" type="number" value="${f.min ?? ''}"></label><label>max<input class="ef-max" type="number" value="${f.max ?? ''}"></label>`
      : ''
  }${
    f.type === 'text' ? `<label><input type="checkbox" class="ef-autocomplete" ${f.autocomplete ? 'checked' : ''}> 記住這個 App 過去輸入過的值（下次可以直接選）</label>` : ''
  }${['select', 'multi_select'].includes(f.type) ? optionsEditorHtml(f) : ''}${
    isCollection
      ? `<label>這一組的名稱（例如「動作」「組」）<input class="ef-itemlabel" value="${esc(f.item_label || '')}"></label><fieldset class="collection"><legend>子欄位</legend><div class="editor-fields">${(f.fields || [])
          .map((sf, si) => editorFieldHtml(sf, p, si, (f.fields || []).length))
          .join('')}</div><button type="button" class="secondary ef-add-subfield">＋ 新增子欄位</button></fieldset>`
      : ''
  }<details class="advanced"><summary>進階設定</summary><label>欄位 ID（機器用，留空會自動產生；建立後不要再改）<input class="ef-id" placeholder="自動產生" value="${esc(f.id)}"></label><label>semantic_type（選填，給其他系統/LLM 辨識資料意義用）<input class="ef-semantic" value="${esc(f.semantic_type || '')}"></label><label>unit（選填，度量單位）<input class="ef-unit" value="${esc(f.unit || '')}"></label></details></div></div>`;
}

function visualPaneHtml() {
  const d = editorState;
  return `<label>App 名稱<input id="edAppName" placeholder="例如：讀書紀錄" value="${esc(d.app.name)}"></label><label>App ID（機器用的英文代號，建立後不要再改）<input id="edAppId" placeholder="自動產生" value="${esc(
    d.app.id
  )}" ${editorIsNew ? '' : 'disabled'}></label>${
    editorIsNew ? '' : `<p class="muted">目前是第 ${editorOriginalVersion} 版，儲存後會變成第 ${d.app.version} 版；舊資料不受影響。</p>`
  }<label>互動模式<select id="edInteractionMode"><option value="form" ${
    !d.app.interaction_mode || d.app.interaction_mode === 'form' ? 'selected' : ''
  }>表單（一次填完）</option><option value="conversation" ${d.app.interaction_mode === 'conversation' ? 'selected' : ''}>對話（一次一題）</option></select></label><h2>欄位</h2><div class="editor-fields">${d.fields
    .map((f, i) => editorFieldHtml(f, [], i, d.fields.length))
    .join('')}</div><button type="button" class="secondary" id="edAddField">＋ 新增欄位</button>`;
}

function renderVisualPane() {
  $('#visualPane').innerHTML = visualPaneHtml();
  bindEditorEvents();
}

function syncSpecText() {
  const ta = $('#specTextArea');
  if (ta) ta.value = yaml.dump(editorState, { noRefs: true, lineWidth: 100 });
}

function renderEditor() {
  root.innerHTML = `${backBtnHtml}<section><h1>${editorIsNew ? '視覺化建立 App' : '編輯 Spec'}</h1><p class="muted">左邊是 Spec（YAML），右邊是視覺化編輯——改任何一邊，另一邊會跟著同步。</p><div class="split-editor"><div class="spec-pane"><h2>Spec</h2><textarea id="specTextArea" spellcheck="false"></textarea><div class="spec-pane-error"></div></div><div class="visual-pane" id="visualPane"></div></div><div id="editorErrors"></div><div class="actions"><button id="edSave">儲存</button><button type="button" id="edCancel" class="ghost">取消</button></div></section>`;
  renderVisualPane();
  syncSpecText();
  bindBack(() => (currentDef ? renderApp() : home()));
  $('#specTextArea').oninput = (e) => {
    const errBox = document.querySelector('.spec-pane-error');
    let parsed;
    try {
      parsed = yaml.load(e.target.value);
    } catch (err) {
      errBox.textContent = '格式錯誤：' + errorMessage(err);
      return;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.fields) || typeof parsed.app !== 'object') {
      errBox.textContent = '還不是完整的 Definition（需要 app 物件與 fields 陣列）';
      return;
    }
    errBox.textContent = '';
    editorState = parsed;
    renderVisualPane();
  };
  $('#edSave').onclick = saveEditor;
  $('#edCancel').onclick = () => (currentDef ? renderApp() : home());
}

function sanitizeId(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+/, '');
}

function bindEditorEvents() {
  $('#edAppName').oninput = (e) => {
    editorState.app.name = e.target.value;
    syncSpecText();
  };
  $('#edAppId').oninput = (e) => {
    const clean = sanitizeId(e.target.value);
    if (clean !== e.target.value) e.target.value = clean;
    editorState.app.id = clean;
    syncSpecText();
  };
  $('#edInteractionMode').onchange = (e) => {
    editorState.app.interaction_mode = e.target.value;
    syncSpecText();
  };
  $('#edAddField').onclick = () => {
    getFieldsRef([]).push(blankField());
    renderVisualPane();
    syncSpecText();
  };

  document.querySelectorAll('.editor-field').forEach((card) => {
    const path = card.dataset.path.split(',').map(Number);
    const f = fieldAtPath(path);
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    const head = card.querySelector(':scope > .editor-field-head');
    head.querySelector('.move-up').onclick = () => {
      const fields = getFieldsRef(parentPath);
      [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
      renderVisualPane();
      syncSpecText();
    };
    head.querySelector('.move-down').onclick = () => {
      const fields = getFieldsRef(parentPath);
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      renderVisualPane();
      syncSpecText();
    };
    head.querySelector('.ef-remove').onclick = () => {
      getFieldsRef(parentPath).splice(index, 1);
      renderVisualPane();
      syncSpecText();
    };
    head.querySelector('.ef-label').oninput = (e) => {
      f.label = e.target.value;
      syncSpecText();
    };
    head.querySelector('.ef-type').onchange = (e) => {
      f.type = e.target.value;
      renderVisualPane();
      syncSpecText();
    };

    const body = card.querySelector(':scope > .editor-field-body');
    body.querySelector('.ef-id').oninput = (e) => {
      const clean = sanitizeId(e.target.value);
      if (clean !== e.target.value) e.target.value = clean;
      f.id = clean;
      syncSpecText();
    };
    body.querySelector('.ef-semantic').oninput = (e) => {
      f.semantic_type = e.target.value || undefined;
      syncSpecText();
    };
    body.querySelector('.ef-unit').oninput = (e) => {
      f.unit = e.target.value || undefined;
      syncSpecText();
    };
    const min = body.querySelector('.ef-min');
    if (min)
      min.oninput = (e) => {
        f.min = e.target.value === '' ? undefined : Number(e.target.value);
        syncSpecText();
      };
    const max = body.querySelector('.ef-max');
    if (max)
      max.oninput = (e) => {
        f.max = e.target.value === '' ? undefined : Number(e.target.value);
        syncSpecText();
      };
    const auto = body.querySelector('.ef-autocomplete');
    if (auto)
      auto.onchange = (e) => {
        f.autocomplete = e.target.checked || undefined;
        syncSpecText();
      };
    const itemLabel = body.querySelector('.ef-itemlabel');
    if (itemLabel)
      itemLabel.oninput = (e) => {
        f.item_label = e.target.value;
        syncSpecText();
      };

    const addSub = body.querySelector(':scope > .collection > .ef-add-subfield');
    if (addSub)
      addSub.onclick = () => {
        f.fields = f.fields || [];
        f.fields.push(blankField());
        renderVisualPane();
        syncSpecText();
      };

    const optionsEditor = body.querySelector(':scope > .options-editor');
    if (optionsEditor) {
      optionsEditor.querySelector('.ef-opt-add').onclick = () => {
        f.options = f.options || [];
        f.options.push({ value: '', label: '' });
        renderVisualPane();
        syncSpecText();
      };
      optionsEditor.querySelectorAll('.ef-opt-value').forEach(
        (el) =>
          (el.oninput = (e) => {
            f.options[Number(el.dataset.oi)].value = e.target.value;
            syncSpecText();
          })
      );
      optionsEditor.querySelectorAll('.ef-opt-label').forEach(
        (el) =>
          (el.oninput = (e) => {
            f.options[Number(el.dataset.oi)].label = e.target.value;
            syncSpecText();
          })
      );
      optionsEditor.querySelectorAll('.ef-opt-remove').forEach(
        (el) =>
          (el.onclick = () => {
            f.options.splice(Number(el.dataset.oi), 1);
            renderVisualPane();
            syncSpecText();
          })
      );
    }
  });
}

function fillMissingIds(fields) {
  const used = new Set(fields.map((f) => f.id).filter(Boolean));
  let n = 1;
  for (const f of fields) {
    if (!f.id) {
      let candidate = `field_${n}`;
      while (used.has(candidate)) {
        n++;
        candidate = `field_${n}`;
      }
      f.id = candidate;
      used.add(candidate);
    }
    if (f.type === 'collection' && Array.isArray(f.fields)) fillMissingIds(f.fields);
  }
}

async function saveEditor() {
  fillMissingIds(editorState.fields);
  renderVisualPane();
  syncSpecText();
  const errBox = $('#editorErrors');
  if (!editorIsNew && editorState.app.id !== editorOriginalAppId) {
    errBox.innerHTML = `<p class="error">App ID 不能修改（原本是 ${esc(editorOriginalAppId)}），請改回來，或用「視覺化建立」新增一個獨立的 App。</p>`;
    return;
  }
  const errs = validateDefinition(editorState);
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

const RELATION_LABEL = { owner: '擁有者（可刪除/可再分享）', editor: '可編輯', viewer: '只能檢視' };

async function renderShareDialog(def) {
  root.innerHTML = `${backBtnHtml}<section><h1>分享「${esc(def.app.name)}」</h1><p class="muted">輸入同事的 email（要先由管理者建立帳號），選擇權限後新增。</p><form id="shareForm" class="row"><input id="shareEmail" type="email" placeholder="colleague@example.com" required><select id="shareRelation"><option value="viewer">只能檢視</option><option value="editor">可編輯</option><option value="owner">擁有者</option></select><button type="submit">新增</button></form><div id="shareErrors"></div><h2>目前有權限的人</h2><div id="shareList"><p class="muted">載入中…</p></div></section>`;
  bindBack(() => renderApp());
  const grants = () => api.listAccess(def.app.id);
  async function refreshList() {
    const list = $('#shareList');
    try {
      const rows = await grants();
      list.innerHTML = rows.length
        ? rows
            .map(
              (g) =>
                `<div class="card"><b>${esc(g.email || g.userId)}</b><span>${esc(RELATION_LABEL[g.relation] || g.relation)}</span><div class="actions"><button class="danger" data-revoke="${esc(g.userId)}">移除</button></div></div>`
            )
            .join('')
        : '<p class="empty-state">目前沒有分享給任何人。</p>';
      document.querySelectorAll('[data-revoke]').forEach(
        (btn) =>
          (btn.onclick = async () => {
            if (!confirm('確定要移除這個人的權限嗎？')) return;
            try {
              await api.revokeAccess(def.app.id, btn.dataset.revoke);
              await refreshList();
            } catch (e) {
              alert('移除失敗：' + errorMessage(e));
            }
          })
      );
    } catch (e) {
      list.innerHTML = `<p class="error">載入失敗：${esc(errorMessage(e))}</p>`;
    }
  }
  $('#shareForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#shareEmail').value;
    const relation = $('#shareRelation').value;
    try {
      await api.grantAccess(def.app.id, email, relation);
      $('#shareEmail').value = '';
      $('#shareErrors').innerHTML = '';
      await refreshList();
    } catch (err) {
      $('#shareErrors').innerHTML = `<p class="error">${esc(errorMessage(err))}</p>`;
    }
  };
  await refreshList();
}

async function renderUserAdmin() {
  root.innerHTML = `${backBtnHtml}<section><h1>使用者管理</h1><p class="muted">建立同事帳號、指定權限等級。</p><form id="newUserForm"><label>Email<input id="newUserEmail" type="email" required></label><label>暫時密碼（請同事登入後自行更換）<input id="newUserPassword" type="text" required minlength="8"></label><label>權限等級<select id="newUserRole"><option value="user">一般使用者（可自建/編輯 App，需被分享才看得到別人的 App）</option><option value="viewer">只能檢視（永遠不能編輯，即使被分享為可編輯）</option><option value="admin">管理者（看得到全部、可管理帳號）</option></select></label><div class="actions"><button type="submit">建立帳號</button></div></form><div id="newUserError"></div><h2>所有使用者</h2><div id="userList"><p class="muted">載入中…</p></div></section>`;
  bindBack(home);
  async function refreshUsers() {
    const list = $('#userList');
    try {
      const { data, error } = await authClient.admin.listUsers({ query: { limit: 200 } });
      if (error) throw new Error(error.message || 'list failed');
      list.innerHTML = data.users
        .map(
          (u) =>
            `<div class="card"><b>${esc(u.email)}</b><span>${esc(ROLE_LABEL[u.role] || u.role || 'user')}</span><div class="actions">${['admin', 'user', 'viewer']
              .map((r) => `<button class="secondary" data-setrole="${esc(u.id)}" data-role="${r}" ${u.role === r ? 'disabled' : ''}>設為${esc(ROLE_LABEL[r])}</button>`)
              .join('')}${u.id === currentUser.id ? '' : `<button class="danger" data-removeuser="${esc(u.id)}">刪除帳號</button>`}</div></div>`
        )
        .join('');
      document.querySelectorAll('[data-setrole]').forEach(
        (btn) =>
          (btn.onclick = async () => {
            try {
              await authClient.admin.setRole({ userId: btn.dataset.setrole, role: btn.dataset.role });
              await refreshUsers();
            } catch (e) {
              alert('設定失敗：' + errorMessage(e));
            }
          })
      );
      document.querySelectorAll('[data-removeuser]').forEach(
        (btn) =>
          (btn.onclick = async () => {
            if (!confirm('確定要刪除這個帳號嗎？')) return;
            try {
              await authClient.admin.removeUser({ userId: btn.dataset.removeuser });
              await refreshUsers();
            } catch (e) {
              alert('刪除失敗：' + errorMessage(e));
            }
          })
      );
    } catch (e) {
      list.innerHTML = `<p class="error">載入失敗：${esc(errorMessage(e))}</p>`;
    }
  }
  $('#newUserForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#newUserEmail').value;
    const password = $('#newUserPassword').value;
    const role = $('#newUserRole').value;
    try {
      const { error } = await authClient.admin.createUser({ email, password, name: email.split('@')[0], role });
      if (error) throw new Error(error.message || 'create failed');
      $('#newUserEmail').value = '';
      $('#newUserPassword').value = '';
      $('#newUserError').innerHTML = '';
      await refreshUsers();
    } catch (err) {
      $('#newUserError').innerHTML = `<p class="error">${esc(errorMessage(err))}</p>`;
    }
  };
  await refreshUsers();
}

async function renderAuditLog() {
  root.innerHTML = `${backBtnHtml}<section><h1>稽核紀錄</h1><p class="muted">記錄所有 App / 紀錄的新增、修改、刪除、分享操作。</p><div id="auditList"><p class="muted">載入中…</p></div></section>`;
  bindBack(home);
  const AUDIT_LABEL = {
    'app.create': '建立 App',
    'app.update': '更新 App Spec',
    'app.delete': '刪除 App',
    'app.share': '分享 App',
    'app.unshare': '取消分享',
    'record.create': '新增紀錄',
    'record.update': '編輯紀錄',
    'record.delete': '刪除紀錄',
  };
  try {
    const entries = await api.listAuditLog();
    $('#auditList').innerHTML = entries.length
      ? `<div class="compare"><table><tr><th>時間</th><th>操作者</th><th>動作</th><th>對象</th></tr>${entries
          .map(
            (e) =>
              `<tr><td>${new Date(e.created_at).toLocaleString()}</td><td>${esc(e.actor_email || '(已刪除的帳號)')}</td><td>${esc(
                AUDIT_LABEL[e.action] || e.action
              )}</td><td>${esc(e.entity_id)}</td></tr>`
          )
          .join('')}</table></div>`
      : '<p class="empty-state">目前沒有任何紀錄。</p>';
  } catch (e) {
    $('#auditList').innerHTML = `<p class="error">載入失敗：${esc(errorMessage(e))}</p>`;
  }
}

$('#homeBtn').onclick = () => (currentUser ? home() : renderLogin());
boot();
