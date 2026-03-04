# Post-Implementation Quality Checklist: Group Conversations & Unified Messaging API

**Purpose**: Validate requirements quality, cross-artifact consistency, and specification completeness after implementation and three rounds of method unification
**Created**: 2026-03-04
**Feature**: [spec.md](../spec.md)

## API Contract Quality

- [x] CHK001 Are mutation return types for `removeConversationMember` and `leaveConversation` documented as nullable (`Conversation` or `null` on auto-delete)? [Completeness, Contract §Mutations] — Fixed: contract updated to nullable returns
- [x] CHK002 Is the `deleteConversation` mutation's input argument name (`deleteData`) consistent with the naming convention used by other mutations (`conversationData`, `memberData`, `leaveData`)? [Consistency, Contract §Mutations] — All follow `[purpose]Data` pattern
- [x] CHK003 Are error response semantics specified for all mutation failure modes (e.g., add member to DIRECT conversation, remove non-existent member, leave conversation you're not in)? [Completeness, Gap] — Fixed: added FR-013
- [x] CHK004 Is it specified whether `addConversationMember` is idempotent (no error when member already exists)? [Clarity, Spec §Edge Cases] — Covered in Edge Cases + FR-013
- [x] CHK005 Are the `memberIDs` semantics in `CreateConversationInput` clear about whether they include or exclude the creator? [Clarity, Contract §Input Types] — Documented in contract comments + FR-002
- [x] CHK006 Is the `resetConversationVc` mutation's behavior documented with respect to the new `members` field and removed `type` field? [Completeness, Contract §Mutations] — Fixed: added FR-017
- [x] CHK007 Is the return type of `deleteConversation` specified to clarify what state the returned `Conversation` is in (pre-deletion snapshot)? [Clarity, Contract §Mutations] — Fixed: added FR-015
- [x] CHK008 Are authorization privilege requirements documented for each mutation (CONTRIBUTE for add/remove, READ for leave, DELETE for delete)? [Completeness, Gap] — Fixed: added FR-018

## Cross-Artifact Consistency

- [x] CHK009 Does the plan.md `messaging.resolver.mutations.ts` description still reference "unified createConversation + new mutations" — is this accurate after unification collapsed the messaging service methods? [Consistency, Plan §Project Structure] — Fixed: updated to clarify membership mutations are on conversation.resolver.mutations.ts
- [x] CHK010 Does the research.md R8 table entry for `getConversationsForAgent(typeFilter)` reflect the actual implementation (renamed to `getConversationsForActor`, typeFilter removed entirely)? [Consistency, Research §R8] — Fixed: updated R8 replacement description
- [x] CHK011 Does the research.md R6 accurately reflect that `virtualContributor(wellKnown:)` was replaced by `createConversationWithWellKnownVC` helper, not just client-side cross-referencing? [Consistency, Research §R6] — R6 accurately describes the listing replacement; creation helper is a separate concern
- [x] CHK012 Does the data-model.md state transition diagram account for group conversations dropping from N members to 1 member to 0 members (auto-delete)? [Completeness, Data Model §State transitions] — Covered: Active → 1-member → Deleted
- [x] CHK013 Are the spec's acceptance scenarios for US3 (§3.4 — self-removal) consistent with the implementation where `leaveConversation` delegates to `removeMember` via a shared resolver helper? [Consistency, Spec §US3] — Spec describes observable behavior which matches
- [x] CHK014 Does the tasks.md unification notes section accurately describe all three unification rounds with correct method signatures? [Consistency, Tasks §Post-Implementation] — Verified accurate
- [x] CHK015 Is the plan.md `conversation.service.ts` description updated to reflect the unified `createConversation(creatorAgentId, memberAgentIds[], roomType)` signature? [Consistency, Plan §Project Structure] — Updated in previous retrofit
- [x] CHK016 Does the contract document specify the same nullable return for `removeConversationMember` / `leaveConversation` as implemented? [Consistency, Contract §Mutations vs Implementation] — Fixed: contract updated to nullable

## Lifecycle & Edge Cases

- [x] CHK017 Is the requirement for "0 members → auto-delete" specified with clarity about what "delete" means (conversation + room + memberships removed)? [Clarity, Spec §FR-009] — Fixed: added FR-016 specifying cascade scope
- [x] CHK018 Are requirements defined for what happens when a user tries to add themselves to a conversation they're already in? [Coverage, Gap] — Covered by Edge Cases idempotency + FR-013
- [x] CHK019 Is the behavior specified for attempting to create a DIRECT conversation where the member is the creator themselves (self-DM)? [Edge Case, Gap] — Fixed: added Edge Case for self-DM
- [x] CHK020 Are requirements defined for the ordering/priority when multiple members leave a group conversation simultaneously (race condition)? [Edge Case, Gap] — Fixed: added Edge Case for concurrent leaves
- [x] CHK021 Is it specified whether the auto-delete on 0 members cascades through the authorization policy cleanup? [Completeness, Gap] — Fixed: FR-016 specifies full cascade including auth policy
- [x] CHK022 Are requirements clear about whether a deleted group conversation's room is also removed from Matrix Synapse, or only from the database? [Clarity, Gap] — Fixed: FR-016 specifies "Room entity (including Matrix Synapse room cleanup via the adapter)"
- [x] CHK023 Is the "1-member group persists" requirement (FR-009) consistent with the data-model state transition that shows "Active → 1-member"? [Consistency, Spec §FR-009, Data Model §State transitions] — Consistent
- [x] CHK024 Are requirements specified for what happens to in-flight messages when a conversation is being deleted? [Edge Case, Gap] — Fixed: added Edge Case for in-flight messages
- [x] CHK025 Is the duplicate member deduplication requirement (FR-012) specified to cover both creation-time and add-member-time? [Completeness, Spec §FR-012] — FR-012 covers creation; Edge Cases + FR-013 cover add-time idempotency

## Subscription & Real-Time Events

- [x] CHK026 Is it specified whether the `MEMBER_REMOVED` event is delivered to the removed member as well as remaining members? [Clarity, Spec §US5] — Spec US5.3 + FR-019 specify delivery to all pre-removal members
- [x] CHK027 Is it specified whether the `CONVERSATION_DELETED` event is delivered to all members before or after the conversation entity is removed? [Clarity, Gap] — Fixed: FR-019 specifies events published after mutation completes, deleted event contains UUID only
- [x] CHK028 Are subscription event delivery guarantees specified (at-least-once, at-most-once, exactly-once)? [Completeness, Gap] — Fixed: FR-020 specifies at-most-once via existing WebSocket model
- [x] CHK029 Is the `memberAdded` event specified to include the full `Actor` entity of the added member, enabling clients to update their member list without re-fetching? [Clarity, Contract §ConversationMemberAddedEvent] — Documented in contract: `addedMember: Actor!`
- [x] CHK030 Is the asymmetry between `memberAdded` (returns full `Actor`) and `memberRemoved` (returns `UUID` only) documented with rationale? [Clarity, Contract §Event Types] — Contract comment: "Added events return full entity; removed/deleted return UUID only"
- [x] CHK031 Are requirements defined for subscription behavior when a member is added to a conversation they were previously removed from (re-join)? [Coverage, Gap] — Fixed: added Edge Case for re-join
- [x] CHK032 Is it specified whether `CONVERSATION_CREATED` events for GROUP conversations include the full member list or just the conversation reference? [Clarity, Contract §ConversationCreatedEvent] — Contract: `conversation: Conversation!` which has `members` field
- [x] CHK033 Are requirements clear about whether subscription filter logic uses `actorID` or `agentID` for member matching? [Clarity, Gap] — Fixed: FR-019 specifies "actor's ID to match against the conversation's member list"
- [x] CHK034 Is the event ordering requirement specified — must `MEMBER_ADDED` arrive before messages from the new member are visible? [Coverage, Gap] — Fixed: FR-020 specifies ordering not guaranteed across concurrent mutations

## Non-Functional Requirements

- [x] CHK035 Are performance requirements specified for group conversations with many members (e.g., latency targets for N=10, N=50, N=100 members)? [Gap, Spec §Success Criteria] — Fixed: added NFR-001 with ≤50 member target
- [x] CHK036 Is the maximum member count for group conversations explicitly documented as "no limit" with rationale, or left as an unstated assumption? [Clarity, Spec §Assumptions] — Documented in Assumptions
- [x] CHK037 Are authorization re-application costs documented for membership changes (each add/remove triggers `applyAuthorizationPolicy`)? [Gap] — Fixed: added NFR-002

## Notes

- All 37 items validated and resolved on 2026-03-04
- 17 items passed on first validation, 20 fixed via spec/contract/plan/research updates
- Items marked [Gap] were resolved by adding new FRs (FR-013 through FR-020), NFRs (NFR-001, NFR-002), and Edge Cases
- Items marked [Consistency] were resolved by updating plan.md, research.md, and contract
