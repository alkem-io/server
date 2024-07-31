export type AlkemioConfig = {
  hosting: {
    environment: string;
    port: number;
    endpoint_cluster: string;
    path_api_public_rest: string;
    path_api_private_rest: string;
    subscriptions: {
      enabled: string;
    };
    whiteboard_rt: {
      port: number;
    };
    max_json_payload_size: string;
  };
  bootstrap: {
    authorization: {
      enabled: string;
      file: string;
    };
  };
  security: {
    cors: {
      enabled: boolean;
      origin: string;
      methods: string;
      allowed_headers: string;
    };
  };
  innovation_hub: {
    header: string;
  };
  search: {
    use_new: boolean;
    max_results: number;
    index_pattern: string;
  };
  identity: {
    authentication: {
      api_access_enabled: boolean;
      cache_ttl: number;
      providers: {
        ory: {
          issuer: string;
          jwks_uri: string;
          kratos_public_base_url: string;
          kratos_public_base_url_server: string;
          kratos_admin_base_url_server: string;
          earliest_possible_extend: number;
          admin_service_account: {
            username: string;
            password: string;
          };
          session_cookie_name: string;
          session_extend_enabled: boolean;
        };
      };
    };
  };
  monitoring: {
    logging: {
      console_logging_enabled: boolean;
      level: 'debug' | 'verbose' | 'info' | 'log' | 'warn' | 'error';
      profiling_enabled: boolean;
      json: boolean;
      requests: {
        full_logging_enabled: boolean;
        headers_logging_enabled: boolean;
      };
      responses: {
        headers_logging_enabled: boolean;
      };
      context_to_file: {
        enabled: boolean;
        filename: string;
        context: string;
      };
    };
    sentry: {
      enabled: boolean;
      endpoint: string;
      submit_pii: boolean;
    };
    apm: {
      rumEnabled: boolean;
      endpoint: string;
    };
  };
  communications: {
    enabled: boolean;
    matrix: {
      connection_retries: number;
      connection_timeout: number;
    };
    discussions: {
      enabled: boolean;
    };
  };
  storage: {
    database: {
      host: string;
      port: number;
      username: string;
      password: string;
      schema: string;
      database: string;
      charset: string;
      logging: boolean;
    };
    local_storage: {
      path: string;
    };
    redis: {
      host: string;
      port: string;
      timeout: number;
    };
  };
  microservices: {
    rabbitmq: {
      connection: {
        host: string;
        port: number;
        user: string;
        password: string;
      };
    };
  };
  integrations: {
    geo: {
      rest_endpoint: string;
      service_endpoint: string;
      cache_entry_ttl: number;
      allowed_calls_to_service: number;
      allowed_calls_to_service_window: number;
    };
    elasticsearch: {
      host: string;
      api_key: string;
      retries: number;
      timeout: number;
      indices: {
        contribution: string;
        namings: string;
        guidance_usage: string;
      };
      tls: {
        ca_cert_path: string | 'none';
        rejectUnauthorized: boolean;
      };
      policies: {
        space_name_enrich_policy: string;
      };
    };
  };
  notifications: {
    enabled: boolean;
  };
  collaboration: {
    whiteboards: {
      enabled: boolean;
      contribution_window: number;
      save_interval: number;
      save_timeout: number;
      collaborator_mode_timeout: number;
      max_collaborators_in_room: number;
    };
  };
  platform: {
    terms: string;
    privacy: string;
    security: string;
    support: string;
    forumreleases: string;
    feedback: string;
    about: string;
    landing: string;
    blog: string;
    impact: string;
    foundation: string;
    contactsupport: string;
    switchplan: string;
    opensource: string;
    releases: string;
    help: string;
    community: string;
    newuser: string;
    tips: string;
    aup: string;
    landing_page: {
      enabled: boolean;
    };
    guidance_engine: {
      enabled: boolean;
    };
    vector_db: {
      host: string;
      port: number;
    }
  };
  ssi: {
    enabled: boolean;
    issuer_validation_enabled: boolean;
    issuers: {
      alkemio: {
        enabled: boolean;
      };
      sovrhd: {
        enabled: boolean;
        endpoint: string;
        credential_types: Array<{
          name: string;
          identifier: string;
        }>;
      };
    };
    credentials: {
      the_hague_proof_of_postal_address: SsiCredential<the_hague_proof_of_postal_addressContext>;
      the_hague_hoplr: SsiCredential<the_hague_hoplrContext>;
      proof_of_email_address: SsiCredential<proof_of_email_addressContext>;
      proof_of_community_membership: SsiCredential<proof_of_community_membershipContext>;
      proof_of_alkemio_membership: SsiCredential<proof_of_alkemio_membershipContext>;
    };
  };
};

type SsiCredential<TContext extends Record<string, string>> = {
  name: string;
  issuer: string;
  description: string;
  schema: string;
  types: string[];
  uniqueType: string;
  context: TContext;
};

type the_hague_proof_of_postal_addressContext = {
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
};

type the_hague_hoplrContext = {
  the_hague_hoplr: string;
};

type proof_of_email_addressContext = {
  emailAddress: string;
};

type proof_of_community_membershipContext = {
  alkemioUser_userID: string;
  alkemioUser_email: string;
  communityMember_communityID: string;
  communityMember_displayName: string;
};

type proof_of_alkemio_membershipContext = {
  alkemioUser_userID: string;
  alkemioUser_email: string;
};
