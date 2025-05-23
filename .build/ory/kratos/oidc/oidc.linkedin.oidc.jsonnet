local claims =
{
  email_verified: true
} + std.extVar('claims');

{
  identity: {
    traits: {
      email: claims.email,
      picture: if "profilePicture" in claims then claims.profilePicture["displayImage~:playableStreams"][0].identifiers[2].identifier else null,
      name: {
        first: claims.given_name,
        last: claims.family_name,
      }
    }
  }
}