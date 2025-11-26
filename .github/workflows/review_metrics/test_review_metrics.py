import sys
from pathlib import Path

import unittest

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import review_metrics


def compute(**overrides):
    params = {
        "title": "chore: update docs",
        "description": "minor docs tweak",
        "loc_changed": 2,
        "files_changed": 1,
        "file_paths": ["docs/readme.md"],
    }
    params.update(overrides)
    return review_metrics.compute_metrics(**params)


class ComputeMetricsTestCase(unittest.TestCase):

  def test_simple_change_goes_llm_only(self):
    result = compute()
    self.assertEqual(result["review_type"], "LLM_ONLY")
    self.assertIn("simple_change", result["review_rationale"])
    self.assertFalse(result["high_risk_keyword"])
    self.assertFalse(result["critical_path_change"])

  def test_high_risk_keyword_in_description(self):
    result = compute(description="This touches security edge cases")
    self.assertTrue(result["high_risk_keyword"])
    self.assertEqual(result["review_type"], "HUMAN_AUGMENTED_LLM")
    self.assertTrue(result["high_risk_trigger"])

  def test_critical_path_file_forces_human_augmented(self):
    result = compute(file_paths=["src/main.ts"])
    self.assertTrue(result["critical_path_change"])
    self.assertEqual(result["review_type"], "HUMAN_AUGMENTED_LLM")

  def test_loc_threshold_exceeded_triggers_high_risk(self):
    big_loc = review_metrics.CONFIG["CRITICAL_LOC_THRESHOLD"] + 1
    result = compute(loc_changed=big_loc)
    self.assertEqual(result["review_type"], "HUMAN_AUGMENTED_LLM")
    self.assertIn("LOC>{}".format(review_metrics.CONFIG["CRITICAL_LOC_THRESHOLD"]), result["review_rationale"])

  def test_low_risk_keyword_present_in_rationale(self):
    result = compute(description="Minor typo fix across docs")
    self.assertTrue(result["low_risk_keyword"])
    self.assertIn("low_risk_keyword", result["review_rationale"])

  def test_file_threshold_exceeded_triggers_high_risk(self):
    threshold = review_metrics.CONFIG["FILE_COUNT_THRESHOLD"] + 1
    file_paths = [f"src/file_{i}.ts" for i in range(threshold)]
    result = compute(files_changed=threshold, file_paths=file_paths)
    self.assertEqual(result["review_type"], "HUMAN_AUGMENTED_LLM")
    self.assertIn("files>{}".format(review_metrics.CONFIG["FILE_COUNT_THRESHOLD"]), result["review_rationale"])

  def test_low_risk_keyword_detected_in_title(self):
    result = compute(title="docs: refresh pagination section")
    self.assertTrue(result["low_risk_keyword"])
    self.assertEqual(result["review_type"], "LLM_ONLY")

  def test_high_risk_trigger_flag_true_when_keyword_present(self):
    result = compute(description="auth flow update")
    self.assertTrue(result["high_risk_keyword"])
    self.assertTrue(result["high_risk_trigger"])

  def test_description_optional_defaults_to_title_detection(self):
    result = compute(description="")
    self.assertEqual(result["review_type"], "LLM_ONLY")
    self.assertFalse(result["high_risk_keyword"])


if __name__ == "__main__":
    unittest.main()
