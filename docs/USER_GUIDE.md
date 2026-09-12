# OpenForm 功能、使用情境與操作教學

## OpenForm 是什麼
OpenForm 把 YAML/JSON Definition 變成可以直接填寫資料的 Mini-App。LLM 可以協助你產生 Definition，但 OpenForm 執行時不依賴任何 LLM。

## 目前可用功能
- 我的 App、內建 Mattress / Workout / Inspection Apps、CRUD、伺服器資料庫儲存、JSON/CSV export。
- 貼上 YAML/JSON Definition，驗證、預覽後建立新 App；App 內也能查看、複製、下載自己的 YAML Spec。
- text、textarea、number、rating、select、multi_select、boolean、date、time、datetime、duration。
- collection 已有視覺化新增/移除/編輯，且可遞迴巢狀。例如 Workout 的 Exercises[] 裡面可再有 Sets[]。
- image、video、audio 已有檔案選擇、上傳進度與預覽，檔案透過 presigned URL 存到 Neon Object Storage，Record 只保存 URL。
- 紀錄可以直接唯讀檢視，不必先進入編輯模式。

## 情境：床墊店詢價
開 OpenForm → 床墊 App → 新增紀錄。每試一張床輸入店家、品牌、型號、尺寸、照片、報價、材質、軟硬度與各項評分，再記錄試睡、退換貨、保固、配送與備註。最後可匯出 JSON 完整備份，或 CSV 放進試算表比較。

## 情境：請 LLM 建立新的收集 App
告訴 LLM：`請產生 openform/definition/v1 YAML，只輸出 declarative Definition，不要 JavaScript。field id 使用 snake_case，select option 使用穩定 value。`
取得 Definition 後：OpenForm → 匯入 Spec → 貼上 YAML/JSON → 驗證 → 預覽 → 確認建立。

更好的方式是先從任一既有 App 點「查看 Spec」，把實際可執行的 YAML 複製給 GPT / Claude / Gemini，再要求它照相同規格產生新的 Definition。

## Nested Collection
Definition 的 collection 可以包含 fields，而其中的 field 也可以再是 collection。Runtime 會依 Definition 遞迴建立 UI，使用者不需要編輯 JSON。Workout template 是標準範例：Workout → Exercises[] → Sets[]。

`examples/workout.record.json` 則展示實際儲存後的巢狀 Record data，可作為 LLM 或其他軟體整合時的資料格式參考。`examples/` 也包含 Mattress 與 Inspection 的完整 Record 範例。

## 資料與隱私
資料存在後端 Postgres；media 檔案存在 Neon Object Storage。前端透過 REST API 存取資料，不再依賴單一瀏覽器 localStorage。需要登入才能使用，換瀏覽器或換裝置只要用同一個帳號登入就會看到自己有權限的 App。不會自動把資料送給任何 LLM。

## 公開環境
目前已部署並實際驗證：
- Frontend: https://openform-frontend.onrender.com
- Backend: https://openform-backend.onrender.com

長期正式交付方向仍是 GitHub Actions → GHCR → Argo CD → k3s/Kubernetes；Render 是目前可以立即使用與驗證產品的公開環境。

## 多人使用
每個帳號有一個全域等級：`admin`（看得到/管得到全部 App，也能新增/管理其他人的帳號）、`user`（一般使用者）、`viewer`（全域只能檢視，即使某個 App 被分享成可編輯也一樣改不了）。
每個 App 另外可以個別分享給特定同事，分為 owner（建立者，可再分享/可刪除）/ editor（可編輯內容）/ viewer（唯讀）三種權限，運作方式類似 Google 文件的分享。首發模板（床墊試躺、健身紀錄、現場檢查）預設分享給所有登入使用者。所有 App/紀錄的新增/編輯/刪除/分享操作都會記錄稽核紀錄，只有 `admin` 能查看。忘記密碼目前需要請 `admin` 協助重設帳號密碼，尚未有自助的忘記密碼流程。

## 尚未完成
location、barcode、signature 目前仍使用一般文字 fallback，尚未有專用 runtime UI。正式 Argo CD production cluster、DNS/TLS 也仍未完成。「忘記密碼」自助流程尚未實作。
