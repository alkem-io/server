export const name = () => '{ name }';

export const hostMembers = () => '{ host { groups { name }}}';

export const hostGroups = () => '{ host { members { name }}}';

export const hostProfile = () => '{ host { profile { description }}}';

export const contextTagline = () => '{ context { tagline }}';

export const contextBackground = () => '{ context { background }}';

export const contextVision = () => '{ context { vision }}';

export const contextImpact = () => '{ context { impact }}';

export const contextWho = () => '{ context { who }}';

export const contextReferencesName = () => '{ context { references { name }}}';

export const usersName = () => '{ users { name }}';

export const usersAccountUPN = () => '{ users { accountUpn }}';

export const usersProfile = () => '{ users { profile { description }}}';

export const usersMemberofGroupsName = () =>
  '{ users { memberof { groups { name }}}}';

export const usersMemberofChallengesName = () =>
  '{ users { memberof { challenges { name }}}}';

export const usersMemberofOrganisationsName = () =>
  '{ users { memberof { organisations { name }}}}';

export const userName = (id: number) => `{ user ( ID: "${id}" ) { name }}`;

export const userAccountUPN = (id: number) =>
  `{ user ( ID: "${id}" ){ accountUpn }}`;

export const userProfile = (id: number) =>
  `{ user ( ID: "${id}" ){ profile { description }}}`;

export const userMemberofGroupsName = (id: number) =>
  `{ user ( ID: "${id}" ){ memberof { groups { name }}}}`;

export const userMemberofChallengesName = (id: number) =>
  `{ user ( ID: "${id}" ){ memberof { challenges { name }}}}`;

export const userMemberofOrganisationsName = (id: number) =>
  `{ user ( ID: "${id}" ){ memberof { organisations { name }}}}`;

export const usersById = () => '{ usersById (IDs: ["1", "2"]) { id }}';

export const groupsName = () => '{ groups { name }}';

export const groupsFocalPointName = () => '{ groups { focalPoint { name }}}';

export const groupsMembersName = () => '{ groups { members { name }}}';

export const groupsProfile = () => '{ groups { profile { description }}}';

export const groupsParentChallenge = () =>
  '{ groups { parent { __typename ... on Challenge { name }}}}';

export const groupsParentOpportunity = () =>
  '{ groups { parent { __typename ... on Opportunity { name }}}}';

export const groupsParentEcoverse = () =>
  '{ groups { parent { __typename ... on Ecoverse { name }}}}';

export const groupsWithTagName = () => '{ groupsWithTag (tag: ""){ name }}';

export const groupsWithTagFocalPointName = () =>
  '{ groupsWithTag (tag: ""){ focalPoint { name }}}';

export const groupsWithTagProfile = () =>
  '{ groupsWithTag (tag: ""){ profile { description }}}';

export const groupsWithTagMembersName = () =>
  '{ groupsWithTag (tag: ""){ members { name }}}';

export const groupsWithTagParentChallenge = () =>
  '{ groupsWithTag (tag: ""){ parent { __typename ... on Challenge { name }}}}';

export const groupsWithTagParentEcoverse = () =>
  '{ groupsWithTag (tag: ""){ parent { __typename ... on Ecoverse { name }}}}';

export const groupsWithTagParentOpportunity = () =>
  '{ groupsWithTag (tag: ""){ parent { __typename ... on Opportunity { name }}}}';

export const challengesName = () => '{ challenges { name }}';

export const challengesTextId = () => '{ challenges { textID }}';

export const challengesState = () => '{ challenges { state }}';

export const challengesContext = () => '{ challenges { context { who }}}';

export const challengesLeadOrganisation = () =>
  '{ challenges { leadOrganisations { name }}}';

export const challengesLeadOrganisationGroups = () =>
  '{ challenges { leadOrganisations { groups { name }}}}';

export const challengesTagsets = () => '{ challenges { tagset { name }}}';

export const challengesGroups = () => '{ challenges { groups { name }}}';

export const challengesContributors = () =>
  '{ challenges { contributors { name }}}';

export const challengesOpportunities = () =>
  '{ challenges { opportunities { name }}}';

export const challengeName = (id: number) => `{ challenge(ID: ${id}) { name }}`;

export const challengeTextId = (id: number) =>
  `{ challenge(ID: ${id}) { textID }}`;

export const challengeState = (id: number) =>
  `{ challenge(ID: ${id}) { state }}`;

export const challengeContext = (id: number) =>
  `{ challenge(ID: ${id}) { context { who }}}`;

export const challengeLeadOrganisation = (id: number) =>
  `{ challenge(ID: ${id}) { leadOrganisations { name }}}`;

export const challengeLeadOrganisationGroups = (id: number) =>
  `{ challenge(ID: ${id}) { leadOrganisations { groups { name }}}}`;

export const challengeTagsets = (id: number) =>
  `{ challenge(ID: ${id}) { tagset { name }}}`;

export const challengeGroups = (id: number) =>
  `{ challenge(ID: ${id}) { groups { name }}}`;

export const challengeContributors = (id: number) =>
  `{ challenge(ID: ${id}) { contributors { name }}}`;

export const challengeOpportunities = (id: number) =>
  `{ challenge(ID: ${id}) { opportunities { name }}}`;

export const opportunitiesName = () => '{ opportunities { name }}';

export const opportunitiesTextId = () => '{ opportunities { textID }}';

export const opportunitiesState = () => '{ opportunities { state }}';

export const opportunitiesContext = () => '{ opportunities { context { who }}}';

export const opportunitiesGroups = () => '{ opportunities { groups { name }}}';

export const opportunitiesContributors = () =>
  '{ opportunities { contributors { name }}}';

export const opportunitiesProjectsName = () =>
  '{ opportunities { projects { name }}}';

export const opportunitiesProjectsAspectsName = () =>
  '{ opportunities { projects { aspects { name }}}}';

export const opportunitiesActorgroupsName = () =>
  '{ opportunities { actorGroups { name }}}';

export const opportunitiesActorGroupsActorsName = () =>
  '{ opportunities { actorGroups { actors { name }}}}';

export const opportunitiesAspects = () =>
  '{ opportunities { aspects { title }}}';

export const opportunitiesRelationsName = () =>
  '{ opportunities { relations { actorName }}}';

export const projectsName = () => '{ projects { name }}';

export const projectsTextId = () => '{ projects { textID }}';

export const projectsDescription = () => '{ projects { description }}';

export const projectsState = () => '{ projects { state }}';

export const projectsTagset = () => '{ projects { tagset { name }}}';

export const projectsAspects = () => '{ projects { aspects { title }}}';

const query: Record<string, (id: number) => string> = {
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

export const getQueries = (name: string, id: number) => {
  return query[name](id);
};

// export {
//   name,
//   hostMembers,
//   hostGroups,
//   hostProfile,
//   contextTagline,
//   contextBackground,
//   contextVision,
//   contextImpact,
//   contextWho,
//   contextReferencesName,
//   usersName,
//   usersAccountUPN,
//   usersProfile,
//   usersMemberofGroupsName,
//   usersMemberofChallengesName,
//   usersMemberofOrganisationsName,
//   userName,
//   userAccountUPN,
//   userProfile,
//   userMemberofGroupsName,
//   userMemberofChallengesName,
//   userMemberofOrganisationsName,
//   usersById,
//   groupsName,
//   groupsFocalPointName,
//   groupsProfile,
//   groupsMembersName,
//   groupsParentChallenge,
//   groupsParentEcoverse,
//   groupsParentOpportunity,
//   groupsWithTagName,
//   groupsWithTagFocalPointName,
//   groupsWithTagProfile,
//   groupsWithTagMembersName,
//   groupsWithTagParentChallenge,
//   groupsWithTagParentEcoverse,
//   groupsWithTagParentOpportunity,
//   challengesName,
//   challengesTextId,
//   challengesState,
//   challengesContext,
//   challengesLeadOrganisation,
//   challengesLeadOrganisationGroups,
//   challengesContributors,
//   challengesTagsets,
//   challengesGroups,
//   challengesOpportunities,
//   challengeName,
//   challengeTextId,
//   challengeState,
//   challengeContext,
//   challengeLeadOrganisation,
//   challengeLeadOrganisationGroups,
//   challengeTagsets,
//   challengeGroups,
//   challengeContributors,
//   challengeOpportunities,
//   opportunitiesName,
//   opportunitiesTextId,
//   opportunitiesState,
//   opportunitiesContext,
//   opportunitiesGroups,
//   opportunitiesContributors,
//   opportunitiesProjectsName,
//   opportunitiesProjectsAspectsName,
//   opportunitiesActorgroupsName,
//   opportunitiesActorGroupsActorsName,
//   opportunitiesAspects,
//   opportunitiesRelationsName,
//   projectsName,
//   projectsTextId,
//   projectsDescription,
//   projectsState,
//   projectsTagset,
//   projectsAspects,
// };
