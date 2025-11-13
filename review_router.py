# -*- coding: utf-8 -*-
import sys
import json
from typing import List, Dict

# --- Configuration (thresholds retained for context) ---
CONFIG = {
    "CRITICAL_LOC_THRESHOLD": 200,
    "SIMPLE_LOC_THRESHOLD": 100,
    "FILE_COUNT_THRESHOLD": 10,
    # High Risk Keywords (Case-insensitive match in title/description)
    "HIGH_RISK_KEYWORDS": [
        "security", "auth", "migration", "architecture",
        "core logic rewrite", "critical bug fix", "deployment"
    ],
    # Critical Paths (If any file path contains one of these, it's high risk)
    "CRITICAL_PATHS": [
        "Dockerfile",
        ".github/workflows/",
        "src/authorization.ts",
    ],
    # Low Risk Keywords (Prefixes/words that suggest a simple change)
    "LOW_RISK_KEYWORDS": [
        "typo", "docs", "refactor(style)", "whitespace", "comment", "lint"
    ]
}

def compute_metrics(title: str, loc_changed: int, files_changed: int, file_paths: List[str]) -> Dict[str, object]:
    """Compute metrics and risk-related flags for a PR and derive a review type.

    Review type decision now expressed via multiple simple if statements (more granular),
    avoiding a single large compound expression.
    """
    title_lower = title.lower()

    high_risk_keyword = any(k in title_lower for k in CONFIG["HIGH_RISK_KEYWORDS"])
    critical_path_change = any(any(path in f for path in CONFIG["CRITICAL_PATHS"]) for f in file_paths)
    low_risk_keyword = any(k in title_lower for k in CONFIG["LOW_RISK_KEYWORDS"])

    high_risk_trigger = (
        high_risk_keyword or
        critical_path_change or
        loc_changed > CONFIG["CRITICAL_LOC_THRESHOLD"] or
        files_changed > CONFIG["FILE_COUNT_THRESHOLD"]
    )

    # Default assumptions
    review_type = "HUMAN_AUGMENTED_LLM"
    rationale_parts: List[str] = []

    # Collect rationale flags
    if high_risk_keyword:
        rationale_parts.append("high_risk_keyword")
    if critical_path_change:
        rationale_parts.append("critical_path_change")
    if loc_changed > CONFIG["CRITICAL_LOC_THRESHOLD"]:
        rationale_parts.append("LOC>{}".format(CONFIG['CRITICAL_LOC_THRESHOLD']))
    if files_changed > CONFIG["FILE_COUNT_THRESHOLD"]:
        rationale_parts.append("files>{}".format(CONFIG['FILE_COUNT_THRESHOLD']))

    # Track size simplicity
    if loc_changed <= CONFIG["SIMPLE_LOC_THRESHOLD"]:
        rationale_parts.append("LOC<=simple_threshold")
    if files_changed <= CONFIG["FILE_COUNT_THRESHOLD"]:
        rationale_parts.append("files<=threshold")
    if low_risk_keyword:
        rationale_parts.append("low_risk_keyword")

    # Decide if it qualifies for LLM_ONLY (simple path) using stepwise checks
    qualifies_simple = True
    if not low_risk_keyword:
        qualifies_simple = False
    if loc_changed > CONFIG["SIMPLE_LOC_THRESHOLD"]:
        qualifies_simple = False
    if files_changed > CONFIG["FILE_COUNT_THRESHOLD"]:
        qualifies_simple = False
    if high_risk_keyword:
        qualifies_simple = False
    if critical_path_change:
        qualifies_simple = False
    if loc_changed > CONFIG["CRITICAL_LOC_THRESHOLD"]:
        qualifies_simple = False

    if qualifies_simple:
        review_type = "LLM_ONLY"
        # Provide distilled rationale for simple case
        rationale_parts = [
            "simple_change",
            "LOC={}".format(loc_changed),
            "files={}".format(files_changed),
            "no_high_risk_flags"
        ]

    if not rationale_parts:
        rationale_parts.append("default_case")

    rationale = "; ".join(rationale_parts)

    return {
        "title": title,
        "loc_changed": loc_changed,
        "files_changed": files_changed,
        "file_paths": file_paths,
        "high_risk_keyword": high_risk_keyword,
        "critical_path_change": critical_path_change,
        "low_risk_keyword": low_risk_keyword,
        "high_risk_trigger": high_risk_trigger,
        "review_type": review_type,
        "review_rationale": rationale,
        "thresholds": {
            "critical_loc": CONFIG["CRITICAL_LOC_THRESHOLD"],
            "simple_loc": CONFIG["SIMPLE_LOC_THRESHOLD"],
            "file_count": CONFIG["FILE_COUNT_THRESHOLD"]
        }
    }


if __name__ == "__main__":
    if len(sys.argv) < 5:
        # Output JSON error shape for consistency
        print(json.dumps({
            "error": "Missing required arguments (title, loc, files, paths_string)",
            "expected_args": ["title", "loc (int)", "files (int)", "paths_string (newline-separated)"],
        }))
        sys.exit(1)

    pr_title = sys.argv[1]
    try:
        pr_loc = int(sys.argv[2])
        pr_files = int(sys.argv[3])
    except ValueError:
        print(json.dumps({
            "error": "LOC and Files must be integers"
        }))
        sys.exit(1)

    file_paths_string = sys.argv[4]
    changed_paths = [p.strip() for p in file_paths_string.split('\n') if p.strip()]

    metrics = compute_metrics(pr_title, pr_loc, pr_files, changed_paths)

    # Emit as compact JSON (single line) so shell parsing is simpler
    print(json.dumps(metrics, separators=(",", ":")))
