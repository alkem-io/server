import moment from 'moment';

export const formatDatetime = (datetimeString: string) => {
  const datetime = moment(datetimeString, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ').toDate();
  return datetime.toISOString().slice(0, 26);
};
