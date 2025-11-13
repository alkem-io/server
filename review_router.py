import sys
from typing import List, Tuple

# --- Configuration ---
CONFIG = {
    "CRITICAL_LOC_THRESHOLD": 100,
    "SIMPLE_LOC_THRESHOLD": 20,
    "FILE_COUNT_THRESHOLD": 10,
    "HIGH_RISK_KEYWORDS": [
        "security", "auth", "payment", "database migration", "architecture",
        "core logic rewrite", "critical bug fix", "deployment script"
    ],
    "CRITICAL_PATHS": [
        "src/auth/",
        "config/production.yml",
        "ci/cd/",
        "Dockerfile",
        ".github/workflows/"
    ],
    "LOW_RISK_KEYWORDS": [
        "typo", "docs", "refactor(style)", "whitespace", "comment", "lint"
    ]
}

# --- Reviewer Mapping ---
REVIEWER_MAP = {
    "SECURITY": "security-lead",    # For high-risk, security, or config changes
    "SENIOR_DEV": "senior-dev",      # For large or complex core changes
    "TEAM_REVIEWER": "team-reviewer", # Standard human reviewer for augmented reviews
    "NONE": "none"                   # For LLM_ONLY or default assignments
}

def determine_reviewer(title: str, loc_changed: int, files_changed: int, file_paths: List[str]) -> Tuple[str, str]:
    """
    Determines the required review type and the suggested human reviewer.

    Args:
        title: The PR title (string).
        loc_changed: Total lines added/removed (integer).
        files_changed: Total number of files modified (integer).
        file_paths: List of file paths changed (for critical path checks).

    Returns:
        A tuple: (review_type, reviewer_username)
    """
    title_lower = title.lower()

    # --- Check Flags ---
    is_high_risk_keyword = any(keyword in title_lower for keyword in CONFIG["HIGH_RISK_KEYWORDS"])
    is_critical_path_change = any(any(path in f for path in CONFIG["CRITICAL_PATHS"]) for f in file_paths)
    is_low_risk_keyword = any(keyword in title_lower for keyword in CONFIG["LOW_RISK_KEYWORDS"])

    # --- Rule 1: Always Human for High Risk/Context Changes (The Guardrail) ---
    review_type = "HUMAN_AUGMENTED_LLM" # Default
    reviewer_username = REVIEWER_MAP["TEAM_REVIEWER"]

    if is_high_risk_keyword or is_critical_path_change or loc_changed > CONFIG["CRITICAL_LOC_THRESHOLD"] or files_changed > CONFIG["FILE_COUNT_THRESHOLD"]:
        review_type = "HUMAN_ONLY"

        # Determine specific human reviewer for HUMAN_ONLY
        if is_critical_path_change and any("auth" in f or "config/production" in f for f in file_paths):
            reviewer_username = REVIEWER_MAP["SECURITY"]
        elif loc_changed > CONFIG["CRITICAL_LOC_THRESHOLD"]:
            reviewer_username = REVIEWER_MAP["SENIOR_DEV"]
        else:
            reviewer_username = REVIEWER_MAP["TEAM_REVIEWER"]

    # --- Rule 2: LLM ONLY for Simple, Low-Risk Tasks (The Automation Win) ---
    elif (loc_changed <= CONFIG["SIMPLE_LOC_THRESHOLD"] and
          files_changed <= 3 and
          is_low_risk_keyword):

        review_type = "LLM_ONLY"
        reviewer_username = REVIEWER_MAP["NONE"] # No human review needed

    # Rule 3: If not HUMAN_ONLY and not LLM_ONLY, use the default HUMAN_AUGMENTED_LLM

    return review_type, reviewer_username


if __name__ == "__main__":
    # Now expecting 4 arguments: script_name, title, loc, files, file_paths_string
    if len(sys.argv) < 5:
        print("ERROR: Missing required arguments (title, loc, files, paths_string).|none")
        sys.exit(1)

    pr_title = sys.argv[1]
    try:
        pr_loc = int(sys.argv[2])
        pr_files = int(sys.argv[3])
    except ValueError:
        print("ERROR: LOC and Files must be integers.|none")
        sys.exit(1)

    # New: Process the file path string passed from the GitHub Action
    file_paths_string = sys.argv[4]

    # Split the string into a list of file paths. The shell passes paths separated by '\n'
    # .strip() handles any leading/trailing whitespace.
    changed_paths = [p.strip() for p in file_paths_string.split('\n') if p.strip()]

    # Ensure changed_paths is populated for the downstream function (shouldn't be empty if files > 0)
    if not changed_paths and pr_files > 0:
        print("ERROR: Changed file paths list is empty despite files > 0.|none")
        sys.exit(1)

    review_level, reviewer = determine_reviewer(pr_title, pr_loc, pr_files, changed_paths)

    # Print the result using a pipe '|' delimiter for the YAML to parse
    print(f"{review_level}|{reviewer}")
