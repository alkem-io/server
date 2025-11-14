# Quickstart: SonarQube Static Analysis for PRs

## Purpose

Enable SonarQube static analysis for every pull request on this repository and make the quality gate status visible to developers and release managers without hard-blocking merges.

## Implementation Overview

This repository uses the official SonarQube GitHub Actions template via the workflow at `.github/workflows/trigger-sonarqube.yml`. The workflow:

- Triggers automatically on pull requests
- Uses the `sonarsource/sonarqube-scan-action@v3` action
- Connects to the SonarQube instance at https://sonarqube.alkem.io
- Reports quality gate status back to the pull request

## Configuration

### Workflow File

The workflow is defined in `.github/workflows/trigger-sonarqube.yml` and is based on the official SonarQube template. It triggers on:
- `pull_request` events
- `workflow_dispatch` (manual trigger)

### Project Configuration

Project-specific settings are defined in `sonar-project.properties` at the repository root, including:
- Project key: `alkem-io_server`
- Source directories: `src/`
- Test directories: `test/`
- Coverage report path: `coverage-ci/lcov.info`

### Required Secrets

The following secrets must be configured in the GitHub repository settings:

- `SONAR_TOKEN`: Authentication token for SonarQube (generated in SonarQube user settings)
- `SONAR_HOST_URL`: The SonarQube server URL (https://sonarqube.alkem.io)

## Developer Workflow

1. Open a pull request against the default branch.
2. Wait for the CI pipeline to complete.
3. Check the PR checks/status section for the SonarQube analysis result (labeled "Build and analyze").
4. If the quality gate fails, click on the check details to open the SonarQube dashboard and review issues.
5. Address identified issues or document why they should be accepted.

## Operational Notes

- SonarQube runs are advisory only and do **not** block merges, but failed gates should be addressed or consciously accepted during release.
- Tokens and project keys are stored in the CI secrets manager and are not committed to this repository.
- If SonarQube is unreachable or misconfigured, the CI job fails with a clear error message and a suggested remediation.
- The workflow uses `fetch-depth: 0` to ensure accurate blame information and change detection.

## Maintenance

### Token Rotation

When rotating SonarQube tokens:

1. Generate a new token in SonarQube (User → My Account → Security → Generate Tokens)
2. Update the `SONAR_TOKEN` secret in GitHub repository settings (Settings → Secrets and variables → Actions)
3. Trigger a test PR to confirm analysis still succeeds
4. Revoke the old token in SonarQube

### Quality Gate Configuration

Quality gate thresholds are managed in SonarQube at https://sonarqube.alkem.io:
- Navigate to the project: alkem-io_server
- Go to Project Settings → Quality Gates
- Adjust thresholds as needed (coverage, bugs, vulnerabilities, code smells)
- Changes apply immediately to all new analyses

### Troubleshooting

**Analysis not running on PR:**
- Verify the workflow file is present at `.github/workflows/trigger-sonarqube.yml`
- Check that the workflow has `pull_request` trigger enabled
- Ensure the repository has the required secrets configured

**Authentication errors:**
- Verify `SONAR_TOKEN` is valid and not expired
- Confirm `SONAR_HOST_URL` is set to https://sonarqube.alkem.io
- Check SonarQube user has permissions for the project

**Quality gate always failing:**
- Review quality gate thresholds in SonarQube project settings
- Check if coverage data is being generated and uploaded correctly
- Verify the coverage report path in `sonar-project.properties` matches the actual output location
