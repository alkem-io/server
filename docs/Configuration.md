# Cherrytwist Server Configuration

The Cherrytwit Server uses a series of environment variables to control the server behaviour.

There are defaults provided for all supported configuration value sets. If you need to specify different configuration, add a `.env` file in project root folder and set your custom values there.

## Server

The following environment variables are used to configure database usage:

```conf
GRAPHQL_ENDPOINT_PORT=[Port where the graphql end point will be listening]. Defaults to 4000.
```

## Database

The database used by Cherrytwist is MySQL.

The following environment variables are used to configure database usage:

```conf
DATABASE_HOST=[server hosting the database]. Defaults to 'localhost'.
MYSQL_DB_PORT=[port where the database can be accessed]. Default is 3306.
MYSQL_DATABASE=[name of the database schema to use]. Defaults to 'cherrytwist'.
MYSQL_ROOT_PASSWORD=[password for root account]. Default is 'toor'.

```

## Authentication

Cherrytwist relies on **Authentication Providers** to ensure that users are authenticated. The currently supported Authentication Providers are:

- **Azure AD (AAD)**: Enterprise grade and suitable for production deployments.
- **Simple Auth**: For simple evaluation / demonstration purposes. It is not suitable for production deployments.

It is fairly straightforward to extend with additional Authentication Providers - these will be added on as needed basis. If interested please reach out.

### Enable / disable

Cherrytwist (for now) supports running the server in non-authenticated mode - primabily for developer purposes.

```conf
AUTH_ENABLED=true. Specifies whether authentication should be enabled on the CT Web Client and CT Server.
```

### **AAD Authentication Provider**

The following environment variables are used to configure AAD Authentication:

```conf
AUTH_AAD_TENANT=[tenant (directory) ID]
AUTH_AAD_CHERRYTWIST_API_APP_ID= [client (application) ID]
AUTH_AAD_MSGRAPH_API_SCOPE= [API Scopes Required for Downstream APIs, in our case Microsoft Graph API]
AUTH_AAD_MSGRAPH_API_SECRET=[App Client Secret obtained from cherrytwist-api app registration*]

AUTH_AAD_UPN_DOMAIN=[Domain name to be used when generating the UPN for accounts created on AAD by the platform]. Defaults to "playgroundcherrytwist.onmicrosoft.com", so a user gets a UPN like "first.last@playgroundcherrytwist.onmicrosoft.com". Note: the domain name specified needs to be either the default domain for the AAD tenant or a configured "verified domain name".
AUTH_AAD_CLIENT_APP_ID= The AAD app registrion client id of the Cherrytwist Web Client.
AUTH_AAD_CHERRYTWIST_API_SCOPE=[Cherrytwist API URI]./default - it is very important to have ./default after the API URI as this scope aggregates all the scopes of the Cherrytwist API and all downstream API scopes.
AUTH_AAD_CLIENT_LOGIN_REDIRECT_URI=The login redirect for the Cherrytwist Web Client.
AUTH_AAD_LOGGING_LEVEL=info|warn|error. Defaults to `error` if no value is set.
AUTH_AAD_LOGGING_LOG_PII=true|false. Default is false. Specifies whether AAD personal identifiable information can be logged.
```

Note: Only AAD v2 endpoints and tokens are supported!

Replace the content in [] with the guids from AAD - they can be retrieved from the Azure portal from the app registration page.

**\*Disclaimer: The secret for the Cherrytwist playground environment is shared in .env.default. This is a playground environment and this secret is shared for demo purposes ONLY - make sure you always put your production variables in a safe place!**

### **Simple Authentication Provider**

The following environment variables are used to configure Simple Auth Provider authentication:

```conf
AUTH_SIMPLE_AUTH_ISSUER=[issuer end point]. Default is 'localhost:3002'
AUTH_SIMPLE_AUTH_TOKEN_ENDPOINT=[issuer authentication end point]. Default is 'localhost:3002/auth/login'
AUTH_SIMPLE_AUTH_CLIENT_SECRET=[secret shared by the simple authentication provider instance and the Cherrytwist server]. No default.
```

## Security: CORS

To configure CORS for improved security and to match your deployment, use:

```conf
CORS_ORIGIN=[your CORS origin value]. Default value is '*'.
CORS_ALLOWED_HEADERS=[CORS allowed headers]. Default value is 'Origin, X-Requested-With, Content-Type, Accept'.
CORS_METHODS=[CORS methods allowed]. Default value is 'GET,HEAD,PUT,PATCH,POST,DELETE'.
```

## Logging

To configure logging levels, use:

```conf
LOGGING_CONSOLE_ENABLED=true|false. Defaults to true. Determines if logging messages (apart from NestJS messages) are sent to the console.
LOGGING_LEVEL_CONSOLE=Error|Warn|Verbose|Debug. Defaults to Error if no value is set. The logging level for the Winston console transports (logging to console).
LOGGING_LEVEL_ELK=Error|Warn|Verbose|Debug. Defaults to Error if no value is set. The logging level for the Elasticsearch transports (logging to Elastic Cloud).
ENABLE_ORM_LOGGING=true|false. Default is false. Specifies whether ORM logging should be enabled.
ENVIRONMENT=dev|test|acceptance|production. Current deployment environment. Used for managing / filtering logs on the Elastic Cloud / Kibana.
```

To configure profiling of the graphql api usage and performance, use:

```conf
LOGGING_PROFILING_ENABLED=true|false. Defaults to false if no value is set for performance reasons.
```

Note that profiling messages are set at Verbose level so the logging level does need to be at least at that level for the messages to be visible.

## Monitoring via Elastic Cloud

To configure Elastic Cloud endpoint, use:

```conf
LOGGING_ELK_ENABLED=true|false. Default is false. Is logging to Elastic Cloud enabled?
ELASTIC_CLOUD_ID=Cloud ID of the Elastic Cloud instance.
ELASTIC_CLOUD_USERNAME=Elastic Cloud username.
ELASTIC_CLOUD_PASSWORD=Elastic Cloud password.
```
