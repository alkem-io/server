import { gql } from 'apollo-server-express';

export const hubsQuery = gql`
  query hubs {
    hubs {
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
