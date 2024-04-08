import gql from 'graphql-tag';

export const spacesQuery = gql`
  query spaces {
    spaces {
      nameID
      profile {
        displayName
      }
      community {
        id
        displayName
      }
      subspaces {
        nameID
        profile {
          displayName
        }
        community {
          id
          displayName
        }
        subspaces {
          nameID
          profile {
            displayName
          }
          community {
            id
            displayName
          }
        }
      }
    }
  }
`;
