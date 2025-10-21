export type AlkemioConfig = {
  authorization: {
    chunk: number;
  };
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
  security: {
    cors: {
      enabled: boolean;
      origin: string;
      methods: string;
      allowed_headers: string;
    };
    encryption_key: string;
  };
  innovation_hub: {
    header: string;
    whitelisted_subdomains: string;
  };
  search: {
    max_results: number;
    index_pattern: string;
  };
  licensing: {
    wingback: {
      enabled: boolean;
      key: string;
      endpoint: string;
      retries: number;
      timeout: number;
      webhook_secret: {
        name: string;
        value: string;
      };
    };
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
        oidc: {
          hydra_admin_url: string;
          session_sync: {
            enabled: boolean;
            interval_ms: number;
            kratos_database: {
              database: string;
              host?: string;
              port?: number;
              username?: string;
              password?: string;
            };
            synapse_database: {
              host: string;
              port: number;
              username: string;
              password: string;
              database: string;
            };
          };
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
      environment: string;
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
      admin_api: {
        url: string;
        token?: string;
      };
      database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        ssl: boolean;
      };
    };
    discussions: {
      enabled: boolean;
    };
    direct_message_rooms: {
      enabled: boolean;
    };
  };
  storage: {
    enabled: boolean;
    file: {
      max_file_size: number;
    };
    database: {
      host: string;
      port: number;
      timezone: string;
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
      event_bus: {
        exchange: string;
        ingest_body_of_knowledge_queue: string;
        ingest_body_of_knowledge_result_queue: string;
        ingest_website_queue: string;
        ingest_website_result_queue: string;
        invoke_engine_result: string;
        invoke_engine_expert: string;
        invoke_engine_libra_flow: string;
        invoke_engine_guidance: string;
        invoke_engine_generic: string;
        invoke_engine_openai_assistant: string;
      };
    };
  };
  integrations: {
    geo: {
      enabled: boolean;
      header: string;
      rest_endpoint: string;
      service_endpoint: string;
      cache_entry_ttl: number;
      allowed_calls_to_service: number;
      allowed_calls_to_service_window: number;
    };
    geoapify: {
      enabled: boolean;
      geocode_rest_endpoint: string;
      api_key: string;
    };
    elasticsearch: {
      host: string;
      api_key: string;
      retries: number;
      timeout: number;
      indices: {
        contribution: string;
        guidance_usage: string;
      };
      tls: {
        ca_cert_path: string | 'none';
        rejectUnauthorized: boolean;
      };
    };
  };
  notifications: {
    enabled: boolean;
    in_app: {
      max_notifications_per_user: number;
      max_retention_period_days: number;
    };
  };
  collaboration: {
    membership: {
      cache_ttl: number;
    };
    whiteboards: {
      enabled: boolean;
      max_collaborators_in_room: number;
    };
    memo: {
      enabled: boolean;
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
    inspiration: string;
    innovationLibrary: string;
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
    documentation_path: string;
    landing_page: {
      enabled: boolean;
    };
    guidance_engine: {
      enabled: boolean;
    };
    vector_db: {
      host: string;
      port: number;
      credentials: string;
    };
    virtual_contributors: {
      history_length: number;
    };
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
