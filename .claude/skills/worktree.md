# Worktree Management

When asked to work on multiple things simultaneously or create a worktree:

1. Create worktrees in sibling directories using the pattern `../{repo-name}-{branch}`
2. If the branch doesn't exist, create it with `git worktree add -b`
3. After creating, remind the user to open a new terminal/tmux pane and run `claude` there

## Commands reference
```bash
# New worktree from existing branch
git worktree add ../alkemio-{branch} {branch}

# New worktree with new branch
git worktree add -b {branch} ../alkemio-{branch}

# List worktrees
git worktree list

# Cleanup
git worktree remove ../alkemio-{branch}
```

## Naming convention

Always use `../{current-repo-name}-{branch-name}` for consistency.