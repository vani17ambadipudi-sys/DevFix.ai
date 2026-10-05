# DevFix AI — Model Context Protocol (MCP) Tools Registry

The DevFix AI MCP Server exposes 10 standardized developer tools across Stage 4 and Stage 8:

| Tool | Stage | Input Schema | Purpose |
|:---|:---:|:---|:---|
| `run_code` | 4 | `{ language, code }` | Executes short snippets in isolated sandbox with watchdog timer. |
| `read_project_file` | 4 | `{ path, workspacePath? }` | Reads file content with path traversal prevention. |
| `inspect_project` | 4 | `{ subDirectory?, workspacePath? }` | Discovers files and folder structure. |
| `search_documentation` | 4 | `{ query, technology? }` | Queries programming references and API documentation. |
| `search_project` | 8 | `{ query, workspacePath?, filePattern? }` | Searches workspace code for symbols and keywords. |
| `run_tests` | 8 | `{ workspacePath, testCommand?, timeoutMs? }` | Runs allowlisted test suites inside the workspace. |
| `apply_patch` | 8 | `{ workspacePath, file, patch, operation? }` | Writes surgical modifications within workspace boundary. |
| `generate_diff` | 8 | `{ workspacePath, originalPath, files? }` | Produces standard unified diff representation. |
| `git_status` | 8 | `{ workspacePath }` | Safe read-only inspection of git status. |
| `git_diff` | 8 | `{ workspacePath }` | Safe read-only inspection of uncommitted git diffs. |
