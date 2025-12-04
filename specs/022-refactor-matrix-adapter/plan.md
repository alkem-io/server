# Plan: Refactor Communication Adapter

## Goal
Refactor the `CommunicationAdapter` to use the new `@alkem-io/matrix-adapter-go-lib` (v0.2.0) and its associated protocol. This shift moves the responsibility of ID mapping (Alkemio UUID <-> Matrix ID) to the external Adapter service, simplifying the Server's codebase.

## Scope
- **Adapter:** `src/services/adapters/communication-adapter/communication.adapter.ts`
- **Services:** `CommunicationService`, `RoomService`, `UserService` (and any other callers of the adapter).
- **Protocol:** Switch from `MatrixAdapterEventType` (legacy) to `matrix.adapter.event.type` (new).
- **Data:** Stop using `user.communicationID` (Matrix ID) and `room.externalRoomID` (Matrix Room ID) in adapter calls; use Alkemio UUIDs instead.

## Analysis & Simplification
The following legacy complexities will be removed:
1.  **Matrix ID Management:** The server no longer needs to know or store Matrix IDs (`@user:server.com`, `!room:server.com`). It will exclusively use Alkemio UUIDs (`AlkemioActorID`, `AlkemioRoomID`, `AlkemioContextID`).
2.  **Explicit Registration:** `tryRegisterNewUser` is replaced by `syncActor`. The server just ensures the actor exists in the adapter before adding them to rooms.
3.  **Ad-Hoc Hierarchy:** `adminReplicateRoomMembership` and `updateMatrixRoomState` are replaced by first-class Hierarchy support (`SetParentRequest`, `CreateSpaceRequest`).
4.  **Complex Retry Logic:** The legacy `makeRetryableAndPromisify` with exponential backoff will be replaced by a simpler "Log & Fail" strategy as per the spec, relying on the Adapter's robustness.
5.  **Legacy DM Handling:** Explicit "Start/Stop DM" logic is replaced by standard `CreateRoom` (type=Direct) calls.
6.  **Unified Actor Pattern:** Instead of passing `User` or `VirtualContributor` through services and resolving `communicationID` at the bottom, we introduce `actorId: string` (= `contributor.agent.id`) resolved once at the entry point. This eliminates the need to distinguish User/VC in the communication layer.
7.  **IdentityResolverService Removal:** Since the Adapter returns `AlkemioActorID` (which IS `agent.id`) in responses, the `IdentityResolverService` reverse-lookup logic becomes obsolete.

## Proposed Changes

### 1. Adapter Implementation (`CommunicationAdapter`)
- [ ] **Dependency:** Ensure `@alkem-io/matrix-adapter-go-lib` is installed (Done).
- [ ] **Event Types:** Replace legacy `MatrixAdapterEventType` with the new enum from the library.
- [ ] **Method: `syncActor`:** Implement `SyncActorRequest`.
- [ ] **Method: `createRoom` / `createSpace`:** Implement `CreateRoomRequest` and `CreateSpaceRequest`.
- [ ] **Method: `setParent`:** Implement `SetParentRequest` for hierarchy.
- [ ] **Method: `batchAddMember` / `batchRemoveMember`:** Implement batch membership operations.
- [ ] **Method: `sendMessage` / `deleteMessage`:** Update to use new DTOs and UUIDs.
- [ ] **Cleanup:** Remove `tryRegisterNewUser`, `adminReplicateRoomMembership`, `updateMatrixRoomState`, `getRoomMembers` (use `getRoom`), `getMessageSender`.

### 2. Service Integration
- [ ] **`CommunicationService`:** Update `addContributorToCommunications` to pass `contributor.agent.id` instead of `user.communicationID`.
- [ ] **`RoomService`:** Update room creation/deletion to use the new adapter methods. Use `room.id` as `AlkemioRoomID`.
- [ ] **`UserService`:** Call `syncActor` on user creation/update instead of `tryRegisterNewUser`.

### 3. Data & Deprecation
- [ ] **`externalRoomID`:** Stop using this for adapter calls. Use `room.id`.
- [ ] **`communicationID`:** Stop using this for adapter calls. Use `contributor.agent.id` instead.
- [ ] **Adapter DTOs:** Rename `senderCommunicationsID` → `actorId` across all DTOs.
- [ ] **Service signatures:** Update to accept `actorId: string` instead of User/VC-specific parameters.

## Risks
- **Data Mismatch:** If the Adapter doesn't have the mapping for an existing user/room (because we stopped sending Matrix IDs), operations might fail. *Mitigation:* The Adapter is expected to handle the migration/mapping. The Server just sends UUIDs.
- **Protocol Breakage:** The new library might have subtle differences in behavior. *Mitigation:* Thorough testing of the new methods.

## Verification Plan
### Automated Tests
- [ ] **Unit Tests:** Update `communication.adapter.spec.ts` to mock the new `ClientProxy` calls and verify correct DTOs are sent.
- [ ] **Integration Tests:** Since we can't easily spin up the Go Adapter in this environment, we will rely heavily on unit tests and contract verification (checking DTO shapes).

### Manual Verification
- [ ] Verify that `pnpm build` passes.
- [ ] Verify that `pnpm lint` passes.
