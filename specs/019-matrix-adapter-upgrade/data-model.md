# Data Model: Upgrade Matrix Adapter to 0.7.0 & Use ActorID

**Feature**: `019-matrix-adapter-upgrade`

## Entity Changes

### User
- **Remove**: `communicationID` column.
- **Source**: `src/domain/community/user/user.entity.ts` (inherited from `ContributorBase`)

### VirtualContributor
- **Remove**: `communicationID` column.
- **Source**: `src/domain/community/virtual-contributor/virtual.contributor.entity.ts` (inherited from `ContributorBase`)

### Organization
- **Remove**: `communicationID` column.
- **Source**: `src/domain/community/organization/organization.entity.ts` (inherited from `ContributorBase`)

### ContributorBase
- **Remove**: `communicationID` property.
- **Source**: `src/domain/community/contributor/contributor.base.entity.ts`
- **Note**: Since `User`, `VirtualContributor`, and `Organization` all inherit from `ContributorBase`, removing it here should cover all of them.

### AgentInfo
- **Remove**: `communicationID` property.
- **Source**: `src/core/authentication.agent.info/agent.info.ts`

## API Contracts

No changes to public API contracts (GraphQL/REST) identified.

## Database Migrations

### Migration 1: Drop CommunicationID Columns
- **Type**: Schema Change
- **Description**: Drop `communicationID` column from `user`, `virtual_contributor`, and `organization` tables.
- **SQL**:
  ```sql
  ALTER TABLE `user` DROP COLUMN `communicationID`;
  ALTER TABLE `virtual_contributor` DROP COLUMN `communicationID`;
  ALTER TABLE `organization` DROP COLUMN `communicationID`;
  ```
