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
      challenges {
        nameID
        profile {
          displayName
        }
        community {
          id
          displayName
        }
        opportunities {
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
