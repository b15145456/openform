# OpenForm 功能、使用情境與操作教學

## OpenForm 是什麼
OpenForm 把 YAML/JSON Definition 變成可以直接填寫資料的 Mini-App。LLM 可以協助你產生 Definition，但 OpenForm 執行時不依賴任何 LLM。

## 目前可用功能
- 我的 App：查看已建立 App 與紀錄數。
- 內建床墊試躺 / 詢價 App。
- 新增、查看列表、編輯、刪除紀錄。
- localStorage 本機保存，重新整理後保留。
- JSON 與 CSV 匯出。
- 貼上 YAML/JSON Definition，驗證後建立新 App。
- Definition stable field id、版本與 Record definition identity。
- 基本動態欄位：text、textarea、number、rating、select、multi_select、boolean、date、time、datetime、duration。
- collection 目前以 JSON array 編輯方式提供最低可用能力；真正的巢狀視覺化 collection editor 尚未完成。

## 情境 1：今天去床墊店詢價
1. 開 OpenForm → `使用床墊範本`。
2. 點 `新增紀錄`。
3. 每試一張床輸入店家、品牌、型號、尺寸、報價、總價、材質、彈簧、分區、軟硬度與各項主觀評分。
4. 補上試睡、退換貨、保固、配送與備註。
5. 點 `儲存`。下一張床再新增一筆。
6. 回到列表可編輯或刪除。
7. 離店前可匯出 JSON 作完整備份，或 CSV 放入試算表比較。

## 情境 2：請 ChatGPT / Claude 幫我建立新的收集 App
告訴 LLM：`請產生 openform/definition/v1 YAML，只輸出 declarative Definition，不要 JavaScript。field id 使用 snake_case，select option 使用穩定 value。`

取得 Definition 後：OpenForm → `匯入 Spec` → 貼上 YAML/JSON → 驗證 → 確認建立。之後就可以像普通 App 一樣新增紀錄。

## Definition 最小範例
```yaml
spec: openform/definition/v1
app:
  id: simple_note
  name: 簡單紀錄
  version: 1
fields:
  - id: title
    label: 標題
    type: text
  - id: score
    label: 評分
    type: rating
    min: 1
    max: 5
```

## 資料與隱私
目前資料存在瀏覽器 localStorage。沒有帳號、沒有伺服器資料庫，也不會自動送資料給 LLM。換瀏覽器、清除網站資料或換裝置不會自動同步，因此重要資料請先匯出 JSON。

## 多人使用代表什麼
目前網站可以讓不同人開啟使用，但每個人的資料各自在自己的瀏覽器。若需求是「多人看到同一批紀錄、跨裝置同步」，需要後續 Backend + Database + Authentication。

## 欄位狀態
text/textarea/number/rating/select/multi_select/boolean/date/time/datetime/duration 已有一般輸入 UI。collection 有最低可用 JSON array 編輯。image/video/audio/location/barcode/signature 目前尚未有專用 runtime UI，會暫以一般文字輸入呈現，因此不應視為完整支援。

## 使用限制
- 尚未有登入/同步。
- 尚未有真正 nested collection 視覺 editor。
- media/location/barcode/signature 尚待專用 UI。
- 尚未完成 production Argo CD 部署驗證。

## 部署方向
正式目標保持 GitHub → GitHub Actions → GHCR → Argo CD → k3s/Kubernetes → Traefik。臨時 hosting 可以獨立存在，但不能取代 GitHub Source of Truth。
