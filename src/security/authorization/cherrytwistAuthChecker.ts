import { AuthChecker } from 'type-graphql';
import { ICherrytwistContext } from './ICherrytwistContext';

export const cherrytwistAuthChecker: AuthChecker<ICherrytwistContext> = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { context: { user } },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  roles,
) => {

  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]

  return true; // or false if access is denied
};