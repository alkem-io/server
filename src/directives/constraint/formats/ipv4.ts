import { GraphQLError } from 'graphql';
import validator from 'validator';

const ipv4 = (value: string) => {
  if (validator.isIP(value, 4)) return true;

  throw new GraphQLError('Must be in IP v4 format');
};

export default ipv4;
