import { gql } from 'apollo-server-express';

export const configQuery = gql`
  query configuration {
    configuration {
      ...Configuration
    }
  }

  fragment Configuration on Config {
    authentication {
      providers {
        name
        label
        icon
        enabled
        config {
          __typename
          ... on OryConfig {
            kratosPublicBaseURL
            issuer
          }
        }
      }
    }
    platform {
      about
      feedback
      privacy
      security
      support
      terms
      featureFlags {
        enabled
        name
      }
    }
    sentry {
      enabled
      endpoint
      submitPII
    }
  }
`;
