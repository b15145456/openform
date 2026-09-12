# OpenForm Handoff

## 2026-09-12 — Canonical schemas + semantic/unit validation
### 做了什麼
- 確認 recursive collection commit `6a2c34c` 的 GitHub Actions CI #14 completed/success，且 GHCR SHA 已由 Actions promotion commit 寫回 Kubernetes manifest。
- 新增 `spec/definition.schema.json` 與 `spec/record.schema.json`，採 JSON Schema Draft 2020-12。
- Runtime 的 Definition validation 加入 Semantic Registry 驗證：已登錄 semantic type 可用，自訂語意必須使用 `custom.*`。
- Runtime 加入 canonical unit 驗證。
- Tests 補 semantic/unit 行為與 canonical schema 文件檢查。

### 現況
Definition → Runtime → Record 的格式契約現在同時有 executable runtime validation 與 canonical machine-readable schema 文件。本次新增內容仍需新的 CI run 成功後才算驗證完成。

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
