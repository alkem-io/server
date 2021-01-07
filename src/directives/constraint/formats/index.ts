import byte from '@src/directives/constraint/formats/byte';
import date from '@src/directives/constraint/formats/date';
import dateTime from '@src/directives/constraint/formats/date-time';
import email from '@src/directives/constraint/formats/email';
import ipv4 from '@src/directives/constraint/formats/ipv4';
import ipv6 from '@src/directives/constraint/formats/ipv6';
import uri from '@src/directives/constraint/formats/uri';
import uuid from '@src/directives/constraint/formats/uuid';

export const formatter = (
  type: string
): ((value: string) => boolean) | undefined => {
  switch (type) {
    case 'byte':
      return byte;
    case 'date-time':
      return dateTime;
    case 'date':
      return date;
    case 'email':
      return email;
    case 'ipv4':
      return ipv4;
    case 'ipv6':
      return ipv6;
    case 'uri':
      return uri;
    case 'uuid':
      return uuid;
    default:
      return;
  }
};

export default formatter;
