# OpenForm Handoff

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
