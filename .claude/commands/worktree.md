---
description: Create or remove a git worktree for parallel work
arguments:
  - name: action
    description: Action to perform - "create" (default) or "remove"
    required: false
  - name: branch
    description: Branch name to create or check out (e.g. "feature-auth", "fix-db-connection")
    required: true
  - name: base
    description: Base branch to create from (e.g. "main", "develop"). Defaults to current branch. Only used with create.
    required: false
---

## Create (default action)

If action is "create" or not specified:

1. Create a worktree at `../$REPO_NAME-$ARGUMENTS` for branch `$ARGUMENTS`
2. If the branch doesn't exist, create it from `$ARGUMENTS.base` (or current branch if not specified)
3. Automatically open a new tmux pane with Claude:

```bash
tmux split-window -h "cd ../$REPO_NAME-$ARGUMENTS && claude"
```

## Remove

If action is "remove":

1. **Ask user for confirmation** before proceeding with removal using AskUserQuestion tool:
   - Question: "Remove worktree and close tmux pane for branch '$ARGUMENTS'?"
   - Options: "Yes, remove" / "No, cancel"

2. If confirmed, **FIRST** find and close any tmux pane running in that worktree directory (must happen BEFORE removing worktree):

```bash
tmux list-panes -a -F '#{pane_id} #{pane_current_path}' | grep -F -- "$REPO_NAME-$ARGUMENTS" | awk '{print $1}' | xargs -I{} tmux kill-pane -t {}
```

3. **THEN** remove the worktree:

```bash
git worktree remove "../$REPO_NAME-$ARGUMENTS"
```

4. **Ask user if they want to delete the branch** using AskUserQuestion tool:
   - Question: "Also delete the local branch '$ARGUMENTS'?"
   - Options: "Yes, delete branch" / "No, keep branch"

5. If confirmed, delete the branch:

```bash
git branch -d $ARGUMENTS
```
If the branch has unmerged changes and user still wants to delete, use `-D` instead.
