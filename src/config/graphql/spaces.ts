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
      }
      subspaces {
        nameID
        profile {
          displayName
        }
        community {
          id
        }
        subspaces {
          nameID
          profile {
            displayName
          }
          community {
            id
          }
        }
      }
    }
  }
`;
