# OpenForm Progress

## 2026-09-12 — Product hardening started
- Runtime recovery CI run #11 succeeded for commit c3861f5.
- GitHub Actions successfully built/pushed GHCR image and automatically promoted the immutable SHA into the Kubernetes Deployment manifest; promotion commits are now visible on main.
- Added canonical first-party Mattress, Workout, and Inspection Definition templates.
- Workout template is the reference nested-collection interoperability example.
- Added initial Semantic Registry source and documentation.

## 2026-09-12 — Runtime recovery
- 恢復 browser runtime entrypoint 與 package/build/test 基礎。
- 建立 Mattress MVP CRUD、local persistence、JSON/CSV export、Definition import/validation。
- 套用 BotHangar 文件慣例並建立 USER_GUIDE/TODO/PROGRESS/CLAUDE context。
- 下一個驗收門檻：公開 URL mobile smoke test。
