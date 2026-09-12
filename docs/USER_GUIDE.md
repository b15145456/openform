# OpenForm 功能、使用情境與操作教學

## OpenForm 是什麼
OpenForm 把 YAML/JSON Definition 變成可以直接填寫資料的 Mini-App。LLM 可以協助你產生 Definition，但 OpenForm 執行時不依賴任何 LLM。

## 目前可用功能
- 我的 App、內建床墊 App、CRUD、伺服器資料庫儲存、JSON/CSV export。
- 貼上 YAML/JSON Definition，驗證後建立新 App。
- text、textarea、number、rating、select、multi_select、boolean、date、time、datetime、duration。
- collection 已有視覺化新增/移除/編輯，且可遞迴巢狀。例如 Workout 的 Exercises[] 裡面可再有 Sets[]。

## 情境：床墊店詢價
開 OpenForm → 使用床墊範本 → 新增紀錄。每試一張床輸入店家、品牌、型號、尺寸、報價、材質、軟硬度與各項評分，再記錄試睡、退換貨、保固、配送與備註。離店前可匯出 JSON 完整備份，或 CSV 放進試算表比較。

## 情境：請 LLM 建立新的收集 App
告訴 LLM：`請產生 openform/definition/v1 YAML，只輸出 declarative Definition，不要 JavaScript。field id 使用 snake_case，select option 使用穩定 value。`
取得 Definition 後：OpenForm → 匯入 Spec → 貼上 YAML/JSON → 驗證 → 確認建立。

## Nested Collection
Definition 的 collection 可以包含 fields，而其中的 field 也可以再是 collection。Runtime 會依 Definition 遞迴建立 UI，使用者不需要編輯 JSON。Workout template 是標準範例：Workout → Exercises[] → Sets[]。

## 資料與隱私
資料現在存在後端的 Postgres 資料庫（前後端分離架構：`frontend/` 呼叫 `backend/` 的 REST API），不再只存在單一瀏覽器的 localStorage。換瀏覽器或換裝置都能看到同一份資料。目前沒有帳號系統，也不會自動送資料給 LLM。

## 多人使用
目前沒有帳號/權限系統，所有連到同一個後端的使用者會看到同一份資料（沒有資料隔離）。若需要每個人只看到自己的資料，需要再加 Authentication；目前仍是單一共享工作區的定位。

## 尚未完成
image/video/audio/location/barcode/signature 尚未有專用 runtime UI；帳號/權限（Authentication）尚未實作；正式的公開 URL 部署（見 `docs/deployment.md`）尚待實際上線驗證。
