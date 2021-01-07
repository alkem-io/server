import { GraphQLError } from 'graphql';
import validator from 'validator';

const date = (value: string) => {
  if (validator.isISO8601(value)) return true;

  throw new GraphQLError('Must be a date in ISO 8601 format');
};

export default date;
