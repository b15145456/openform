# OpenForm Handoff

## 2026-09-12 — 前後端分離 + 資料庫
### 做了什麼
- 拆成 `frontend/`（Vite 靜態前端）與 `backend/`（Express API），共用邏輯抽到 `shared/runtime.js`（validateDefinition/makeRecord/csvEscape，前後端都 import 同一份）。
- 新增 Postgres 持久層：`apps`（definition）、`records`（資料）兩張表；`backend/src/migrate.js` 在後端啟動時自動、冪等地建表並 seed mattress 範本（讀 `templates/mattress.yaml`，不再是 app.js 內硬編一份）。
- REST API：`GET/POST /api/apps`、`GET/POST/PUT/DELETE /api/apps/:id/records`；`POST /api/apps` 會跑跟前端匯入 Spec 一樣的 `validateDefinition`。
- 前端 `app.js` 全面改成呼叫 `frontend/api.js`（fetch 包裝，`VITE_API_URL` 決定後端位置），拿掉 localStorage 狀態；`app/` 目錄整個移除（原本重複、未使用的 `app/index.html` 也一併清掉）。
- 根目錄改成 npm workspaces（`frontend`、`backend`），根 `package.json` 的 `build`/`test` 對應到各 workspace。
- CI（`.github/workflows/ci.yml`）新增 Postgres service container，跑 `backend/tests/api.test.js`（supertest 打 `backend/src/app.js`，涵蓋 CRUD + validation 拒絕）；既有的 k8s image build/promotion 流程不變，仍只打包 frontend（`Dockerfile` 只改了 COPY 路徑對應 `frontend/dist`）。
- 新增 `render.yaml`：Render 免費方案的前後端兩個 service（backend 用 Node runtime + `npm start`；frontend 用 static site + `npm run build`），資料庫預期接 Neon 免費 Postgres（`DATABASE_URL` 環境變數）。細節寫在 `docs/deployment.md` 的 Path A。
- 修掉 `npm audit` 揪出的 `js-yaml`（升到 4.3.2）與 `qs`（用 root `overrides` 鎖到 6.16.0）已知漏洞，重跑後 0 vulnerabilities。
- 更新 `docs/USER_GUIDE.md`（資料現在存伺服器 DB，不是 localStorage）、`docs/deployment.md`（新增免費部署路徑）、`CHANGELOG.md`。

### 實際驗證（不是只憑肉眼看程式碼）
- 用 Docker 起一個一次性 `postgres:16-alpine` container，`DATABASE_URL` 指過去，跑 `npm test`（shared runtime 7 tests pass）與 `cd backend && npm test`（4 個 API 整合測試 pass：health check、seeded mattress app、record CRUD 生命週期、無效 definition 被拒絕）。
- `npm run build` 成功產出 `frontend/dist`；用 `VITE_API_URL` 重新 build 確認網址有正確烤進 bundle。
- 實際啟動 `node backend/src/server.js` 連本地 Postgres，用 curl 打 `/healthz`、`/api/apps`、`/api/apps/mattress_quote`、POST 一筆 record，全部回應正確；用 `python3 -m http.server` 起built 前端，確認 CORS header 正常回應。
- 測試結束後已清掉 Docker container 與背景 process，沒有殘留。
- **沒有**實際跑過 CI（沒有 push），**沒有**實際在 Render/Neon 上部署過——這兩項仍待驗證，不可視為已完成。

### 現況
前後端分離、接 Postgres 的架構已經做完並在本地驗證過。舊的 k8s/Argo CD 路徑保留、只打包 frontend，不受影響。免費部署路徑（Render + Neon）的設定檔已就緒，但尚未實際申請帳號、建立服務、線上驗證。

### 下一步
1. 使用者自己申請 Neon（拿 `DATABASE_URL`）與 Render 帳號，照 `docs/deployment.md` Path A 連上 GitHub repo 部署，回填環境變數。
2. 部署後做一次真正的 public URL mobile smoke test。
3. 視需要加 Authentication（目前是單一共享工作區，任何打到後端的人看到同一份資料，沒有隔離）。
4. canonical Definition/Record JSON Schema + semantic/unit validation；media/location/barcode/signature controls（仍是 P1 待辦，這次沒有動）。

### 卡關
Render/Neon 需要使用者自己的帳號才能建立實際服務並取得 public URL，這一步無法在這個 session 裡代為完成。

## 2026-09-12 — Recursive collection editor
### 做了什麼
- 將 collection 從 JSON textarea 升級成視覺化 editor。
- Runtime 依 Definition 遞迴 render collection；每層都可新增、移除與編輯 item。
- Record serialization 同樣遞迴，因此 Workout → Exercises[] → Sets[] 可直接產生 nested Record data。
- 對 Definition label/value 做 HTML escaping，降低 imported Spec 造成 DOM injection 的風險。
- 更新 mobile nested collection 樣式與 USER_GUIDE/TODO。

### 現況
核心 Definition → Dynamic Renderer → Record 已開始具備真正通用 Runtime 的樣貌。這個 commit 仍需 GitHub Actions CI 成功後才算驗證完成。

### 下一步
1. CI 驗證 recursive collection 版本。
2. canonical Definition/Record JSON Schema + semantic/unit validation。
3. public deployment + mobile smoke test。
4. media/location/barcode/signature controls。

### 卡關
Public hosting 尚未建立；Argo CD production 仍需要實際 cluster/DNS/TLS。
