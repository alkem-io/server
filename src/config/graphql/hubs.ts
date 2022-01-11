import { gql } from 'apollo-server-express';

export const hubsQuery = gql`
  query ecoverses {
    ecoverses {
      nameID
      displayName
      community {
        id
        displayName
      }
      challenges {
        nameID
        displayName
        community {
          id
          displayName
        }
        opportunities {
          nameID
          displayName
          community {
            id
            displayName
          }
        }
      }
    }
  }
`;
