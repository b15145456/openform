# OpenForm 功能、使用情境與操作教學

## OpenForm 是什麼
OpenForm 把 YAML/JSON Definition 變成可以直接填寫資料的 Mini-App。LLM 可以協助你產生 Definition，但 OpenForm 執行時不依賴任何 LLM。

## 目前可用功能
- 我的 App、內建床墊 App、CRUD、localStorage、JSON/CSV export。
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
目前資料存在瀏覽器 localStorage。沒有帳號、沒有伺服器資料庫，也不會自動送資料給 LLM。換瀏覽器、清除網站資料或換裝置不會自動同步，因此重要資料請先匯出 JSON。

## 多人使用
目前不同人可以各自在自己的瀏覽器使用，但資料不共享。若需要多人看到同一批紀錄、跨裝置同步，才需要 Backend + Database + Authentication。

## 尚未完成
image/video/audio/location/barcode/signature 尚未有專用 runtime UI；尚未完成 production Argo CD 公開部署驗證。
