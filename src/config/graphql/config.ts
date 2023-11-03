import gql from 'graphql-tag';

export const configQuery = gql`
  query configuration {
    platform {
      configuration {
        featureFlags {
          enabled
          name
        }
      }
    }
  }
`;
