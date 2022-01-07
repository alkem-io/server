import { gql } from 'apollo-server-express';

export const hubsQuery = gql`
  query ecoverses {
    ecoverses {
      ...EcoverseDetailsProvider
      __typename
    }
  }

  fragment EcoverseDetailsProvider on Ecoverse {
    id
    nameID
    displayName
    authorization {
      id
      anonymousReadAccess
      __typename
    }
    activity {
      name
      value
      __typename
    }
    community {
      id
      __typename
    }
    tagset {
      id
      name
      tags
      __typename
    }
    context {
      ...ContextDetailsProvider
      __typename
    }
    __typename
  }

  fragment ContextDetailsProvider on Context {
    id
    tagline
    background
    vision
    impact
    who
    visual {
      ...ContextVisual
      __typename
    }
    __typename
  }

  fragment ContextVisual on Visual {
    id
    avatar
    background
    banner
    __typename
  }
`;
