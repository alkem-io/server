create table activity
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  rowId           int auto_increment,
  triggeredBy     char(36)                                 not null,
  resourceID      char(36)                                 not null,
  parentID        char(36)                                 null,
  collaborationID char(36)                                 not null,
  messageID       char(44)                                 null,
  visibility      tinyint                                  not null,
  description     varchar(512)                             null,
  type            varchar(128)                             not null,
  constraint IDX_07a39cea9426b689be25fd61de
    unique (rowId)
);

create table authorization_policy
(
  id                          char(36)                                 not null
    primary key,
  createdDate                 datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                 datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                     int                                      not null,
  credentialRules             json                                     not null,
  privilegeRules              json                                     not null,
  type                        varchar(128)                             not null,
  parentAuthorizationPolicyId char(36)                                 null,
  constraint FK_24b8950effd9ba78caa48ba76df
    foreign key (parentAuthorizationPolicyId) references authorization_policy (id)
      on delete set null
);

create table agent
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  type            varchar(128)                             null,
  authorizationId char(36)                                 null,
  constraint REL_8ed9d1af584fa62f1ad3405b33
    unique (authorizationId),
  constraint FK_8ed9d1af584fa62f1ad3405b33b
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table ai_server
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  constraint REL_9d520fa5fed56042918e48fc4b
    unique (authorizationId),
  constraint FK_9d520fa5fed56042918e48fc4b5
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table ai_persona
(
  id                         char(36)                                 not null
    primary key,
  createdDate                datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                    int                                      not null,
  engine                     varchar(128)                             not null,
  prompt                     text                                     not null,
  bodyOfKnowledgeLastUpdated datetime                                 null,
  externalConfig             text                                     null,
  authorizationId            char(36)                                 null,
  aiServerId                 char(36)                                 null,
  promptGraph                json                                     null,
  constraint REL_293f0d3ef60cb0ca0006044ecf
    unique (authorizationId),
  constraint FK_293f0d3ef60cb0ca0006044ecfd
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_7460caf8dad74c0a302af76b1d5
    foreign key (aiServerId) references ai_server (id)
);

create table calendar
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  constraint REL_6e74d59afda096b68d12a69969
    unique (authorizationId),
  constraint FK_6e74d59afda096b68d12a699691
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table callout_contribution_defaults
(
  id                 char(36)                                 not null
    primary key,
  createdDate        datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate        datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version            int                                      not null,
  defaultDisplayName text                                     null,
  postDescription    text                                     null,
  whiteboardContent  longtext                                 null
);

create table classification
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  constraint REL_42422fc4b9dfe4424046f12d8f
    unique (authorizationId),
  constraint FK_42422fc4b9dfe4424046f12d8fd
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table conversations_set
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  constraint REL_57e3ee47af26b479a67e7f94da
    unique (authorizationId),
  constraint FK_57e3ee47af26b479a67e7f94da0
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table credential
(
  id          char(36)                                 not null
    primary key,
  createdDate datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version     int                                      not null,
  resourceID  varchar(36)                              not null,
  type        varchar(128)                             not null,
  issuer      char(36)                                 null,
  expires     datetime                                 null,
  agentId     char(36)                                 null,
  constraint FK_dbe0929355f82e5995f0b7fd5e2
    foreign key (agentId) references agent (id)
      on delete cascade
);

create table form
(
  id          char(36)                                 not null
    primary key,
  createdDate datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version     int                                      not null,
  questions   text                                     not null,
  description text                                     not null
);

create table forum
(
  id                   char(36)                                 not null
    primary key,
  createdDate          datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate          datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version              int                                      not null,
  discussionCategories text                                     not null,
  authorizationId      char(36)                                 null,
  constraint REL_3b0c92945f36d06f37de80285d
    unique (authorizationId),
  constraint FK_3b0c92945f36d06f37de80285dd
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table library
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  constraint REL_3879db652f2421337691219ace
    unique (authorizationId),
  constraint FK_3879db652f2421337691219ace8
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table license
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  type            varchar(128)                             not null,
  authorizationId char(36)                                 null,
  constraint REL_bfd01743815f0dd68ac1c5c45c
    unique (authorizationId),
  constraint FK_bfd01743815f0dd68ac1c5c45c0
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table license_entitlement
(
  id          char(36)                                 not null
    primary key,
  createdDate datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version     int                                      not null,
  type        varchar(128)                             not null,
  dataType    varchar(128)                             not null,
  `limit`     int                                      not null,
  enabled     tinyint                                  not null,
  licenseId   char(36)                                 null,
  constraint FK_badab780c9f3e196d98ab324686
    foreign key (licenseId) references license (id)
      on delete cascade
);

create table license_policy
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  credentialRules json                                     not null,
  authorizationId char(36)                                 null,
  constraint REL_23d4d78ea8db637df031f86f03
    unique (authorizationId),
  constraint FK_23d4d78ea8db637df031f86f030
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table licensing_framework
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  licensePolicyId char(36)                                 null,
  constraint REL_29b5cd2c555b47f80942dfa4aa
    unique (authorizationId),
  constraint REL_427ff5dfcabbc692ed6d71acae
    unique (licensePolicyId),
  constraint FK_29b5cd2c555b47f80942dfa4aa7
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_427ff5dfcabbc692ed6d71acaea
    foreign key (licensePolicyId) references license_policy (id)
      on delete set null
);

create table license_plan
(
  id                              char(36)                                 not null
    primary key,
  createdDate                     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                         int                                      not null,
  name                            text                                     not null,
  enabled                         tinyint     default 1                    not null,
  sortOrder                       int                                      not null,
  pricePerMonth                   decimal(10, 2)                           null,
  isFree                          tinyint     default 0                    not null,
  trialEnabled                    tinyint     default 0                    not null,
  requiresPaymentMethod           tinyint     default 0                    not null,
  requiresContactSupport          tinyint     default 0                    not null,
  licenseCredential               text                                     not null,
  type                            varchar(128)                             not null,
  assignToNewOrganizationAccounts tinyint     default 0                    not null,
  assignToNewUserAccounts         tinyint     default 0                    not null,
  licensingFrameworkId            char(36)                                 null,
  constraint FK_9f99adf29316d6aa1d0e8ecae54
    foreign key (licensingFrameworkId) references licensing_framework (id)
      on delete cascade
);

create table lifecycle
(
  id           char(36)                                 not null
    primary key,
  createdDate  datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate  datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version      int                                      not null,
  machineState text                                     null
);

create table location
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  city            varchar(128)                             null,
  country         varchar(128)                             null,
  addressLine1    varchar(512)                             null,
  addressLine2    varchar(512)                             null,
  stateOrProvince varchar(128)                             null,
  postalCode      varchar(128)                             null,
  geoLocation     json                                     not null
);

create table migrations_typeorm
(
  id        int auto_increment
        primary key,
  timestamp bigint       not null,
  name      varchar(255) not null
);

create table nvp
(
  id          char(36)                                 not null
    primary key,
  createdDate datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version     int                                      not null,
  name        varchar(512)                             not null,
  value       varchar(512)                             not null,
  sortOrder   int                                      not null
);

create table organization_verification
(
  id              char(36)                                  not null
    primary key,
  createdDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                       not null,
  organizationID  varchar(36)                               not null,
  status          varchar(128) default 'not-verified'       not null,
  authorizationId char(36)                                  null,
  lifecycleId     char(36)                                  null,
  constraint REL_1cc3b275fc2a9d9d9b0ae33b31
    unique (lifecycleId),
  constraint REL_c66eddab0caacb1ef8d46bcafd
    unique (authorizationId),
  constraint FK_1cc3b275fc2a9d9d9b0ae33b310
    foreign key (lifecycleId) references lifecycle (id)
      on delete set null,
  constraint FK_c66eddab0caacb1ef8d46bcafdb
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table `query-result-cache`
(
  id         int auto_increment
        primary key,
  identifier varchar(255) null,
  time       bigint       not null,
  duration   int          not null,
  query      text         not null,
  result     text         not null
);

create table role_set
(
  id                char(36)                                 not null
    primary key,
  createdDate       datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate       datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version           int                                      not null,
  entryRoleName     varchar(128)                             not null,
  authorizationId   char(36)                                 null,
  applicationFormId char(36)                                 null,
  parentRoleSetId   char(36)                                 null,
  licenseId         char(36)                                 null,
  type              varchar(128)                             not null,
  constraint REL_00905b142498f63e76d38fb254
    unique (applicationFormId),
  constraint REL_b038f74c8d4eadb839e78b99ce
    unique (authorizationId),
  constraint REL_c25bfb0c837427dd54e250b240
    unique (licenseId),
  constraint FK_00905b142498f63e76d38fb254e
    foreign key (applicationFormId) references form (id)
      on delete set null,
  constraint FK_86acc254af20d20c9d87c3503d5
    foreign key (parentRoleSetId) references role_set (id)
      on delete set null,
  constraint FK_b038f74c8d4eadb839e78b99ce5
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_c25bfb0c837427dd54e250b240e
    foreign key (licenseId) references license (id)
      on delete set null
);

create table invitation
(
  id                   char(36)                                 not null
    primary key,
  createdDate          datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate          datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version              int                                      not null,
  invitedContributorID char(36)                                 not null,
  createdBy            char(36)                                 not null,
  welcomeMessage       varchar(8192)                            null,
  invitedToParent      tinyint     default 0                    not null,
  contributorType      varchar(128)                             not null,
  authorizationId      char(36)                                 null,
  lifecycleId          char(36)                                 null,
  roleSetId            char(36)                                 null,
  extraRoles           text                                     not null,
  constraint REL_b0c80ccf319a1c7a7af12b3998
    unique (lifecycleId),
  constraint REL_b132226941570cb650a4023d49
    unique (authorizationId),
  constraint FK_6a3b86c6db10582baae7058f5b9
    foreign key (roleSetId) references role_set (id)
      on delete cascade,
  constraint FK_b0c80ccf319a1c7a7af12b39987
    foreign key (lifecycleId) references lifecycle (id)
      on delete set null,
  constraint FK_b132226941570cb650a4023d493
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table platform_invitation
(
  id                     char(36)                                 not null
    primary key,
  createdDate            datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate            datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                int                                      not null,
  roleSetInvitedToParent tinyint     default 0                    not null,
  email                  varchar(128)                             not null,
  firstName              varchar(128)                             null,
  lastName               varchar(128)                             null,
  createdBy              char(36)                                 not null,
  welcomeMessage         varchar(8192)                            null,
  profileCreated         tinyint     default 0                    not null,
  authorizationId        char(36)                                 null,
  roleSetId              char(36)                                 null,
  roleSetExtraRoles      text                                     not null,
  constraint REL_c0448d2c992a62c9c11bd0f142
    unique (authorizationId),
  constraint FK_562dce4a08bb214f08107b3631e
    foreign key (roleSetId) references role_set (id)
      on delete cascade,
  constraint FK_c0448d2c992a62c9c11bd0f1422
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table role
(
  id                              char(36)                                 not null
    primary key,
  createdDate                     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                         int                                      not null,
  name                            varchar(128)                             not null,
  credential                      json                                     not null,
  parentCredentials               json                                     not null,
  requiresEntryRole               tinyint                                  not null,
  requiresSameRoleInParentRoleSet tinyint                                  not null,
  userPolicy                      json                                     not null,
  organizationPolicy              json                                     not null,
  virtualContributorPolicy        json                                     not null,
  roleSetId                       char(36)                                 null,
  constraint FK_66d695b73839e9b66ff1350d34f
    foreign key (roleSetId) references role_set (id)
      on delete cascade
);

create table room
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  messagesCount   int                                      not null,
  type            varchar(128)                             not null,
  displayName     varchar(255)                             not null,
  authorizationId char(36)                                 null,
  constraint REL_d1d94dd8e0c417b4188a05ccbc
    unique (authorizationId),
  constraint FK_d1d94dd8e0c417b4188a05ccbca
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table communication
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  spaceID         varchar(36)                              not null,
  displayName     varchar(255)                             not null,
  authorizationId char(36)                                 null,
  updatesId       char(36)                                 null,
  constraint REL_a20c5901817dd09d5906537e08
    unique (authorizationId),
  constraint REL_eb99e588873c788a68a035478a
    unique (updatesId),
  constraint FK_a20c5901817dd09d5906537e087
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_eb99e588873c788a68a035478ab
    foreign key (updatesId) references room (id)
      on delete set null
);

create table community
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  parentID        varchar(36)                              not null,
  authorizationId char(36)                                 null,
  communicationId char(36)                                 null,
  roleSetId       char(36)                                 null,
  constraint REL_3b8f390d76263ef5996869da07
    unique (roleSetId),
  constraint REL_6e7584bfb417bd0f8e8696ab58
    unique (authorizationId),
  constraint REL_7fbe50fa78a37776ad962cb764
    unique (communicationId),
  constraint FK_3b8f390d76263ef5996869da071
    foreign key (roleSetId) references role_set (id)
      on delete set null,
  constraint FK_6e7584bfb417bd0f8e8696ab585
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_7fbe50fa78a37776ad962cb7643
    foreign key (communicationId) references communication (id)
      on delete set null
);

create table conversation
(
  id                          char(36)                                 not null
    primary key,
  createdDate                 datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                 datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                     int                                      not null,
  type                        varchar(128)                             not null,
  userID                      char(36)                                 null,
  virtualContributorID        char(36)                                 null,
  wellKnownVirtualContributor varchar(128)                             null,
  authorizationId             char(36)                                 null,
  conversationsSetId          char(36)                                 null,
  roomId                      char(36)                                 null,
  constraint REL_a6cdd15ca94945e57a3abbf64d
    unique (authorizationId),
  constraint REL_c3eb45de493217a6d0e225028f
    unique (roomId),
  constraint FK_9604668892b53a75690fb92ec25
    foreign key (conversationsSetId) references conversations_set (id)
      on delete cascade,
  constraint FK_a6cdd15ca94945e57a3abbf64d1
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_c3eb45de493217a6d0e225028fa
    foreign key (roomId) references room (id)
      on delete set null
);

create table storage_aggregator
(
  id                        char(36)                                 not null
    primary key,
  createdDate               datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate               datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                   int                                      not null,
  type                      varchar(128)                             null,
  authorizationId           char(36)                                 null,
  parentStorageAggregatorId char(36)                                 null,
  directStorageId           char(36)                                 null,
  constraint REL_0647707288c243e60091c8d862
    unique (directStorageId),
  constraint REL_f3b4d59c0b805c9c1ecb0070e1
    unique (authorizationId),
  constraint FK_b80c28f5335ab5442f63c644d94
    foreign key (parentStorageAggregatorId) references storage_aggregator (id)
      on delete set null,
  constraint FK_f3b4d59c0b805c9c1ecb0070e16
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table account
(
  id                     char(36)                                 not null
    primary key,
  createdDate            datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate            datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                int                                      not null,
  type                   varchar(128)                             null,
  authorizationId        char(36)                                 null,
  agentId                char(36)                                 null,
  storageAggregatorId    char(36)                                 null,
  externalSubscriptionID varchar(128)                             null,
  licenseId              char(36)                                 null,
  baselineLicensePlan    json                                     not null,
  constraint REL_833582df0c439ab8c9adc5240d
    unique (agentId),
  constraint REL_8339e62882f239dc00ff5866f8
    unique (licenseId),
  constraint REL_91a165c1091a6959cc19d52239
    unique (authorizationId),
  constraint REL_950221e932175dc7cf7c006488
    unique (storageAggregatorId),
  constraint FK_833582df0c439ab8c9adc5240d1
    foreign key (agentId) references agent (id)
      on delete set null,
  constraint FK_8339e62882f239dc00ff5866f8c
    foreign key (licenseId) references license (id)
      on delete set null,
  constraint FK_91a165c1091a6959cc19d522399
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_950221e932175dc7cf7c0064887
    foreign key (storageAggregatorId) references storage_aggregator (id)
      on delete set null
);

create table storage_bucket
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  allowedMimeTypes    text                                     not null,
  maxFileSize         int                                      not null,
  authorizationId     char(36)                                 null,
  storageAggregatorId char(36)                                 null,
  constraint REL_f2f48b57269987b13b415a0058
    unique (authorizationId),
  constraint FK_11d0ed50a26da5513f7e4347847
    foreign key (storageAggregatorId) references storage_aggregator (id)
      on delete set null,
  constraint FK_f2f48b57269987b13b415a00587
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table profile
(
  id              char(36)                                                                                                                                                                                                                                                                                                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6)                                                                                                                                                                                                                                                                                 not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6)                                                                                                                                                                                                                                                                                 not null on update CURRENT_TIMESTAMP(6),
  version         int                                                                                                                                                                                                                                                                                                                      not null,
  displayName     text                                                                                                                                                                                                                                                                                                                     not null,
  tagline         text                                                                                                                                                                                                                                                                                                                     null,
  description     text                                                                                                                                                                                                                                                                                                                     null,
  authorizationId char(36)                                                                                                                                                                                                                                                                                                                 null,
  locationId      char(36)                                                                                                                                                                                                                                                                                                                 null,
  storageBucketId char(36)                                                                                                                                                                                                                                                                                                                 null,
  type            enum ('space-about', 'innovation-flow', 'callout-framing', 'knowledge-base', 'post', 'contribution-link', 'whiteboard', 'memo', 'discussion', 'organization', 'user-group', 'user', 'innovation-hub', 'calendar-event', 'innovation-pack', 'template', 'community-guidelines', 'virtual-contributor', 'virtual-persona') not null,
  constraint REL_432056041df0e4337b17ff7b09
    unique (locationId),
  constraint REL_4a1c74fd2a61b32d9d9500e065
    unique (storageBucketId),
  constraint REL_a96475631aba7dce41db03cc8b
    unique (authorizationId),
  constraint FK_432056041df0e4337b17ff7b09d
    foreign key (locationId) references location (id)
      on delete set null,
  constraint FK_4a1c74fd2a61b32d9d9500e0650
    foreign key (storageBucketId) references storage_bucket (id)
      on delete set null,
  constraint FK_a96475631aba7dce41db03cc8b2
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table calendar_event
(
  id                      char(36)                                 not null
    primary key,
  createdDate             datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate             datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                 int                                      not null,
  nameID                  varchar(36)                              not null,
  type                    varchar(128)                             not null,
  createdBy               char(36)                                 not null,
  startDate               datetime                                 not null,
  wholeDay                tinyint                                  not null,
  multipleDays            tinyint                                  not null,
  durationMinutes         int                                      not null,
  durationDays            int                                      null,
  authorizationId         char(36)                                 null,
  profileId               char(36)                                 null,
  commentsId              char(36)                                 null,
  calendarId              char(36)                                 null,
  visibleOnParentCalendar tinyint                                  not null,
  constraint REL_8ee86afa2808a4ab523b9ee6c5
    unique (authorizationId),
  constraint REL_9349e137959f3ca5818c2e62b3
    unique (profileId),
  constraint REL_b5069b11030e9608ee4468f850
    unique (commentsId),
  constraint FK_80ab7835e1749581a27462eb87f
    foreign key (calendarId) references calendar (id)
      on delete cascade,
  constraint FK_8ee86afa2808a4ab523b9ee6c5e
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_9349e137959f3ca5818c2e62b3f
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_b5069b11030e9608ee4468f850d
    foreign key (commentsId) references room (id)
      on delete set null
);

create table community_guidelines
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  constraint REL_3d60fe4fa40d54bad7d51bb4bd
    unique (profileId),
  constraint REL_684b272e6f7459439d41d2879e
    unique (authorizationId),
  constraint FK_3d60fe4fa40d54bad7d51bb4bd1
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_684b272e6f7459439d41d2879ee
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table discussion
(
  id              char(36)                                  not null
    primary key,
  createdDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                       not null,
  nameID          varchar(36)                               not null,
  category        text                                      not null,
  createdBy       char(36)                                  not null,
  privacy         varchar(255) default 'authenticated'      not null,
  authorizationId char(36)                                  null,
  profileId       char(36)                                  null,
  commentsId      char(36)                                  null,
  forumId         char(36)                                  null,
  constraint REL_2d8a3ca181c3f0346817685d21
    unique (profileId),
  constraint REL_4555dccdda9ba57d8e3a634cd0
    unique (authorizationId),
  constraint REL_5337074c9b818bb63e6f314c80
    unique (commentsId),
  constraint FK_0de78853c1ee793f61bda7eff79
    foreign key (forumId) references forum (id)
      on delete cascade,
  constraint FK_2d8a3ca181c3f0346817685d21d
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_4555dccdda9ba57d8e3a634cd0d
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_5337074c9b818bb63e6f314c808
    foreign key (commentsId) references room (id)
      on delete set null
);

create table innovation_hub
(
  id                    char(36)                                  not null
    primary key,
  createdDate           datetime(6)  default CURRENT_TIMESTAMP(6) not null,
  updatedDate           datetime(6)  default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version               int                                       not null,
  nameID                varchar(36)                               not null,
  subdomain             varchar(63)                               not null,
  type                  varchar(255)                              not null,
  spaceVisibilityFilter varchar(255)                              null,
  spaceListFilter       text                                      null,
  listedInStore         tinyint                                   not null,
  searchVisibility      varchar(128) default 'account'            not null,
  authorizationId       char(36)                                  null,
  profileId             char(36)                                  null,
  accountId             char(36)                                  null,
  constraint IDX_8f35d04d098bb6c7c57a9a83ac
    unique (subdomain),
  constraint REL_36c8905c2c6c59467c60d94fd8
    unique (profileId),
  constraint REL_b411e4f27d77a96eccdabbf4b4
    unique (authorizationId),
  constraint FK_156fd30246eb151b9d17716abf5
    foreign key (accountId) references account (id)
      on delete set null,
  constraint FK_36c8905c2c6c59467c60d94fd8a
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_b411e4f27d77a96eccdabbf4b45
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table link
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  uri             text                                     not null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  constraint REL_07f249ac87502495710a62c5c0
    unique (authorizationId),
  constraint REL_3bfc8c1aaec1395cc148268d3c
    unique (profileId),
  constraint FK_07f249ac87502495710a62c5c01
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_3bfc8c1aaec1395cc148268d3cd
    foreign key (profileId) references profile (id)
      on delete set null
);

create table memo
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  nameID              varchar(36)                              not null,
  content             mediumblob                               null,
  createdBy           char(36)                                 null,
  contentUpdatePolicy varchar(128)                             not null,
  authorizationId     char(36)                                 null,
  profileId           char(36)                                 null,
  constraint REL_3eae185405c8e3a7d1828cf863
    unique (profileId),
  constraint REL_c3a02e516496db62a676a0bfb7
    unique (authorizationId),
  constraint FK_3eae185405c8e3a7d1828cf8639
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_c3a02e516496db62a676a0bfb74
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table organization
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  nameID              varchar(36)                              not null,
  accountID           char(36)                                 not null,
  rowId               int auto_increment,
  legalEntityName     varchar(255)                             not null,
  domain              varchar(255)                             not null,
  website             varchar(255)                             not null,
  contactEmail        varchar(255)                             not null,
  authorizationId     char(36)                                 null,
  profileId           char(36)                                 null,
  agentId             char(36)                                 null,
  verificationId      char(36)                                 null,
  storageAggregatorId char(36)                                 null,
  settings            json                                     not null,
  roleSetId           char(36)                                 null,
  constraint IDX_9fdd8f0bfe04a676822c7265e1
    unique (rowId),
  constraint IDX_d11fdb37a7b736d053b762b27c
    unique (nameID),
  constraint REL_395aa74996a1f978b4969d114b
    unique (storageAggregatorId),
  constraint REL_5a72d5b37312bac2e0a0115718
    unique (verificationId),
  constraint REL_7f1bec8979b57ed7ebd392a2ca
    unique (agentId),
  constraint REL_857684833bbd26eff72f97bcfd
    unique (roleSetId),
  constraint REL_d2cb77c14644156ec8e865608e
    unique (profileId),
  constraint REL_e0e150e4f11d906b931b46a2d8
    unique (authorizationId),
  constraint FK_395aa74996a1f978b4969d114b1
    foreign key (storageAggregatorId) references storage_aggregator (id)
      on delete set null,
  constraint FK_5a72d5b37312bac2e0a01157185
    foreign key (verificationId) references organization_verification (id)
      on delete set null,
  constraint FK_7f1bec8979b57ed7ebd392a2ca9
    foreign key (agentId) references agent (id)
      on delete set null,
  constraint FK_857684833bbd26eff72f97bcfdb
    foreign key (roleSetId) references role_set (id)
      on delete set null,
  constraint FK_d2cb77c14644156ec8e865608e0
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_e0e150e4f11d906b931b46a2d89
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table post
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  nameID          varchar(36)                              not null,
  createdBy       char(36)                                 not null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  commentsId      char(36)                                 null,
  constraint REL_042b9825d770d6b3009ae206c2
    unique (commentsId),
  constraint REL_390343b22abec869bf80041933
    unique (authorizationId),
  constraint REL_970844fcd10c2b6df7c1b49eac
    unique (profileId),
  constraint FK_042b9825d770d6b3009ae206c2f
    foreign key (commentsId) references room (id)
      on delete set null,
  constraint FK_390343b22abec869bf800419333
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_970844fcd10c2b6df7c1b49eacf
    foreign key (profileId) references profile (id)
      on delete set null
);

create table reference
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  name            varchar(255)                             not null,
  uri             text                                     not null,
  description     text                                     null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  constraint REL_73e8ae665a49366ca7e2866a45
    unique (authorizationId),
  constraint FK_2f46c698fc4c19a8cc233c5f255
    foreign key (profileId) references profile (id)
      on delete cascade,
  constraint FK_73e8ae665a49366ca7e2866a45d
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table space_about
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  why             text                                     null,
  who             text                                     null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  guidelinesId    char(36)                                 null,
  constraint REL_35584de03c66d9d473cbbe9d37
    unique (profileId),
  constraint REL_830c5cd4eda4b4ba8e297101c7
    unique (guidelinesId),
  constraint REL_8ce1fdaa7405b062b0102ce5f1
    unique (authorizationId),
  constraint FK_35584de03c66d9d473cbbe9d372
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_830c5cd4eda4b4ba8e297101c73
    foreign key (guidelinesId) references community_guidelines (id)
      on delete set null,
  constraint FK_8ce1fdaa7405b062b0102ce5f12
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

alter table storage_aggregator
  add constraint FK_0647707288c243e60091c8d8620
    foreign key (directStorageId) references storage_bucket (id)
      on delete set null;

create table tagset_template_set
(
  id          char(36)                                 not null
    primary key,
  createdDate datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version     int                                      not null
);

create table callouts_set
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  type                varchar(128)                             not null,
  authorizationId     char(36)                                 null,
  tagsetTemplateSetId char(36)                                 null,
  constraint REL_211515f7e21e93136a6b905e84
    unique (tagsetTemplateSetId),
  constraint REL_8f3fd7a83451183166aac4ad02
    unique (authorizationId),
  constraint FK_211515f7e21e93136a6b905e84a
    foreign key (tagsetTemplateSetId) references tagset_template_set (id),
  constraint FK_8f3fd7a83451183166aac4ad02f
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table knowledge_base
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  calloutsSetId   char(36)                                 null,
  constraint REL_0e8a8e02916c701eeed6bf866a
    unique (profileId),
  constraint REL_610fe23f4b0c4d8e38f0d0fbf3
    unique (authorizationId),
  constraint REL_970b16bb8c1f8daee6135b00c8
    unique (calloutsSetId),
  constraint FK_0e8a8e02916c701eeed6bf866ad
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_610fe23f4b0c4d8e38f0d0fbf34
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_970b16bb8c1f8daee6135b00c82
    foreign key (calloutsSetId) references callouts_set (id)
      on delete set null
);

create table tagset_template
(
  id                   char(36)                                 not null
    primary key,
  createdDate          datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate          datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version              int                                      not null,
  name                 varchar(128)                             not null,
  type                 varchar(128)                             not null,
  allowedValues        text                                     not null,
  defaultSelectedValue varchar(255)                             null,
  tagsetTemplateSetId  char(36)                                 null,
  constraint FK_96f23f044acf305c1699e0319d2
    foreign key (tagsetTemplateSetId) references tagset_template_set (id)
      on delete cascade
);

create table innovation_flow
(
  id                         char(36)                                 not null
    primary key,
  createdDate                datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                    int                                      not null,
  authorizationId            char(36)                                 null,
  profileId                  char(36)                                 null,
  settings                   json                                     not null,
  flowStatesTagsetTemplateId char(36)                                 null,
  currentStateID             char(36)                                 null,
  constraint REL_858fd06a671b804765d91251e6
    unique (flowStatesTagsetTemplateId),
  constraint REL_96a8cbe1706f459fd7d883be9b
    unique (profileId),
  constraint REL_a6e050daa4c7a3ab1e411c3651
    unique (authorizationId),
  constraint FK_858fd06a671b804765d91251e6c
    foreign key (flowStatesTagsetTemplateId) references tagset_template (id)
      on delete set null,
  constraint FK_96a8cbe1706f459fd7d883be9bd
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_a6e050daa4c7a3ab1e411c36517
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table innovation_flow_state
(
  id               char(36)                                 not null
    primary key,
  createdDate      datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate      datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version          int                                      not null,
  displayName      text                                     not null,
  description      text                                     null,
  settings         json                                     not null,
  sortOrder        int                                      not null,
  authorizationId  char(36)                                 null,
  innovationFlowId char(36)                                 null,
  constraint REL_83d9f1d85d3ca51828168ea336
    unique (authorizationId),
  constraint FK_73db98435e680e2a2dada61e815
    foreign key (innovationFlowId) references innovation_flow (id)
      on delete cascade,
  constraint FK_83d9f1d85d3ca51828168ea3367
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table tagset
(
  id               char(36)                                  not null
    primary key,
  createdDate      datetime(6)  default CURRENT_TIMESTAMP(6) not null,
  updatedDate      datetime(6)  default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version          int                                       not null,
  name             varchar(255) default 'default'            not null,
  type             varchar(128)                              not null,
  tags             text                                      not null,
  authorizationId  char(36)                                  null,
  profileId        char(36)                                  null,
  tagsetTemplateId char(36)                                  null,
  classificationId char(36)                                  null,
  constraint REL_eb59b98ee6ef26c993d0d75c83
    unique (authorizationId),
  constraint FK_391d124a58a845b85a047acc9d3
    foreign key (classificationId) references classification (id)
      on delete cascade,
  constraint FK_644155610ddc40dc4e19781c8f0
    foreign key (tagsetTemplateId) references tagset_template (id),
  constraint FK_81fc213b2d9ad0cddeab1a9ce64
    foreign key (profileId) references profile (id)
      on delete cascade,
  constraint FK_eb59b98ee6ef26c993d0d75c83c
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table document
(
  id                char(36)                                 not null
    primary key,
  createdDate       datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate       datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version           int                                      not null,
  createdBy         char(36)                                 null,
  displayName       varchar(512)                             not null,
  mimeType          varchar(128)                             not null,
  size              int                                      not null,
  externalID        varchar(128)                             not null,
  temporaryLocation tinyint     default 0                    not null,
  authorizationId   char(36)                                 null,
  storageBucketId   char(36)                                 null,
  tagsetId          char(36)                                 null,
  constraint REL_9fb9257b14ec21daf5bc9aa4c8
    unique (tagsetId),
  constraint REL_d9e2dfcccf59233c17cc6bc641
    unique (authorizationId),
  constraint FK_851e50ec4be7c62a1f9b9a430bf
    foreign key (storageBucketId) references storage_bucket (id)
      on delete cascade,
  constraint FK_9fb9257b14ec21daf5bc9aa4c8e
    foreign key (tagsetId) references tagset (id)
      on delete set null,
  constraint FK_d9e2dfcccf59233c17cc6bc6418
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table templates_set
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  constraint REL_eb0176ef4b98c143322aa6f809
    unique (authorizationId),
  constraint FK_eb0176ef4b98c143322aa6f8090
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table innovation_pack
(
  id               char(36)                                 not null
    primary key,
  createdDate      datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate      datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version          int                                      not null,
  nameID           varchar(36)                              not null,
  listedInStore    tinyint                                  not null,
  searchVisibility varchar(36) default 'account'            not null,
  authorizationId  char(36)                                 null,
  profileId        char(36)                                 null,
  accountId        char(36)                                 null,
  templatesSetId   char(36)                                 null,
  constraint REL_5facd6d188068a5a1c5b6f07fc
    unique (profileId),
  constraint REL_8af8122897b05315e7eb892525
    unique (authorizationId),
  constraint REL_a1441e46c8d36090e1f6477cea
    unique (templatesSetId),
  constraint FK_51014590f9644e6ff9e0536f40f
    foreign key (accountId) references account (id)
      on delete cascade,
  constraint FK_5facd6d188068a5a1c5b6f07fc3
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_8af8122897b05315e7eb8925253
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_a1441e46c8d36090e1f6477cea5
    foreign key (templatesSetId) references templates_set (id)
      on delete set null
);

create table templates_manager
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  templatesSetId  char(36)                                 null,
  constraint REL_19ea19263c6016f411fb008243
    unique (authorizationId),
  constraint REL_7ba875eee72ec5fcbe2355124d
    unique (templatesSetId),
  constraint FK_19ea19263c6016f411fb0082437
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_7ba875eee72ec5fcbe2355124df
    foreign key (templatesSetId) references templates_set (id)
      on delete set null
);

create table platform
(
  id                           char(36)                                 not null
    primary key,
  createdDate                  datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                  datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                      int                                      not null,
  authorizationId              char(36)                                 null,
  forumId                      char(36)                                 null,
  libraryId                    char(36)                                 null,
  templatesManagerId           char(36)                                 null,
  storageAggregatorId          char(36)                                 null,
  licensingFrameworkId         char(36)                                 null,
  roleSetId                    char(36)                                 null,
  settings                     json                                     not null,
  wellKnownVirtualContributors json                                     not null,
  constraint REL_36d8347a558f81ced8a621fe50
    unique (licensingFrameworkId),
  constraint REL_40f3ebb0c2a0b2a1557e67f849
    unique (roleSetId),
  constraint REL_81f92b22d30540102e9654e892
    unique (templatesManagerId),
  constraint REL_9f621c51dd854634d8766a9cfa
    unique (authorizationId),
  constraint REL_ca469f5ec53a7719d155d60aca
    unique (libraryId),
  constraint REL_dd88d373c64b04e24705d575c9
    unique (forumId),
  constraint REL_f516dd9a46616999c7e9a6adc1
    unique (storageAggregatorId),
  constraint FK_36d8347a558f81ced8a621fe509
    foreign key (licensingFrameworkId) references licensing_framework (id)
      on delete set null,
  constraint FK_40f3ebb0c2a0b2a1557e67f8496
    foreign key (roleSetId) references role_set (id)
      on delete set null,
  constraint FK_81f92b22d30540102e9654e892c
    foreign key (templatesManagerId) references templates_manager (id)
      on delete set null,
  constraint FK_9f621c51dd854634d8766a9cfaf
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_ca469f5ec53a7719d155d60aca1
    foreign key (libraryId) references library (id)
      on delete set null,
  constraint FK_dd88d373c64b04e24705d575c99
    foreign key (forumId) references forum (id)
      on delete set null,
  constraint FK_f516dd9a46616999c7e9a6adc15
    foreign key (storageAggregatorId) references storage_aggregator (id)
      on delete set null
);

create table timeline
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  calendarId      char(36)                                 null,
  constraint REL_56aae15a664b2889a1a11c2cf8
    unique (calendarId),
  constraint REL_5fe58ece01b48496aebc04733d
    unique (authorizationId),
  constraint FK_56aae15a664b2889a1a11c2cf82
    foreign key (calendarId) references calendar (id)
      on delete set null,
  constraint FK_5fe58ece01b48496aebc04733da
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table collaboration
(
  id               char(36)                                 not null
    primary key,
  createdDate      datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate      datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version          int                                      not null,
  isTemplate       tinyint     default 0                    not null,
  authorizationId  char(36)                                 null,
  timelineId       char(36)                                 null,
  innovationFlowId char(36)                                 null,
  licenseId        char(36)                                 null,
  calloutsSetId    char(36)                                 null,
  constraint REL_262ecf3f5d70b82a4833618425
    unique (authorizationId),
  constraint REL_35c6b1de6d4d89dfe8e9c85d77
    unique (innovationFlowId),
  constraint REL_9e1ebbc0972fa354d33b67a1a0
    unique (calloutsSetId),
  constraint REL_aa5815c9577533141cbc4aebe9
    unique (licenseId),
  constraint REL_f67a2d25c945269d602c182fbc
    unique (timelineId),
  constraint FK_262ecf3f5d70b82a48336184251
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_35c6b1de6d4d89dfe8e9c85d771
    foreign key (innovationFlowId) references innovation_flow (id)
      on delete set null,
  constraint FK_9e1ebbc0972fa354d33b67a1a02
    foreign key (calloutsSetId) references callouts_set (id)
      on delete set null,
  constraint FK_aa5815c9577533141cbc4aebe9f
    foreign key (licenseId) references license (id)
      on delete set null,
  constraint FK_f67a2d25c945269d602c182fbc0
    foreign key (timelineId) references timeline (id)
      on delete set null
);

create table space
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  nameID              varchar(36)                              not null,
  rowId               int auto_increment,
  settings            json                                     not null,
  levelZeroSpaceID    char(36)                                 null,
  level               int                                      not null,
  visibility          varchar(128)                             not null,
  authorizationId     char(36)                                 null,
  parentSpaceId       char(36)                                 null,
  accountId           char(36)                                 null,
  collaborationId     char(36)                                 null,
  communityId         char(36)                                 null,
  agentId             char(36)                                 null,
  storageAggregatorId char(36)                                 null,
  templatesManagerId  char(36)                                 null,
  licenseId           char(36)                                 null,
  aboutId             char(36)                                 null,
  platformRolesAccess json                                     not null,
  constraint IDX_0f03c61020ea0dfa0198c60304
    unique (rowId),
  constraint REL_3ef80ef55ba1a1d45e625ea838
    unique (licenseId),
  constraint REL_68fa2c2b00cc1ed77e7c225e8b
    unique (communityId),
  constraint REL_8d03fd2c8e8411ec9192c79cd9
    unique (authorizationId),
  constraint REL_980c4643d7d9de1b97bc39f518
    unique (storageAggregatorId),
  constraint REL_9c664d684f987a735678b0ba82
    unique (agentId),
  constraint REL_c59c1beb254808dd32007de661
    unique (aboutId),
  constraint REL_dea52ce918df6950019678fa35
    unique (templatesManagerId),
  constraint REL_ea06eb8894469a0f262d929bf0
    unique (collaborationId),
  constraint FK_3ef80ef55ba1a1d45e625ea8389
    foreign key (licenseId) references license (id)
      on delete set null,
  constraint FK_68fa2c2b00cc1ed77e7c225e8ba
    foreign key (communityId) references community (id)
      on delete set null,
  constraint FK_6bdeffaf6ea6159b4672a2aed70
    foreign key (accountId) references account (id)
      on delete set null,
  constraint FK_8d03fd2c8e8411ec9192c79cd99
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_980c4643d7d9de1b97bc39f5185
    foreign key (storageAggregatorId) references storage_aggregator (id)
      on delete set null,
  constraint FK_9c664d684f987a735678b0ba825
    foreign key (agentId) references agent (id)
      on delete set null,
  constraint FK_c59c1beb254808dd32007de6617
    foreign key (aboutId) references space_about (id)
      on delete set null,
  constraint FK_dea52ce918df6950019678fa355
    foreign key (templatesManagerId) references templates_manager (id)
      on delete set null,
  constraint FK_ea06eb8894469a0f262d929bf06
    foreign key (collaborationId) references collaboration (id)
      on delete set null,
  constraint FK_ef1ff4ac7f613cc0677e2295b30
    foreign key (parentSpaceId) references space (id)
);

create table template_content_space
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  rowId           int auto_increment,
  settings        json                                     not null,
  level           int                                      not null,
  authorizationId char(36)                                 null,
  collaborationId char(36)                                 null,
  aboutId         char(36)                                 null,
  parentSpaceId   char(36)                                 null,
  constraint IDX_93791de89f18db45fe1e9bd5e5
    unique (rowId),
  constraint REL_1101883dd80b6c54f3171979b9
    unique (collaborationId),
  constraint REL_6c3991ba75f25e07d478a6296d
    unique (authorizationId),
  constraint REL_9d01f912e7465553e45a551509
    unique (aboutId),
  constraint FK_1101883dd80b6c54f3171979b99
    foreign key (collaborationId) references collaboration (id)
      on delete set null,
  constraint FK_6c3991ba75f25e07d478a6296dd
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_9d01f912e7465553e45a551509b
    foreign key (aboutId) references space_about (id)
      on delete set null,
  constraint FK_9e2017ee8cfa420bcac748b85db
    foreign key (parentSpaceId) references template_content_space (id)
);

create table user_group
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  organizationId  char(36)                                 null,
  communityId     char(36)                                 null,
  constraint REL_9912e4cfc1e09848a392a65151
    unique (profileId),
  constraint REL_e8e32f1e59c349b406a4752e54
    unique (authorizationId),
  constraint FK_694ebec955a90e999d9926b7da8
    foreign key (organizationId) references organization (id)
      on delete cascade,
  constraint FK_9912e4cfc1e09848a392a651514
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_9fcc131f256e969d773327f07cb
    foreign key (communityId) references community (id)
      on delete cascade,
  constraint FK_e8e32f1e59c349b406a4752e545
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table user_settings
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  communication   json                                     not null,
  privacy         json                                     not null,
  notification    json                                     not null,
  authorizationId char(36)                                 null,
  constraint REL_320cf6b7374f1204df6741bbb0
    unique (authorizationId),
  constraint FK_320cf6b7374f1204df6741bbb0c
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table user
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  nameID              varchar(36)                              not null,
  accountID           char(36)                                 not null,
  rowId               int auto_increment,
  firstName           varchar(128)                             not null,
  lastName            varchar(128)                             not null,
  email               varchar(512)                             not null,
  phone               varchar(128)                             null,
  serviceProfile      tinyint                                  not null,
  authorizationId     char(36)                                 null,
  profileId           char(36)                                 null,
  agentId             char(36)                                 null,
  storageAggregatorId char(36)                                 null,
  settingsId          char(36)                                 null,
  conversationsSetId  char(36)                                 null,
  authenticationID    char(36)                                 null,
  constraint IDX_266bc44a18601f893566962df6
    unique (rowId),
  constraint IDX_ad8730bcd46ca67fb2d1edd756
    unique (nameID),
  constraint IDX_e12875dfb3b1d92d7d7c5377e2
    unique (email),
  constraint IDX_user_authenticationID
    unique (authenticationID),
  constraint IDX_user_conversationsSetId
    unique (conversationsSetId),
  constraint REL_09f909622aa177a097256b7cc2
    unique (authorizationId),
  constraint REL_10458c50c10436b6d589b40e5c
    unique (storageAggregatorId),
  constraint REL_390395c3d8592e3e8d8422ce85
    unique (settingsId),
  constraint REL_9466682df91534dd95e4dbaa61
    unique (profileId),
  constraint REL_b61c694cacfab25533bd23d9ad
    unique (agentId),
  constraint REL_user_conversationsSetId
    unique (conversationsSetId),
  constraint FK_09f909622aa177a097256b7cc22
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_10458c50c10436b6d589b40e5ca
    foreign key (storageAggregatorId) references storage_aggregator (id)
      on delete set null,
  constraint FK_390395c3d8592e3e8d8422ce853
    foreign key (settingsId) references user_settings (id)
      on delete set null,
  constraint FK_9466682df91534dd95e4dbaa616
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_b61c694cacfab25533bd23d9add
    foreign key (agentId) references agent (id)
      on delete set null,
  constraint FK_user_conversationsSetId
    foreign key (conversationsSetId) references conversations_set (id)
      on delete set null
);

create table application
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  authorizationId char(36)                                 null,
  lifecycleId     char(36)                                 null,
  userId          char(36)                                 null,
  roleSetId       char(36)                                 null,
  constraint REL_56f5614fff0028d40370499582
    unique (authorizationId),
  constraint REL_7ec2857c7d8d16432ffca1cb3d
    unique (lifecycleId),
  constraint FK_56f5614fff0028d403704995822
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_7ec2857c7d8d16432ffca1cb3d9
    foreign key (lifecycleId) references lifecycle (id)
      on delete set null,
  constraint FK_8fb220ad1ac1f9c86ec39d134e4
    foreign key (roleSetId) references role_set (id)
      on delete cascade,
  constraint FK_b4ae3fea4a24b4be1a86dacf8a2
    foreign key (userId) references user (id)
      on delete cascade
);

create table application_questions
(
  applicationId char(36) not null,
  nvpId         char(36) not null,
  primary key (applicationId, nvpId),
  constraint FK_8495fae86f13836b0745642baa8
    foreign key (applicationId) references application (id)
      on update cascade on delete cascade,
  constraint FK_fe50118fd82e7fe2f74f986a195
    foreign key (nvpId) references nvp (id)
      on update cascade on delete cascade
);

create index IDX_8495fae86f13836b0745642baa
  on application_questions (applicationId);

create index IDX_fe50118fd82e7fe2f74f986a19
  on application_questions (nvpId);

create table vc_interaction
(
  id                   char(36)                                 not null
    primary key,
  createdDate          datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate          datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version              int                                      not null,
  threadID             varchar(44)                              not null,
  virtualContributorID char(36)                                 not null,
  externalMetadata     text                                     not null,
  roomId               char(36)                                 null,
  constraint FK_d6f78c95ff41cdd30e505a4ebbb
    foreign key (roomId) references room (id)
      on delete cascade
);

create table virtual_contributor
(
  id                         char(36)                                 not null
    primary key,
  createdDate                datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate                datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                    int                                      not null,
  nameID                     varchar(36)                              not null,
  listedInStore              tinyint                                  not null,
  searchVisibility           varchar(128)                             not null,
  authorizationId            char(36)                                 null,
  profileId                  char(36)                                 null,
  agentId                    char(36)                                 null,
  accountId                  char(36)                                 null,
  knowledgeBaseId            char(36)                                 null,
  settings                   json                                     not null,
  rowId                      int auto_increment,
  aiPersonaID                char(36)                                 not null,
  dataAccessMode             varchar(128)                             not null,
  interactionModes           text                                     not null,
  bodyOfKnowledgeType        varchar(128)                             not null,
  bodyOfKnowledgeDescription text                                     null,
  bodyOfKnowledgeID          varchar(128)                             null,
  promptGraphDefinition      json                                     null,
  platformSettings           json                                     null,
  constraint IDX_a643bc875218dd4abbf86bbf7f
    unique (rowId),
  constraint IDX_d068ef33a6752b8a48839b89d4
    unique (nameID),
  constraint REL_409cc6ee5429588f868cd59a1d
    unique (knowledgeBaseId),
  constraint REL_4504c37764f6962ccbd165a21d
    unique (profileId),
  constraint REL_a8890dcd65b8c3ee6e160d33f3
    unique (agentId),
  constraint REL_e2eaa2213ac4454039cd8abc07
    unique (authorizationId),
  constraint FK_409cc6ee5429588f868cd59a1de
    foreign key (knowledgeBaseId) references knowledge_base (id),
  constraint FK_4504c37764f6962ccbd165a21de
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_7a962c9b04b0d197bc3c93262a7
    foreign key (accountId) references account (id)
      on delete set null,
  constraint FK_a8890dcd65b8c3ee6e160d33f3a
    foreign key (agentId) references agent (id)
      on delete set null,
  constraint FK_e2eaa2213ac4454039cd8abc07d
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table visual
(
  id              char(36)                                 not null
    primary key,
  createdDate     datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                      not null,
  name            varchar(255)                             not null,
  uri             varchar(2048)                            not null,
  minWidth        int                                      not null,
  maxWidth        int                                      not null,
  minHeight       int                                      not null,
  maxHeight       int                                      not null,
  aspectRatio     decimal(3, 1)                            not null,
  allowedTypes    text                                     not null,
  alternativeText varchar(120)                             null,
  authorizationId char(36)                                 null,
  profileId       char(36)                                 null,
  constraint REL_4fbd109f9bb84f58b7a3c60649
    unique (authorizationId),
  constraint FK_1104f3ef8497ca40d99b9f46b87
    foreign key (profileId) references profile (id)
      on delete cascade,
  constraint FK_4fbd109f9bb84f58b7a3c60649c
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table whiteboard
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  nameID              varchar(36)                              not null,
  content             longtext                                 not null,
  createdBy           char(36)                                 null,
  contentUpdatePolicy varchar(128)                             not null,
  authorizationId     char(36)                                 null,
  profileId           char(36)                                 null,
  previewSettings     json                                     not null,
  constraint REL_3f9e9e2798d2a4d84b16ee8477
    unique (profileId),
  constraint REL_d3b86160bb7d704212382b0ca4
    unique (authorizationId),
  constraint FK_3f9e9e2798d2a4d84b16ee8477c
    foreign key (profileId) references profile (id)
      on delete set null,
  constraint FK_d3b86160bb7d704212382b0ca44
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table callout_framing
(
  id              char(36)                                  not null
    primary key,
  createdDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                       not null,
  authorizationId char(36)                                  null,
  profileId       char(36)                                  null,
  whiteboardId    char(36)                                  null,
  type            varchar(128) default 'none'               not null,
  memoId          char(36)                                  null,
  linkId          char(36)                                  null,
  constraint REL_7c71c36a3eba63b8b52b30eb25
    unique (memoId),
  constraint REL_8bc0e1f40be5816d3a593cbf7f
    unique (whiteboardId),
  constraint REL_c3eee1b0c21294874daec15ad5
    unique (linkId),
  constraint REL_c9d7c2c4eb8a1d012ddc6605da
    unique (authorizationId),
  constraint REL_f53e2d266432e58e538a366705
    unique (profileId),
  constraint FK_7c71c36a3eba63b8b52b30eb25d
    foreign key (memoId) references memo (id)
      on delete set null,
  constraint FK_8bc0e1f40be5816d3a593cbf7fa
    foreign key (whiteboardId) references whiteboard (id)
      on delete set null,
  constraint FK_c3eee1b0c21294874daec15ad59
    foreign key (linkId) references link (id)
      on delete set null,
  constraint FK_c9d7c2c4eb8a1d012ddc6605da9
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_f53e2d266432e58e538a366705d
    foreign key (profileId) references profile (id)
      on delete set null
);

create table callout
(
  id                     char(36)                                 not null
    primary key,
  createdDate            datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate            datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                int                                      not null,
  nameID                 varchar(36)                              not null,
  isTemplate             tinyint     default 0                    not null,
  createdBy              char(36)                                 null,
  sortOrder              int                                      not null,
  publishedBy            char(36)                                 null,
  publishedDate          datetime                                 null,
  authorizationId        char(36)                                 null,
  framingId              char(36)                                 null,
  contributionDefaultsId char(36)                                 null,
  commentsId             char(36)                                 null,
  calloutsSetId          char(36)                                 null,
  classificationId       char(36)                                 null,
  settings               json                                     not null,
  constraint REL_0674c137336c2417df036053b6
    unique (classificationId),
  constraint REL_36b0da55acff774d0845aeb55f
    unique (contributionDefaultsId),
  constraint REL_6289dee12effb51320051c6f1f
    unique (authorizationId),
  constraint REL_62ed316cda7b75735b20307b47
    unique (commentsId),
  constraint REL_cf776244b01436d8ca5cc76284
    unique (framingId),
  constraint FK_0674c137336c2417df036053b65
    foreign key (classificationId) references classification (id)
      on delete set null,
  constraint FK_08d3fa19eb35058446dafa99192
    foreign key (calloutsSetId) references callouts_set (id)
      on delete cascade,
  constraint FK_36b0da55acff774d0845aeb55f2
    foreign key (contributionDefaultsId) references callout_contribution_defaults (id)
      on delete set null,
  constraint FK_6289dee12effb51320051c6f1fc
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_62ed316cda7b75735b20307b47e
    foreign key (commentsId) references room (id)
      on delete set null,
  constraint FK_cf776244b01436d8ca5cc762848
    foreign key (framingId) references callout_framing (id)
      on delete set null
);

create table callout_contribution
(
  id              char(36)                                  not null
    primary key,
  createdDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null,
  updatedDate     datetime(6)  default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version         int                                       not null,
  createdBy       char(36)                                  null,
  sortOrder       int                                       not null,
  authorizationId char(36)                                  null,
  whiteboardId    char(36)                                  null,
  postId          char(36)                                  null,
  linkId          char(36)                                  null,
  calloutId       char(36)                                  null,
  memoId          char(36)                                  null,
  type            varchar(128) default 'post'               not null,
  constraint REL_5e34f9a356f6254b8da24f8947
    unique (whiteboardId),
  constraint REL_97fefc97fb254c30577696e1c0
    unique (postId),
  constraint REL_bdf2d0eced5c95968a85caaaae
    unique (linkId),
  constraint REL_d1e29afff9bc73a1e20e468e3f
    unique (memoId),
  constraint REL_dfa86c46f509a61c6510536cd9
    unique (authorizationId),
  constraint FK_5e34f9a356f6254b8da24f8947b
    foreign key (whiteboardId) references whiteboard (id)
      on delete set null,
  constraint FK_7370de8eb79ed00b0d403f2299a
    foreign key (calloutId) references callout (id)
      on delete cascade,
  constraint FK_97fefc97fb254c30577696e1c0a
    foreign key (postId) references post (id)
      on delete set null,
  constraint FK_bdf2d0eced5c95968a85caaaaee
    foreign key (linkId) references link (id)
      on delete set null,
  constraint FK_d1e29afff9bc73a1e20e468e3fd
    foreign key (memoId) references memo (id)
      on delete set null,
  constraint FK_dfa86c46f509a61c6510536cd9a
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null
);

create table in_app_notification
(
  id                        char(36)                                 not null
    primary key,
  createdDate               datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate               datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                   int                                      not null,
  triggeredAt               datetime                                 not null comment 'UTC',
  type                      varchar(128)                             not null,
  state                     varchar(128)                             not null,
  triggeredByID             char(36)                                 null comment 'The contributor who triggered the event.',
  category                  varchar(128)                             not null comment 'Which category (role) is this notification targeted to.',
  receiverID                char(36)                                 not null comment 'The contributor who is the receiver of this notification',
  payload                   json                                     not null comment 'Additional data that is relevant for this Notification.',
  rowId                     int auto_increment,
  spaceID                   char(36)                                 null comment 'FK to Space - cascade deletes notification when space is deleted',
  organizationID            char(36)                                 null comment 'FK to Organization - cascade deletes notification when organization is deleted',
  userID                    char(36)                                 null comment 'FK to User - cascade deletes notification when referenced user is deleted',
  applicationID             char(36)                                 null comment 'FK to Application - cascade deletes notification when application is deleted',
  invitationID              char(36)                                 null comment 'FK to Invitation - cascade deletes notification when invitation is deleted',
  calloutID                 char(36)                                 null comment 'FK to Callout - cascade deletes notification when callout is deleted',
  contributionID            char(36)                                 null comment 'FK to Callout Contribution - cascade deletes notification when Contribution is deleted',
  roomID                    char(36)                                 null comment 'FK to Room - cascade deletes notification when the room is deleted',
  messageID                 char(44)                                 null comment 'Not actual FK - used to manually delete notification when the message is deleted',
  contributorOrganizationID char(36)                                 null comment 'FK to Organization - cascade deletes notification when organization contributor is deleted',
  contributorUserID         char(36)                                 null comment 'FK to User - cascade deletes notification when user contributor is deleted',
  contributorVcID           char(36)                                 null comment 'FK to VC - cascade deletes notification when VC contributor is deleted',
  calendarEventID           char(36)                                 null comment 'FK to Calendar Event - cascade deletes notification when the calendar event is deleted',
  constraint IDX_4c6428607b038a5b96509f8c2e
    unique (rowId),
  constraint FK_3a71f82d91a3809bd652cd80f1f
    foreign key (organizationID) references organization (id)
      on delete cascade,
  constraint FK_439dd686c1912533c380b783f0b
    foreign key (roomID) references room (id)
      on delete cascade,
  constraint FK_60085ab32808bc5f628fe3ca587
    foreign key (spaceID) references space (id)
      on delete cascade,
  constraint FK_618449b41643adab8598b80e1b2
    foreign key (contributorOrganizationID) references organization (id)
      on delete cascade,
  constraint FK_6df3d947b625cf6bd2ed856f632
    foreign key (contributionID) references callout_contribution (id)
      on delete cascade,
  constraint FK_75c3fa6ba71954e8586bfdbe725
    foreign key (calloutID) references callout (id)
      on delete cascade,
  constraint FK_8bf8b7bba9aab93abcaa4238820
    foreign key (calendarEventID) references calendar_event (id)
      on delete cascade,
  constraint FK_a84dd5170304562dbd58b37521e
    foreign key (receiverID) references user (id)
      on delete cascade,
  constraint FK_b2f1dc00232220031a6921da1b9
    foreign key (invitationID) references invitation (id)
      on delete cascade,
  constraint FK_b8fe43c84d0f765bba5f6bd054d
    foreign key (applicationID) references application (id)
      on delete cascade,
  constraint FK_c9c5d92154e4300bad54b7bbcc7
    foreign key (contributorVcID) references virtual_contributor (id)
      on delete cascade,
  constraint FK_d298041d567d984ed6c0667c814
    foreign key (userID) references user (id)
      on delete cascade,
  constraint FK_e4b8c5447b138bd2ce749274ae3
    foreign key (contributorUserID) references user (id)
      on delete cascade
);

create table template
(
  id                     char(36)                                 not null
    primary key,
  createdDate            datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate            datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version                int                                      not null,
  nameID                 varchar(36)                              not null,
  type                   varchar(128)                             not null,
  postDefaultDescription text                                     null,
  authorizationId        char(36)                                 null,
  profileId              char(36)                                 null,
  templatesSetId         char(36)                                 null,
  communityGuidelinesId  char(36)                                 null,
  calloutId              char(36)                                 null,
  whiteboardId           char(36)                                 null,
  contentSpaceId         char(36)                                 null,
  constraint REL_4318f97beabd362a8a09e9d320
    unique (authorizationId),
  constraint REL_c6e4d1a07781a809ad3b3ee826
    unique (calloutId),
  constraint REL_dc4f33c8d24ef7a8af59aafc8b
    unique (contentSpaceId),
  constraint REL_eedeae5e63f9a9c3a0161541e9
    unique (communityGuidelinesId),
  constraint REL_f09090a77e07377eefb3f731d9
    unique (whiteboardId),
  constraint REL_f58c3b144b6e010969e199beef
    unique (profileId),
  constraint FK_4318f97beabd362a8a09e9d3203
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_c6e4d1a07781a809ad3b3ee8265
    foreign key (calloutId) references callout (id)
      on delete set null,
  constraint FK_c7f54e6269c013d9c273f025edd
    foreign key (templatesSetId) references templates_set (id),
  constraint FK_dc4f33c8d24ef7a8af59aafc8b3
    foreign key (contentSpaceId) references template_content_space (id)
      on delete set null,
  constraint FK_eedeae5e63f9a9c3a0161541e98
    foreign key (communityGuidelinesId) references community_guidelines (id)
      on delete set null,
  constraint FK_f09090a77e07377eefb3f731d9f
    foreign key (whiteboardId) references whiteboard (id)
      on delete set null,
  constraint FK_f58c3b144b6e010969e199beeff
    foreign key (profileId) references profile (id)
      on delete set null
);

create table template_default
(
  id                  char(36)                                 not null
    primary key,
  createdDate         datetime(6) default CURRENT_TIMESTAMP(6) not null,
  updatedDate         datetime(6) default CURRENT_TIMESTAMP(6) not null on update CURRENT_TIMESTAMP(6),
  version             int                                      not null,
  type                varchar(128)                             not null,
  allowedTemplateType varchar(128)                             not null,
  authorizationId     char(36)                                 null,
  templatesManagerId  char(36)                                 null,
  templateId          char(36)                                 null,
  constraint REL_9dbeb9326140b3ce01c1037efe
    unique (authorizationId),
  constraint REL_b6617b64c6ea8ebb24947ddbd4
    unique (templateId),
  constraint FK_9dbeb9326140b3ce01c1037efee
    foreign key (authorizationId) references authorization_policy (id)
      on delete set null,
  constraint FK_b6617b64c6ea8ebb24947ddbd45
    foreign key (templateId) references template (id)
      on delete set null,
  constraint FK_c1135fa45c07ba625e1db9f93bd
    foreign key (templatesManagerId) references templates_manager (id)
);

