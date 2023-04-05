import gql from 'graphql-tag';

export const serverMetadataQuery = gql`
  query serverMetadata {
    metadata {
      services {
        name
        version
      }
    }
  }
`;
