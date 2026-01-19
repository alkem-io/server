# Worktree Management

When asked to work on multiple things simultaneously or create/remove a worktree:

## Create worktree

1. Create worktrees in sibling directories using the pattern `../{repo-name}-{branch}`
2. If the branch doesn't exist, create it with `git worktree add -b`
3. Automatically open a new tmux pane with Claude running in that worktree

## Remove worktree

1. Find and kill any tmux pane whose current directory is the worktree
2. Remove the worktree with `git worktree remove`

## Commands reference

```bash
# New worktree from existing branch + open tmux pane
git worktree add ../repo-{branch} {branch}
tmux split-window -h "cd ../repo-{branch} && claude"

# New worktree with new branch + open tmux pane
git worktree add -b {branch} ../repo-{branch}
tmux split-window -h "cd ../repo-{branch} && claude"

# List worktrees
git worktree list

# Close tmux pane and remove worktree
worktree_path=$(realpath "../repo-{branch}")
tmux list-panes -a -F '#{pane_id} #{pane_current_path}' | grep "$worktree_path" | awk '{print $1}' | xargs -I{} tmux kill-pane -t {}
git worktree remove ../repo-{branch}
```

## Naming convention

Always use `../{current-repo-name}-{branch-name}` for consistency.
