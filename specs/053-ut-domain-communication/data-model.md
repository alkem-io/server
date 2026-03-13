# Data Model: src/domain/communication

## Entity Relationships
- **Communication** (1:1 with Space) -> has 1 **Room** (updates)
- **Messaging** (1:1 with Platform) -> has many **Conversation**
- **Conversation** -> has 1 **Room**, has many **ConversationMembership**
- **ConversationMembership** -> links Conversation to Actor (actorID, actorType)
- **Room** -> has messages (via CommunicationAdapter/Matrix), has authorization
- **Message** -> has sender (actorID), replies, reactions
- **MessageReaction** -> has sender (actorID), emoji

## Key Services
- CommunicationService: CRUD for Communication aggregate (Space updates room)
- MessagingService: Platform messaging singleton, conversation lifecycle
- ConversationService: Conversation CRUD, membership management
- RoomService: Room CRUD, message operations via CommunicationAdapter
- RoomLookupService: Room lookup and message sending
- RoomMentionsService: @mention resolution
- RoomServiceEvents: Activity/notification/contribution tracking
- RoomAuthorizationService: Authorization policy management for rooms
- CommunicationAuthorizationService: Authorization cascading for communication
- ConversationAuthorizationService: Membership-based authorization for conversations

## External Dependencies (mocked in tests)
- CommunicationAdapter: Matrix/Synapse communication bridge
- ActivityAdapter: Activity logging
- NotificationSpaceAdapter/NotificationUserAdapter/NotificationPlatformAdapter: Notifications
- ContributionReporterService: Elasticsearch contribution tracking
- CommunityResolverService/TimelineResolverService: Entity resolution
- SubscriptionPublishService/SubscriptionReadService: GraphQL subscriptions
