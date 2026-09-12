# Project Guidelines & Rules

This project follows strict engineering and coding guidelines. All AI agents and contributors must adhere to the rules outlined below.

---

## 1. Relative File Paths Only

### Objective
Ensure all file and directory paths written in code, documentation, configuration files, scripts, and conversation outputs use **relative paths** only. Absolute paths tied to specific machines or local user directories must never be used.

### Rules & Guidelines
- **Always use relative paths**: Reference files and directories relative to the repository root (e.g., `apps/web/src/App.tsx`, `packages/shared-types/index.ts`, `./docker-compose.yml`) or relative to the current file (e.g., `../utils/logger.ts`).
- **Strictly prohibit absolute paths**: Never write paths starting with `/Users/...`, `/home/...`, `C:\...`, or any absolute filesystem prefix in code, configs, markdown, documentation, or responses.
- **Code imports**: Always use relative imports (`./`, `../`) or configured module aliases (`@/...`), never machine-specific filesystem paths.
- **Portability**: All code, scripts, docker configurations, and documentation must remain fully portable across different machines and development environments.

---

## 2. English Only in Code Comments

### Objective
Ensure all source code comments, documentation annotations, and internal code notes across the entire codebase are written exclusively in **English**.

### Rules & Guidelines
- **Mandatory English**: All code comments in any language (TypeScript, JavaScript, Python, Go, Rust, SQL, YAML, Shell, etc.) must be written in clear and concise English.
- **Strictly prohibit Vietnamese in comments**: Never write comments in Vietnamese (e.g., no `// Xử lý dữ liệu`, `// Kiểm tra trạng thái`).
- **Scope**:
  - Inline comments (`// ...`, `# ...`)
  - Block comments (`/* ... */`)
  - Docstrings and JSDoc/TSDoc (`/** ... */`, `"""..."""`)
  - Task annotations (`TODO`, `FIXME`, `NOTE`, `HACK`)
  - Database schema & migration comments
- **Legacy code**: When editing or refactoring code that contains Vietnamese comments, translate them to English.
