# Data Model

**Feature**: Drop User Communication ID

## Entity Changes

### ContributorBase
- **File**: `src/domain/community/contributor/contributor.base.entity.ts`
- **Change**: Remove `communicationID` column.
- **Impact**: Affects `User`, `VirtualContributor`, `Organization`.

### AgentInfo
- **File**: `src/core/authentication.agent.info/agent.info.ts`
- **Change**: Remove `communicationID` field.

## Database Schema

### Table: `contributor_base` (or individual tables if STI/CTI)
- **Operation**: `DROP COLUMN communicationId`
- **Migration**: Create a new TypeORM migration.

## API Contracts

### GraphQL
- **Type**: `User`, `VirtualContributor`, `Organization` (and their DTOs/Interfaces)
- **Change**: Remove `communicationID` field if present.
- **Breaking Change**: Yes. Clients using this field will break.
- **Mitigation**: If critical, mark `@deprecated` and return `agentId` temporarily, but spec says "Drop redundant... tables", implying removal. We will remove it.

### Internal Services
- **Service**: `IdentityResolverService`
- **Change**: Remove `getUserIDByCommunicationsID`, `getContributorIDByCommunicationsID`.
- **Service**: `RoomService`, `RoomLookupService`
- **Change**: Update calls to use `agentId`.
