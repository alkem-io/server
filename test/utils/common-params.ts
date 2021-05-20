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
  name
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
  templateId
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
  name
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
  name
  textID
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
  name
  textID
  groups {
    ${groupData}
  }
  profile {
    ${profileData}
  }
  ${membersData}
`;

export const challengesData = `
    id
    name
    textID
    ${activityData}
    ${collaborationData}
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
  name
  textID
  ${activityData}
  ${collaborationData}
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
  name
  textID

  ${collaborationData}
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
