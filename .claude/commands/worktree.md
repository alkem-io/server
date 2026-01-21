---
description: Create a git worktree for parallel work
arguments:
  - name: branch
    description: Branch name to create or check out (e.g. "feature-auth", "fix-db-connection")
    required: true
  - name: base
    description: Base branch to create from (e.g. "main", "develop"). Defaults to current branch.
    required: false
---

Create a worktree at `../$REPO_NAME-$ARGUMENTS.branch` for branch `$ARGUMENTS.branch`.

If the branch doesn't exist, create it from `$ARGUMENTS.base` (or current branch if not specified).

After creation, tell me to run `cd ../$REPO_NAME-$ARGUMENTS.branch && claude` in a new tmux pane.