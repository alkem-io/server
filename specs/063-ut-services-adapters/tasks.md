# Tasks: Unit Tests for src/services/adapters

## T1: Write notification.in.app.adapter.spec.ts (expand existing skeleton)
- Test unsupported event type filtering
- Test empty receiverIDs guard
- Test happy path with multiple receivers
- Test counter update failure handling

## T2: Write activity.adapter.spec.ts
- Test subspaceCreated with valid data
- Test subspaceCreated throwing EntityNotFoundException
- Test calloutPublished, calloutPostCreated
- Test messageRemoved (activity found vs not found)
- Test private helper methods via public method calls

## T3: Write ai.server.adapter.spec.ts
- Test all delegation methods
- Test invoke with externalMetadata defaulting

## T4: Write communication.adapter.event.service.spec.ts
- Test each onXxx handler emits correct event
- Test error handling returns Nack

## T5: Write notification.adapter.spec.ts
- Test getNotificationRecipients delegation

## T6: Write notification.organization.adapter.spec.ts
- Test organizationMention with email + in-app recipients
- Test organizationSendMessage with sender notifications

## T7: Write notification.platform.adapter.spec.ts
- Test platformGlobalRoleChanged, platformForumDiscussionCreated
- Test platformForumDiscussionComment (commenter filtering)
- Test platformInvitationCreated, platformSpaceCreated
- Test platformUserProfileCreated, platformUserRemoved

## T8: Write notification.space.adapter.spec.ts
- Test spaceCollaborationCalloutPublished (publisher filtering)
- Test spaceCommunityCalendarEventComment (creator == commenter early return)
- Test spaceCollaborationCalloutContributionCreated (EntityNotFoundException catch)
- Test excludeDuplicatedRecipients helper

## T9: Write notification.user.adapter.spec.ts
- Test userMention (sender filtering)
- Test userCommentReply (error catch)
- Test userSignUpWelcome, userSpaceCommunityInvitationCreated

## T10: Write notification.external.adapter.spec.ts
- Test sendExternalNotifications emits event
- Test buildBaseEventPayload, buildSpacePayload
- Test contribution type branching in buildSpaceCollaborationCreatedPayload
- Test getContributorPayloadOrEmpty with undefined

## T11: Write local.storage.adapter.spec.ts
- Test save/read/delete/exists when enabled
- Test StorageDisabledException when disabled
- Test error wrapping for file operations

## T12: Verify coverage and fix gaps
- Run coverage report
- Add missing test cases if below 80%
