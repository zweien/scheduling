# Repository Guidelines

## Agent-Specific Override

For this repository, the assistant may execute routine Git workflow actions without asking for per-action confirmation when those actions are the recommended next step for the current task.

This override applies to:

- `git add`
- `git commit`
- `git push`
- creating and updating local branches or tags when required by the task

Execution rules:

- Prefer the smallest safe Git action that moves the task forward.
- Do not use destructive history-rewrite commands unless explicitly requested.
- Keep commits focused and use Conventional Commits style messages.
- Continue to explain what was done after the action completes.

Examples:

- After a completed bugfix with passing verification, the assistant may commit directly.
- After an approved release workflow change, the assistant may push directly.

This repository-level instruction overrides any default habit of requesting confirmation for routine commit/push operations.
