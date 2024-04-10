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
      challenges {
        nameID
        profile {
          displayName
        }
        community {
          id
        }
        opportunities {
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
