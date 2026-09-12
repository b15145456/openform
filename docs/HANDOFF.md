# OpenForm Handoff

## 2026-09-12 — Runtime recovery
### 做了什麼
- Audit 發現 main 缺 app.js/package.json，已停止把 GitOps skeleton 誤認為可部署產品。
- 恢復 Vite/browser runtime、Definition validator、Record builder 與 tests。
- 恢復 Mattress MVP：CRUD、localStorage、JSON/CSV export。
- 支援貼 YAML/JSON Definition → validate → create App。
- 導入 BotHangar 的文件骨幹：CLAUDE、docs/README、CONVENTIONS、TODO、PROGRESS、HANDOFF。
- 新增 USER_GUIDE，明確區分已完成與尚未完成能力。

### 現況
程式碼已恢復到可以進入 CI 驗證的狀態，但在 CI 真正 green 前不可宣稱 build/test 成功；也尚無已驗證 public deployment。

### 下一步
1. 驗證 GitHub Actions test/build。
2. 修正任何 CI 問題直到 green。
3. 部署 public URL。
4. mobile smoke test Mattress end-to-end。
5. P1 完成 nested collection editor 與其他 v1 controls。

### 卡關
Vercel connector 先前在 deploy invocation 被平台停用，因此臨時 hosting 尚未完成。
