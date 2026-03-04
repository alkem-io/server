export type ContributionAuthorDetails = {
  /**
   * Id of the user when not anonymous or guest.
   */
  author?: string;
  /**
   * Event caused by an anonymous user.
   */
  anonymous: boolean;
  /**
   * Someone who is not a user but has contributed to whiteboards or memos in an anonymous way,
   * so we have a guestName
   */
  guest: boolean;
  /**
   * The name of the guest contributor, if the contribution was made by a guest (i.e. not a registered user). Otherwise, undefined.
   */
  guestName?: string;
  /**
   * True if the contribution was made by a member of the Alkemio team, false otherwise.
   * Determined by the email domain of the author.
   */
  alkemio: boolean;
};
