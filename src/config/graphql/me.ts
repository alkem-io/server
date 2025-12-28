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
        credentials {
          resourceID
          type
        }
      }
      spaceMembershipsFlat {
        space {
          nameID
          level
        }
      }
    }
  }
`;
