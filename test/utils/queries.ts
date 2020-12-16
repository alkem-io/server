const name = '{ name }';

const hostMembers = '{ host { groups { name }}}';

const hostGroups = '{ host { members { name }}}';

const hostProfile = '{ host { profile { description }}}';

const contextTagline = '{ context { tagline }}';

const contextBackground = '{ context { background }}';

const contextVision = '{ context { vision }}';

const contextImpact = '{ context { impact }}';

const contextWho = '{ context { who }}';

const contextReferencesName = '{ context { references { name }}}';

const usersName = '{ users { name }}';

const usersAccountUPN = '{ users { accountUpn }}';

const usersProfile = '{ users { profile { description }}}';

const usersMemberofGroupsName = '{ users { memberof { groups { name }}}}';

const usersMemberofChallengesName =
  '{ users { memberof { challenges { name }}}}';

const usersMemberofOrganisationsName =
  '{ users { memberof { organisations { name }}}}';

const userName = '{ user ( ID: "13" ) { name }}';

const userAccountUPN = '{ user ( ID: "13" ){ accountUpn }}';

const userProfile = '{ user ( ID: "13" ){ profile { description }}}';

const userMemberofGroupsName =
  '{ user ( ID: "13" ){ memberof { groups { name }}}}';

const userMemberofChallengesName =
  '{ user ( ID: "13" ){ memberof { challenges { name }}}}';

const userMemberofOrganisationsName =
  '{ user ( ID: "13" ){ memberof { organisations { name }}}}';

const usersById = '{ usersById (IDs: ["1", "2"]) { id }}';

const groupsName = '{ groups { name }}';

const groupsFocalPointName = '{ groups { focalPoint { name }}}';

const groupsMembersName = '{ groups { members { name }}}';

const groupsProfile = '{ groups { profile { description }}}';

const groupsParentChallenge =
  '{ groups { parent { __typename ... on Challenge { name }}}}';

const groupsParentOpportunity =
  '{ groups { parent { __typename ... on Opportunity { name }}}}';

const groupsParentEcoverse =
  '{ groups { parent { __typename ... on Challenge { name }}}}';

const groupsWithTagName = '{ groupsWithTag (tag: ""){ name }}';

const groupsWithTagFocalPointName =
  '{ groupsWithTag (tag: ""){ focalPoint { name }}}';

const groupsWithTagProfile =
  '{ groupsWithTag (tag: ""){ profile { description }}}';

const groupsWithTagMembersName =
  '{ groupsWithTag (tag: ""){ members { name }}}';

const groupsWithTagParentChallenge =
  '{ groupsWithTag (tag: ""){ parent { __typename ... on Challenge { name }}}}';

const groupsWithTagParentEcoverse =
  '{ groupsWithTag (tag: ""){ parent { __typename ... on Opportunity { name }}}}';

const groupsWithTagParentOpportunity =
  '{ groupsWithTag (tag: ""){ parent { __typename ... on Challenge { name }}}}';

const challengesName = '{ challenges { name }}';

const challengesTextId = '{ challenges { textID }}';

const challengesState = '{ challenges { state }}';

const challengesContext = '{ challenges { context { who }}}';

const challengesLeadOrganisation =
  '{ challenges { leadOrganisations { name }}}';

const challengesLeadOrganisationGroups =
  '{ challenges { leadOrganisations { groups { name }}}}';

const challengesTagsets = '{ challenges { tagset { name }}}';

const challengesGroups = '{ challenges { groups { name }}}';

const challengesContributors = '{ challenges { contributors { name }}}';

const challengesOpportunities = '{ challenges { opportunities { name }}}';

const challengeName = '{ challenge(ID: 1) { name }}';

const challengeTextId = '{ challenge(ID: 1) { textID }}';

const challengeState = '{ challenge(ID: 1) { state }}';

const challengeContext = '{ challenge(ID: 1) { context { who }}}';

const challengeLeadOrganisation =
  '{ challenge(ID: 1) { leadOrganisations { name }}}';

const challengeLeadOrganisationGroups =
  '{ challenge(ID: 1) { leadOrganisations { groups { name }}}}';

const challengeTagsets = '{ challenge(ID: 1) { tagset { name }}}';

const challengeGroups = '{ challenge(ID: 1) { groups { name }}}';

const challengeContributors = '{ challenge(ID: 1) { contributors { name }}}';

const challengeOpportunities = '{ challenge(ID: 1) { opportunities { name }}}';

const opportunitiesName = '{ opportunities { name }}';

const opportunitiesTextId = '{ opportunities { textID }}';

const opportunitiesState = '{ opportunities { state }}';

const opportunitiesContext = '{ opportunities { context { who }}}';

const opportunitiesGroups = '{ opportunities { groups { name }}}';

const opportunitiesContributors = '{ opportunities { contributors { name }}}';

const opportunitiesProjectsName = '{ opportunities { projects { name }}}';

const opportunitiesProjectsAspectsName =
  '{ opportunities { projects { aspects { name }}}}';

const opportunitiesActorgroupsName = '{ opportunities { actorGroups { name }}}';

const opportunitiesActorGroupsActorsName =
  '{ opportunities { actorGroups { actors { name }}}}';

const opportunitiesAspects = '{ opportunities { aspects { title }}}';

const opportunitiesRelationsName =
  '{ opportunities { relations { actorName }}}';

const projectsName = '{ projects { name }}';

const projectsTextId = '{ projects { textID }}';

const projectsDescription = '{ projects { description }}';

const projectsState = '{ projects { state }}';

const projectsTagset = '{ projects { tagset { name }}}';

const projectsAspects = '{ projects { aspects { title }}}';

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
  contextReferencesName,
  usersName,
  usersAccountUPN,
  usersProfile,
  usersMemberofGroupsName,
  usersMemberofChallengesName,
  usersMemberofOrganisationsName,
  userName,
  userAccountUPN,
  userProfile,
  userMemberofGroupsName,
  userMemberofChallengesName,
  userMemberofOrganisationsName,
  usersById,
  groupsName,
  groupsFocalPointName,
  groupsProfile,
  groupsMembersName,
  groupsParentChallenge,
  groupsParentEcoverse,
  groupsParentOpportunity,
  groupsWithTagName,
  groupsWithTagFocalPointName,
  groupsWithTagProfile,
  groupsWithTagMembersName,
  groupsWithTagParentChallenge,
  groupsWithTagParentEcoverse,
  groupsWithTagParentOpportunity,
  challengesName,
  challengesTextId,
  challengesState,
  challengesContext,
  challengesLeadOrganisation,
  challengesLeadOrganisationGroups,
  challengesContributors,
  challengesTagsets,
  challengesGroups,
  challengesOpportunities,
  challengeName,
  challengeTextId,
  challengeState,
  challengeContext,
  challengeLeadOrganisation,
  challengeLeadOrganisationGroups,
  challengeTagsets,
  challengeGroups,
  challengeContributors,
  challengeOpportunities,
  opportunitiesName,
  opportunitiesTextId,
  opportunitiesState,
  opportunitiesContext,
  opportunitiesGroups,
  opportunitiesContributors,
  opportunitiesProjectsName,
  opportunitiesProjectsAspectsName,
  opportunitiesActorgroupsName,
  opportunitiesActorGroupsActorsName,
  opportunitiesAspects,
  opportunitiesRelationsName,
  projectsName,
  projectsTextId,
  projectsDescription,
  projectsState,
  projectsTagset,
  projectsAspects,
};
