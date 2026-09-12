# OpenForm TODO

## P0 — 可使用
- [x] 恢復可執行 Runtime 原始碼。
- [x] Mattress CRUD + JSON/CSV export。
- [x] Definition YAML/JSON import + validation。
- [x] 建立基本 runtime tests。
- [x] 取得 CI green 的實際證據（GitHub Actions run #11, commit c3861f5）。
- [x] 前後端分離（`frontend/` + `backend/`）+ 接 Postgres 資料庫，取代 localStorage（本地以 Docker Postgres 驗證過 CRUD/CI 流程）。
- [x] 實際建立 Neon Postgres 專案並連上（`neon link` 到 project `aged-moon-84749721` / branch `production`；`neon deploy` 套用 `neon.ts` policy；本機以真實 `DATABASE_URL` 跑過 migration + API smoke test，見 HANDOFF）。
- [x] Render 帳號申請、實際部署到公開 URL並做 mobile smoke test（https://openform-frontend.onrender.com + https://openform-backend.onrender.com，已用手機/curl 驗證可用）。
- [x] 確認 GitHub Actions 上新增的 Postgres service container 測試真的能跑綠（多次 push 後 CI 皆為 success）。

## P1 — Definition v1 完整度
- [x] nested collection 視覺 editor（CI #14 已通過）。
- [x] image/video/audio 上傳 UI（接 Neon Object Storage，presigned upload，見 HANDOFF）。
- [ ] location/barcode/signature 專用 UI（目前仍 fallback 成純文字輸入）。
- [x] canonical Definition/Record JSON Schema。
- [x] semantic registry + canonical unit runtime validation（已包含於後續多次 green CI；latest checked CI #26 success）。
- [x] Mattress / Workout / Inspection templates（mattress/workout 因新增 photo/form_video 欄位升到 version 2）。
- [x] templates 對應 worked Record examples（`examples/*.record.json` + CI regression tests）。
- [x] App 畫面可以查看/複製/下載自己的 Definition Spec（YAML），方便貼給外部 LLM 當範例。
- [x] `rating` 欄位改成可點選的數字按鈕（1..max），不再是裸的數字輸入框。
- [x] `number`/`duration` 欄位即時顯示 min/max 範圍提示，超出範圍即時標紅（不用等送出才跳原生瀏覽器提示）。
- [x] `text` 欄位可標記 `autocomplete: true`，UI 用 datalist 建議這個 App 裡該欄位過去輸入過的值（目前只支援頂層欄位，不含 collection 巢狀欄位）；mattress 範本的 `store`/`brand` 已套用。
- [x] 紀錄列表新增「檢視」按鈕，唯讀顯示所有欄位（含 media 預覽），不用先進編輯畫面。
- [x] `/api/uploads` 在缺少物件儲存憑證時回傳明確的 503 訊息，不再是模糊的「internal error」。

## P2 — Production
- [ ] k3s/Kubernetes target。
- [ ] Argo CD bootstrap/sync 驗證。
- [ ] DNS/TLS。
- [ ] GHCR visibility/credentials 驗證。

## P3 — Shared data
- [x] Backend/API/DB（Express + Postgres，見 `backend/`）。
- [ ] Auth（目前是單一共享工作區，沒有帳號/資料隔離）。
