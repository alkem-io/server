# Spec 019: Unified Entity/Actor/Context Architecture

**Status**: Draft
**Created**: 2025-12-04
**Author**: AI-assisted analysis session

## 1. Executive Summary

The current architecture suffers from **fragmented identity** and **overloaded concepts**. We have 5+ ID spaces, an `Agent` entity that conflates "Actor" with "Credential Holder", and a rigid "Stage" (Space/Account) hierarchy that relies on polymorphic nullable columns.

This spec proposes a **Unified Entity Model** that separates concerns into four fundamental traits:
1.  **Entity:** Universal Identity (Single ID space).
2.  **Actor:** Capability to perform actions (User, Org, VC).
3.  **Context:** Capability to contain resources and other entities (Space, Account, Room).
4.  **Resource:** Content created by Actors within Contexts.

## 2. Problem Analysis (360° View)

### 2.1. The Identity Crisis (5+ ID Spaces)
*   **Current:** `User`, `Organization`, `VirtualContributor`, `Space`, `Account` all have separate ID spaces.
*   **Impact:** `message.sender` contains an ID, but we don't know *which* table to query. We must try `UserLookup`, then `OrgLookup`, etc.
*   **Impact:** Foreign Keys are fragile or require multiple columns (`userID`, `orgID`, `vcID`).

### 2.2. The "Agent" Overload
*   **Current:** `Agent` is a sidecar entity attached to Users, Orgs, Spaces, and Accounts.
*   **Usage 1 (Actor):** "Who sent this message?" -> `Agent` (but really we want the User).
*   **Usage 2 (Credential Holder):** "Does this Space have a license?" -> `Space.agent.credentials`.
*   **Conflict:** A `Space` has an `Agent` (so it can hold a license), which implies a `Space` can "act" (send messages), which is confusing.
*   **Inefficiency:** To check permissions, we often traverse `User -> Agent -> Credentials`.

### 2.3. The "Stage" Rigidity (Contexts)
*   **Current:** `Space` and `Account` are the primary containers.
*   **Impact:** Polymorphism is handled via nullable columns. `InAppNotification` has ~15 FK columns (`spaceID`, `accountID`, `applicationID`, etc.) to define "Context".
*   **Limitation:** Adding a new type of container (e.g., "Project" or "Workflow") requires schema changes across all resource tables.

## 3. Proposed Architecture

### 3.1. Core Concept: The Universal Entity
Everything is an **Entity**.
*   **Single ID Space:** `entity.id` is unique across the system.
*   **Type Discriminator:** `entity.type` tells us what it is.
*   **Universal FKs:** `sender_id` and `context_id` always point to `entity.id`.

### 3.2. The Four Traits

#### A. Entity (Base)
The fundamental atom. Holds identity and credentials.
*   **Replaces:** `Agent` (as the identity holder).
*   **Capabilities:** Can hold `Credentials` (Licenses, Roles).
*   **Schema:**
    ```sql
    CREATE TABLE entity (
      id UUID PRIMARY KEY,
      type ENUM('user', 'org', 'space', 'account', 'room', ...),
      display_name VARCHAR,
      created_at TIMESTAMP,
      authorization_policy_id UUID REFERENCES authorization_policy(id) -- Unified permission link
    );
    ```

#### B. Actor (Trait)
Entities that can *perform actions*.
*   **Applies to:** `User`, `Organization`, `VirtualContributor`.
*   **Potential Actors:** `Space` (for automated updates or cross-space posts), `Application` (bots).
*   **Note:** An entity can be **both** a Context and an Actor (e.g., a Space that posts an update to another Space).
*   **Schema:**
    ```sql
    CREATE TABLE actor (
      entity_id UUID PRIMARY KEY REFERENCES entity(id),
      -- actor specific settings (quotas, rate limits)
    );
    ```

#### C. Context (Trait)
Entities that *contain* other entities or resources. (The "Stage").
*   **Applies to:** `Space`, `Account`, `Room`, `Callout`, `Whiteboard`.
*   **Potential Contexts:** `Organization` (e.g., containing internal docs), `User` (personal workspace).
*   **Note:** Traits are composable. An `Organization` is primarily an Actor, but can also be a Context.
*   **Capabilities:** Can be a parent to other Contexts or Resources.
*   **Schema:**
    ```sql
    CREATE TABLE context (
      entity_id UUID PRIMARY KEY REFERENCES entity(id),
      parent_context_id UUID REFERENCES entity(id), -- Generic hierarchy
      visibility_settings JSONB
    );
    ```

#### D. Resource (Trait)
Content created by Actors.
*   **Applies to:** `Message`, `Post`, `Comment`, `WhiteboardContent`, `File`.
*   **Schema:**
    ```sql
    CREATE TABLE resource (
      id UUID PRIMARY KEY, -- Could also be an Entity if resources need permissions
      context_id UUID REFERENCES entity(id), -- Where it lives
      author_id UUID REFERENCES entity(id), -- Who made it (User, Space, etc.)
      content JSONB
    );
    ```

### 3.3. Solving Specific Problems

#### "Space has an Agent"
*   **Old:** `Space` -> `Agent` -> `Credentials`.
*   **New:** `Space` (is Entity) -> `Credentials`.
*   **Benefit:** No separate `Agent` entity needed. `Space` holds its own licenses directly.

#### "Resource Authorship & Action Attribution"
*   **Old:** `sender` = `agentId`. Need to look up Agent type, then User/Org.
*   **New:** `author_id` = `entity.id`.
*   **Benefit:** One lookup. Works for **any** actor type: User, Bot, or even a Space posting to another Space.

#### "Notification Target"
*   **Old:** `spaceID`, `userID`, `orgID` columns.
*   **New:** `target_entity_id`.
*   **Benefit:** Works for any entity type (User, Space, or future types).

## 4. Detailed Schema & Migration

### 4.1. Tables to Remove
*   **`agent`**: Completely obsolete. Its responsibilities (Identity, Credentials) move to `entity` and `entity_credentials`.
*   **`contributor_base`** (Concept): No longer needed as a base class/table.
*   **`authorizable_entity`** (Concept): Replaced by `entity` table columns.

### 4.2. New Unified Schema

#### A. `entity` (The Core)
Consolidates identity, authorization, and common metadata.
```sql
CREATE TABLE entity (
  id UUID PRIMARY KEY, -- Reuses existing User/Space/Org IDs
  type ENUM('user', 'org', 'space', 'account', 'vc', 'room', ...),

  -- Common Identity Fields (Denormalized for performance)
  display_name VARCHAR, -- From Profile.displayName
  name_id VARCHAR UNIQUE, -- From NameableEntity.nameID (Slug/Handle)

  -- Common Links
  authorization_policy_id UUID REFERENCES authorization_policy(id),
  profile_id UUID REFERENCES profile(id), -- Link to rich profile (bio, visuals)
  storage_aggregator_id UUID REFERENCES storage_aggregator(id), -- Common to User, Org, Space

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### B. `actor` (Trait Table)
Entities that can perform actions.
```sql
CREATE TABLE actor (
  entity_id UUID PRIMARY KEY REFERENCES entity(id),
  status VARCHAR, -- Active, Suspended, Pending
  -- Future: Global rate limits, reputation scores
);
```

#### C. `context` (Trait Table)
Entities that contain others.
```sql
CREATE TABLE context (
  entity_id UUID PRIMARY KEY REFERENCES entity(id),
  parent_context_id UUID REFERENCES entity(id), -- The Hierarchy (Nullable for Root)
  visibility VARCHAR, -- Public, Private, Internal (Common to Space, VC)
  -- Future: Path enumeration for fast tree queries?
);
```

#### D. `entity_credentials` (Replaces Agent Credentials)
```sql
CREATE TABLE entity_credentials (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entity(id),
  type VARCHAR, -- License, Role, API Key
  value JSONB,
  expires_at TIMESTAMP
);
```

### 4.3. Refactored "Detail" Tables
Existing tables become lightweight "Detail" tables containing only type-specific logic.

*   **`user_details`** (was `user`): `first_name`, `last_name`, `email`, `phone`, `auth_id`, `settings`.
*   **`org_details`** (was `organization`): `legal_name`, `domain`, `website`, `verification_id`.
*   **`space_details`** (was `space`): `settings`, `layout_config`, `template_id`.
*   **`account_details`** (was `account`): `license_plan`, `billing_info`.

### 4.4. Migration Strategy

#### Step 1: Create Core Tables
Create `entity`, `actor`, `context`, `entity_credentials`.

#### Step 2: Migrate Data (Preserving IDs)
We iterate through existing tables and "lift" common data to `entity`.

*   **Migrate Users:**
    *   `INSERT INTO entity (id, type, display_name, name_id, auth_policy_id, profile_id) SELECT id, 'user', profile.displayName, nameID, auth_policy_id, profile_id FROM user ...`
    *   `INSERT INTO actor (entity_id) VALUES (user.id)`
*   **Migrate Spaces:**
    *   `INSERT INTO entity (id, type, display_name, name_id, ...) SELECT id, 'space', nameID, nameID, ...`
    *   `INSERT INTO context (entity_id, parent_context_id) SELECT id, parentSpaceId FROM space`
    *   `INSERT INTO actor (entity_id) ...` (If Spaces are actors)
*   **Migrate Agents:**
    *   Find the Owner of each Agent (User/Space/Org).
    *   Move `agent.credentials` -> `entity_credentials` (linked to Owner ID).

#### Step 3: Refactor Code
*   Update TypeORM entities to extend `BaseEntity` instead of `AuthorizableEntity`.
*   Map `User` entity to join `entity` + `user_details`.

## 5. Business Logic Improvements

1.  **Simplified Authorization:** `can(Actor, Action, Context)` becomes the standard signature. Both Actor and Context are Entities with Credentials.
2.  **Generic Hierarchy:** `Context` trait allows arbitrary nesting (e.g., `Account -> Space -> SubSpace -> Room`).
3.  **Unified Activity Feed:** `Activity` table becomes clean. `actor_id`, `context_id`, `resource_id` are all Entity FKs.
4.  **Future Proofing:** Adding a "Project" entity just means adding a `project_data` table and `type='project'`. No schema changes to `Notification`, `Activity`, or `Message` tables.

## 6. Open Questions

1.  **Resource vs Entity Rule:**
    *   **Rule:** If an object needs its own **Authorization Policy** (permissions), it MUST be an **Entity**.
    *   **Application:** `Whiteboard` and `Callout` have `authorizationId`, so they are **Entities** (likely with the Context trait).
    *   **Application:** `Message` does not have its own policy (it relies on `Room`), so it is a **Resource**.
2.  **Platform Entity:** Confirmed. A singleton "Platform" entity will exist to represent the system itself for automated actions, maintenance tasks, and system-wide notifications.
3.  **Space as Actor:** Confirmed. Spaces can be actors (e.g., automated system updates, cross-space sharing). The `Actor` trait is optional but available to Context entities.

## 7. References
*   [Constitution](.specify/memory/constitution.md)
*   [agents.md](agents.md)
*   `src/domain/agent/agent/agent.entity.ts`
*   `src/domain/space/space/space.entity.ts`

## 8. Design Decisions & Rationale

### 8.1. Credentials in Separate Table (vs. JSONB on Entity)
**Decision:** Keep Credentials in a separate table (`1:N` relationship from Entity).

**Pros:**
*   **Inverse Lookups:** Efficiently answer "Who is an Admin of Space X?" (Critical for listing members/admins).
*   **Lifecycle Management:** Easy to handle expiration (`expires` column) and revocation without locking the main Entity record.
*   **Indexing:** Can index `resource_id` and `type` for fast permission checks.
*   **Clean Entity Table:** Keeps the core `entity` table lightweight (avoiding large JSON blobs).

**Cons:**
*   **Join Overhead:** Requires a `JOIN` or secondary query to fetch an Entity's permissions.
*   **Migration Friction:** Moving rows from `agent_credentials` to `entity_credentials` is a heavy operation.

**Verdict:** The benefits for authorization queries and expiration management outweigh the join overhead.

### 8.2. Authorization Policy Strategy
**Decision:** Retain the existing `AuthorizationPolicy` table and link it directly to the `entity` table.

**Rationale:**
*   **Current State:** Almost all major objects (`Space`, `User`, `Room`, `Post`) already extend `AuthorizableEntity` and have a 1:1 relationship with `AuthorizationPolicy`.
*   **Unified Model:** By moving the `authorization_policy_id` FK to the `entity` table, we enforce that *any* entity can theoretically have permissions attached.
*   **Flexibility:** This allows us to easily add permissions to new entity types (e.g., a "Project" or "Workflow") without schema changes.
*   **Migration:** We can migrate existing policies by simply moving the FK from the child tables (`space`, `user`, etc.) to the new `entity` row.

### 8.4. Role & Permission Strategy
**Decision:** Retain `RoleSet` and `Role` tables for *definitions*, but migrate `Credential` to `entity_credentials` for *assignments*.

**Rationale:**
*   **Role Definitions (The Blueprints):** The existing `RoleSet` and `Role` tables define what roles exist (e.g., "Admin", "Member") and their policies. These are configuration data attached to a Context (Org, Space).
    *   **Change:** Instead of linking `RoleSet` to `Organization` or `Community` specific tables, we will link `RoleSet` to the `context` (via `entity_id`). This allows *any* Context (Space, Account, Project) to define its own roles if needed.
*   **Role Assignments (The Keys):** The `Credential` table currently holds "User X has Role Y in Space Z".
    *   **Change:** This moves to `entity_credentials`.
    *   **Mapping:** `agent_id` -> `entity_id` (The User/Actor), `resourceID` -> `resource_id` (The Context/Space), `type` -> `role_name`.
*   **Authorization (The Locks):** `AuthorizationPolicy` remains the enforcement engine, checking if the Actor's `entity_credentials` match the Policy's rules.

### 8.5. Role Policy Unification
**Decision:** Replace specific `userPolicy`, `organizationPolicy`, `virtualContributorPolicy` columns in the `Role` table with a single `actor_policies` JSONB column.

**Rationale:**
*   **Current State:** The `Role` table has hardcoded columns for each actor type (`user`, `org`, `vc`), defining `min/max` cardinality.
*   **Problem:** This breaks the "Arbitrary Actor" principle. If we want `Space` to be an actor (e.g., a "Partner Space"), we'd need a schema change to add `spacePolicy`.
*   **Solution:** A single JSON map keyed by `entity.type`.
    ```json
    {
      "user": { "min": 1, "max": 10 },
      "org": { "min": 0, "max": 0 }, // Explicitly forbidden
      "space": { "min": 0, "max": 5 } // Future capability
    }
    ```
*   **Migration:** Script will read the three existing columns and construct the JSON object for the new column.

**Migration Note:**
*   `RoleSet` FKs pointing to `Organization` or `Community` will be migrated to point to the corresponding `entity.id`.

## 9. Database Schema

The complete new database schema has been created in [`new_schema.sql`](./new_schema.sql).

**Key Changes:**
*   **`entity` table**: Universal identity with `type`, `display_name`, `name_id`, common FKs (`authorization_policy_id`, `profile_id`, `storage_aggregator_id`).
*   **`actor` table**: Trait table for entities that perform actions.
*   **`context` table**: Trait table for entities that contain others (with `parent_context_id` hierarchy).
*   **`entity_credential` table**: Replaces `credential` table, links to `entity_id` instead of `agent_id`.
*   **Detail tables**: `user_details`, `organization_details`, `virtual_contributor_details`, `space_details`, `account_details`, `room_details`, `callout_details`, `whiteboard_details`, `post_details` hold type-specific fields.
*   **Role policy**: `role.actor_policies` is now JSON instead of three separate columns.
*   **Updated FKs**: `activity`, `in_app_notification`, `communication`, `conversation`, `role_set`, `community` now reference `entity.id`.



