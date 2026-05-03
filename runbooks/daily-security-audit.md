# Runbook — Daily Security Audit

## When to use

- **Automated:** runs daily 06:00 UTC via `.github/workflows/daily-security-audit.yml`. Findings land as comments on a rolling `Daily security audit — YYYY-MM-DD` issue with the `security-audit` label.
- **Manual:** when CI is down, when investigating a specific finding, or when you want to confirm the codebase passes the audit before a high-risk merge. `gh workflow run daily-security-audit.yml` triggers the same checks ad-hoc.

The audit's machine-checkable spec lives in the parent skill `~/CascadeProjects/.claude/skills/sabon-security/SKILL.md` § "Daily audit checklist". This runbook is the human-side procedure.

## What gets checked

### Dependency CVEs
- `npm audit --audit-level=high --json` exits 0 with `vulnerabilities.high === 0` and `vulnerabilities.critical === 0`
- Every direct dep cross-checked against GHSA + CISA KEV by the scheduled threat-intel agent (separate from the GH Actions workflow — runs daily 06:30 UTC, posts to `noam237/contracts` issues)

### Code-rule compliance
`scripts/audit-security.ts` AST-scans every API route and verifies:
1. The handler body calls `getCurrentUser()` before any `prisma.*` call
2. The handler body calls `user.permissions.includes(...)` before any `prisma.*` call
3. Every `prisma.*.create|update|delete|upsert` is followed by `createAuditEntry(...)` or `writeAudit(...)` within the same function
4. No new `$queryRawUnsafe` / `$executeRawUnsafe` introduced
5. No new `dangerouslySetInnerHTML` introduced

## Manual run

```bash
cd C:\Users\noam\CascadeProjects\CRM
npm install   # if you haven't recently
npm audit --audit-level=high --json | jq '.metadata.vulnerabilities'
npx tsx scripts/audit-security.ts
```

The audit script prints `<file>:<line> — <rule failed>` per violation and exits 1 if any. CI captures the output and appends it to the rolling issue.

## Triage

When a finding lands in a `Daily security audit` issue:

| Severity signal | Action |
|---|---|
| **CISA KEV match** on a direct dep | **P0** — fix today. Open a `chore(deps): bump X` PR, merge fast. If no upstream patch yet, evaluate whether to remove the dep or pin a workaround. |
| **GHSA high/critical** with available patch | **P1** — fix this week. Bump dep, run tests, ship. |
| **GHSA high/critical** with no patch | **P1** — assess whether our usage is exposed to the vuln. If yes, remove/replace dep or sandbox the call. If no, comment on issue with the assessment and dismiss. |
| **GHSA moderate/low** | **P2** — batch with monthly dep refresh. |
| **Code-rule violation** (missing safeHandler, skipped permission check, missing audit) | **P1** — fix in next PR touching the file, or dedicated cleanup PR if widespread. Flag `--admin`-merged PRs that introduced the violation. |

## Closing a finding

- **Fixed:** comment `Resolved by #<PR>` on the rolling issue. Don't close the issue itself unless ALL findings for the day are addressed.
- **Wontfix / accepted risk:** comment with the rationale and reference to a tracking issue / ADR. Add an exception to `.audit-security.exceptions.json` (one line per exception, with date + reviewer + reason) so the audit stops re-flagging it.
- **False positive:** comment + tighten the audit script. False positives on this audit are a high signal — fix the script promptly so it stays trustworthy.

## When to halt deploys

The audit issue staying open for >7 days means findings are accumulating. If the rolling issue has 5+ unresolved high-severity findings, **pause non-security PRs to main** until at least the CISA KEV matches and `code-rule` violations are addressed.

Halt-deploy is a manual call (no automation). Document the pause + lift in `VERSION.md` so the gap is visible.

## Cross-links

- Parent skill: `~/CascadeProjects/.claude/skills/sabon-security/SKILL.md`
- Credential rotation: [rotating-service-api-key.md](rotating-service-api-key.md)
- DR procedure: [disaster-recovery.md](disaster-recovery.md)
- Migration runbook: [migrating-prisma-schema.md](migrating-prisma-schema.md)
