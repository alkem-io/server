declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_HOST: string;
    MYSQL_DATABASE: string;
    MYSQL_ROOT_PASSWORD: string;
    ENABLE_ORM_LOGGING: boolean;
    AAD_CLIENT: string;
    AAD_TENANT: string;
    AUTHENTICATION_ENABLED: string;
  }
}
