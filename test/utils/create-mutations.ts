const createOrganisationMutation = `
mutation CreateOrganisation($organisationData: OrganisationInput!) {
    createOrganisation(organisationData: $organisationData) {
      name,
      members
      {
        name
      }
    }
  }`;

const createOrganisationVariables = `
{
    "organisationData": {
        "name": "Cherrytwist7"
    }
}`;

const createGroupOnEcoverseMutation = `
mutation CreateGroupOnEcoverse($groupName: String!) {
    createGroupOnEcoverse(groupName: $groupName) {
      name,
      id,
    }
  }`;

const createGroupOnEcoverseVariables = `
{
    "groupName": "test Ecoverse Group"
  }`;

const createUserMutation = `
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

const createUserVariables = `
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

const createReferenceOnProfileMutation = `
mutation createReferenceOnProfile($referenceInput: ReferenceInput!, $profileID: Float!) {
    createReferenceOnProfile(referenceInput: $referenceInput, profileID: $profileID) {
      name,
      uri,
      description
    }
  }`;

const createReferenceOnProfileVariable = `
{
    "profileID": 1,
    "referenceInput":
        {
            "name": "wow",
            "uri": "something",
            "description": "this works"
        }
  }`;

const createChallengeMutation = `
mutation CreateChallenge($challengeData: ChallengeInput!) {
    createChallenge(challengeData: $challengeData) {
      name,
      id,
      groups
      {
        id,
        name
      },
      context{
          references{name, uri}
      }
    }
  }`;

const createChallengeVariables = `
{
    "challengeData": {
        "name": "test challenge name",
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

const createGroupOnChallengeMutation = `
mutation createGroupOnChallenge($groupName: String!, $challengeID: Float!) {
  createGroupOnChallenge(groupName: $groupName, challengeID: $challengeID) {
    name,
    id
    members {
      name
    }
  }
}`;

const createGroupOnChallengeVariables = `
{
  "challengeID": 1,
  "groupName": "testGroup"
}`;

const createOpportunityMutation = `
mutation createOpportunityOnChallenge($opportunityData: OpportunityInput!, $challengeID: Float!) {
    createOpportunityOnChallenge(opportunityData: $opportunityData, challengeID: $challengeID) {
      name,
      id
      }
  }`;

const createOpportunityVariables = `
{
    "challengeID": 1,
    "opportunityData": {
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
                "uri": "test uri",
                "description": "test description"
            }
        }
    }
}`;

const createGroupOnOpportunityMutations = `
mutation createGroupOnOpportunity($groupName: String!, $opportunityID: Float!) {
    createGroupOnOpportunity(groupName: $groupName, opportunityID: $opportunityID) {
      name,
      id
      members {
        name
      }
    }
  }`;

const createGroupOnOpportunityVariables = `
{
    "opportunityID": 1,
    "groupName": "testOpportunityGroup"
  }`;

const createProjectMutation = `
mutation CreateProject($projectData: ProjectInput!, $opportunityID: Float!) {
    createProject(projectData: $projectData, opportunityID: $opportunityID) {
        id
      name,
      description,
      state
    }
  }`;

const createProjectVariables = `
{
    "opportunityID": 1,
    "projectData": {
        "name": "Test-Name-Project",
        "textID": "Test-TextId2",
        "description": "Test-Description--Proj-How do I handle scalability?",
        "state": "test-status--Proj-new"
    }
}`;

const createAspectOnOpportunityMutation = `
mutation CreateAspect($aspectData: AspectInput!, $opportunityID: Float!) {
    createAspect(aspectData: $aspectData, opportunityID: $opportunityID) {
      title,
      framing,
      explanation
    }
  }`;

const createAspectOnOpportunityVariables = `
{
    "opportunityID": 1,
    "aspectData": {
        "title": "2 Test-Test-Deployment---zzz kkk mm",
        "framing": "2 Test-Test-How do I handle scalability?",
        "explanation": "Test-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Test-Deployment is via a microservices architectureTest-Tsdfsdfdsdddddd"
    }
}`;

const createRelationMutation = `
mutation CreateRelation($relationData: RelationInput!, $opportunityID: Float!) {
    createRelation(relationData: $relationData, opportunityID: $opportunityID) {
      type
    }
  }`;

const createRelationVariables = `
{
    "opportunityID": 1,
    "relationData":
    {
      "type": "incoming",
      "description": "description-How do I handle test?",
      "actorName": "actorName-Test",
      "actorType": "actorType-Test1",
      "actorRole": "actorRole-Test2"
    }
  }`;

const createAspectOnProjectMutation = `
mutation CreateAspectOnProject($aspectData: AspectInput!, $projectID: Float!) {
    createAspectOnProject(aspectData: $aspectData, projectID: $projectID) {
      title,
      framing,
      explanation
    }
  }`;

const createAspectOnProjectVariables = `
{
    "projectID": 1,
    "aspectData": {
        "title": "Test-Title",
        "framing": "Test-Framing-How do I handle scalability?",
        "explanation": "Test-Explenation-Deployment is via a microservices architecture"
    }
}`;

const createActorGroupMutation = `
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

const createActorGroupVariables = `
{
    "opportunityID": 1,
    "actorGroupData": {
        "name": "Test Actor 1",
        "description": "Test-How do I handle scalability? - Test"
    }
}`;

const createActorMutation = `
mutation createActor($actorData: ActorInput!, $actorGroupID: Float!) {
    createActor(actorData: $actorData, actorGroupID: $actorGroupID) {
      id,
      name,
      description,
      value,
      impact
      }
  }`;

const createActorVariables = `
{
    "actorGroupID": 1,
    "actorData": {
        "name": "test",
        "description": "Test-Main architect for the solution - Test",
        "value": "Ensuring a robust design - Test",
        "impact": "Time allocated to work on the solution - Test"
    }
}`;

const createReferenceOnContextMutation = `
mutation createReferenceOnContext($referenceInput: ReferenceInput!, $contextID: Float!) {
    createReferenceOnContext(referenceInput: $referenceInput, contextID: $contextID) {
      name,
      uri,
      description
    }
  }`;

const createReferenceOnContextVariables = `
{
    "contextID": 1,
    "referenceInput":
        {
            "name": "wow",
            "uri": "something",
            "description": "this works"
        }
  }`;

const createTagsetOnProfileMutation = `
mutation createTagsetOnProfile($tagsetName: String!, $profileID: Float!) {
    createTagsetOnProfile(tagsetName: $tagsetName, profileID: $profileID) {
      name,
      id
      tags
    }
  }`;

const createTagsetOnProfileVariables = `
{
    "profileID": 1,
    "tagsetName": "testTagset"
  }`;

export {
  createOrganisationMutation,
  createOrganisationVariables,
  createGroupOnEcoverseMutation,
  createGroupOnEcoverseVariables,
  createUserMutation,
  createUserVariables,
  createReferenceOnProfileMutation,
  createReferenceOnProfileVariable,
  createChallengeMutation,
  createChallengeVariables,
  createGroupOnChallengeMutation,
  createGroupOnChallengeVariables,
  createOpportunityMutation,
  createOpportunityVariables,
  createGroupOnOpportunityMutations,
  createGroupOnOpportunityVariables,
  createProjectMutation,
  createProjectVariables,
  createActorGroupMutation,
  createActorGroupVariables,
  createActorMutation,
  createActorVariables,
  createAspectOnOpportunityMutation,
  createAspectOnOpportunityVariables,
  createRelationMutation,
  createRelationVariables,
  createAspectOnProjectMutation,
  createAspectOnProjectVariables,
  createReferenceOnContextMutation,
  createReferenceOnContextVariables,
  createTagsetOnProfileMutation,
  createTagsetOnProfileVariables,
};
