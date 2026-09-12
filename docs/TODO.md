# OpenForm TODO

## P0 — 可使用
- [x] 恢復可執行 Runtime 原始碼。
- [x] Mattress CRUD + JSON/CSV export。
- [x] Definition YAML/JSON import + validation。
- [x] 建立基本 runtime tests。
- [x] 取得 CI green 的實際證據（GitHub Actions run #11, commit c3861f5）。
- [x] 前後端分離（`frontend/` + `backend/`）+ 接 Postgres 資料庫，取代 localStorage（本地以 Docker Postgres 驗證過 CRUD/CI 流程）。
- [x] 實際建立 Neon Postgres 專案並連上（`neon link` 到 project `aged-moon-84749721` / branch `production`；`neon deploy` 套用 `neon.ts` policy；本機以真實 `DATABASE_URL` 跑過 migration + API smoke test，見 HANDOFF）。
- [ ] Render 帳號申請、實際部署到公開 URL 並做 mobile smoke test（見 `docs/deployment.md` Path A；Render 那一步還沒做，需要使用者自己的 Render 帳號）。
- [ ] 確認 GitHub Actions 上這次新增的 Postgres service container 測試真的能跑綠（本地驗證過，但還沒有實際 push 觸發過 CI）。

## P1 — Definition v1 完整度
- [x] nested collection 視覺 editor（CI #14 已通過）。
- [ ] image/video/audio/location/barcode/signature 專用 UI。
- [x] canonical Definition/Record JSON Schema。
- [x] semantic registry + canonical unit runtime validation（等待此 commit CI 驗證）。
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
