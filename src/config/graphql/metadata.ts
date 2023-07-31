import gql from 'graphql-tag';

export const platformMetadataQuery = gql`
  query platformMetadata {
    platform {
      metadata {
        services {
          name
          version
        }
      }
    }
  }
`;
