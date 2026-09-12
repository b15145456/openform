# OpenForm — AI 工作上下文

OpenForm 是 LLM-independent data collection App Runtime。GitHub `b15145456/openform` 的 `main` 是唯一 Source of Truth。

## 每個 session
1. 先讀 `docs/HANDOFF.md` 最新紀錄與 `docs/TODO.md`。
2. 再讀 `docs/README.md` 找需要的規格文件。
3. 不把聊天內容當成比 GitHub 更新的權威狀態。
4. 有實質修改：更新 HANDOFF/TODO；階段里程碑更新 PROGRESS。
5. 不得宣稱 build/test/deploy 成功，除非有實際驗證證據。

## 不變產品原則
- LLM → Definition Spec → OpenForm Runtime → Record Spec。
- Runtime 不自動呼叫任何 LLM API。
- stable machine field id；label 可變。
- select 儲存 stable value，不儲存 label。
- v1 不允許任意 JS/shell/SQL/executable expressions。
- Record 保存 definition id/version。
- nested collection 是核心能力。
