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
- [x] `app.interaction_mode: form | conversation`——conversation 模式一次問一題、collection 用「新增一筆嗎？」的方式收集、最後一個唯讀確認畫面 + 「完成對話」才真的存檔。mattress_quote 範本已套用 conversation 模式。
- [x] 視覺化 Definition 編輯器（「視覺化建立」/「編輯 Spec」）：新增/刪除/改型別/編輯 min-max/options/semantic_type/unit、collection 巢狀子欄位、▲▼ 排序（不是真正的拖拉手勢，因為原生 HTML5 drag-and-drop 在手機觸控上不可靠；如果之後真的想要手勢拖曳，需要另外用 Pointer Events 自己刻，這是一個可能的後續項目）。編輯既有 App 的 spec 會自動把 version + 1。
- [x] 編輯器改成左右分割：左邊 Spec（YAML，可編輯）、右邊視覺化編輯，雙向即時同步。
- [x] 所有非首頁畫面左上角都有「← 返回」按鈕，含原本沒有任何離開方式的「App 讀取失敗」錯誤畫面。
- [ ] 手勢式拖曳排序（目前是 ▲▼ 按鈕，功能等價但不是真正的「拖」）。

## P2 — Production
- [ ] k3s/Kubernetes target。
- [ ] Argo CD bootstrap/sync 驗證。
- [ ] DNS/TLS。
- [ ] GHCR visibility/credentials 驗證。

## P3 — Shared data
- [x] Backend/API/DB（Express + Postgres，見 `backend/`）。
- [x] Auth + RBAC：Better Auth（email/password + bearer token，因前後端在不同 onrender.com 子網域無法共用 cookie）處理身分認證；三層全域角色（`admin` 看得到/管得到全部、`user` 一般使用者、`viewer` 全域只能檢視，即使某個 App 被分享成 editor 也一樣）；OpenFGA（ReBAC）處理每個 App 的 owner/editor/viewer 分享（Google Docs 風格），首發模板用 `user:*` wildcard 公開分享給所有登入使用者。見 `docs/authentication.md`、`docs/deployment.md` Path A 的 OpenFGA 小節。
- [x] Audit log：所有 App/Record 的建立/更新/刪除/分享操作都會記錄到 `audit_log` 表（含操作者、時間、before/after detail），只有 `admin` 能在「稽核紀錄」畫面查看。
- [ ] 生產環境實際部署 RBAC/OpenFGA/audit log（本地已用真實 Postgres + OpenFGA Docker 驗證通過 11 條 backend 測試 + 完整 Playwright RBAC 情境測試；尚未在 Render 上設定新環境變數、跑一次性的 OpenFGA production migration）。
- [ ] 自助變更密碼以外，尚未有「忘記密碼」流程（目前帳號都由 admin 建立/重設）。
- [x] 刪除 App（含 cascade 刪除底下所有紀錄）。
- [x] 匯入 Spec 如果 id 撞到既有 App 會先警告，不會無聲覆蓋。
