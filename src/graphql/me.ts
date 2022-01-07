import { gql } from 'apollo-server-express';

export const meQuery = gql`
  query me {
    me {
      ...UserDetails
      ...UserAgent
      __typename
    }
  }

  fragment UserDetails on User {
    id
    nameID
    displayName
    firstName
    lastName
    email
    gender
    country
    city
    phone
    accountUpn
    agent {
      credentials {
        type
        resourceID
        __typename
      }
      __typename
    }
    profile {
      id
      description
      avatar
      references {
        id
        name
        uri
        __typename
      }
      tagsets {
        id
        name
        tags
        __typename
      }
      __typename
    }
    __typename
  }

  fragment UserAgent on User {
    agent {
      id
      did
      credentials {
        id
        resourceID
        type
        __typename
      }
      __typename
    }
    __typename
  }
`;
