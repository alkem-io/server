import { ApolloServer, AuthenticationError } from 'apollo-server-express';
import express, { NextFunction } from 'express';
import { Request, Response } from 'express';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { LoadConfiguration } from './configuration-loader';
import { ConnectionFactory } from './connection-factory';
import { CreateMutations, Resolvers, UpdateMutations } from './schema';
import 'passport-azure-ad';
// import { bearerStrategy } from './authentication'
import passport from 'passport';
import { BearerStrategy, IProfile, ITokenPayload, OIDCStrategy, VerifyCallback } from 'passport-azure-ad';
import { config, OIDCConfig } from './authentication';
import { User } from './models';
import session from 'express-session';

const main = async () => {

  LoadConfiguration();

  // Connect to the database
  try {
    const connectionFactory = new ConnectionFactory();
    const connection = await connectionFactory.GetConnection();
    await connection.synchronize();
    console.log('Database connection established and data loaded');
  } catch (error) {
    console.log('Unable to establish database connection: ' + error);
  }

  // Build the schema
  const schema = await buildSchema({
    resolvers: [Resolvers, CreateMutations, UpdateMutations],
  });

  // let options = {
  //   // The URL of the metadata document for your app. We will put the keys for token validation from the URL found in the jwks_uri tag of the in the metadata.
  //   identityMetadata: config.identityMetadata,
  //   clientID: config.clientID,
  //   validateIssuer: config.validateIssuer,
  //   issuer: config.issuer,
  //   passReqToCallback: config.passReqToCallback,
  //   isB2C: config.isB2C,
  //   policyName: config.policyName,
  //   allowMultiAudiencesInToken: config.allowMultiAudiencesInToken,
  //   audience: config.audience,
  //   loggingLevel: config.loggingLevel,
  // };

  //   const bearerStrategy = new BearerStrategy(config,
  //      (token: ITokenPayload, done: CallableFunction) => {
  //         // Send user info using the second argument
  //         done(null, {}, token);
  //     }
  // );

  const bearerStrategy = new BearerStrategy(config,
    async (token: ITokenPayload, done: CallableFunction) => {
      try {

        console.log('verifying the user');
        console.log(token, 'was the token retreived');

        if (!token.oid) throw 'token oid missing'

        const knownUser = await User.findOne({ email: token.upn })
        if (knownUser) return done(null, knownUser, token)

        return done('User not found!');

      } catch (error) {
        console.error(`Failed adding the user to the request object: ${error}`);
        done(`Failed adding the user to the request object: ${error}`);
      }
    });

  const oidcStrategy = new OIDCStrategy(OIDCConfig, (iss: string, sub: string, profile: IProfile, jwtClaims: any, access_token: string, refresh_token: string, params: any, done: VerifyCallback) => {
    console.log(iss);
    console.log(sub);
    console.log(profile);
    console.log(jwtClaims);
    console.log(access_token);
    console.log(refresh_token);
    console.log(params);
    done(null, 'User');
  });

  const getUser = (req: Request, res: Response) =>
    new Promise((resolve, reject) => {
      console.log(req.headers['authorization']);
      passport.authenticate('oauth-bearer', { session: false }, (err, user, info) => {
        console.error(err);
        console.log('User info: ', user);
        console.log('Validated claims: ', info);
        console.log(Date.now());

        // if(req.authInfo === undefined)
        //   {
        //     res.status(403).json({'error': 'Authentication info is undefined!'});
        //   }
        // else
        // {
        //   const authInfo = req.authInfo as Express.AuthInfo;

        //   if ('scp' in authInfo && authInfo['scp'].split(' ').indexOf('GraphQL.Read') >= 0) {
        //       // Service relies on the name claim.
        //       res.status(200).json({'name': authInfo['name']});
        //   } else {
        //       console.log('Invalid Scope, 403');
        //       res.status(403).json({'error': 'insufficient_scope'});
        //   }
        // }

        if (err) reject(err)
        resolve(user)
      })(req, res)
    })

  const apolloServer = new ApolloServer(
    {
      schema,
      context: async ({ res, req }) => {
        const user = await getUser(req, res);
        if (!user) throw new AuthenticationError('No user logged in!');
        console.log('User found', user);

        return user;
      }
    }
  );
  const app = express();

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use('oauth-bearer', bearerStrategy);
  passport.use(oidcStrategy)

  //enable CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.get('/login', (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('azuread-openidconnect',
      { session: false },
      function (err, user, info) {
        if (err) { return next(err) }
        console.info('Login was called in the Sample');
        res.redirect('/graphql');
      })(req, res, next);
  });


  function regenerateSessionAfterAuthentication(req: Request, res: Response, next: NextFunction) {
    const passportInstance = req.session?.passport;
    return req.session?.regenerate(function (err) {
      if (err) {
        return next(err);
      }
      if (req.session)
        req.session.passport = passportInstance;
      return req.session?.save(next);
    });
    next();
  }

  app.post('/auth/openid/return',
    passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }),
    regenerateSessionAfterAuthentication,
    function (req, res) {
      res.redirect('/');
    });

  apolloServer.applyMiddleware({ app, cors: false });

  const environment = process.env.NODE_ENV;
  const isDevelopment = environment === 'development';

  if (isDevelopment) {
    app.use('/voyager', voyagerMiddleware({ endpointUrl: '/graphql' }));
  }
  const sess = {
    secret: 'keyboard cat',
    cookie: {}
  }
  app.use(session(sess));

  const GRAPHQL_ENDPOINT_PORT = process.env.GRAPHQL_ENDPOINT_PORT || 4000;

  app.listen(
    GRAPHQL_ENDPOINT_PORT,
    () => console.log(`Server started on http://localhost:${GRAPHQL_ENDPOINT_PORT}`),
  );
};

main();
