# Data Model: SonarQube Static Analysis Integration

## Entities

### SonarQube Project

- **Description**: Logical representation of this repository in SonarQube.
- **Attributes**:
  - `key`: Unique SonarQube project key for this repo.
  - `name`: Human-readable project name.
  - `url`: URL to the SonarQube project dashboard.
  - `qualityGateId`: Identifier of the configured quality gate.

### Analysis Run

- **Description**: A single static analysis execution initiated from CI.
- **Attributes**:
  - `id`: SonarQube analysis identifier.
  - `branch`: Git branch name (PR head or main branch).
  - `commitSha`: Commit hash associated with the analysis.
  - `status`: Completed / Failed / Cancelled.
  - `qualityGateStatus`: Passed / Failed.
  - `timestamp`: Time when analysis completed.

### Quality Gate Status

- **Description**: Summary of gate evaluation for a given analysis.
- **Attributes**:
  - `status`: Passed / Failed.
  - `conditions`: List of conditions with metric type (coverage, bugs, vulnerabilities, smells) and outcome.
  - `url`: Deep link to the gate details in SonarQube.

## Relationships

- A **SonarQube Project** has many **Analysis Runs**.
- Each **Analysis Run** has one **Quality Gate Status**.

## Constraints & Rules

- Each repository must map to exactly one SonarQube Project key.
- Each Analysis Run must be uniquely associated with a commit SHA and branch.
- Quality Gate Status must be retrievable for any completed Analysis Run used in release decisions.
