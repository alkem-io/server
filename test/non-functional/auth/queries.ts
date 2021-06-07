export const name = () => '{ecoverse(ID: "TestEcoverse" ) { name }}';

export const hostMembers = () => '{ecoverse(ID: "TestEcoverse" ) { host { members { name }}}}';

export const hostGroups = () => '{ecoverse(ID: "TestEcoverse" ) { host { groups { name }}}}';

export const hostProfile = () =>
  '{ecoverse(ID: "TestEcoverse" ) { host { profile { description }}}}';

export const contextTagline = () => '{ecoverse(ID: "TestEcoverse" ) { context { tagline }}}';

export const contextBackground = () => '{ecoverse(ID: "TestEcoverse" ) { context { background }}}';

export const contextVision = () => '{ecoverse(ID: "TestEcoverse" ) { context { vision }}}';

export const contextImpact = () => '{ecoverse(ID: "TestEcoverse" ) { context { impact }}}';

export const contextWho = () => '{ecoverse(ID: "TestEcoverse" ) { context { who }}}';

export const contextReferencesName = () =>
  '{ecoverse(ID: "TestEcoverse" ) { context { references { name }}}}';

export const usersName = () => '{ users { name }}';

export const usersAccountUPN = () => '{ users { accountUpn }}';

export const usersProfile = () => '{ users { profile { description }}}';

export const usersMemberofAgentCredentials = () =>
  '{ users {agent {id credentials { id resourceID type }}}}';

export const userName = (id: string) => `{ user ( ID: "${id}" ) { name }}`;

export const userAccountUPN = (id: string) =>
  `{ user ( ID: "${id}" ){ accountUpn }}`;

export const userProfile = (id: string) =>
  `{ user ( ID: "${id}" ){ profile { description }}}`;

export const userMemberofAgentCredentials = (id: string) =>
  `{ user ( ID: "${id}" ){ agent {id credentials { id resourceID type }}}}`;

export const usersById = () => '{ usersById (IDs: ["1", "2"]) { id }}';

export const groupsName = () => '{ ecoverse(ID: "testEcoverse") { groups { name }}}';

export const groupsMembersName = () =>
  '{ ecoverse(ID: "testEcoverse") { groups { members { name }}}}';

export const groupsProfile = () =>
  '{ ecoverse(ID: "testEcoverse") { groups { profile { description }}}}';

export const groupsParentCommunity = () =>
  '{ ecoverse(ID: "testEcoverse") { groups { parent { __typename ... on Community { name }}}}}';

export const groupsParentOrganisation = () =>
  '{ ecoverse(ID: "testEcoverse") { groups { parent { __typename ... on Organisation { name }}}}}';

export const groupsWithTagName = () =>
  '{ecoverse(ID: "testEcoverse") { groupsWithTag (tag: ""){ name }}}';

export const groupsWithTagProfile = () =>
  '{ ecoverse(ID: "testEcoverse") { groupsWithTag (tag: ""){ profile { description }}}}';

export const groupsWithTagMembersName = () =>
  '{ ecoverse(ID: "testEcoverse") { groupsWithTag (tag: ""){ members { name }}}}';

export const groupsWithTagParentCommunity = () =>
  '{ ecoverse(ID: "testEcoverse") { groupsWithTag (tag: ""){ parent { __typename ... on Community { name }}}}}';

export const groupsWithTagParentOrganisation = () =>
  '{ ecoverse(ID: "testEcoverse") { groupsWithTag (tag: ""){ parent { __typename ... on Organisation { name }}}}}';

export const challengesName = () => '{ ecoverse(ID: "testEcoverse") { challenges { name }}}';

export const challengesTextId = () => '{ ecoverse(ID: "testEcoverse") { challenges { textID }}}';

export const challengesState = () =>
  '{ ecoverse(ID: "testEcoverse") { challenges { lifecycle{state} }}}';

export const challengesContext = () =>
  '{ ecoverse(ID: "testEcoverse") { challenges { context { who }}}}';

export const challengesLeadOrganisation = () =>
  '{ ecoverse(ID: "testEcoverse") { challenges { leadOrganisations { name }}}}';

export const challengesLeadOrganisationGroups = () =>
  '{ ecoverse(ID: "testEcoverse") { challenges { leadOrganisations { groups { name }}}}}';

export const challengesTagsets = () =>
  '{ecoverse(ID: "testEcoverse") { challenges { tagset { name }}}}';

export const challengesGroups = () =>
  '{ ecoverse(ID: "testEcoverse") { challenges {community {groups {members {name}}}}}}';

export const challengesContributors = () =>
  '{ecoverse(ID: "testEcoverse") { challenges {community{id members{id}}}}}';

export const challengesOpportunities = () =>
  '{ ecoverse(ID: "testEcoverse") { challenges { opportunities { name }}}}';

export const challengeName = (id: string) =>
  `{ecoverse(ID: "testEcoverse") { challenge(ID: "${id}") { name }}}`;

export const challengeTextId = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") { textID }}}`;

export const challengeState = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") { lifecycle{state} }}}`;
export const challengeContext = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") { context { who }}}}`;

export const challengeLeadOrganisation = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") { leadOrganisations { name }}}}`;

export const challengeLeadOrganisationGroups = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") { leadOrganisations { groups { name }}}}}`;

export const challengeTagsets = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") { tagset { name }}}}`;

export const challengeGroups = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") {community {groups {name}}}}}`;

export const challengeContributors = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") {community{id members{id}}}}}`;

export const challengeOpportunities = (id: string) =>
  `{ecoverse(ID: "testEcoverse") {  challenge(ID: "${id}") { opportunities { name }}}}`;

export const opportunitiesName = () => '{ecoverse(ID: "testEcoverse") {  opportunities { name }}}';

export const opportunitiesTextId = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { textID }}}';

export const opportunitiesState = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { lifecycle{state} }}}';
export const opportunitiesContext = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { context { who }}}}';

export const opportunitiesGroups = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { community{groups { name }}}}}';

export const opportunitiesContributors = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities {community{id members{id}}}}}';

export const opportunitiesProjectsName = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { projects { name }}}}';

export const opportunitiesProjectsAspectsName = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { projects { aspects { name }}}}}';

export const opportunitiesActorgroupsName = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { actorGroups { name }}}}';

export const opportunitiesActorGroupsActorsName = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { actorGroups { actors { name }}}}}';

export const opportunitiesAspects = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { aspects { title }}}}';

export const opportunitiesRelationsName = () =>
  '{ecoverse(ID: "testEcoverse") {  opportunities { relations { actorName }}}}';

export const projectsName = () => '{ecoverse(ID: "testEcoverse") {  projects { name }}}';

export const projectsTextId = () => '{ecoverse(ID: "testEcoverse") {  projects { textID }}}';

export const projectsDescription = () =>
  '{ecoverse(ID: "testEcoverse") {  projects { description }}}';

export const projectsState = () =>
  '{ecoverse(ID: "testEcoverse") {  projects { lifecycle{state} }}}';

export const projectsTagset = () => '{ecoverse(ID: "testEcoverse") {  projects { tagset { name }}}}';

export const projectsAspects = () =>
  '{ecoverse(ID: "testEcoverse") { projects { aspects { title }}}}';

const query: Record<string, (id: string) => string> = {
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
  usersMemberofAgentCredentials,
  userName,
  userAccountUPN,
  userProfile,
  userMemberofAgentCredentials,
  usersById,
  groupsName,
  groupsProfile,
  groupsMembersName,
  groupsParentCommunity,
  groupsParentOrganisation,
  groupsWithTagName,
  groupsWithTagProfile,
  groupsWithTagMembersName,
  groupsWithTagParentCommunity,
  groupsWithTagParentOrganisation,
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

export const getQueries = (name: string, id: string) => {
  return query[name](id);
};
