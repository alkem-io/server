import gql from 'graphql-tag';

export const meQuery = gql`
  query me {
    me {
      user {
        nameID
        email
        profile {
          displayName
        }
        agent {
          did
          credentials {
            resourceID
            type
          }
        }
      }
      spaceMemberships {
        nameID
      }
    }
  }
`;
