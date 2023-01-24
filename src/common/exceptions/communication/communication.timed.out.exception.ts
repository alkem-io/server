export class CommunicationTimedOutException extends Error {
  constructor() {
    super('Did not receive response from the communication service in time');
    this.name = 'CommunicationTimedOutException';
  }
}
