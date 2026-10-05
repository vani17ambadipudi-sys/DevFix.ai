# DevFix AI — Patch Generation & Verification System

## 1. Structured Patch Generation

Rather than rewriting full repositories or dumping large hallucinations, DevFix AI enforces surgical patching:

1. **Patch Plan Verification**:
   The `PatchPlannerAgent` outputs target files, operations, and rationale.
2. **Unified Diff Generation**:
   The `generate_diff` MCP tool compares original and workspace files to produce standard unified diff headers:
   ```diff
   --- a/src/routes/auth.js
   +++ b/src/routes/auth.js
   @@ -4,6 +4,11 @@
      try {
        const { email, password } = req.body || {};
   +
   +    // Validate email presence and non-empty constraint
   +    if (!email || typeof email !== 'string' || !email.trim()) {
   +      return res.status(400).json({ success: false, error: 'Email is required.' });
   +    }
   +
        const user = await findUserByEmail(email);
   ```

---

## 2. Checkpoints & Rollback

Before any patch is written to the workspace:
* `WorkspaceManager.createCheckpoint()` clones the current workspace state to `checkpoints/<cpId>/`.
* If a patch fails compilation or test verification, the system automatically triggers `rollback()`.
* If the developer rejects the proposed diff, the workspace is instantly restored to its pre-patch state.
