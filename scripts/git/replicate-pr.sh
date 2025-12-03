#!/bin/bash
# replicate-pr.sh - Replicate a GitHub PR's changes to a new branch with different authorship
#
# Usage: ./replicate-pr.sh <PR_NUMBER> [OPTIONS]
#
# Options:
#   -b, --branch <name>     Name for the new branch (default: pr-<number>-replicated)
#   -a, --author <email>    Author email (default: git config user.email)
#   -n, --author-name <n>   Author name (default: git config user.name)
#   -m, --message <msg>     Custom commit message (default: PR title)
#   -r, --remote <name>     Remote name (default: origin)
#   -o, --org <name>        GitHub org/owner (default: parsed from remote)
#   -p, --repo <name>       GitHub repo name (default: parsed from remote)
#   -h, --help              Show this help message
#
# Examples:
#   ./replicate-pr.sh 5642
#   ./replicate-pr.sh 5642 -b my-feature-branch
#   ./replicate-pr.sh 5642 -a "john@example.com" -n "John Doe"
#   ./replicate-pr.sh 5642 -m "Custom commit message"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REMOTE="origin"
AUTHOR_EMAIL=""
AUTHOR_NAME=""
BRANCH_NAME=""
COMMIT_MESSAGE=""
ORG=""
REPO=""

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

show_help() {
    head -30 "$0" | tail -27 | sed 's/^# //' | sed 's/^#//'
    exit 0
}

cleanup() {
    local temp_branch="$1"
    if git show-ref --verify --quiet "refs/heads/$temp_branch" 2>/dev/null; then
        git branch -D "$temp_branch" 2>/dev/null || true
    fi
}

# Parse command line arguments
parse_args() {
    if [[ $# -lt 1 ]]; then
        log_error "PR number is required"
        echo "Usage: $0 <PR_NUMBER> [OPTIONS]"
        echo "Use -h or --help for more information"
        exit 1
    fi

    # First argument should be PR number
    if [[ "$1" =~ ^[0-9]+$ ]]; then
        PR_NUMBER="$1"
        shift
    elif [[ "$1" == "-h" || "$1" == "--help" ]]; then
        show_help
    else
        log_error "First argument must be a PR number"
        exit 1
    fi

    # Parse remaining options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--branch)
                BRANCH_NAME="$2"
                shift 2
                ;;
            -a|--author)
                AUTHOR_EMAIL="$2"
                shift 2
                ;;
            -n|--author-name)
                AUTHOR_NAME="$2"
                shift 2
                ;;
            -m|--message)
                COMMIT_MESSAGE="$2"
                shift 2
                ;;
            -r|--remote)
                REMOTE="$2"
                shift 2
                ;;
            -o|--org)
                ORG="$2"
                shift 2
                ;;
            -p|--repo)
                REPO="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

# Detect org/repo from git remote
detect_repo_info() {
    if [[ -z "$ORG" || -z "$REPO" ]]; then
        local remote_url
        remote_url=$(git remote get-url "$REMOTE" 2>/dev/null)

        if [[ -z "$remote_url" ]]; then
            log_error "Could not get remote URL for '$REMOTE'"
            exit 1
        fi

        # Parse GitHub URL (handles both HTTPS and SSH formats)
        if [[ "$remote_url" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
            [[ -z "$ORG" ]] && ORG="${BASH_REMATCH[1]}"
            [[ -z "$REPO" ]] && REPO="${BASH_REMATCH[2]}"
        else
            log_error "Could not parse GitHub org/repo from remote URL: $remote_url"
            exit 1
        fi
    fi

    log_info "Repository: $ORG/$REPO"
}

# Set default author from git config
set_default_author() {
    if [[ -z "$AUTHOR_EMAIL" ]]; then
        AUTHOR_EMAIL=$(git config user.email)
        if [[ -z "$AUTHOR_EMAIL" ]]; then
            log_error "No author email specified and git user.email is not set"
            exit 1
        fi
    fi

    if [[ -z "$AUTHOR_NAME" ]]; then
        AUTHOR_NAME=$(git config user.name)
        if [[ -z "$AUTHOR_NAME" ]]; then
            log_error "No author name specified and git user.name is not set"
            exit 1
        fi
    fi

    log_info "Author: $AUTHOR_NAME <$AUTHOR_EMAIL>"
}

# Fetch PR information using GitHub CLI
fetch_pr_info() {
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is required but not installed"
        log_info "Install it from: https://cli.github.com/"
        exit 1
    fi

    log_info "Fetching PR #$PR_NUMBER information..."

    # Get PR details
    PR_INFO=$(gh pr view "$PR_NUMBER" --repo "$ORG/$REPO" --json title,baseRefName,headRefName,headRefOid 2>/dev/null) || {
        log_error "Failed to fetch PR #$PR_NUMBER from $ORG/$REPO"
        log_info "Make sure the PR exists and you have access to the repository"
        exit 1
    }

    PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
    BASE_BRANCH=$(echo "$PR_INFO" | jq -r '.baseRefName')
    HEAD_REF=$(echo "$PR_INFO" | jq -r '.headRefName')
    HEAD_SHA=$(echo "$PR_INFO" | jq -r '.headRefOid')

    log_success "PR Title: $PR_TITLE"
    log_info "Base branch: $BASE_BRANCH"
    log_info "Head ref: $HEAD_REF"
    log_info "Head SHA: ${HEAD_SHA:0:12}"

    # Set default branch name if not specified
    if [[ -z "$BRANCH_NAME" ]]; then
        # Create a sanitized branch name from author name
        local author_slug
        author_slug=$(echo "$AUTHOR_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
        BRANCH_NAME="pr-${PR_NUMBER}-${author_slug}"
    fi

    # Set default commit message if not specified
    if [[ -z "$COMMIT_MESSAGE" ]]; then
        COMMIT_MESSAGE="$PR_TITLE"
    fi
}

# Main replication logic
replicate_pr() {
    local temp_branch="temp-pr-$PR_NUMBER-$$"

    # Set up cleanup trap
    trap "cleanup '$temp_branch'" EXIT

    # Save current branch to return to it later
    local original_branch
    original_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || original_branch=""

    log_info "Fetching PR #$PR_NUMBER from $REMOTE..."
    git fetch "$REMOTE" "pull/$PR_NUMBER/head:$temp_branch" || {
        log_error "Failed to fetch PR #$PR_NUMBER"
        exit 1
    }
    log_success "Fetched PR to temporary branch: $temp_branch"

    # Fetch the base branch
    log_info "Fetching base branch: $BASE_BRANCH..."
    git fetch "$REMOTE" "$BASE_BRANCH" || {
        log_error "Failed to fetch base branch: $BASE_BRANCH"
        exit 1
    }

    # Check if target branch already exists
    if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
        log_warn "Branch '$BRANCH_NAME' already exists"
        read -p "Delete and recreate? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -D "$BRANCH_NAME"
        else
            log_error "Aborting - branch already exists"
            exit 1
        fi
    fi

    # Create new branch from base
    log_info "Creating new branch '$BRANCH_NAME' from $REMOTE/$BASE_BRANCH..."
    git checkout "$REMOTE/$BASE_BRANCH" --detach
    git checkout -b "$BRANCH_NAME"

    # Squash merge the PR changes
    log_info "Squash merging PR changes..."
    git merge --squash "$temp_branch" || {
        log_error "Merge failed - there may be conflicts"
        log_info "Resolve conflicts manually, then commit with:"
        echo "  git commit --author=\"$AUTHOR_NAME <$AUTHOR_EMAIL>\" -m \"$COMMIT_MESSAGE\""
        exit 1
    }

    # Force-add all files including ignored ones (e.g., .scripts/)
    # This ensures files that were force-added in the original PR are included
    log_info "Staging all changes (including ignored files)..."
    git add -f .

    # Count changes
    local files_changed additions deletions
    files_changed=$(git diff --cached --stat | tail -1 | grep -oE '[0-9]+ file' | grep -oE '[0-9]+' || echo "0")
    additions=$(git diff --cached --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
    deletions=$(git diff --cached --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

    log_info "Changes: $files_changed files, +$additions/-$deletions"

    # Commit with specified author
    log_info "Creating commit with author: $AUTHOR_NAME <$AUTHOR_EMAIL>..."
    git commit --author="$AUTHOR_NAME <$AUTHOR_EMAIL>" -m "$COMMIT_MESSAGE" || {
        log_error "Commit failed"
        exit 1
    }

    # Get the new commit SHA
    local new_sha
    new_sha=$(git rev-parse HEAD)

    log_success "Created commit: ${new_sha:0:12}"

    # Summary
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  PR #$PR_NUMBER successfully replicated!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Branch:  $BRANCH_NAME"
    echo "  Commit:  ${new_sha:0:12}"
    echo "  Author:  $AUTHOR_NAME <$AUTHOR_EMAIL>"
    echo "  Files:   $files_changed changed (+$additions/-$deletions)"
    echo ""
    echo "Next steps:"
    echo "  • Push the branch:  git push -u $REMOTE $BRANCH_NAME"
    echo "  • Create a PR:      gh pr create --base $BASE_BRANCH"
    echo ""

    # Disable the trap since we succeeded
    trap - EXIT

    # Clean up temp branch
    git branch -D "$temp_branch" 2>/dev/null || true
}

# Main execution
main() {
    parse_args "$@"
    detect_repo_info
    set_default_author
    fetch_pr_info
    replicate_pr
}

main "$@"
