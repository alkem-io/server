# Quickstart: SonarQube Static Analysis for PRs

## Purpose

Enable SonarQube static analysis for every pull request on this repository and make the quality gate status visible to developers and release managers without hard-blocking merges.

## Developer Workflow

1. Open a pull request against the default branch.
2. Wait for the CI pipeline to complete.
3. Check the PR checks/status section for the SonarQube analysis result.
4. If the quality gate fails, use the link in the check to open the SonarQube dashboard and review issues.

## Release Manager Workflow

Release managers can monitor code quality trends for the `develop` branch:

1. **Access the SonarQube Dashboard**:
   - Navigate to https://sonarqube.alkem.io
   - Select the alkemio-server project (or the configured project key)

2. **Review Current Metrics**:
   - **Coverage**: Test coverage percentage for the develop branch
   - **Bugs**: Number of reliability issues identified
   - **Vulnerabilities**: Security vulnerabilities found
   - **Code Smells**: Maintainability issues detected
   - **Quality Gate Status**: Overall pass/fail status for the branch

3. **Monitor Trends**:
   - Use the **Activity** tab to view historical changes in metrics
   - Review trend graphs to identify improving or degrading quality
   - Check the **Issues** tab to see specific problems by severity

4. **Pre-Release Validation**:
   - Before cutting a release, confirm the develop branch has a passing quality gate
   - Review any new critical or high-severity issues since the last release
   - Address or document any quality gate failures before proceeding

## Required CI Secrets

The following secrets must be configured in the GitHub repository settings under **Settings > Secrets and variables > Actions**:

- **`SONAR_TOKEN`**: Authentication token for SonarQube API access (generated from https://sonarqube.alkem.io)
- **`SONAR_HOST_URL`**: SonarQube instance URL (set to `https://sonarqube.alkem.io`)

These secrets are used by the `.github/workflows/trigger-sonarqube.yml` workflow to authenticate and send analysis results to SonarQube.

## SonarQube Project Configuration

- **Project URL**: https://sonarqube.alkem.io (project dashboard after analysis runs)
- **Project Key**: Configured in `sonar-project.properties` at repository root
- **Quality Gate**: Configured in SonarQube UI for this project

## Operational Notes

- SonarQube runs are advisory only and do **not** block merges, but failed gates should be addressed or consciously accepted during release.
- Tokens and project keys are stored in the CI secrets manager and are not committed to this repository.
- If SonarQube is unreachable or misconfigured, the CI job fails with a clear error message and a suggested remediation.

## Maintenance

### Token Rotation Procedure

To rotate the SonarQube authentication token:

1. **Generate a new token** in SonarQube:
   - Log in to https://sonarqube.alkem.io
   - Navigate to **My Account > Security > Generate Tokens**
   - Create a new token with an appropriate name (e.g., `alkemio-server-ci-<date>`)
   - Copy the token value immediately (it won't be shown again)

2. **Update CI secrets**:
   - Go to the GitHub repository settings
   - Navigate to **Settings > Secrets and variables > Actions**
   - Update the `SONAR_TOKEN` secret with the new token value

3. **Validate the rotation**:
   - Open a test pull request (or trigger the workflow manually via workflow_dispatch)
   - Verify that the SonarQube analysis completes successfully
   - Check that the quality gate status appears on the PR

4. **Revoke the old token**:
   - Return to SonarQube **My Account > Security > Tokens**
   - Revoke or delete the old token
   - Confirm that only the new token remains active

### Quality Gate Management

- Quality gate thresholds are managed in SonarQube; adjust them there rather than editing CI scripts.
- To modify quality gate rules, log in to https://sonarqube.alkem.io and navigate to **Quality Gates**.

## Troubleshooting

### SonarQube Analysis Fails with Authentication Error

**Symptom**: CI job fails with "Unauthorized" or "Authentication failed" error.

**Solution**:
1. Verify the `SONAR_TOKEN` secret is set correctly in GitHub repository settings
2. Check that the token hasn't expired or been revoked in SonarQube
3. Regenerate the token if needed and update the CI secret

### Analysis Fails with "Project Not Found"

**Symptom**: CI job fails with project key or project not found error.

**Solution**:
1. Verify the project exists in SonarQube at https://sonarqube.alkem.io
2. Check that the `sonar-project.properties` file has the correct project key
3. Ensure the token has permissions to access the project

### Quality Gate Status Not Appearing on PR

**Symptom**: CI job completes but no status check appears on the pull request.

**Solution**:
1. Check the workflow run logs in GitHub Actions
2. Verify the workflow is configured to run on `pull_request` events
3. Ensure the workflow has appropriate permissions to post status checks

### SonarQube Service Unreachable

**Symptom**: CI job fails with connection timeout or service unavailable.

**Solution**:
1. Verify https://sonarqube.alkem.io is accessible from your network
2. Check if there are any planned maintenance windows
3. Contact DevOps if the service is down for an extended period
4. The workflow will need to be re-run once the service is restored

### Analysis Takes Too Long

**Symptom**: SonarQube analysis step exceeds expected time (>5 minutes).

**Solution**:
1. Check the size of the changeset in the PR (large diffs take longer)
2. Review SonarQube server load at https://sonarqube.alkem.io
3. Consider excluding test files or generated code if they're causing unnecessary analysis load
