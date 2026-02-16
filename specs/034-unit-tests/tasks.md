# Tasks: Application-Wide Unit Test Coverage

**Input**: Design documents from `/specs/034-unit-tests/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: This feature IS about writing tests. All implementation tasks produce `.spec.ts` test files co-located alongside source files.

**Organization**: Tasks are grouped by user story (layer priority) to enable independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Domain, US2=Common/Library, US3=App/Platform, US4=Core)
- Include exact file paths in descriptions

## Path Conventions

- Source: `src/` at repository root
- Tests: co-located `*.spec.ts` alongside `*.service.ts` or `*.ts` source files
- Mock infrastructure: `test/mocks/`, `test/utils/`, `test/data/`

---

## Phase 1: Setup

**Purpose**: Verify existing infrastructure and establish baseline before writing new tests

- [X] T001 Run `pnpm test:ci:no:coverage` and confirm all existing tests pass to establish green baseline
- [X] T002 Audit existing spec files for trivial-only assertions (e.g. `should be defined`) to identify files needing replacement per FR-009

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

No foundational tasks required. The existing test infrastructure is confirmed ready per research.md:

- Vitest 4.x with globals, SWC plugin, v8 coverage (RQ-3)
- Four established test patterns: manual construction, NestJS TestingModule, pure utility, parameterized (RQ-2)
- 50+ pre-built mocks in `test/mocks/`, factories in `test/utils/`, data builders in `test/data/` (RQ-2)

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Domain Service Logic Verification (Priority: P1) :dart: MVP

**Goal**: Unit tests covering the domain service layer so that business logic correctness is verified in isolation, regressions are caught early, and developers can refactor domain code with confidence.

**Independent Test**: Run `pnpm test -- src/domain/` — each module's tests run independently and deliver immediate regression protection.

**Pattern**: Use Pattern A (manual construction) for focused behavioral tests or Pattern B (NestJS TestingModule) when DI wiring matters. Follow quickstart.md Step 3.

**Test order within each describe block**: happy path → domain violations → edge cases → error handling (FR-013).

### access module

- [X] T003 [P] [US1] Write unit tests for ApplicationService in src/domain/access/application/application.service.spec.ts
- [X] T004 [P] [US1] Write unit tests for PlatformInvitationService in src/domain/access/invitation.platform/platform.invitation.service.spec.ts
- [X] T005 [P] [US1] Write unit tests for InvitationService in src/domain/access/invitation/invitation.service.spec.ts
- [X] T006 [P] [US1] Write unit tests for PlatformRolesAccessService in src/domain/access/platform-roles-access/platform.roles.access.service.spec.ts
- [X] T007 [P] [US1] Write unit tests for RoleService in src/domain/access/role/role.service.spec.ts

### agent module

- [X] T008 [P] [US1] Write unit tests for AgentService in src/domain/agent/agent/agent.service.spec.ts
- [X] T009 [P] [US1] Write unit tests for CredentialService in src/domain/agent/credential/credential.service.spec.ts

### collaboration module

- [X] T010 [P] [US1] Write unit tests for CalloutContributionDefaultsService in src/domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.service.spec.ts
- [X] T011 [P] [US1] Write unit tests for CalloutContributionMoveService in src/domain/collaboration/callout-contribution/callout.contribution.move.service.spec.ts
- [X] T012 [P] [US1] Write unit tests for CalloutContributionService in src/domain/collaboration/callout-contribution/callout.contribution.service.spec.ts
- [X] T013 [P] [US1] Write unit tests for CalloutFramingService in src/domain/collaboration/callout-framing/callout.framing.service.spec.ts
- [X] T014 [P] [US1] Write unit tests for CalloutTransferService in src/domain/collaboration/callout-transfer/callout.transfer.service.spec.ts
- [X] T015 [P] [US1] Write unit tests for CalloutService in src/domain/collaboration/callout/callout.service.spec.ts
- [X] T016 [P] [US1] Write unit tests for CalloutsSetService in src/domain/collaboration/callouts-set/callouts.set.service.spec.ts
- [X] T017 [P] [US1] Write unit tests for CollaborationService in src/domain/collaboration/collaboration/collaboration.service.spec.ts
- [X] T018 [P] [US1] Write unit tests for InnovationFlowStateService in src/domain/collaboration/innovation-flow-state/innovation.flow.state.service.spec.ts
- [X] T019 [P] [US1] Write unit tests for LinkService in src/domain/collaboration/link/link.service.spec.ts
- [X] T020 [P] [US1] Write unit tests for PostService in src/domain/collaboration/post/post.service.spec.ts

### common domain module

- [X] T021 [P] [US1] Write unit tests for AuthorizationPolicyService in src/domain/common/authorization-policy/authorization.policy.service.spec.ts
- [X] T022 [P] [US1] Write unit tests for ClassificationService in src/domain/common/classification/classification.service.spec.ts
- [X] T023 [P] [US1] Write unit tests for FormService in src/domain/common/form/form.service.spec.ts
- [X] T024 [P] [US1] Write unit tests for KnowledgeBaseService in src/domain/common/knowledge-base/knowledge.base.service.spec.ts
- [X] T025 [P] [US1] Write unit tests for LicenseEntitlementService in src/domain/common/license-entitlement/license.entitlement.service.spec.ts
- [X] T026 [P] [US1] Write unit tests for LicenseService in src/domain/common/license/license.service.spec.ts
- [X] T027 [P] [US1] Write unit tests for LocationService in src/domain/common/location/location.service.spec.ts
- [X] T028 [P] [US1] Write unit tests for MediaGalleryService in src/domain/common/media-gallery/media.gallery.service.spec.ts
- [X] T029 [P] [US1] Write unit tests for MemoService in src/domain/common/memo/memo.service.spec.ts
- [X] T030 [P] [US1] Write unit tests for NvpService in src/domain/common/nvp/nvp.service.spec.ts
- [X] T031 [P] [US1] Write unit tests for ProfileService in src/domain/common/profile/profile.service.spec.ts
- [X] T032 [P] [US1] Write unit tests for ReferenceService in src/domain/common/reference/reference.service.spec.ts
- [X] T033 [P] [US1] Write unit tests for TagsetTemplateSetService in src/domain/common/tagset-template-set/tagset.template.set.service.spec.ts
- [X] T034 [P] [US1] Write unit tests for TagsetTemplateService in src/domain/common/tagset-template/tagset.template.service.spec.ts
- [X] T035 [P] [US1] Write unit tests for TagsetService in src/domain/common/tagset/tagset.service.spec.ts
- [X] T036 [P] [US1] Write unit tests for VisualService in src/domain/common/visual/visual.service.spec.ts
- [X] T037 [P] [US1] Write unit tests for WhiteboardService in src/domain/common/whiteboard/whiteboard.service.spec.ts
- [X] T038 [US1] Replace trivial tests with behavioral tests for LifecycleService in src/domain/common/lifecycle/lifecycle.service.spec.ts

### communication module

- [X] T039 [P] [US1] Write unit tests for ConversationService in src/domain/communication/conversation/conversation.service.spec.ts
- [X] T040 [P] [US1] Write unit tests for MessageDetailsService in src/domain/communication/message.details/message.details.service.spec.ts
- [X] T041 [P] [US1] Write unit tests for MessagingService in src/domain/communication/messaging/messaging.service.spec.ts
- [X] T042 [P] [US1] Write unit tests for RoomLookupService in src/domain/communication/room-lookup/room.lookup.service.spec.ts
- [X] T043 [P] [US1] Write unit tests for RoomMentionsService in src/domain/communication/room-mentions/room.mentions.service.spec.ts
- [X] T044 [P] [US1] Write unit tests for RoomService in src/domain/communication/room/room.service.spec.ts
- [X] T045 [P] [US1] Write unit tests for VirtualContributorMessageService in src/domain/communication/virtual.contributor.message/virtual.contributor.message.service.spec.ts

### community module

- [X] T046 [P] [US1] Write unit tests for CommunityCommunicationService in src/domain/community/community-communication/community.communication.service.spec.ts
- [X] T047 [P] [US1] Write unit tests for CommunityGuidelinesService in src/domain/community/community-guidelines/community.guidelines.service.spec.ts
- [X] T048 [P] [US1] Write unit tests for ContributorService in src/domain/community/contributor/contributor.service.spec.ts
- [X] T049 [P] [US1] Write unit tests for OrganizationLookupService in src/domain/community/organization-lookup/organization.lookup.service.spec.ts
- [X] T050 [P] [US1] Write unit tests for OrganizationSettingsService in src/domain/community/organization-settings/organization.settings.service.spec.ts
- [X] T051 [P] [US1] Write unit tests for OrganizationVerificationService in src/domain/community/organization-verification/organization.verification.service.spec.ts
- [X] T052 [P] [US1] Write unit tests for UserLookupService in src/domain/community/user-lookup/user.lookup.service.spec.ts
- [X] T053 [P] [US1] Write unit tests for UserSettingsHomeSpaceValidationService in src/domain/community/user-settings/user.settings.home.space.validation.service.spec.ts
- [X] T054 [P] [US1] Write unit tests for UserSettingsService in src/domain/community/user-settings/user.settings.service.spec.ts
- [X] T055 [P] [US1] Write unit tests for VirtualContributorDefaultsService in src/domain/community/virtual-contributor-defaults/virtual.contributor.defaults.service.spec.ts
- [X] T056 [P] [US1] Write unit tests for VirtualContributorLookupService in src/domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service.spec.ts
- [X] T057 [P] [US1] Write unit tests for VirtualContributorPlatformSettingsService in src/domain/community/virtual-contributor-platform-settings/virtual.contributor.platform.settings.service.spec.ts
- [X] T058 [P] [US1] Write unit tests for VirtualContributorSettingsService in src/domain/community/virtual-contributor-settings/virtual.contributor.settings.service.spec.ts
- [X] T059 [P] [US1] Write unit tests for VirtualContributorService in src/domain/community/virtual-contributor/virtual.contributor.service.spec.ts

### innovation-hub module

- [X] T060 [P] [US1] Write unit tests for InnovationHubService in src/domain/innovation-hub/innovation.hub.service.spec.ts

### space module

- [X] T061 [P] [US1] Write unit tests for AccountHostService in src/domain/space/account.host/account.host.service.spec.ts
- [X] T062 [P] [US1] Write unit tests for AccountLicensePlanService in src/domain/space/account.license.plan/account.license.plan.service.spec.ts
- [X] T063 [P] [US1] Write unit tests for AccountLookupService in src/domain/space/account.lookup/account.lookup.service.spec.ts
- [X] T064 [P] [US1] Write unit tests for AccountService in src/domain/space/account/account.service.spec.ts
- [X] T065 [P] [US1] Write unit tests for SpaceAboutMembershipService in src/domain/space/space.about.membership/space.about.membership.service.spec.ts
- [X] T066 [P] [US1] Write unit tests for SpaceAboutService in src/domain/space/space.about/space.about.service.spec.ts
- [X] T067 [P] [US1] Write unit tests for SpaceDefaultsService in src/domain/space/space.defaults/space.defaults.service.spec.ts
- [X] T068 [P] [US1] Write unit tests for SpaceLookupService in src/domain/space/space.lookup/space.lookup.service.spec.ts
- [X] T069 [P] [US1] Write unit tests for SpaceSettingsService in src/domain/space/space.settings/space.settings.service.spec.ts

### storage module

- [X] T070 [P] [US1] Write unit tests for DocumentService in src/domain/storage/document/document.service.spec.ts
- [X] T071 [P] [US1] Write unit tests for StorageAggregatorService in src/domain/storage/storage-aggregator/storage.aggregator.service.spec.ts
- [X] T072 [P] [US1] Write unit tests for StorageBucketService in src/domain/storage/storage-bucket/storage.bucket.service.spec.ts

### template module

- [X] T073 [P] [US1] Write unit tests for TemplateApplierService in src/domain/template/template-applier/template.applier.service.spec.ts
- [X] T074 [P] [US1] Write unit tests for TemplateContentSpaceLookupService in src/domain/template/template-content-space/template-content-space.lookup/template-content-space.lookup.service.spec.ts
- [X] T075 [P] [US1] Write unit tests for TemplateContentSpaceService in src/domain/template/template-content-space/template.content.space.service.spec.ts
- [X] T076 [P] [US1] Write unit tests for TemplateDefaultService in src/domain/template/template-default/template.default.service.spec.ts
- [X] T077 [P] [US1] Write unit tests for TemplateService in src/domain/template/template/template.service.spec.ts
- [X] T078 [P] [US1] Write unit tests for TemplatesManagerService in src/domain/template/templates-manager/templates.manager.service.spec.ts
- [X] T079 [P] [US1] Write unit tests for TemplatesSetService in src/domain/template/templates-set/templates.set.service.spec.ts

### timeline module

- [X] T080 [P] [US1] Write unit tests for CalendarService in src/domain/timeline/calendar/calendar.service.spec.ts
- [X] T081 [P] [US1] Write unit tests for EventService in src/domain/timeline/event/event.service.spec.ts
- [X] T082 [P] [US1] Write unit tests for TimelineService in src/domain/timeline/timeline/timeline.service.spec.ts

**Checkpoint**: Domain layer should have 90%+ file coverage. Run `pnpm test -- src/domain/` to verify all domain tests pass independently.

---

## Phase 4: User Story 2 — Common Utility & Library Verification (Priority: P2)

**Goal**: Unit tests for shared utility functions and library modules so that foundational code used across the application is proven correct, preventing cascading failures.

**Independent Test**: Run `pnpm test -- src/common/utils/ src/library/` — utility tests are fully self-contained with no mocks required.

**Pattern**: Use Pattern C (pure utility) for all common utils — direct import and test of pure functions. Use Pattern A or B for library services. Use Pattern D (parameterized `it.each`) for functions with many input/output combinations.

### common utilities

- [X] T083 [P] [US2] Write unit tests for arrayRandomElement in src/common/utils/array.random.element.spec.ts
- [X] T084 [P] [US2] Write unit tests for asyncFilter in src/common/utils/async.filter.spec.ts
- [X] T085 [P] [US2] Write unit tests for asyncMapSequential in src/common/utils/async.map.sequential.spec.ts
- [X] T086 [P] [US2] Write unit tests for asyncMap in src/common/utils/async.map.spec.ts
- [X] T087 [P] [US2] Write unit tests for asyncReduceSequential in src/common/utils/async.reduce.sequential.spec.ts
- [X] T088 [P] [US2] Write unit tests for asyncReduce in src/common/utils/async.reduce.spec.ts
- [X] T089 [P] [US2] Write unit tests for base64ToBuffer in src/common/utils/base64.to.buffer.spec.ts
- [X] T090 [P] [US2] Write unit tests for calculateBufferHash in src/common/utils/calculate.buffer.hash.spec.ts
- [X] T091 [P] [US2] Write unit tests for compareEnums in src/common/utils/compare.enums.spec.ts
- [X] T092 [P] [US2] Write unit tests for convertToEntity in src/common/utils/convert-to-entity/convert.to.entity.spec.ts
- [X] T093 [P] [US2] Write unit tests for email utility functions in src/common/utils/email.util.spec.ts
- [X] T094 [P] [US2] Write unit tests for file utility functions in src/common/utils/file.util.spec.ts
- [X] T095 [P] [US2] Write unit tests for getSession in src/common/utils/get.session.spec.ts
- [X] T096 [P] [US2] Write unit tests for image utility functions in src/common/utils/image.util.spec.ts
- [X] T097 [P] [US2] Write unit tests for isDefined in src/common/utils/is.defined.spec.ts
- [X] T098 [P] [US2] Write unit tests for limitAndShuffle in src/common/utils/limitAndShuffle.spec.ts
- [X] T099 [P] [US2] Write unit tests for pathResolve in src/common/utils/path.resolve.spec.ts
- [X] T100 [P] [US2] Write unit tests for randomIdGenerator in src/common/utils/random.id.generator.util.spec.ts
- [X] T101 [P] [US2] Write unit tests for random utility functions in src/common/utils/random.util.spec.ts
- [X] T102 [P] [US2] Write unit tests for string utility functions in src/common/utils/string.util.spec.ts
- [X] T103 [P] [US2] Write unit tests for stringify utility functions in src/common/utils/stringify.util.spec.ts
- [X] T104 [P] [US2] Write unit tests for untildify in src/common/utils/untildify.spec.ts

### library services

- [X] T105 [P] [US2] Write unit tests for InnovationPackDefaultsService in src/library/innovation-pack/innovation.pack.defaults/innovation.pack.defaults.service.spec.ts
- [X] T106 [P] [US2] Write unit tests for LibraryService in src/library/library/library.service.spec.ts

**Checkpoint**: Common/Library layer should have 90%+ file coverage. Run `pnpm test -- src/common/utils/ src/library/` to verify.

---

## Phase 5: User Story 3 — Application & Infrastructure Service Verification (Priority: P3)

**Goal**: Unit tests for application-layer services (API delegation, adapters, infrastructure) so that the orchestration between domain and external systems is verified.

**Independent Test**: Run `pnpm test -- src/services/ src/platform/ src/platform-admin/` — each service layer can be tested independently.

**Pattern**: Use Pattern B (NestJS TestingModule) with `defaultMockerFactory` for most services. Mock domain services at boundaries.

**FR-004 Filter**: Only test services with non-trivial logic (conditional branching, data transformation). Skip pure pass-through delegation. If a service has no `if`/`switch`/ternary/transformation, mark the task as skipped.

### src/services/ — Adapters & AI

- [X] T107 [P] [US3] Write unit tests for AiServerAdapterDtoUpdateAiPersonaService in src/services/adapters/ai-server-adapter/dto/ai.server.adapter.dto.update.ai.persona.service.spec.ts
- [X] T108 [P] [US3] Write unit tests for AiPersonaService in src/services/ai-server/ai-persona/ai.persona.service.spec.ts
- [X] T109 [P] [US3] Write unit tests for AiServerService in src/services/ai-server/ai-server/ai.server.service.spec.ts
- [X] T110 [P] [US3] Write unit tests for AiServerDtoIngestAiPersonaService in src/services/ai-server/ai-server/dto/ai.server.dto.ingest.ai.persona.service.spec.ts

### src/services/ — API services

- [X] T111 [P] [US3] Write unit tests for IdentityResolveService in src/services/api-rest/identity-resolve/identity-resolve.service.spec.ts
- [X] T112 [P] [US3] Write unit tests for ActivityLogBuilderService in src/services/api/activity-log/activity.log.builder.service.spec.ts
- [X] T113 [P] [US3] Write unit tests for ConversionService in src/services/api/conversion/conversion.service.spec.ts
- [X] T114 [P] [US3] Write unit tests for InputCreatorService in src/services/api/input-creator/input.creator.service.spec.ts
- [X] T115 [P] [US3] Write unit tests for LookupByNameService in src/services/api/lookup-by-name/lookup.by.name.service.spec.ts
- [X] T116 [P] [US3] Write unit tests for LookupService in src/services/api/lookup/lookup.service.spec.ts
- [X] T117 [P] [US3] Write unit tests for NotificationRecipientsService in src/services/api/notification-recipients/notification.recipients.service.spec.ts
- [X] T118 [P] [US3] Write unit tests for RegistrationService in src/services/api/registration/registration.service.spec.ts
- [X] T119 [P] [US3] Write unit tests for SearchExtractService in src/services/api/search/extract/search.extract.service.spec.ts
- [X] T120 [P] [US3] Write unit tests for SearchResultService in src/services/api/search/result/search.result.service.spec.ts
- [X] T121 [P] [US3] Write unit tests for UrlResolverService in src/services/api/url-resolver/url.resolver.service.spec.ts

### src/services/ — Integration services

- [X] T122 [P] [US3] Write unit tests for CollaborativeDocumentIntegrationService in src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts

### src/services/ — Event handler services

- [X] T123 [P] [US3] Write unit tests for MessageInboxService in src/services/event-handlers/internal/message-inbox/message.inbox.service.spec.ts
- [X] T124 [P] [US3] Write unit tests for MessageNotificationService in src/services/event-handlers/internal/message-inbox/message.notification.service.spec.ts
- [X] T125 [P] [US3] Write unit tests for VcInvocationService in src/services/event-handlers/internal/message-inbox/vc.invocation.service.spec.ts

### src/services/ — External services

- [X] T126 [P] [US3] Write unit tests for AvatarCreatorService in src/services/external/avatar-creator/avatar.creator.service.spec.ts
- [X] T127 [P] [US3] Write unit tests for GeoapifyService in src/services/external/geoapify/geoapify.service.spec.ts

### src/services/ — File & Room integration

- [X] T128 [P] [US3] Write unit tests for FileIntegrationService in src/services/file-integration/file.integration.service.spec.ts
- [X] T129 [P] [US3] Write unit tests for RoomControllerService in src/services/room-integration/room.controller.service.spec.ts

### src/services/ — Infrastructure services

- [X] T130 [P] [US3] Write unit tests for ContributorLookupService in src/services/infrastructure/contributor-lookup/contributor.lookup.service.spec.ts
- [X] T131 [P] [US3] Write unit tests for CommunityResolverService in src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts
- [X] T132 [P] [US3] Write unit tests for ContributionResolverService in src/services/infrastructure/entity-resolver/contribution.resolver.service.spec.ts
- [X] T133 [P] [US3] Write unit tests for RoomResolverService in src/services/infrastructure/entity-resolver/room.resolver.service.spec.ts
- [X] T134 [P] [US3] Write unit tests for TimelineResolverService in src/services/infrastructure/entity-resolver/timeline.resolver.service.spec.ts
- [X] T135 [P] [US3] Write unit tests for KratosService in src/services/infrastructure/kratos/kratos.service.spec.ts
- [X] T136 [P] [US3] Write unit tests for SpaceFilterService in src/services/infrastructure/space-filter/space.filter.service.spec.ts
- [X] T137 [P] [US3] Write unit tests for StorageAggregatorResolverService in src/services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service.spec.ts
- [X] T138 [P] [US3] Write unit tests for TemporaryStorageService in src/services/infrastructure/temporary-storage/temporary.storage.service.spec.ts
- [X] T139 [P] [US3] Write unit tests for UrlGeneratorService in src/services/infrastructure/url-generator/url.generator.service.spec.ts

### src/services/ — Subscription services

- [X] T140 [P] [US3] Write unit tests for SubscriptionPublishService in src/services/subscriptions/subscription-service/subscription.publish.service.spec.ts
- [X] T141 [P] [US3] Write unit tests for SubscriptionReadService in src/services/subscriptions/subscription-service/subscription.read.service.spec.ts

### src/platform/ services

- [X] T142 [P] [US3] Write unit tests for ActivityService in src/platform/activity/activity.service.spec.ts
- [X] T143 [P] [US3] Write unit tests for PlatformAuthorizationPolicyService in src/platform/authorization/platform.authorization.policy.service.spec.ts
- [X] T144 [P] [US3] Write unit tests for ForumDiscussionLookupService in src/platform/forum-discussion-lookup/forum.discussion.lookup.service.spec.ts
- [X] T145 [P] [US3] Write unit tests for DiscussionService in src/platform/forum-discussion/discussion.service.spec.ts
- [X] T146 [P] [US3] Write unit tests for InAppNotificationService in src/platform/in-app-notification/in.app.notification.service.spec.ts
- [X] T147 [P] [US3] Write unit tests for LicenseIssuerService in src/platform/licensing/credential-based/license-credential-issuer/license.issuer.service.spec.ts
- [X] T148 [P] [US3] Write unit tests for LicensePlanService in src/platform/licensing/credential-based/license-plan/license.plan.service.spec.ts
- [X] T149 [P] [US3] Write unit tests for LicensePolicyService in src/platform/licensing/credential-based/license-policy/license.policy.service.spec.ts
- [X] T150 [P] [US3] Write unit tests for LicensingFrameworkService in src/platform/licensing/credential-based/licensing-framework/licensing.framework.service.spec.ts
- [X] T151 [P] [US3] Write unit tests for PlatformSettingsService in src/platform/platform-settings/platform.settings.service.spec.ts
- [X] T152 [P] [US3] Write unit tests for PlatformTemplatesService in src/platform/platform-templates/platform.templates.service.spec.ts
- [X] T153 [P] [US3] Write unit tests for PlatformWellKnownVirtualContributorsService in src/platform/platform.well.known.virtual.contributors/platform.well.known.virtual.contributors.service.spec.ts

### src/platform-admin/ services

- [X] T154 [P] [US3] Write unit tests for PlatformAdminService in src/platform-admin/admin/platform.admin.service.spec.ts
- [X] T155 [P] [US3] Write unit tests for AdminIdentityService in src/platform-admin/core/identity/admin.identity.service.spec.ts
- [X] T156 [P] [US3] Write unit tests for AdminAuthorizationService in src/platform-admin/domain/authorization/admin.authorization.service.spec.ts
- [X] T157 [P] [US3] Write unit tests for AdminCommunicationService in src/platform-admin/domain/communication/admin.communication.service.spec.ts
- [X] T158 [P] [US3] Write unit tests for DomainPlatformSettingsService in src/platform-admin/domain/organization/domain.platform.settings.service.spec.ts
- [X] T159 [P] [US3] Write unit tests for AuthenticationIdBackfillService in src/platform-admin/domain/user/authentication-id-backfill/authentication-id-backfill.service.spec.ts
- [X] T160 [P] [US3] Write unit tests for AdminWhiteboardService in src/platform-admin/domain/whiteboard/admin.whiteboard.service.spec.ts
- [X] T161 [P] [US3] Write unit tests for InAppNotificationAdminService in src/platform-admin/in-app-notification/in.app.notification.admin.service.spec.ts
- [X] T162 [P] [US3] Write unit tests for AdminLicensingService in src/platform-admin/licensing/admin.licensing.service.spec.ts

**Checkpoint**: Application/Platform layers should have 80%+ file coverage. Run `pnpm test -- src/services/ src/platform/ src/platform-admin/` to verify.

---

## Phase 6: User Story 4 — Core Framework Service Verification (Priority: P4)

**Goal**: Unit tests for core framework services (authentication caching, microservice resilience) so that cross-cutting infrastructure concerns are verified.

**Independent Test**: Run `pnpm test -- src/core/` — core tests verify behavior without requiring a running auth stack.

**Pattern**: Use Pattern B (NestJS TestingModule) with config mocking.

- [X] T163 [P] [US4] Write unit tests for AgentInfoCacheService in src/core/authentication.agent.info/agent.info.cache.service.spec.ts
- [X] T164 [P] [US4] Write unit tests for RabbitmqResilienceService in src/core/microservices/rabbitmq.resilience.service.spec.ts

**Checkpoint**: Core layer should have 90%+ file coverage. Run `pnpm test -- src/core/` to verify.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all layers

- [X] T165 Run full test suite with `pnpm test:ci` and verify all tests pass within 5-minute CI budget (SC-006)
- [X] T166 Generate coverage report and verify layer targets — Domain 90%+, Common/Library 90%+, Application 80%+, Core 90%+ (SC-005)
- [X] T167 Run quickstart.md validation to confirm test development guide is accurate

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No tasks — existing infrastructure is ready
- **User Stories (Phase 3–6)**: All depend on Phase 1 baseline verification
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order: P1 → P2 → P3 → P4
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 — Domain (P1)**: Can start after Phase 1 — no dependencies on other stories
- **US2 — Common/Library (P2)**: Can start after Phase 1 — fully independent of US1
- **US3 — App/Platform (P3)**: Can start after Phase 1 — fully independent of US1/US2
- **US4 — Core (P4)**: Can start after Phase 1 — fully independent of other stories

### Within Each User Story

All tasks within a story are marked [P] (parallelizable) because each creates an independent `.spec.ts` file. The only exception is T038 (lifecycle replacement) which modifies an existing file.

### Parallel Opportunities

- **All tasks marked [P] within any phase can run simultaneously** — each task creates a separate file
- **All four user stories can execute in parallel** if team capacity allows
- **Suggested batch size**: Process one domain module at a time (5–17 files) for manageable review
- **Maximum parallelism**: All 162 implementation tasks are independent and can theoretically run in parallel

---

## Parallel Example: Domain collaboration module

```bash
# All collaboration tasks can launch simultaneously:
Task T010: "Write unit tests for CalloutContributionDefaultsService"
Task T011: "Write unit tests for CalloutContributionMoveService"
Task T012: "Write unit tests for CalloutContributionService"
Task T013: "Write unit tests for CalloutFramingService"
Task T014: "Write unit tests for CalloutTransferService"
Task T015: "Write unit tests for CalloutService"
Task T016: "Write unit tests for CalloutsSetService"
Task T017: "Write unit tests for CollaborationService"
Task T018: "Write unit tests for InnovationFlowStateService"
Task T019: "Write unit tests for LinkService"
Task T020: "Write unit tests for PostService"
```

## Parallel Example: Common utilities

```bash
# All utility tasks can launch simultaneously:
Task T083: "Write unit tests for arrayRandomElement"
Task T084: "Write unit tests for asyncFilter"
Task T093: "Write unit tests for email utility functions"
Task T102: "Write unit tests for string utility functions"
# ... all 22 utility tasks in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 — Domain Services Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 3: US1 Domain Services (T003–T082)
3. **STOP and VALIDATE**: Run `pnpm test -- src/domain/` — verify 90%+ domain file coverage
4. This alone delivers the highest-value regression protection

### Incremental Delivery

1. Phase 1 → Baseline verified
2. US1 (Domain) → 90%+ domain coverage — **MVP complete**
3. US2 (Common/Library) → 90%+ utility coverage — broadens foundation
4. US3 (App/Platform) → 80%+ app coverage — completes breadth
5. US4 (Core) → 90%+ core coverage — fills remaining gaps
6. Phase 7 → Final validation and CI budget check

### Suggested Module Order Within US1 (by coverage gap severity)

Start with 0% coverage modules for maximum impact:
1. template (7 services) — template creation, bundling, defaults
2. timeline (3 services) — calendar events
3. agent (2 services) — agent lifecycle
4. storage (3 services) — document lifecycle
5. innovation-hub (1 service) — hub configuration

Then address large-gap modules:
6. collaboration (11 services) — callouts, contributions, flows
7. common domain (18 services) — profiles, visuals, forms, auth policies
8. space (9 services) — accounts, settings, lookups
9. communication (7 services) — messaging, rooms
10. community (14 services) — users, orgs, virtual contributors
11. access (5 services) — roles, invitations, applications

---

## Notes

- [P] tasks = different files, no dependencies — can run simultaneously
- [US*] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Follow quickstart.md patterns (Pattern A/B/C/D) per service layer
- Test naming: `should [expected behavior] when [condition]` (FR-006)
- Test order: happy path → domain violations → edge cases → error handling (FR-013)
- No trivial tests: never write `should be defined` assertions (FR-009)
- Mock at boundaries only: repositories, external services, event publishers (FR-008)
- Error paths: verify exception types, no dynamic data in messages (FR-011)
- Skip pure pass-through services with no conditional logic (FR-004)
- Commit after each module batch for manageable review
