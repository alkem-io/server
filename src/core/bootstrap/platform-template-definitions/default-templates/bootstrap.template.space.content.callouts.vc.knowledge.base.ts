import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CreateTemplateContentSpaceInput } from '@domain/template/template-content-space/dto/template.content.space.dto.create';

export enum FlowState {
  GOING_LIVE = 'Going Live',
  INTRODUCTION = 'Introduction',
  BODY_OF_KNOWLEDGE = 'Body of Knowledge',
  KNOWLEDGE_UPDATES = 'Knowledge Updates',
}

export const bootstrapTemplateSpaceContentCalloutsVcKnowledgeBase: CreateTemplateContentSpaceInput =
  {
    level: 0,
    subspaces: [],
    collaborationData: {
      innovationFlowData: {
        profile: {
          displayName: 'Subspace knowledge Innovation Flow',
        },
        settings: {
          maximumNumberOfStates: 8,
          minimumNumberOfStates: 1,
        },
        states: [
          {
            displayName: FlowState.INTRODUCTION,
            description:
              'Scroll down to read more about how to get started. Ready to add some knowledge to your Virtual Contributor? Click on Body of Knowledge ⬆️',
          },
          {
            displayName: FlowState.BODY_OF_KNOWLEDGE,
            description:
              'Here you can share all relevant information for the Virtual Contributor to know about. To get started, three posts have already been added. Click on the ➕ Collaboration Tool to add more.',
          },
          {
            displayName: FlowState.KNOWLEDGE_UPDATES,
            description: '',
          },
        ],
      },
      calloutsSetData: {
        calloutsData: [
          {
            nameID: 'summary',
            sortOrder: 1,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.INTRODUCTION],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'No Time? A quick summary ⬇️',
                description:
                  '*   <strong>Virtual Contributors</strong> are dynamic entities that engage with you based on a curated body of knowledge.\n*   This knowledge repository consists of texts and documents that you collect within a designated <strong>Subspace</strong> of your Space.\n*   To update the Virtual Contributor with newly added knowledge, Go to the profile of your Virtual Contributor.\n2. Go to the settings and click on the settings tab.\n3. Click on the button UPDATE KNOWLEDGE.\n*   Anyone in your Space can interact with the Virtual Contributor by mentioning it in a comment to a post using the format <strong>@name-of-virtual-contributor</strong>.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'introduction',
            sortOrder: 2,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.INTRODUCTION],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'The Virtual Contributor',
                description:
                  '# 🤖 What is a Virtual Contributor?\n\nThink of it as a dynamic repository of knowledge with which you can interact. Powered by generative AI, these bots provide answers based on the documents and texts they were trained on. Unlike generic chatbots, the Virtual Contributor responds only to questions it can confidently answer.\n\n# 🛠️ How to make your own:\n\n1.  Learn More in this <strong>Introduction</strong>: Discover additional details about the Virtual Contributor and how you can interact with it.\n2.  Build Your <strong>Knowledge Base</strong>: Click the next step in the flow to create the body of knowledge you want to train your Virtual Contributor on.\n3.  Read how to Publish Your VC in <strong>Going Live</strong>: Once you’ve crafted your Virtual Contributor, publish it so anyone in your Space can interact with it!\n\n# ❗Keep in mind:\n\nAlkemio is currently in Public Preview. We invite you to join us in shaping a better future with safe technology and responsible AI usage. The Virtual Contributor is available to Spaces with a Plus subscription. Even if your subscription (or the free trial) ends, your Virtual Contributor will remain accessible, although it won’t answer new questions.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'interacting-with-vc',
            sortOrder: 3,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.INTRODUCTION],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Interacting with a Virtual Contributor',
                description:
                  'Once you’ve published your <strong>Virtual Contributor (VC)</strong>, everyone in your Space can engage with it. The process is straightforward: simply mention or tag the VC in a comment (@name-of-your-vc), just as you would with any other contributor. The VC will then respond in a comment below. Be patient—it might take a few seconds; after all, even our VC needs a moment to think! 😉\n\nIf you’d like your VC to interact in a different Space, feel free to [contact our support team here](https://welcome.alkem.io/contact/)—they’ll be happy to assist you.\n\nRemember that you can ask your VC questions anywhere within your Space. Admins of Subspaces in your Space can also add them there (Subspace Settings > Community). However, please keep the posts in this Subspace (Virtual Contributor)<span> </span><strong>closed for interaction with the VC</strong> since it could clutter your knowledge base.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'vc-profile',
            sortOrder: 4,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.INTRODUCTION],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'The Profile of your Virtual Contributor',
                description:
                  'Similar to users and organizations, your Virtual Contributor (VC) will have a <strong>profile</strong> that others can view by clicking on its name or avatar. When the VC is linked to your account, you will also notice a ⚙️ icon on the profile page next to the VC’s name. Click there to edit the profile and enhance it with a nice description, perhaps including instructions for people on what questions to ask.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'content-types',
            sortOrder: 5,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.INTRODUCTION],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Types of Content',
                description:
                  'Currently, the Virtual Contributor can read:\n\n*   Text written anywhere in this Subspace\n*   PDF files uploaded in Collections of Links and Documents\n*   PDF files added as a reference to a post or other collaboration tool\n*   Website texts pointed to through a link in a post or other collaboration tool\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'terms-conditions',
            sortOrder: 6,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.INTRODUCTION],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Terms & Conditions',
                description:
                  'As a host of a Space, and thus of the Body of Knowledge this Virtual Contributor is based upon, you are responsible for the content in there. To read all Terms and Conditions, [click here](https://welcome.alkem.io/legal).\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'body-of-knowledge-ex1',
            sortOrder: 7,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.BODY_OF_KNOWLEDGE],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Example 1: Background information',
                description:
                  'Click on the ⚙️ at the top right of this post, click EDIT and then update this text with the background information or something else you want your Virtual Contributor to know about.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'body-of-knowledge-ex2',
            sortOrder: 8,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.BODY_OF_KNOWLEDGE],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Example 2: Random facts and figures',
                description:
                  'Use this post to add facts, figures, insights, etc, that you cannot group in a more structure place, like for instance:\n\n*   Alkemio was launched in 2021\n*   <strong>New Zealand Features the World’s Longest Mountain Name.</strong> The name holds the Guinness World Record and consists of 85 characters. The name of this mountain is Taumatawhakatangihangakoauauotamateapokaiwhenuakitanatahu. When translated into English, the word means “the place where Tmatea, the man with the big knees, who slid, climbed, and swallowed mountains, known as – landeater – played his nose flute to his loved one”. Source: <https://mystart.com/blog/8-amazing-facts-about-mountains/>\n*   Etc.\n\nClick on the ⚙️ at the top right of this post, click EDIT and then update this text with the facts and figures you want your Virtual Contributor to know about.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'body-of-knowledge-ex3',
            sortOrder: 9,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.BODY_OF_KNOWLEDGE],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Example 3: Links and Documents',
                description:
                  'Aside from inserting text, you can also upload documents and add links to expand the Body of Knowledge. Click on the plus below to add a link or (PDF) document and click on the ⚙️ at the top right of this post, and click EDIT to update this text.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
              contribution: {
                enabled: false,
                allowedTypes: [CalloutContributionType.LINK],
                canAddContributions: CalloutAllowedContributors.NONE,
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'where-to-find-vc-profile',
            sortOrder: 10,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.KNOWLEDGE_UPDATES],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Where to find the Virtual Contributor Profile',
                description:
                  'You can find the profile of your VC in your account page. \n\n1. Go to your profile (by clicking on your profile picture in the top right of your screen and selecting MY PROFILE in the dropdown menu).\n2. Go to the settings by clicking on the gear icon right of your name.\n3. Go to the ACCOUNT tab.\n Here you can see a list of all your VCs and go to their profile by clicking on their name.',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
          {
            nameID: 'activate',
            sortOrder: 11,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.KNOWLEDGE_UPDATES],
                },
              ],
            },
            framing: {
              profile: {
                displayName: 'Updating my Body of Knowledge',
                description:
                  'You can add additional information to the Body of Knowledge at any time. However, you need to update your Virtual Contributor to pick up the latest information. How? \n\n1. Go to the profile of your Virtual Contributor.\n2. Go to the settings and click on the settings tab.\n3. Click on the button UPDATE KNOWLEDGE.\n',
              },
            },
            settings: {
              framing: {
                commentsEnabled: false,
              },
            },
          },
        ],
      },
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
      membership: {
        policy: CommunityMembershipPolicy.APPLICATIONS,
        trustedOrganizations: [], // only allow to be host org for now, not on subspaces
        allowSubspaceAdminsToInviteMembers: true,
      },
      collaboration: {
        inheritMembershipRights: false,
        allowMembersToCreateSubspaces: false,
        allowMembersToCreateCallouts: false,
        allowEventsFromSubspaces: true,
        allowMembersToVideoCall: false,
        allowGuestContributions: false,
      },
    },
    about: {
      profileData: {
        displayName: 'Home Space',
        tagline: 'A home to go from here to there, together!',
      },
    },
  };
