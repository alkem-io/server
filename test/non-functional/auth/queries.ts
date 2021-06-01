export const name = () => '{ecoverse { name }}';

export const hostMembers = () => '{ecoverse { host { members { name }}}}';

export const hostGroups = () => '{ecoverse { host { groups { name }}}}';

export const hostProfile = () =>
  '{ecoverse { host { profile { description }}}}';

export const contextTagline = () => '{ecoverse { context { tagline }}}';

export const contextBackground = () => '{ecoverse { context { background }}}';

export const contextVision = () => '{ecoverse { context { vision }}}';

export const contextImpact = () => '{ecoverse { context { impact }}}';

export const contextWho = () => '{ecoverse { context { who }}}';

export const contextReferencesName = () =>
  '{ecoverse { context { references { name }}}}';

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

export const groupsName = () => '{ ecoverse{ groups { name }}}';

export const groupsMembersName = () =>
  '{ ecoverse{ groups { members { name }}}}';

export const groupsProfile = () =>
  '{ ecoverse{ groups { profile { description }}}}';

export const groupsParentCommunity = () =>
  '{ ecoverse{ groups { parent { __typename ... on Community { name }}}}}';

export const groupsParentOrganisation = () =>
  '{ ecoverse{ groups { parent { __typename ... on Organisation { name }}}}}';

export const groupsWithTagName = () =>
  '{ecoverse{ groupsWithTag (tag: ""){ name }}}';

export const groupsWithTagProfile = () =>
  '{ ecoverse{ groupsWithTag (tag: ""){ profile { description }}}}';

export const groupsWithTagMembersName = () =>
  '{ ecoverse{ groupsWithTag (tag: ""){ members { name }}}}';

export const groupsWithTagParentCommunity = () =>
  '{ ecoverse{ groupsWithTag (tag: ""){ parent { __typename ... on Community { name }}}}}';

export const groupsWithTagParentOrganisation = () =>
  '{ ecoverse{ groupsWithTag (tag: ""){ parent { __typename ... on Organisation { name }}}}}';

export const challengesName = () => '{ ecoverse{ challenges { name }}}';

export const challengesTextId = () => '{ ecoverse{ challenges { textID }}}';

export const challengesState = () =>
  '{ ecoverse{ challenges { lifecycle{state} }}}';

export const challengesContext = () =>
  '{ ecoverse{ challenges { context { who }}}}';

export const challengesLeadOrganisation = () =>
  '{ ecoverse{ challenges { leadOrganisations { name }}}}';

export const challengesLeadOrganisationGroups = () =>
  '{ ecoverse{ challenges { leadOrganisations { groups { name }}}}}';

export const challengesTagsets = () =>
  '{ecoverse{ challenges { tagset { name }}}}';

export const challengesGroups = () =>
  '{ ecoverse{ challenges {community {groups {members {name}}}}}}';

export const challengesContributors = () =>
  '{ecoverse{ challenges {community{id members{id}}}}}';

export const challengesOpportunities = () =>
  '{ ecoverse{ challenges { opportunities { name }}}}';

export const challengeName = (id: string) =>
  `{ecoverse{ challenge(ID: "${id}") { name }}}`;

export const challengeTextId = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") { textID }}}`;

export const challengeState = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") { lifecycle{state} }}}`;
export const challengeContext = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") { context { who }}}}`;

export const challengeLeadOrganisation = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") { leadOrganisations { name }}}}`;

export const challengeLeadOrganisationGroups = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") { leadOrganisations { groups { name }}}}}`;

export const challengeTagsets = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") { tagset { name }}}}`;

export const challengeGroups = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") {community {groups {name}}}}}`;

export const challengeContributors = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") {community{id members{id}}}}}`;

export const challengeOpportunities = (id: string) =>
  `{ecoverse{  challenge(ID: "${id}") { opportunities { name }}}}`;

export const opportunitiesName = () => '{ecoverse{  opportunities { name }}}';

export const opportunitiesTextId = () =>
  '{ecoverse{  opportunities { textID }}}';

export const opportunitiesState = () =>
  '{ecoverse{  opportunities { lifecycle{state} }}}';
export const opportunitiesContext = () =>
  '{ecoverse{  opportunities { context { who }}}}';

export const opportunitiesGroups = () =>
  '{ecoverse{  opportunities { community{groups { name }}}}}';

export const opportunitiesContributors = () =>
  '{ecoverse{  opportunities {community{id members{id}}}}}';

export const opportunitiesProjectsName = () =>
  '{ecoverse{  opportunities { projects { name }}}}';

export const opportunitiesProjectsAspectsName = () =>
  '{ecoverse{  opportunities { projects { aspects { name }}}}}';

export const opportunitiesActorgroupsName = () =>
  '{ecoverse{  opportunities { actorGroups { name }}}}';

export const opportunitiesActorGroupsActorsName = () =>
  '{ecoverse{  opportunities { actorGroups { actors { name }}}}}';

export const opportunitiesAspects = () =>
  '{ecoverse{  opportunities { aspects { title }}}}';

export const opportunitiesRelationsName = () =>
  '{ecoverse{  opportunities { relations { actorName }}}}';

export const projectsName = () => '{ecoverse{  projects { name }}}';

export const projectsTextId = () => '{ecoverse{  projects { textID }}}';

export const projectsDescription = () =>
  '{ecoverse{  projects { description }}}';

export const projectsState = () =>
  '{ecoverse{  projects { lifecycle{state} }}}';

export const projectsTagset = () => '{ecoverse{  projects { tagset { name }}}}';

export const projectsAspects = () =>
  '{ecoverse{ projects { aspects { title }}}}';

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
