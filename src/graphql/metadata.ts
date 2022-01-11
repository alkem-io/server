import { gql } from 'apollo-server-express';

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
