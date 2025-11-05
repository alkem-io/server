# Implementation Tasks: Timeline Event Comment Notification

**Feature**: 013-timeline-comment-notification
**Date**: 2025-11-05
**Total Estimated Hours**: 4-6 hours

---

## Task Format

```
- [ ] [T001] [P] [US1] Description with file path
```

- **[TXXX]**: Sequential task ID
- **[P]**: Parallel-safe (can be done alongside other [P] tasks)
- **[Story]**: User story label (US1, US2, US3) or blank for foundational tasks

---

## Phase 1: Setup & Infrastructure

### Enum and Type System Foundation

- [x] [T001] Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT to NotificationEvent enum in `src/common/enums/notification.event.ts`
- [x] [T002] Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT to NotificationEventPayload enum in `src/common/enums/notification.event.payload.ts`

---

## Phase 2: Foundational Data Structures (BLOCKING - Must Complete Before Stories)

### DTO Layer

- [x] [T003] [P] Create NotificationInputCommunityCalendarEventComment DTO interface in `src/services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.calendar.event.comment.ts`
- [x] [T004] [P] Create InAppNotificationPayloadSpaceCommunityCalendarEventComment GraphQL type in `src/platform/in-app-notification-payload/dto/space/notification.in.app.payload.space.community.calendar.event.comment.ts`

### GraphQL Schema Integration

- [x] [T005] Create InAppNotificationPayloadSpaceCommunityCalendarEventCommentResolverFields field resolver in `src/platform/in-app-notification-payload/field-resolvers/space/in.app.notification.payload.space.community.calendar.event.comment.resolver.fields.ts`
- [x] [T006] Register field resolver provider in InAppNotificationPayloadModule in `src/platform/in-app-notification-payload/in.app.notification.payload.module.ts`
- [x] [T007] Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT case to resolveType switch in IInAppNotificationPayload interface in `src/platform/in-app-notification-payload/in.app.notification.payload.interface.ts`

### Schema Verification

- [x] [T008] Run `pnpm run schema:print` and verify new enum values appear in generated schema
- [x] [T009] Run `pnpm build` and verify no TypeScript compilation errors

---

## Phase 3: User Story 1 - Core Notification Delivery (P1 - MVP)

**Goal**: Send notifications when users comment on calendar events

### Notification Recipients Service

- [x] [T010] [US1] Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT case to getChannelsSettingsForEvent switch in `src/services/api/notification-recipients/notification.recipients.service.ts`
- [x] [T011] [US1] Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT case to getPrivilegeRequiredCredentialCriteria switch in `src/services/api/notification-recipients/notification.recipients.service.ts`
- [x] [T012] [US1] Add SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT case to getAuthorizationPolicy switch in `src/services/api/notification-recipients/notification.recipients.service.ts`

### Notification Adapters

- [x] [T013] [US1] Implement spaceCommunityCalendarEventComment method with recipient filtering logic in `src/services/adapters/notification-adapter/notification.space.adapter.ts`
- [x] [T014] [US1] Implement buildSpaceCommunityCalendarEventCommentPayload method for email notifications in `src/services/adapters/notification-external-adapter/notification.external.adapter.ts`

### Event Processing

- [x] [T015] [US1] Add CalendarEventService to RoomServiceEvents constructor and import CalendarEventModule in `src/domain/communication/room/room.module.ts`
- [x] [T016] [US1] Implement processNotificationCalendarEventComment method in `src/domain/communication/room/room.service.events.ts`
- [x] [T017] [US1] Integrate processNotificationCalendarEventComment call into CALENDAR_EVENT case in sendMessageToRoom method in `src/domain/communication/room/room.resolver.mutations.ts`

### Schema Contract Validation

- [x] [T018] [US1] Run `pnpm run schema:print && pnpm run schema:sort` to regenerate schema
- [x] [T019] [US1] Run `pnpm run schema:diff` and verify all changes are non-breaking additions
- [x] [T020] [US1] Review change-report.json for any BREAKING or PREMATURE_REMOVAL flags

---

## Phase 4: User Story 2 - Respect User Preferences (P2)

**Goal**: Honor user notification preference settings

### User Settings Integration

- [ ] [T021] [US2] Verify communityCalendarEvents setting exists in user_settings notification JSON column (no code changes - validation task)
- [ ] [T022] [US2] Test with user who has email enabled but in-app disabled - verify only email delivered
- [ ] [T023] [US2] Test with user who has in-app enabled but email disabled - verify only in-app delivered
- [ ] [T024] [US2] Test with user who has both channels disabled - verify no notifications delivered

---

## Phase 5: User Story 3 - Community Scope Filtering (P3)

**Goal**: Ensure only community members receive notifications

### Authorization and Filtering

- [ ] [T025] [US3] Verify getNotificationRecipientsSpace filters by SPACE_MEMBER credential (no code changes - validation task)
- [ ] [T026] [US3] Verify READ privilege check on Space authorization policy (no code changes - validation task)
- [ ] [T027] [US3] Test with non-community member - verify they do not receive notification
- [ ] [T028] [US3] Test with community member without READ privilege - verify they do not receive notification

---

## Phase 6: Integration & Polish

### Final Validation

- [ ] [T029] Perform end-to-end test: Post comment to calendar event room and verify notifications delivered (MANUAL TEST REQUIRED)
- [ ] [T030] Verify comment author is excluded from recipient list in both email and in-app channels (MANUAL TEST REQUIRED)
- [ ] [T031] Verify navigation URLs in email payload point to correct calendar event detail page (MANUAL TEST REQUIRED)
- [ ] [T032] Verify comment preview truncates to 200 characters correctly (MANUAL TEST REQUIRED)
- [ ] [T033] Verify in-app notification payload contains all required fields (calendarEventID, calendarEventTitle, commentID, commentText, commenterID) (MANUAL TEST REQUIRED)

### Documentation & Compliance

- [x] [T034] Update `docs/Notifications.md` with new SPACE_COMMUNITY_CALENDAR_EVENT_COMMENT event entry
- [x] [T035] Verify no circular dependencies introduced: Clean module imports (no forwardRef required)
- [x] [T036] Run full test suite: `pnpm test:ci` and verify no regressions - ✅ All 94 test suites passed (307 tests)

---

## Implementation Strategy

### MVP First (Complete in Order)

1. **Phase 1 + Phase 2** → Foundation ready (T001-T009)
2. **Phase 3** → US1 complete (T010-T020) → **STOP and VALIDATE**
3. Deploy/demo if ready

### Incremental Delivery

- After Phase 3 validation passes, continue with:
  - **Phase 4** → US2 complete (T021-T024) → **Validate independently**
  - **Phase 5** → US3 complete (T025-T028) → **Validate independently**
  - **Phase 6** → Final polish (T029-T036)

### Parallel Team Strategy

- Team completes Phase 1 + Phase 2 together (T001-T009)
- Once foundational tasks done:
  - **Developer A**: Phase 3 (US1 tasks T010-T020)
  - **Developer B**: Phase 4 (US2 tasks T021-T024) after T013 merges
  - **Developer C**: Phase 5 (US3 tasks T025-T028) after T011-T012 merge

---

## Task Dependencies

### Critical Path (Sequential)

```
T001 → T002 → T003+T004 → T005 → T006 → T007 → T008 → T009
    ↓
T010+T011+T012 → T013 → T014 → T015 → T016 → T017
    ↓
T018 → T019 → T020
```

### Parallel Tasks

- **T003 + T004**: Different files, no conflicts
- **T010 + T011 + T012**: Same file but different switch statement cases - can be done together in one commit
- **T021-T024**: Validation tasks, can run concurrently
- **T025-T028**: Validation tasks, can run concurrently
- **T029-T033**: Integration tests, can run concurrently

---

## Testing Notes

Per spec requirements:

- **No automated tests required** for this feature
- Manual validation tasks included in Phases 4, 5, and 6
- End-to-end testing via GraphQL mutations and database inspection

---

## Risk Mitigations

| Risk                                     | Mitigation Task(s)                                   |
| ---------------------------------------- | ---------------------------------------------------- |
| Schema contract broken                   | T018, T019, T020 (schema diff validation)            |
| Circular dependencies                    | T035 (explicit check)                                |
| Missing authorization checks             | T011, T012, T026 (privilege & credential validation) |
| Comment author receives own notification | T030 (explicit exclusion test)                       |
| Performance regression                   | T036 (full test suite)                               |

---

## Exit Criteria

### Phase 3 (US1) Complete When:

- ✅ New notification event enum values exist
- ✅ DTOs and GraphQL types compile successfully
- ✅ Notification sent to community members on calendar event comment
- ✅ Schema diff shows only non-breaking additions

### Phase 4 (US2) Complete When:

- ✅ Email-only preference users receive only email
- ✅ In-app-only preference users receive only in-app
- ✅ Disabled preference users receive no notifications

### Phase 5 (US3) Complete When:

- ✅ Non-community members receive no notifications
- ✅ Community members without READ privilege receive no notifications
- ✅ Only authorized community members receive notifications

### Phase 6 Complete When:

- ✅ All validation tasks pass (T029-T033)
- ✅ Documentation updated
- ✅ No circular dependencies
- ✅ Full test suite passes

---

## Estimated Time Breakdown

| Phase     | Tasks        | Estimated Time  |
| --------- | ------------ | --------------- |
| Phase 1   | T001-T002    | 15 min          |
| Phase 2   | T003-T009    | 1.5 hours       |
| Phase 3   | T010-T020    | 2 hours         |
| Phase 4   | T021-T024    | 30 min          |
| Phase 5   | T025-T028    | 30 min          |
| Phase 6   | T029-T036    | 1 hour          |
| **Total** | **36 tasks** | **5.5-6 hours** |

---

## Notes

- All tasks reference absolute file paths from workspace root
- [P] tasks operate on different files and can be done in parallel
- [US1], [US2], [US3] labels map to user stories in spec.md
- No database migrations required (reuses existing user_settings JSON column)
- Pattern follows existing SPACE_COMMUNITY_CALENDAR_EVENT_CREATED implementation
- Constitution compliance verified in plan.md (all 10 principles PASS)

---

**Ready to implement?** Start with Phase 1 (T001-T002) → Phase 2 (T003-T009) → Phase 3 (US1 tasks T010-T020).
