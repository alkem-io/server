import gql from 'graphql-tag';

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
