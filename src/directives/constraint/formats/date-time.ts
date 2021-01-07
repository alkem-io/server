import { GraphQLError } from 'graphql';
import validator from 'validator';

const dateTime = (value: string) => {
  if (validator.isRFC3339(value)) return true;

  throw new GraphQLError('Must be a date-time in RFC 3339 format');
};

export default dateTime;
