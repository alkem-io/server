const communityId = 1;

export const createOrganisationMutation = `
mutation CreateOrganisation($organisationData: OrganisationInput!) {
  createOrganisation(organisationData: $organisationData) {
    id
    name
    members
      {
        name
      }
    }
  }`;

export const createOrganisationVariables = () => `
{
    "organisationData": {
        "name": "Cherrytwist7 ",
        "textID": "test-organ"
    }
}`;

export const createUserMutation = `
mutation CreateUser($userData: UserInput!) {
    createUser(userData: $userData) {
      id
      name
      firstName
      lastName
      email
      phone
      city
      country
      gender
      accountUpn
    }
}
`;

export const createUserVariables = (id: number) => `
{
    "userData": {
        "name": "user12",
        "firstName": "testasaFN",
        "lastName": "tessataLN",
        "email": "user{{uniqueTextId}}@test.com",
        "city": "testCity",
        "country": "testCountry",
        "gender": "testGender",
        "aadPassword": "sjk!!675&^*GAFDGFSsdfh",
        "accountUpn": "test",
        "profileData": {
            "avatar": "test",
            "description": "test"
        }
    }
}`;

export const createReferenceOnProfileMutation = `
mutation createReferenceOnProfile($referenceInput: ReferenceInput!, $profileID: Float!) {
    createReferenceOnProfile(referenceInput: $referenceInput, profileID: $profileID) {
      name,
      uri,
      description
    }
  }`;

export const createReferenceOnProfileVariable = (id: number) => `
{
    "profileID": ${id},
    "referenceInput":
        {
            "name": "wow",
            "uri": "https://test.com",
            "description": "this works"
        }
  }`;

export const createChallengeMutation = `
mutation CreateChallenge($challengeData: ChallengeInput!) {
    createChallenge(challengeData: $challengeData) {
      name,
      id,
      context{
          references{name, uri}
      }
    }
  }`;

export const createChallengeVariables = () => `
{
    "challengeData": {
        "name": "test challenge name ",
        "textID": "testCha-textId",
        "context": {
            "tagline": "Test tagline - How might we incentivize consumers to communicate energy demand and production to allow all stakeholders to balance the grid?",
            "background": "Test background - Our power system is becoming increasingly more decentralized and complex. By using solar PV, consumers have become electricity producers as well, and the number of these ‘prosumers’ is increasing. All the while, the electricity demand is rising due to the electrification of transport and industry. Cities around the world are electrifying their public transport systems, but if all busses would be charged around the time people are in the kitchen preparing dinner, the current grid would not be able to cope. The energy sector is striving to make the best of these developments, but so far the sector remains fragmented with a large number of initiatives and pilots spread over start-ups, scale-ups, countries, DSOs, TSOs, utilities, and regulators. Balancing the power grid is and will be more and more difficult and expensive. While technological advances have already disrupted many areas of the power system and, for example, empowered consumers to become producers and traders of their own electricity, the balancing markets still resemble an exclusive club of the big industry players. How can we enable also small consumers and prosumers to contribute to balancing? ",
            "vision": "Test vision - Enable the entire energy sector to transition from an ego-system to an eco-system, where everyone and anything is incentivized to share demand AND production of green power. You will co-create the fast and energy efficient digital power market commons by developing a protocol communication layer to power an awesome fossil-free future within one generation.",
            "impact": "Test impact - The power grid is one of the most sophisticated infrastructures ever built. By building the energy flexibility ecosystem on a digital protocol layer, the network will become fit for a fossil-free future and will prevent major and costly physical grid investments that will impact the grid and its customers. It will make the power system more robust and transparent, enabling anyone to build an infinite amount of business cases on top of your solution.",
            "who": "Test who - Vattenfall is inviting energy specialists throughout the entire sector, from DSOs and TSOs to solar power solution providers, to work with the teams to create the best solutions",
            "references": [
                {
                    "name": "Test video",
                    "uri": "https://youtu.be/-wGlzcjs9CI",
                    "description": "Test description - Video explainer for the challenge"
                },
                {
                    "name": "Test - visual",
                    "uri": "https://www.odyssey.org/wp-content/uploads/2020/08/1.-Fossil-Fuel-Free-Future-Vattenfall1-72-scaled.jpg",
                    "description": "Test - Visual for the challenge"
                },
                {
                    "name": "Test - EnergyWeb2",
                    "uri": "https://www.energyweb.org/",
                    "description": "Test - Official site"
                }
            ]
        }
    }
}`;

export const createGroupOnCommunityMutation = `
mutation createGroupOnCommunity($groupName: String!, $communityID: Float!) {
  createGroupOnCommunity(groupName: $groupName, communityID: $communityID) {
    name,
    id
    members {
      name
    }
  }
}`;

export const createGroupOnCommunityVariables = (id: number) => `
{
  "communityID": ${communityId},
  "groupName": "testGroup"
}`;

export const createOpportunityMutation = `
mutation createOpportunity($opportunityData: OpportunityInput!) {
  createOpportunity(opportunityData: $opportunityData) {
      name,
      id
      }
  }`;

export const createOpportunityVariables = (id: number) => `
{

    "opportunityData": {
      "parentID": "${id}",
        "name": "Test opportunity",
        "textID": "test-opp",
        "state": "reserved",
        "context": {
            "background": "test",
            "vision": "test vision",
            "tagline": "test tagline",
            "who": "test who",
            "impact": "test impact",
            "references": {
                "name": "test name",
                "uri": "https://test.com",
                "description": "test description"
            }
        }
    }
}`;

export const createProjectMutation = `
mutation CreateProject($projectData: ProjectInput!, $opportunityID: Float!) {
    createProject(projectData: $projectData, opportunityID: $opportunityID) {
        id
      name,
      description,
      state
    }
  }`;

export const createProjectVariables = (id: number) => `
{
    "opportunityID": ${id},
    "projectData": {
        "name": "Test-Name-Project",
        "textID": "Test-TextId2",
        "description": "Test-Description--Proj-How do I handle scalability?",
        "state": "test-status--Proj-new"
    }
}`;

export const createAspectOnOpportunityMutation = `
mutation CreateAspect($aspectData: AspectInput!, $opportunityID: Float!) {
    createAspect(aspectData: $aspectData, opportunityID: $opportunityID) {
      title,
      framing,
      explanation
    }
  }`;

export const createAspectOnOpportunityVariables = (id: number) => `
{
    "opportunityID": ${id},
    "aspectData": {
        "title": "2 Test-Test-Deployment---zzz kkk mm",
        "framing": "2 Test-Test-How do I handle scalability?",
        "explanation": "Test-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Tsdfsdfdsdddddd"
    }
}`;

export const createRelationMutation = `
mutation CreateRelation($relationData: RelationInput!, $opportunityID: Float!) {
    createRelation(relationData: $relationData, opportunityID: $opportunityID) {
      type
    }
  }`;

export const createRelationVariables = (id: number) => `
{
    "opportunityID": ${id},
    "relationData":
    {
      "type": "incoming",
      "description": "description-How do I handle test?",
      "actorName": "actorName-Test",
      "actorType": "actorType-Test1",
      "actorRole": "actorRole-Test2"
    }
  }`;

export const createAspectOnProjectMutation = `
mutation CreateAspectOnProject($aspectData: AspectInput!, $projectID: Float!) {
    createAspectOnProject(aspectData: $aspectData, projectID: $projectID) {
      title,
      framing,
      explanation
    }
  }`;

export const createAspectOnProjectVariables = (id: number) => `
{
    "projectID": ${id},
    "aspectData": {
        "title": "Test-Title",
        "framing": "Test-Framing-How do I handle scalability?",
        "explanation": "Test-Explenation-Deployment is via a microservices architecture"
    }
}`;

export const createActorGroupMutation = `
mutation CreateActorGroup(
    $actorGroupData: ActorGroupInput!
    $opportunityID: Float!
  ) {
    createActorGroup(
      actorGroupData: $actorGroupData
      opportunityID: $opportunityID
    ) {
      name
      description
      actors {
        name
          }
      }
  }`;

export const createActorGroupVariables = (id: number) => `
{
    "opportunityID": ${id},
    "actorGroupData": {
        "name": "Test Actor 1",
        "description": "Test-How do I handle scalability? - Test"
    }
}`;

export const createActorMutation = `
mutation createActor($actorData: ActorInput!, $actorGroupID: Float!) {
    createActor(actorData: $actorData, actorGroupID: $actorGroupID) {
      id,
      name,
      description,
      value,
      impact
      }
  }`;

export const createActorVariables = (id: number) => `
{
    "actorGroupID": ${id},
    "actorData": {
        "name": "test",
        "description": "Test-Main architect for the solution - Test",
        "value": "Ensuring a robust design - Test",
        "impact": "Time allocated to work on the solution - Test"
    }
}`;

export const createReferenceOnContextMutation = `
mutation createReferenceOnContext($referenceInput: ReferenceInput!, $contextID: Float!) {
    createReferenceOnContext(referenceInput: $referenceInput, contextID: $contextID) {
      name,
      uri,
      description
    }
  }`;

export const createReferenceOnContextVariables = (id: number) => `
{
    "contextID": 1,
    "referenceInput":
        {
            "name": "wow",
            "uri": "https://test.com",
            "description": "this works"
        }
  }`;

export const createTagsetOnProfileMutation = `
mutation createTagsetOnProfile($tagsetName: String!, $profileID: Float!) {
    createTagsetOnProfile(tagsetName: $tagsetName, profileID: $profileID) {
      name,
      id
      tags
    }
  }`;

export const createTagsetOnProfileVariables = (id: number) => `
{
    "profileID": ${id},
    "tagsetName": "testTagset"
  }`;

export const createApplicationMutation = `
  mutation createApplication(
    $communityId: Float!
    $applicationData: ApplicationInput!
  ) {
    createApplication(
      communityID: $communityId
      applicationData: $applicationData
    ) {
      id
      user {
        id
        name
      }
      questions {
        id
        name
        value
      }
      status
    }
  }`;

export const createApplicationVariables = (id: number) => `
{
  "communityId": 1,
  "applicationData": {
    "userId": 11,
    "questions": [
      {"name": "Test Question 1", "value": "Test answer"}
    ]
  }
}`;

const mutations: Record<string, string> = {
  createOrganisationMutation,
  createUserMutation,
  createReferenceOnProfileMutation,
  createChallengeMutation,
  createGroupOnCommunityMutation,
  createOpportunityMutation,
  createAspectOnOpportunityMutation,
  createProjectMutation,
  createActorGroupMutation,
  createActorMutation,
  createRelationMutation,
  createAspectOnProjectMutation,
  createReferenceOnContextMutation,
  createTagsetOnProfileMutation,
  createApplicationMutation,
};

const variables: Record<string, (id: number) => string> = {
  createOrganisationVariables,

  createUserVariables,
  createReferenceOnProfileVariable,
  createChallengeVariables,
  createGroupOnCommunityVariables,
  createOpportunityVariables,
  createProjectVariables,
  createActorGroupVariables,
  createActorVariables,
  createAspectOnOpportunityVariables,
  createRelationVariables,
  createAspectOnProjectVariables,
  createReferenceOnContextVariables,
  createTagsetOnProfileVariables,
  createApplicationVariables
};

export const getCreateMutation = (name: string) => {
  return mutations[name];
};

export const getCreateVariables = (name: string, id: any) => {
  return variables[name](id);
};
