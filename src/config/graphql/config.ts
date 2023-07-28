import gql from 'graphql-tag';

export const configQuery = gql`
  query configuration {
    platform {
      configuration {
        platform {
          featureFlags {
            enabled
            name
          }
        }
      }
    }
  }
`;
