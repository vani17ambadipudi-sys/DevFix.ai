# DevFix MCP Server

The **DevFix Model Context Protocol (MCP) Server** exposes standardized developer tools for the DevFix Multi-Agent System (Manager, Analyzer, Fixer, Tester, Reviewer).

---

## Architecture

```text
Five AI Agents (Manager, Analyzer, Fixer, Tester, Reviewer)
                           ↓
                       MCP Client
                           ↓
                   DevFix MCP Server
                           ↓
         ┌─────────────────┼─────────────────┐
         ↓                 ↓                 ↓
      run_code      read_project_file   inspect_project
                                             ↓
                                   search_documentation
```

---

## Registered MCP Tools

### 1. `run_code`
- **Description:** Safely execute supported source code (Python, JavaScript, TypeScript) in an isolated sandbox subprocess.
- **Input:**
  ```json
  {
    "language": "Python",
    "code": "print(10 + 20)"
  }
  ```
- **Output:**
  ```json
  {
    "attempted": true,
    "success": true,
    "stdout": "30\n",
    "stderr": "",
    "exitCode": 0,
    "executionTime": 84
  }
  ```

### 2. `read_project_file`
- **Description:** Read a permitted project source file. Protected against path traversal (`..`), sensitive files (`.env`, `.git`, `node_modules`, private keys), and enforced within the project root.
- **Input:**
  ```json
  {
    "path": "src/types/index.ts"
  }
  ```
- **Output:**
  ```json
  {
    "path": "src/types/index.ts",
    "content": "export type SupportedLanguage = ...",
    "sizeBytes": 3535,
    "linesCount": 170
  }
  ```

### 3. `inspect_project`
- **Description:** Safely scan and summarize the project directory tree without exposing credentials, dependencies, or hidden directories.
- **Input:**
  ```json
  {
    "subDirectory": "src"
  }
  ```
- **Output:**
  ```json
  {
    "projectName": "react-example",
    "files": ["src/App.tsx", "src/components/CodeEditor.tsx", ...],
    "directories": ["src", "src/agents", "src/services", "src/components", ...],
    "totalFiles": 24
  }
  ```

### 4. `search_documentation`
- **Description:** Query indexed programming and debugging documentation across Python, JavaScript, TypeScript, Java, C, C++, SQL, HTML, and CSS.
- **Input:**
  ```json
  {
    "query": "Python IndexError list",
    "technology": "Python"
  }
  ```
- **Output:**
  ```json
  {
    "query": "Python IndexError list",
    "results": [
      {
        "title": "Python Sequence Types — Indexing & Slicing",
        "description": "In Python, sequences are 0-indexed...",
        "source": "Python 3.12 Official Documentation"
      }
    ]
  }
  ```

---

## Security Model

1. **Path Protection:** Forbids `..` sequences, absolute root escapes, and symlink exploits.
2. **Secret Scrubbing:** Access to `.env*`, `*.pem`, `*.key`, `id_rsa`, passwords, tokens, and credentials is blocked.
3. **Execution Sandboxing:** Code execution runs with a 5-second hard timeout and 512KB output buffer.
4. **No Arbitrary Shell:** No arbitrary `exec(command)` tool is provided.
