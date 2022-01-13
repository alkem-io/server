import { gql } from 'apollo-server-express';

export const configQuery = gql`
  query configuration {
    configuration {
      platform {
        featureFlags {
          enabled
          name
        }
      }
    }
  }
`;
