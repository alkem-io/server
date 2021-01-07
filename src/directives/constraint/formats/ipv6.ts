import { GraphQLError } from 'graphql';
import validator from 'validator';

const ipv6 = (value: string) => {
  if (validator.isIP(value, 6)) return true;

  throw new GraphQLError('Must be in IP v6 format');
};

export default ipv6;
