import gql from 'graphql-tag';

export const meQuery = gql`
  query me {
    me {
      nameID
      firstName
      lastName
      email
      profile {
        displayName
      }
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
