# Release Branch Management

When asked to create a release branch, prepare a release, publish a release, or bump a version:

## How to use this skill

Ask Claude to manage releases in natural language. Examples:

**Creating a release branch:**

- "Create release branch release/46"
- "Create release branch release/47 and bump the minor version"
- "Prepare a patch release on branch release/46.1"
- "Create release/48 with a minor bump and keep the worktree"

**Publishing a release:**

- "Publish a release from release/46"
- "Publish a patch release from release/46.3"
- "Publish a draft release from release/47"
- "Do a dry run of publishing release/46"

**Cleanup:**

- "Clean up the release worktree"

Claude will determine from your request which workflow to run, whether to bump the version, and whether to clean up the worktree.

---

## Workflow 1: Create release branch

Use when starting a new release cycle — creates a branch, merges develop, optionally bumps version.

### Steps

1. Fetch latest from origin
2. Create a worktree at `../release` with a new branch off `origin/master`
3. Merge `origin/develop` into the release branch
4. Optionally bump the version (minor or patch)
5. Push the branch to origin
6. Clean up the worktree unless told not to

### Default behavior

- **Version bump**: Skip unless explicitly requested
- **Cleanup**: Always clean up worktree after push unless told to keep it
- **Tags**: Do not create git tags — tags are created in GitHub when publishing a release
- **Hooks**: Use `--no-verify` on version bump commits since `node_modules` is not present in the worktree

### Commands

```bash
# Fetch and create worktree with new release branch
git fetch origin
git worktree add -b {branch-name} ../release origin/master

# Move into worktree
cd ../release

# Merge develop into the release branch (GPG signature required)
git merge origin/develop -m "Merge develop into {branch-name}"

# Bump version (only if requested — minor or patch)
pnpm version {minor|patch} --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
git add -A
git commit --no-verify -m "$NEW_VERSION"

# Push branch to origin
git push -u origin {branch-name}

# Clean up (default — skip only if asked)
cd -
git worktree remove ../release
git worktree prune
```

---

## Workflow 2: Publish release

Use when publishing from an existing release branch — checks out the branch, optionally bumps version, pushes, and creates a GitHub Release.

### Steps

1. Fetch latest from origin
2. Check out the existing release branch in a worktree at `../release`
3. Pull latest changes
4. Optionally bump the version (minor or patch)
5. Push the branch to origin
6. Create a GitHub Release using `gh release create` with auto-generated notes
7. Clean up the worktree unless told not to

### Default behavior

- **Version bump**: Skip unless explicitly requested
- **Cleanup**: Always clean up worktree after push unless told to keep it
- **Draft**: Release is published immediately unless asked to create as draft
- **Tags**: Created by `gh release create` — do not create tags manually
- **Hooks**: Use `--no-verify` on version bump commits

### Commands

```bash
# Fetch and check out existing release branch in worktree
git fetch origin
git worktree add ../release {branch-name}

# Move into worktree and pull latest
cd ../release
git checkout {branch-name}
git pull origin {branch-name}

# Bump version (only if requested — minor or patch)
pnpm version {minor|patch} --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
git add -A
git commit --no-verify -m "$NEW_VERSION"

# Read current version for the tag
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

# Push branch
git push -u origin {branch-name}

# Create GitHub Release (tag is created by gh)
gh release create "$TAG" --generate-notes --target {branch-name} --title "$TAG"

# For draft releases, add --draft:
gh release create "$TAG" --generate-notes --target {branch-name} --title "$TAG" --draft

# View release URL
gh release view "$TAG" --json url -q '.url'

# Clean up (default — skip only if asked)
cd -
git worktree remove ../release
git worktree prune
```

### Pre-requisites

- GitHub CLI (`gh`) must be installed and authenticated

---

## Important notes

- The merge commit and version bump commit both require **GPG signing** (configured globally)
- Use `--no-verify` on version bump commits to bypass husky/lint-staged hooks that can't resolve in the worktree
- Use `--no-git-tag-version` with `pnpm version` so we handle the git commit manually
- Always use `git worktree prune` after removing a worktree to clean up stale references
- Before creating a release, check if the tag already exists with `gh release view "$TAG"` to avoid duplicates

## Naming convention

- Worktree path: `../release`
- Branch name: provided by the user (e.g., `release/46`, `release/46.3`)

## Cleanup commands (if worktree was kept)

```bash
git worktree remove ../release
git worktree prune
```
