import { gql } from 'apollo-server-express';

export const meQuery = gql`
  query me {
    me {
      nameID
      displayName
      firstName
      lastName
      email
      agent {
        id
        did
        credentials {
          id
          resourceID
          type
        }
      }
    }
  }
`;
