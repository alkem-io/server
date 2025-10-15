## Authorization Forest (Comprehensive)

This document provides a holistic, code-derived view of the complete authorization forest. It complements `credential-based-authorization.md` and replaces its earlier shallow diagrams.

Methodology (updated):

1. Enumerated every `*.service.authorization.ts` file.
2. For each service, analyzed its `applyAuthorizationPolicy` signature and body.
3. Classification rules (per current definitive definition):
   - (R) Root: `applyAuthorizationPolicy` does NOT accept a `parentAuthorization` (or never calls `inheritParentAuthorization`) and calls `inheritRootAuthorizationPolicy` (Platform/User/Organization/Account roots).
   - (E) Edge (non-root internal node): `applyAuthorizationPolicy` accepts a `parentAuthorization` (or receives one), calls `inheritParentAuthorization`, AND invokes at least one child `applyAuthorizationPolicy`.
   - (L) Leaf: `applyAuthorizationPolicy` accepts/uses `parentAuthorization` (calls `inheritParentAuthorization`) and does NOT invoke any other `applyAuthorizationPolicy` (no children).
4. Followed propagation to build directed graph; removed prior misclassification of Licensing Framework as root (it is an Edge under Platform).

Legend:

- (R) Root (no parent; starting point of a tree)
- (E) Edge (has parent + has children)
- (L) Leaf (has parent + no children)

> Some nodes internally create multiple authorization policies (e.g., sets vs items) but are represented once for clarity.

---

### 1. Platform Tree

Derived from `PlatformAuthorizationService.applyAuthorizationPolicy`.

```mermaid
graph TD
	Platform((Platform R)) --> Library((Library E))
	Platform --> TemplatesManager((TemplatesManager E))
	Platform --> PlatformRoleSet((Platform RoleSet L))
	Platform --> Forum((Forum E))
	Platform --> StorageAggregator_Platform((StorageAggregator E))
	Platform --> LicensingFramework((LicensingFramework E))
```

Notes:

- `LicensingFramework` now classified as Edge: inherits from Platform and has child `LicensePolicy`.

### 2. Licensing Framework Branch (Edge)

```mermaid
graph TD
	LicensingFramework((LicensingFramework E)) --> LicensePolicy((LicensePolicy L))
```

### 3. User Tree

From `UserAuthorizationService.applyAuthorizationPolicy` and cascades into Profile and Storage:

```mermaid
graph TD
	User((User R)) --> UserProfile((Profile E))
	User((User R)) --> UserAgent((Agent L))
	User((User R)) --> UserSettings((UserSettings L))
	User((User R)) --> UserStorageAggregator((StorageAggregator E))
	UserStorageAggregator --> UserStorageBucket((StorageBucket E))
	UserStorageBucket --> UserDocument((Document E))
	UserDocument --> UserTagset((Tagset L))
	%% Profile internal children (see Profile Detail)
```

#### 3.a Profile Detail (applies everywhere Profile appears)

```mermaid
graph TD
	Profile((Profile E)) --> ProfileVisuals((Visual L))
	Profile --> ProfileReferences((Reference L))
	Profile --> ProfileTagsets((Tagset L))
	Profile --> ProfileStorageBucket((StorageBucket E))
	ProfileStorageBucket --> ProfileDocument((Document E))
	ProfileDocument --> ProfileDocTagset((Tagset L))
```

### 4. Organization Tree

```mermaid
graph TD
	Organization((Organization R)) --> OrgProfile((Profile E))
	Organization --> OrgAgent((Agent L))
	Organization --> OrgStorage((StorageAggregator E))
	Organization --> OrgRoleSet((RoleSet L))
	Organization --> OrgUserGroups((UserGroup E))
	OrgUserGroups --> OrgUserGroupMembership((Membership L))
	Organization --> OrganizationVerification((OrganizationVerification L))
```

### 5. Account Tree (with recursive Space sub-trees)

From `AccountAuthorizationService.applyAuthorizationPolicy` and recursive calls in `SpaceAuthorizationService`.

```mermaid
graph TD
	Account((Account R)) --> AccountAgent((Agent L))
	Account --> AccountLicense((License L))
	Account --> AccountStorage((StorageAggregator E))
	Account --> AccountVirtualContributors((VirtualContributor E))
	AccountVirtualContributors --> VirtualContributor((VirtualContributor L))
	Account --> AccountInnovationPacks((InnovationPack E))
	AccountInnovationPacks --> InnovationPack((InnovationPack L))
	Account --> AccountInnovationHubs((InnovationHub E))
	AccountInnovationHubs --> InnovationHub((InnovationHub L))
	Account --> SpacesRoot((Spaces E))

	subgraph SpacesRecursive[Space Sub-Trees]
		SpaceL0((Space L0 E)) --> SpaceAgent((Agent L))
		SpaceL0 --> SpaceCommunity((Community E))
		SpaceCommunity --> CommunityRoleSet((RoleSet L))
		SpaceCommunity --> CommunityUserGroups((UserGroup E))
		SpaceCommunity --> CommunityGuidelines((CommunityGuidelines L))
		SpaceL0 --> SpaceCollaboration((Collaboration E))
		SpaceCollaboration --> CalloutsSet((CalloutsSet E))
		CalloutsSet --> Callout((Callout E))
		Callout --> CalloutFraming((CalloutFraming L))
		Callout --> CalloutContribution((CalloutContribution E))
		Callout --> Post((Post E))
		SpaceCollaboration --> InnovationFlow((InnovationFlow E))
		InnovationFlow --> InnovationFlowState((InnovationFlowState L))
		SpaceCollaboration --> Timeline((Timeline E))
		Timeline --> Calendar((Calendar E))
		Calendar --> Event((Event E))
		SpaceCollaboration --> Link((Link L))
		SpaceCollaboration --> Whiteboard((Whiteboard L))
		SpaceCollaboration --> Memo((Memo L))
		SpaceL0 --> SpaceAbout((About E))
		SpaceAbout --> SpaceProfile((Profile E))
		SpaceL0 --> SpaceStorage((StorageAggregator E))
		SpaceL0 --> SpaceLicense((License L))
		SpaceL0 --> TemplatesManagerSpace((TemplatesManager E))
		TemplatesManagerSpace --> TemplatesSet((TemplatesSet E))
		TemplatesSet --> Template((Template E))
		Template --> TemplateDefault((TemplateDefault L))
		Template --> TemplateContentSpace((TemplateContentSpace L))
		SpaceL0 --> SubSpaceL1((Space L1 E))
		SubSpaceL1 --> SubSpaceL2((Space L2 E))
		%% Pattern recurses for each subspace (L1, L2) replicating internal children except TemplatesManager limited to L0 as per code guard.
	end
```

Recursion specifics:

- Each Space (L0 / L1 / L2) propagates to: Agent, Community (RoleSet, UserGroups, Guidelines), Collaboration (CalloutsSet, Callouts, InnovationFlow(+State), Timeline(+Calendar,+Event), Link, Whiteboard, Memo), About(Profile), StorageAggregator (→ Buckets → Documents), License.
- Only L0 attaches TemplatesManager (verified: guard in `SpaceAuthorizationService`).
- Profile nodes are classified as Edge (E) because `ProfileAuthorizationService.applyAuthorizationPolicy` inherits parent authorization and then invokes child apply logic for references, tagsets, visuals, and the storage bucket.

### 5.a Virtual Contributor & AI Branches

From `VirtualContributorAuthorizationService` and downstream services:

```mermaid
graph TD
	Account((Account R)) --> AccountVirtualContributors((VirtualContributors E))
	AccountVirtualContributors --> VC((VirtualContributor E))
	VC --> VCProfile((Profile E))
	VC --> VCAgent((Agent L))
	VC --> VCKnowledgeBase((KnowledgeBase E))
	VC --> VCAiPersona((AiPersona L))
	%% KnowledgeBase branch expanded below
```

AI Server global branch (independent root-like reset pattern):

```mermaid
graph TD
	AiServer((AiServer R)) --> AiPersona((AiPersona L))
```

### 5.b Knowledge Base Detail

From `KnowledgeBaseAuthorizationService`:

```mermaid
graph TD
	KnowledgeBase((KnowledgeBase E)) --> KbCalloutsSet((CalloutsSet E))
	KbCalloutsSet --> KbCallout((Callout E))
	KbCallout --> KbCalloutContribution((CalloutContribution E))
	KbCallout --> KbCalloutPost((Post E))
	KbCallout --> KbCalloutFraming((CalloutFraming L))
	KnowledgeBase --> KbProfile((Profile E))
```

### 6. Collaboration Detail (Expanded)

From `CollaborationAuthorizationService` and its children:

```mermaid
graph TD
	Collaboration((Collaboration E)) --> CalloutsSet((CalloutsSet E))
	CalloutsSet --> Callout((Callout E))
	Callout --> CalloutFraming((CalloutFraming L))
	Callout --> CalloutContribution((CalloutContribution E))
	Callout --> Post((Post E))
	Collaboration --> InnovationFlow((InnovationFlow E))
	InnovationFlow --> InnovationFlowState((InnovationFlowState L))
	Collaboration --> Timeline((Timeline E))
	Timeline --> Calendar((Calendar E))
	Calendar --> Event((Event E))
	Collaboration --> Link((Link L))
	Collaboration --> Whiteboard((Whiteboard L))
	Collaboration --> Memo((Memo L))
	Collaboration --> License((License L))
```

### 7. Storage Detail

From `StorageAggregatorAuthorizationService`:

```mermaid
graph TD
	StorageAggregator((StorageAggregator E)) --> StorageBucket((StorageBucket E))
	StorageBucket --> Document((Document E))
```

Note: `DocumentAuthorizationService.applyAuthorizationPolicy` inherits the parent policy, appends document-specific credential rules, and then applies authorization to its nested `tagset` (treating tagset as a child resource). This makes Document an Edge (E), not a Leaf.

### 8. Forest Overview (Roots Only)

```mermaid
graph TD
	Platform((Platform R))
	UserRoot((User R))
	OrganizationRoot((Organization R))
	AccountRoot((Account R))
	AiServerRoot((AiServer R))
```

### 9. Gaps & Assumptions

| Area                          | Assumption / To Validate                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| User / Organization leaves    | Based on typical pattern; confirm actual invocation file to ensure no missing sub-entities (e.g., Notifications). |
| Templates under non-L0 spaces | Not applied (current code path only at L0).                                                                       |
| AI Personas / Guidance        | If governed separately, add explicit edges from Platform (future refinement).                                     |
| Communication (Rooms)         | If attached under Community or Collaboration in future, extend diagrams.                                          |

### 10. Suggested Automation

Automate generation via AST analysis:

1. Parse each `*.service.authorization.ts` for `applyAuthorizationPolicy(` calls.
2. Build directed graph where edge A→B exists if service A invokes service B passing a child entity.
3. Detect roots as nodes with no inbound edges (except those explicitly marked with root inheritance helpers).
4. Emit Mermaid graph + diff vs previous snapshot for CI visibility.

### 11. Classification Summary

| Service                                      | Classification | Rationale                                                                                                                            |
| -------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| AccountAuthorizationService                  | R              | Root inheritance, no parentAuthorization param                                                                                       |
| AgentAuthorizationService                    | L              | Inherits; no children                                                                                                                |
| AiPersonaAuthorizationService                | L              | Resets then inherits; no children                                                                                                    |
| AiServerAuthorizationService                 | R              | Acts as independent root: resets policy and seeds credential rules before cascading to AiPersonas                                    |
| ApplicationAuthorizationService              | L              | Inherits; no children                                                                                                                |
| CalendarAuthorizationService                 | E              | Inherits; cascades to Event child                                                                                                    |
| CalloutAuthorizationService                  | E              | Inherits (filtered parent); invokes contributions, framing, comments (room)                                                          |
| CalloutContributionAuthorizationService      | E              | Inherits; cascades to Post / Whiteboard / Link children                                                                              |
| CalloutsSetAuthorizationService              | E              | Inherits and iterates callouts                                                                                                       |
| ClassificationAuthorizationService           | E              | Inherits; cascades to Tagsets                                                                                                        |
| CollaborationAuthorizationService            | E              | Inherits; invokes CalloutsSet (then Callout chain), InnovationFlow(+State), Timeline(+Calendar→Event), Link/Whiteboard/Memo, License |
| CommunicationAuthorizationService            | E              | Inherits; cascades to Room                                                                                                           |
| CommunityGuidelinesAuthorizationService      | E              | Resets then inherits; cascades to Profile                                                                                            |
| DocumentAuthorizationService                 | E              | Inherits; applies to tagset (child)                                                                                                  |
| CalendarEventAuthorizationService            | E              | Inherits; cascades to Comments Room + Profile                                                                                        |
| InnovationFlowAuthorizationService           | E              | Inherits; invokes profile + states                                                                                                   |
| InnovationFlowStateAuthorizationService      | L              | Inherits; no children                                                                                                                |
| InnovationHubAuthorizationService            | E              | Inherits (with cloned parent + public read); cascades to Profile                                                                     |
| InnovationPackAuthorizationService           | E              | Resets then inherits; cascades to Profile + TemplatesSet                                                                             |
| InvitationAuthorizationService               | L              | Inherits; no children (extends own credential rules only)                                                                            |
| KnowledgeBaseAuthorizationService            | E              | Inherits; cascades to CalloutsSet + Profile                                                                                          |
| LicenseAuthorizationService                  | L              | Inherits; no children                                                                                                                |
| LicensePolicyAuthorizationService            | L              | Inherits parent, no further children (per code pattern)                                                                              |
| LicensingFrameworkAuthorizationService       | E              | Receives parent authorization from Platform; calls child LicensePolicy                                                               |
| LibraryAuthorizationService                  | L              | Resets then inherits; no child apply calls                                                                                           |
| LinkAuthorizationService                     | E              | Inherits; cascades to Profile                                                                                                        |
| MemoAuthorizationService                     | E              | Inherits; cascades to Profile                                                                                                        |
| OrganizationAuthorizationService             | R              | Root inheritance, no parentAuthorization param                                                                                       |
| OrganizationVerificationAuthorizationService | L              | Resets & appends rules only; no parent inherit, no children                                                                          |
| PlatformAuthorizationService                 | R              | Calls `inheritRootAuthorizationPolicy`, no parent passed in                                                                          |
| PlatformInvitationAuthorizationService       | L              | Inherits; no children                                                                                                                |
| PostAuthorizationService                     | E              | Inherits; cascades to Comments Room + Profile children                                                                               |
| ProfileAuthorizationService                  | E              | Inherits; invokes references, tagsets, visuals, storage bucket                                                                       |
| RoleSetAuthorizationService                  | E              | Inherits; invokes applications, invitations, platform invitations, license                                                           |
| RoomAuthorizationService                     | L              | Inherits; no child apply calls                                                                                                       |
| SpaceAboutAuthorizationService               | E              | Inherits; cascades to Profile + CommunityGuidelines                                                                                  |
| SpaceAuthorizationService                    | E              | Takes optional parent, inherits, invokes child services + subspaces                                                                  |
| StorageAggregatorAuthorizationService        | E              | Inherits; invokes StorageBucket                                                                                                      |
| StorageBucketAuthorizationService            | E              | Inherits; iterates Documents                                                                                                         |
| TemplateAuthorizationService                 | E              | Inherits; cascades to Profile and type-specific child (Guidelines / Callout / Whiteboard / ContentSpace)                             |
| TemplateContentSpaceAuthorizationService     | E              | Inherits; cascades to Collaboration, About, recursive Subspaces                                                                      |
| TemplateDefaultAuthorizationService          | L              | Inherits; no children                                                                                                                |
| TemplatesManagerAuthorizationService         | E              | Inherits; invokes TemplateDefaults and TemplatesSet                                                                                  |
| TemplatesSetAuthorizationService             | E              | Inherits; iterates Templates (child TemplateAuthorizationService)                                                                    |
| TimelineAuthorizationService                 | E              | Inherits; invokes Calendar                                                                                                           |
| UserAuthorizationService                     | R              | Root inheritance, no parentAuthorization param                                                                                       |
| UserGroupAuthorizationService                | E              | Inherits; invokes Profile                                                                                                            |
| UserSettingsAuthorizationService             | L              | Inherits; no children                                                                                                                |
| VirtualContributorAuthorizationService       | E              | Resets + root clone; cascades to Profile, Agent, AiPersona, KnowledgeBase                                                            |
| VisualAuthorizationService                   | L              | Inherits; no children                                                                                                                |
| WhiteboardAuthorizationService               | E              | Inherits; cascades to Profile                                                                                                        |

Last updated: 2025-10-15.
