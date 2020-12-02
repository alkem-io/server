const name = `{
                name
               }`;
//export default name;

const hostMembers = `{
                        host {members{id}}
                      }`;

const hostGroups = `{
                        host {members{id}}
                    }`;

const hostProfile = `{
                        host{profile{id}}
                      }`;

const contextTagline = `{
                        context{tagline{id}}
                      }`;
export { name, hostMembers, hostGroups, hostProfile, contextTagline };
