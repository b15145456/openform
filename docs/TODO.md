# OpenForm TODO

## P0 — 可使用
- [x] 恢復可執行 Runtime 原始碼。
- [x] Mattress CRUD + localStorage + JSON/CSV export。
- [x] Definition YAML/JSON import + validation。
- [x] 建立基本 runtime tests。
- [x] 取得 CI green 的實際證據（GitHub Actions run #11, commit c3861f5）。
- [ ] 實際部署一個公開 URL 並做 mobile smoke test。

## P1 — Definition v1 完整度
- [ ] nested collection 視覺 editor（目前最低可用 JSON array）。
- [ ] image/video/audio/location/barcode/signature 專用 UI。
- [ ] canonical JSON Schema + semantic registry + units validation。
- [ ] Mattress / Workout / Inspection templates 與 examples。

## P2 — Production
- [ ] k3s/Kubernetes target。
- [ ] Argo CD bootstrap/sync 驗證。
- [ ] DNS/TLS。
- [ ] GHCR visibility/credentials 驗證。

## P3 — Shared data
- [ ] Backend/API/DB/auth（只有多人共享/跨裝置同步需要時才做）。
