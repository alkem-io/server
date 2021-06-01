export const referencesData = `
  id
  name
  uri
`;

export const tagsetData = `
  id
  name
  tags
`;

export const profileData = `
  id
  avatar
  description
  references {
    ${referencesData}
  }
  tagsets {
    ${tagsetData}
  }
`;

export const userData = `
  id
  displayName
  nameID
  firstName
  lastName
  email
  phone
  accountUpn
  agent {id}
  city
  country
  profile {
    ${profileData}
  }
`;

export const membersData = `
members{
  ${userData}
  profile {
    ${profileData}
  }
}`;

export const relationsData = `
  id
  actorName
  actorRole
  actorType
  description
  type
`;

// Add parents as param
export const groupData = `
  id
  name
  ${membersData}
  profile{
    ${profileData}
  }
`;

export const lifecycleData = `
  id
  state
  nextEvents
  machineDef
  templateName
`;

export const applicationData = `
  id
  lifecycle {
    ${lifecycleData}
  }
  questions{id}
  user {
    ${userData}
  }
`;

export const communityData = `
  id
  displayName
  ${membersData}
  groups {
    ${groupData}
  }
  applications{
    ${applicationData}
  }
`;

export const activityData = `
activity{
  id
  name
  value
}`;

export const aspectData = `
  id
  title
  explanation
  framing
`;

export const projectData = `
  id
  displayName
  nameID
  description
  aspects{
    ${aspectData}
  }
  lifecycle {
    ${lifecycleData}
  }
  tagset {
    ${tagsetData}
  }`;

export const collaborationData = `
collaboration {
  id
  projects{
    ${projectData}
  }
  relations{
    ${relationsData}
  }
}`;



export const actorData = `
      id
    name
    description
    value
    impact
`;

export const actorGrpupData = `
  id
  name
  description
  actors {
    ${actorData}
  }
`;

export const ecosystemModelData = `
ecosystemModel {
  id
  description

  actorGroups {
    ${actorGrpupData}
  }
  }`;

export const contextData = `
  id
  tagline
  background
  vision
  impact
  who
  references {
    ${referencesData}
  }
  aspects{
    ${aspectData}
  }
  ${ecosystemModelData}
`;

export const leadOrganisationsData = `
  id
  nameID

  groups {
    ${groupData}
  }
  profile {
    ${profileData}
  }
  ${membersData}
`;

export const opportunityData = `
  id
  displayName
  nameID
  community {
    ${communityData}
  }
  context {
    ${contextData}
  }
  lifecycle {
    ${lifecycleData}
  }
  tagset {
    ${tagsetData}
  }
  projects{
    ${projectData}
  }
  relations{
    ${relationsData}
  }
`;

export const challengesData = `
    id
    displayName
    nameID
    ${activityData}

    opportunities {
      ${opportunityData}
    }
    community {
      ${communityData}
    }
    context {
      ${contextData}
    }
    lifecycle {
      ${lifecycleData}
    }
    tagset {
      ${tagsetData}
    }
    leadOrganisations {
      ${leadOrganisationsData}
    }
`;

export const challengeData = `
  id
  displayName
  nameID
  ${activityData}
  opportunities {
    ${opportunityData}
  }
  community {
    ${communityData}
  }
  context {
    ${contextData}
  }
  lifecycle {
    ${lifecycleData}
  }
  tagsets {
    ${tagsetData}
  }
  leadOrganisations {
    ${leadOrganisationsData}
  }
  challenges{
    ${challengesData}
  }
`;
//${activityData}
export const challengeDataTest = `
  id
  displayName
  nameID


  opportunities {
    ${opportunityData}
  }
  community {
    ${communityData}
  }
  context {
    ${contextData}
  }
  lifecycle {
    ${lifecycleData}
  }
  tagset {
    ${tagsetData}
  }

  challenges{
    ${challengesData}
  }
`;

export const hostData = `
host {
  id
  name
  textID
  groups {
    ${groupData}
  }
  ${membersData}
  profile {
    ${profileData}
  }
}`;

export const ecoverseData = `
ecoverse{
  id
  name
  ${activityData}
  applications {
    ${applicationData}
  }
  ${challengesData}
  challenge${challengeData}
  community {
    ${communityData}
  }
  context {
    ${contextData}
  }
  groups {
    ${groupData}
  }
  group {
    ${groupData}
  }
  ${hostData}
  project${projectData}
  projects${projectData}
  tagsets {
    ${tagsetData}
  }
}`;

export const meData = `
me{
  user {
    ${userData}
  }
}`;

export const organisationData = `
  {
    id
    displayName
    nameID
    groups {
      ${groupData}
    }
    ${membersData}
    profile {
      ${profileData}
    }
}`;
