# OpenForm Handoff

## 2026-09-12 — 上傳修復、輸入體驗、唯讀檢視
### 做了什麼
- **抓到並修好上傳失敗的根因**：Render 上 `POST /api/uploads` 回傳模糊的 `{"error":"internal error"}`（500）。原因是 `openform-backend` 這個 Render service 還沒填 `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_ENDPOINT_URL_S3`/`AWS_REGION`（上一輪 HANDOFF 有請使用者手動填，但可能還沒填或還沒重新部署）。`getSignedUrl` 在憑證缺失時會直接丟例外，被 generic error handler 吃成 500。修法：`storage.js` 新增 `storageConfigured()`，upload route 在呼叫 S3 前先檢查，缺憑證直接回 503 + 中文說明訊息，之後不管誰踩到這個問題都能立刻知道原因，不用再靠猜。
- 澄清一個誤解：上傳走的是 **Neon Object Storage**，不是真的 AWS S3——只是借用 S3 相容協定跟官方 `@aws-sdk/client-s3` 函式庫當 client，帳單/額度都算在既有的免費 Neon 帳號裡，沒有另外的 AWS 費用。
- **輸入體驗三項改進**（使用者實際操作後回饋：送出才跳原生瀏覽器限制提示，太晚）：
  1. `number`/`duration` 欄位在 `min`/`max` 存在時，輸入框下方常駐顯示範圍提示（如「範圍：1–10」），使用者打字當下只要超出範圍提示就即時變紅色（`oninput` 即時檢查，不必等送出）。
  2. `rating` 欄位不再是裸的 `<input type=number>`，改成 `min..max` 的可點選數字按鈕列（segmented control），手機上更好點、更清楚目前選了幾分。
  3. `text` 欄位新增可選的 `autocomplete: true` 屬性：UI 用 HTML `<datalist>` 建議這個 App 過去在該欄位輸入過的值（從已載入的 Records 動態算出，不是寫死在 Definition 裡的固定選項）。Mattress 範本的 `store`、`brand` 已套用——同一家店問好幾張床墊時，店名/常見品牌不用每次重打。目前只支援頂層欄位（不支援 collection 巢狀欄位內的 autocomplete，屬已知限制）。
- **唯讀檢視**：紀錄列表每筆多一個「檢視」按鈕，唯讀顯示所有欄位（含巢狀 collection、media 預覽），不用先進可編輯的表單畫面才能看內容；檢視畫面內也有「編輯」捷徑可以直接切換進表單。
- `docs/openform-definition.md` 補上 `autocomplete` 屬性說明與 rating/number hint 行為，並更新給 LLM 的 prompt 模板一併提到這兩個屬性。

### 實際驗證
- 前端 `npm run build` + `npm test`（10 條 shared tests）通過。
- Backend 測試（5 條）在**沒有** AWS 憑證的情況下用 Docker Postgres 跑過，確認新的 503 guard 不會弄壞既有的 400 驗證測試；另外用 curl 實際打過一次沒憑證的 `/api/uploads`，確認回傳的是清楚的 503 中文訊息而不是模糊的 500。
- 尚未在 Render 上實際重新驗證上傳是否已修好——那要等使用者確認 Render 的 4 個 AWS_* 環境變數已經填好、服務已重新部署後才能測。

### 現況
本輪修改已經 commit，準備 push 到 GitHub 觸發 CI 與 Render 自動部署。

### 下一步
1. push 後等 CI 綠燈，再等 Render 自動部署完成，實際 curl 測試 `/api/uploads` 是否已經不再是 503（代表 AWS_* 環境變數確實生效）。
2. 手機上實際測一次上傳一張床墊照片、用「檢視」看一次已存的紀錄。
3. `location`/`barcode`/`signature`、`autocomplete` 支援 collection 巢狀欄位，仍是待辦。

## 2026-09-12 — Render 上線、UI 修復、Media 上傳、Spec 可視化
### 做了什麼
- **Render 部署完成**：`openform-backend`（Node web service）與 `openform-frontend`（static site）都已建立並上線，`render.yaml` 曾因 static site 不接受 `plan: free` 欄位而失敗一次，移除該欄位後成功。環境變數（`DATABASE_URL`、`FRONTEND_ORIGIN`、`VITE_API_URL`）都已回填，CORS 驗證正常。
- 合併了同一天稍早、由另一個 session/使用者在 `main` 上獨立完成的「canonical schema + semantic validation」工作（`spec/*.schema.json`、runtime 的 semantic_type/unit 檢查），用 `git merge` 手動解衝突（HANDOFF/PROGRESS/tests 有衝突，`shared/runtime.js` 靠 git rename 偵測自動合併成功）。
- **真人手機測試抓到 3 個 UI bug**，全部修好：
  1. `.card` 沒設 `color`，導致 `<button class="card appcard">` 白底白字看不到內容。
  2. 「匯入 Spec」只是瀏覽器原生 `prompt()` 單行輸入，換成頁面內 textarea + 驗證 + 預覽（app 名稱/版本/欄位數）流程。
  3. Workout / Inspection 範本檔案存在但後端從沒 seed 過；現在三個範本開機都會 seed。
- **文件正確性修復**：`docs/openform-definition.md`、`docs/record-language.md` 原本描述一套從未實作過的舊格式（`openform:"0.1"`、`key`、`recordType`），跟實際 `openform/definition/v1`／`openform/record/v1` 完全對不上——如果照舊文件餵給 LLM，產生的 spec 會被 validateDefinition 全部拒絕。已重寫成與實際 schema 一致，並加入可直接複製給 GPT/Claude 的 prompt 模板。
- **Image/Video/Audio 上傳**（接 Neon Object Storage）：
  - `neon.ts` 宣告 `preview.buckets.media`（`public_read`），`neon deploy` 建立 bucket，憑證自動拉進 `.env.local`。
  - Backend 新增 `POST /api/uploads`（`backend/src/storage.js` + `routes/uploads.js`）：驗證 `contentType` 是 image/video/audio、用 `@aws-sdk/client-s3` + `s3-request-presigner` 產生 300 秒有效的 presigned PUT URL，回傳 `{key, uploadUrl, publicUrl}`。
  - Frontend：`image`/`video`/`audio` 欄位現在渲染真的檔案選擇器，選檔後直接 `XMLHttpRequest PUT` 到 presigned URL（不經過我們的 backend 轉送），成功後把 `publicUrl`（純字串）存進 Record `data`，跟其他欄位型別一樣，沒有特殊 Record 格式。上傳中顯示進度%，完成後即時預覽（img/video/audio 元素）。
  - Record `data` 只存 URL 字串，檔案本體從不進 Postgres。
  - 床墊範本加了 `photo`（image）欄位、健身範本加了 `form_video`（video，`fitness.exercise.form_video` 這個原本就註冊但沒人用的 semantic type 終於用上了）；兩個範本因此升到 `app.version: 2`。`backend/src/migrate.js` 的 seed 邏輯從「ON CONFLICT DO NOTHING」改成「DO UPDATE」（upsert），這樣範本檔案更新後既有部署會自動同步——已驗證：既有 Record 資料在 re-seed 後完全不受影響（見下方驗證）。
- **Spec 可視化**：App 畫面新增「查看 Spec」按鈕，用 `js-yaml` 把目前的 Definition dump 成 YAML 顯示、可一鍵複製或下載——目的是讓使用者能把自己 App 的 spec 直接複製貼給任何 LLM 當作範例/語法參考，去生成新的、完全不同用途的表單。這是本專案「LLM 讀規範產生 spec」核心賣點的重要缺口，之前完全沒有入口能看到 spec 本身。
- **視覺設計**：兩輪美化——CSS variables 色彩系統、hover/focus 動畫、深色模式（第一輪）；App 卡片加 emoji icon、空狀態（empty state）樣式、header 加 logo 徽章（第二輪）。

### 實際驗證（不是只憑肉眼看程式碼）
- 全部改動都跑過本地 Docker Postgres 的完整測試（10 shared + 5 backend，backend 新增了一個 upload 驗證測試，且刻意在**沒有** AWS 憑證的情況下跑過，確認 CI 不需要雲端密鑰也能跑這個測試）。
- Object Storage 是真實走過一次完整流程驗證的：向 backend 要 presigned URL → 實際 PUT 一張真的 PNG 到 Neon Object Storage → 用 public_read URL 讀回來 → `cmp` 位元組完全相同 → 用 `neon bucket object delete` 清掉測試檔案，bucket 現在是空的。
- 用真實 `DATABASE_URL` 模擬過「重新部署」情境：建一筆 record → 重跑 migrate（升版 mattress_quote 到 v2）→ 確認舊 record 資料原封不動、新版 app 已經有 `photo` 欄位。
- Render 上的 backend/frontend 都用 curl 實際打過（`/healthz`、`/api/apps`、CORS header、建立/刪除一筆 workout record），frontend 打包後的 JS/CSS 也抓下來確認新版內容（`importResult`、`--accent` CSS variable）已經上線。
- CI 每次 push 後都用 `gh run watch` 等到 success 才继续，不是假設它會過。

### 現況
Mattress/Workout/Inspection 三個 App 已經在正式環境（Render + Neon）可用，含照片/影片上傳。文件（Definition/Record contract）跟實際程式碼一致了，也有現成的「複製 Spec 去問 LLM」入口。

### 下一步
1. `location`/`barcode`/`signature` 仍是純文字 fallback，沒有專用 UI。
2. `templates/` 對應的 `examples/`（worked Record 範例）還沒建立。
3. 視需要加 Authentication（目前仍是單一共享工作區）。
4. GitHub Actions 目前沒有把 AWS_* 憑證當 secret 加進去，所以 CI 沒有對 Object Storage 做真正的上傳整合測試（只測了 contentType 驗證邏輯）；如果要在 CI 也驗證真實上傳，需要 `gh secret set` 把 Neon Object Storage 憑證加進 repo secrets。

### 卡關
無新增卡關；Render/Neon 帳號、部署都已由使用者本人完成必要的瀏覽器授權步驟。

## 2026-09-12 — Neon Postgres 專案實際連上
### 做了什麼
- 全域安裝官方 Neon CLI（npm 套件 `neon`，`neonctl` 現在只是相容別名，兩者同一個 repo）。
- `neon login`（`auth` 的別名）完成瀏覽器 OAuth，確認登入身分是 `b15145456@gmail.com`。
- `neon skills -y`：把 Neon 官方 agent skills 裝進 `.claude/skills/`（neon、neon-postgres、neon-functions 等），連同 `skills-lock.json`。
- `neon mcp -y`：把 hosted Neon MCP server（`https://mcp.neon.tech/mcp`）寫進 claude-code/gemini-cli/github-copilot-cli/vscode 的全域 MCP 設定，帳號層級 API key（沒有限定單一 project）。
- `neon link --project-id aged-moon-84749721 --branch production -y`：把這個目錄連到已存在的 Neon 專案（org `org-calm-hall-14765228`），寫入 `.neon`（已加進 `.gitignore`，CLI 自己加的），並把 `DATABASE_URL`/`DATABASE_URL_UNPOOLED`/`NEON_BRANCH` 拉進 `.env.local`（同樣 gitignored，沒有進 git）。
- `neon config init`：產生 `neon.ts` 起始版本，並在根目錄 `package.json` 加了 `@neon/config`、`@neon/env` 兩個 dependency。
- 依指示把 `neon.ts` 改成最小版 `defineConfig({})`。
- `neon deploy`（`config apply` 的別名）套用 policy 到 `production` branch：「No changes — branch production already matches the policy」。

### 實際驗證
- 用真正的 `DATABASE_URL`（來自 `.env.local`，不是假的）跑 `npm run backend:migrate`：成功在 Neon 上建立 `apps`/`records` 表並 seed 床墊範本。
- 用同一組 `DATABASE_URL` 啟動 `backend/src/server.js`，curl `/healthz` 回 `ok`、`/api/apps` 回傳床墊範本，證明 backend ↔ 真實 Neon 資料庫這條路是通的，不只是本地 Docker Postgres 而已。
- 驗證完把背景啟動的 node process 關掉，沒有留著佔用 port。

### 現況
上一則 HANDOFF 提到「免費部署設定檔已就緒，但尚未實際申請帳號」——Neon 的部分現在已經是真的了：專案 `aged-moon-84749721` / branch `production` 已建立並連上，`DATABASE_URL` 是真實可用的連線字串。`docs/deployment.md` Path A 已更新反映這件事。

### 下一步
1. Render 帳號還是要使用者自己申請、連 GitHub repo，把 `DATABASE_URL`（見上面）填進 Render 的 `openform-backend` 環境變數。
2. 部署後做一次真正的 public URL mobile smoke test。
3. `.neon`/`.env.local` 都在這台機器上，換一台機器要重新 `neon link` 或 `neon env pull`。

### 卡關
Render 帳號/部署仍需使用者親自操作，這個 session 沒有 Render 存取權限。

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

## 2026-09-12 — Canonical schemas + semantic/unit validation
### 做了什麼
- 確認 recursive collection commit `6a2c34c` 的 GitHub Actions CI #14 completed/success，且 GHCR SHA 已由 Actions promotion commit 寫回 Kubernetes manifest。
- 新增 `spec/definition.schema.json` 與 `spec/record.schema.json`，採 JSON Schema Draft 2020-12。
- Runtime 的 Definition validation 加入 Semantic Registry 驗證：已登錄 semantic type 可用，自訂語意必須使用 `custom.*`。
- Runtime 加入 canonical unit 驗證。
- Tests 補 semantic/unit 行為與 canonical schema 文件檢查。

### 現況
Definition → Runtime → Record 的格式契約現在同時有 executable runtime validation 與 canonical machine-readable schema 文件。本次新增內容仍需新的 CI run 成功後才算驗證完成。這份工作與同一天稍後的前後端分離／Neon 連線是各自獨立進行、之後才合併回 main。

### 下一步
1. 等待/確認本次 schema/validation CI。
2. public deployment + mobile smoke test（仍是 P0 未完成項）。
3. media/location/barcode/signature 專用 controls。
4. 補 templates 對應 examples 與完整 backup/import UX。

### 卡關
Public hosting 尚未建立；Argo CD production 仍需要實際 cluster、DNS/TLS。Vercel connector 先前不可用，因此不要把 Vercel 當作目前可驗證路徑。

## 2026-09-12 — Recursive collection editor
### 做了什麼
- 將 collection 從 JSON textarea 升級成視覺化 editor。
- Runtime 依 Definition 遞迴 render collection；每層都可新增、移除與編輯 item。
- Record serialization 同樣遞迴，因此 Workout → Exercises[] → Sets[] 可直接產生 nested Record data。
- 對 Definition label/value 做 HTML escaping，降低 imported Spec 造成 DOM injection 的風險。
- 更新 mobile nested collection 樣式與 USER_GUIDE/TODO。

### 現況
核心 Definition → Dynamic Renderer → Record 已開始具備真正通用 Runtime 的樣貌。此版本後續由 GitHub Actions CI #14 驗證成功。

### 下一步
1. canonical Definition/Record JSON Schema + semantic/unit validation。
2. public deployment + mobile smoke test。
3. media/location/barcode/signature controls。

### 卡關
Public hosting 尚未建立；Argo CD production 仍需要實際 cluster/DNS/TLS。
