import gql from 'graphql-tag';

export const meQuery = gql`
  query me {
    me {
      user {
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
      applications {
        id
        lifecycle {
          state
        }
      }
      invitations {
        id
        lifecycle {
          state
        }
      }
      spaceMemberships {
        id
        nameID
      }
    }
  }
`;
