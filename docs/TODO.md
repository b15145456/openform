# OpenForm TODO

## P0 — 可使用
- [x] 恢復可執行 Runtime 原始碼。
- [x] Mattress CRUD + JSON/CSV export。
- [x] Definition YAML/JSON import + validation。
- [x] 建立基本 runtime tests。
- [x] 取得 CI green 的實際證據（GitHub Actions run #11, commit c3861f5）。
- [x] 前後端分離（`frontend/` + `backend/`）+ 接 Postgres 資料庫，取代 localStorage（本地以 Docker Postgres 驗證過 CRUD/CI 流程）。
- [ ] 實際申請 Neon + Render 帳號、部署到公開 URL 並做 mobile smoke test（見 `docs/deployment.md` Path A；這個 session 只做到設定檔就緒，帳號申請需要使用者自己執行）。
- [ ] 確認 GitHub Actions 上這次新增的 Postgres service container 測試真的能跑綠（本地驗證過，但還沒有實際 push 觸發過 CI）。

## P1 — Definition v1 完整度
- [x] nested collection 視覺 editor（recursive add/remove/edit；等待 CI 驗證）。
- [ ] image/video/audio/location/barcode/signature 專用 UI。
- [ ] canonical JSON Schema + semantic registry + units validation（registry 已建立）。
- [x] Mattress / Workout / Inspection templates。
- [ ] templates 對應 examples。

## P2 — Production
- [ ] k3s/Kubernetes target。
- [ ] Argo CD bootstrap/sync 驗證。
- [ ] DNS/TLS。
- [ ] GHCR visibility/credentials 驗證。

## P3 — Shared data
- [x] Backend/API/DB（Express + Postgres，見 `backend/`）。
- [ ] Auth（目前是單一共享工作區，沒有帳號/資料隔離）。
