const name = `{name}`;

const hostMembers = `{host {members{id}}}`;

const hostGroups = `{host {members{id}}}`;

const hostProfile = `{host{profile{id}}}`;

const contextTagline = `{context{tagline}}`;

const contextBackground = `{context{background}}`;

const contextVision = `{context{vision}}`;

const contextImpact = `{context{impact}}`;

const contextWho = `{context{who}}`;

const contextReferencesId = `{context{references{id}}}`;

const usersId = `{users{id}}`;

const usersAccountUPN = `{users{accountUpn}}`;

const usersProfileId = `{users{profile{id}}}`;

const usersMemberofGroupsId = `{users{memberof{groups{id}}}}`;

const usersMemberofChallengesId = `{users{memberof{challenges{id}}}}`;

const usersMemberofOrganisationsId = `{users{memberof{organisations{id}}}}`;

const userId = `{users{id}}`;

const userAccountUPN = `{user(ID: "1"){accountUpn}}`;

const userProfileId = `{user(ID: "1"){profile{id}}}`;

const userMemberofGroupsId = `{user(ID: "1"){memberof{groups{id}}}}`;

const userMemberofChallengesId = `{user(ID: "1"){memberof{challenges{id}}}}`;

const userMemberofOrganisationsId = `{user(ID: "1"){memberof{organisations{id}}}}`;

const groupsId = `{groups{id}}`;

const groupsFocalPointId = `{groups{focalPoint{id}}}`;

const groupsMembersId = `{groups{members{id}}}`;

const groupsProfileId = `{groups{profile{id}}}`;

const groupsParentChallenge = `{groups{parent{__typename ... on Challenge {id}}}}`;

const groupsParentOpportunity = `{groups{parent{__typename ... on Opportunity {id}}}}`;

const groupsParentEcoverse = `{groups{parent{__typename ... on Challenge {id}}}}`;

const challengesId = `{ challenges { id }}`;

const challengesTextId = `{ challenges { textID }}`;

const challengesState = `{ challenges { state }}`;

const challengesContexId = `{ challenges { context { id }}}`;

const challengesLeadOrganisation = `{ challenges { leadOrganisations { id }}}`;

const challengesLeadOrganisationGroups = `{ challenges { leadOrganisations { id groups { id }}}}`;

const challengesTagsets = `{ challenges { tagset { id }}}`;

const challengesGroups = `{ challenges { groups { id }}}`;

const challengesContributors = `{ challenges { contributors { id }}}`;

const challengesOpportunities = `{ challenges { opportunities { id }}}`;

const challengeId = `{ challenge(ID: 1) { id }}`;

const challengeTextId = `{ challenge(ID: 1) { textID }}`;

const challengeState = `{ challenge(ID: 1) { state }}`;

const challengeContexId = `{ challenge(ID: 1) { context { id }}}`;

const challengeLeadOrganisation = `{ challenge(ID: 1) { leadOrganisations { id }}}`;

const challengeLeadOrganisationGroups = `{ challenge(ID: 1) { leadOrganisations { id groups { id }}}}`;

const challengeTagsets = `{ challenge(ID: 1) { tagset { id }}}`;

const challengeGroups = `{ challenge(ID: 1) { groups { id }}}`;

const challengeContributors = `{ challenge(ID: 1) { contributors { id }}}`;

const challengeOpportunities = `{ challenge(ID: 1) { opportunities { id }}}`;

const challenges = `{challenges{}}`;

export {
  name,
  hostMembers,
  hostGroups,
  hostProfile,
  contextTagline,
  contextBackground,
  contextVision,
  contextImpact,
  contextWho,
  contextReferencesId,
  usersId,
  usersAccountUPN,
  usersProfileId,
  usersMemberofGroupsId,
  usersMemberofChallengesId,
  usersMemberofOrganisationsId,
  userId,
  userAccountUPN,
  userProfileId,
  userMemberofGroupsId,
  userMemberofChallengesId,
  userMemberofOrganisationsId,
  groupsId,
  groupsFocalPointId,
  groupsProfileId,
  groupsMembersId,
  groupsParentChallenge,
  groupsParentEcoverse,
  groupsParentOpportunity,
  challengesId,
  challengesTextId,
  challengesState,
  challengesContexId,
  challengesLeadOrganisation,
  challengesLeadOrganisationGroups,
  challengesContributors,
  challengesTagsets,
  challengesGroups,
  challengesOpportunities,
  challengeId,
  challengeTextId,
  challengeState,
  challengeContexId,
  challengeLeadOrganisation,
  challengeLeadOrganisationGroups,
  challengeTagsets,
  challengeGroups,
  challengeContributors,
  challengeOpportunities,
};
