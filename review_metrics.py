# -*- coding: utf-8 -*-
import sys
import json
import fnmatch
import os
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
    # Critical Paths (glob patterns and substring patterns; if matched, it's high risk)
    "CRITICAL_PATHS": [
        # Infrastructure & deployment
        "Dockerfile",
        ".github/workflows/*",
        "quickstart-*.yml",
        "manifests/*",

        # Authorization & security (per constitution & credential-based-authorization.md)
        "src/services/infrastructure/authorization/*",
        "src/domain/access/credential/*",
        "src/platform/authorization/*",
        "**/*.authorization.ts",

        # Database schema & migrations (schema contract gate is mandatory)
        "src/migrations/*",
        "scripts/schema/*",
        "schema.graphql",
        "schema-baseline.graphql",

        # Core bootstrap & configuration
        "src/main.ts",
        "src/core/*",
        "alkemio.yml",
        "package.json",

        # Specification governance (constitution mandates SDD)
        ".specify/memory/constitution.md",
        "agents.md",

        # External integrations with operational impact
        "src/services/adapters/*",
        "src/services/infrastructure/ssi/*",
        "src/services/infrastructure/communication-adapter/*",
    ],
    # Low Risk Keywords (Prefixes/words that suggest a simple change)
    "LOW_RISK_KEYWORDS": [
        "typo", "docs", "refactor(style)", "whitespace", "comment", "lint"
    ]
}

def compute_metrics(title: str, description: str, loc_changed: int, files_changed: int, file_paths: List[str]) -> Dict[str, object]:
    """Compute metrics and risk-related flags for a PR and derive a review type.

    Review type decision now expressed via multiple simple if statements (more granular),
    avoiding a single large compound expression.
    """
    combined_text_parts: List[str] = []
    if title:
        combined_text_parts.append(title)
    if description:
        combined_text_parts.append(description)
    combined_text = " ".join(combined_text_parts).lower()

    high_risk_keyword = any(k in combined_text for k in CONFIG["HIGH_RISK_KEYWORDS"])

    # Use fnmatch for glob pattern matching on critical paths
    critical_path_change = any(
        any(fnmatch.fnmatch(f, pattern) or pattern in f for pattern in CONFIG["CRITICAL_PATHS"])
        for f in file_paths
    )

    low_risk_keyword = any(k in combined_text for k in CONFIG["LOW_RISK_KEYWORDS"])

    has_small_footprint = (
        loc_changed <= CONFIG["SIMPLE_LOC_THRESHOLD"] and
        files_changed <= CONFIG["FILE_COUNT_THRESHOLD"]
    )

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
        rationale_parts.append("LOC<={}".format(CONFIG['SIMPLE_LOC_THRESHOLD']))
    if files_changed <= CONFIG["FILE_COUNT_THRESHOLD"]:
        rationale_parts.append("files<={}".format(CONFIG['FILE_COUNT_THRESHOLD']))
    if low_risk_keyword:
        rationale_parts.append("low_risk_keyword")

    # Decide if it qualifies for LLM_ONLY (simple path) using stepwise checks
    qualifies_simple = (
        has_small_footprint and
        not high_risk_keyword and
        not critical_path_change
    )

    if qualifies_simple:
        review_type = "LLM_ONLY"
        # Provide distilled rationale for simple case
        rationale_parts = [
            "simple_change",
            "LOC={}".format(loc_changed),
            "files={}".format(files_changed),
            "no_high_risk_flags"
        ]
        if low_risk_keyword:
            rationale_parts.append("low_risk_keyword")

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

    pr_description = os.environ.get("PR_DESCRIPTION", "")

    metrics = compute_metrics(pr_title, pr_description, pr_loc, pr_files, changed_paths)

    # Emit as compact JSON (single line) so shell parsing is simpler
    print(json.dumps(metrics, separators=(",", ":")))
