# OpenForm Handoff

## 2026-09-12 — Product hardening
### 做了什麼
- Runtime recovery 的 GitHub Actions run #11 已實際 completed/success。
- 後續 CI 也成功將 GHCR immutable image SHA 自動寫回 `deploy/k8s/deployment.yaml`，證明 GitOps promotion path 正常運作到 Git repository 階段。
- 新增 first-party Mattress / Workout / Inspection templates；Workout 提供 Exercise[] → Sets[] nested collection 標準範例。
- 新增 Semantic Registry JSON 與說明文件。
- 強化 Definition validation：app version、select stable option value uniqueness。

### 現況
Build/test/GHCR promotion path 已有實際成功證據。尚未有 public URL，因此還不能宣稱產品已完成部署。Runtime 的 collection 仍是 JSON textarea，下一個核心產品工作是 nested collection 視覺 editor。

### 下一步
1. 完成 nested collection 視覺 editor，支援任意遞迴深度。
2. 補 Definition/Record canonical JSON Schema 與 validation tests。
3. 建立 public deployment + mobile smoke test。
4. 再處理 media/location/barcode/signature 專用 controls。

### 卡關
Public hosting 尚未建立；Vercel connector 在先前 invocation 被停用。Argo CD production 仍需要實際 k3s/Kubernetes target、DNS/TLS。
