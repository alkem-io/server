import { GraphQLError } from 'graphql';
import validator from 'validator';

const email = (value: string) => {
  if (validator.isEmail(value)) return true;

  throw new GraphQLError('Must be in email format');
};

export default email;
