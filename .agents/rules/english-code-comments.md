---
trigger: always_on
description: Strictly enforces that all code comments and docstrings must be written in English.
---

# Rule: English Only in Code Comments

## Objective
Ensure all source code comments, documentation annotations, and internal code notes across the codebase are written exclusively in **English**. Non-English languages (including Vietnamese) are strictly forbidden in code comments.

## Policy & Requirements

1. **Mandatory English in Code Comments**:
   - All comments in code files across all languages (TypeScript, JavaScript, Python, Go, Rust, HTML, CSS, SQL, YAML, Shell scripts, etc.) **must be written in English**.
   - Use clear, concise, and professional English according to standard software engineering best practices.

2. **Strict Prohibition of Vietnamese & Other Languages in Comments**:
   - Do **NOT** write comments in Vietnamese (e.g., no `// Hàm xử lý đăng nhập`, `// Kiểm tra điều kiện`, etc.).
   - If refactoring or editing existing code that contains Vietnamese or non-English comments, translate them into proper English comments.

3. **Scope of the Rule**:
   - **Inline comments**: `// ...`, `# ...`, `-- ...`
   - **Block comments**: `/* ... */`
   - **Documentation comments & docstrings**: JSDoc/TSDoc (`/** ... */`), Python docstrings (`"""..."""`), Rust doc comments (`/// ...`), Go doc comments (`// ...`).
   - **Action tags**: `// TODO: ...`, `// FIXME: ...`, `// NOTE: ...`, `// HACK: ...`.
   - **Type & Schema annotations**: Descriptions in GraphQL schemas, Protobuf, Zod/TypeBox schemas, database migration comments.

4. **Code vs Conversation Distinction**:
   - This rule specifically applies to **code comments and codebase files**.
   - Agent communication/conversation with the user may continue in Vietnamese if requested by the user, but the code comments produced inside code files must remain strictly in English.

## Examples

- ❌ **Forbidden**:
  ```typescript
  // Khởi tạo kết nối đến Redis cache
  const redisClient = createClient();

  // TODO: Cần kiểm tra lại quyền người dùng trước khi xoá bài viết
  function deletePost(id: string) { ... }
  ```

- ✅ **Required**:
  ```typescript
  // Initialize connection to Redis cache
  const redisClient = createClient();

  // TODO: Verify user permissions before deleting post
  function deletePost(id: string) { ... }
  ```
