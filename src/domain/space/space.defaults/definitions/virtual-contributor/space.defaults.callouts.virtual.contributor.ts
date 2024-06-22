import { CalloutGroupName } from '@common/enums/callout.group.name';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { FlowState } from './space.defaults.innovation.flow.virtual.contributor';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';

export const spaceDefaultsCalloutsVirtualContributor: CreateCalloutInput[] = [
  {
    nameID: 'summary',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'No Time? A quick summary ⬇️',
        description:
          '*   <strong>Virtual Contributors</strong> are dynamic entities that engage with you based on a curated body of knowledge.\n*   This knowledge repository consists of texts and documents that you collect within a designated <strong>Subspace</strong> of your Space.\n*   To activate a Virtual Contributor, navigate to your <strong>Space Settings</strong> and select the <strong>Account</strong> tab.\n*   Once activated, anyone in your Space can interact with the Virtual Contributor by mentioning it in a comment to a post using the format <strong>@name-of-virtual-contributor</strong>.\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.INTRODUCTION],
          },
        ],
      },
    },
  },
  {
    nameID: 'introduction',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 2,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'The Virtual Contributor',
        description:
          '# 🤖 What is a Virtual Contributor?\n\nThink of it as a dynamic repository of knowledge with which you can interact. Powered by generative AI, these bots provide answers based on the documents and texts they were trained on. Unlike generic chatbots, the Virtual Contributor responds only to questions it can confidently answer.\n\n# 🛠️ How to make your own:\n\n1.  Learn More in this <strong>Introduction</strong>: Discover additional details about the Virtual Contributor and how you can interact with it.\n2.  Build Your <strong>Knowledge Base</strong>: Click the next step in the flow to create the body of knowledge you want to train your Virtual Contributor on.\n3.  Read how to Publish Your VC in <strong>Going Live</strong>: Once you’ve crafted your Virtual Contributor, publish it so anyone in your Space can interact with it!\n\n# ❗Keep in mind:\n\nAlkemio is currently in Public Preview. We invite you to join us in shaping a better future with safe technology and responsible AI usage. The Virtual Contributor is available to Spaces with a Plus subscription. Even if your subscription (or the free trial) ends, your Virtual Contributor will remain accessible, although it won’t answer new questions.\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.INTRODUCTION],
          },
        ],
      },
    },
  },
  {
    nameID: 'interacting-with-vc',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 3,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Interacting with a Virtual Contributor',
        description:
          'Once you’ve published your <strong>Virtual Contributor (VC)</strong>, everyone in your Space can engage with it. The process is straightforward: simply mention or tag the VC in a comment (@name-of-your-vc), just as you would with any other contributor. The VC will then respond in a comment below. Be patient—it might take a few seconds; after all, even our VC needs a moment to think! 😉\n\nIf you’d like your VC to interact in a different Space, feel free to [contact our support team here](https://welcome.alkem.io/contact/)—they’ll be happy to assist you.\n\nRemember that you can ask your VC questions anywhere within your Space. Admins of Subspaces in your Space can also add them there (Subspace Settings > Community). However, please keep the posts in this Subspace (Virtual Contributor)<span> </span><strong>closed for interaction with the VC</strong> since it could clutter your knowledge base.\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.INTRODUCTION],
          },
        ],
      },
    },
  },
  {
    nameID: 'vc-profile',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 4,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'The Profile of your Virtual Contributor',
        description:
          'Similar to users and organizations, your Virtual Contributor (VC) will have a <strong>profile</strong> that others can view by clicking on its name or avatar. When the VC is linked to your account, you will also notice a ⚙️ icon on the profile page next to the VC’s name. Click there to edit the profile and enhance it with a nice description, perhaps including instructions for people on what questions to ask.\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.INTRODUCTION],
          },
        ],
      },
    },
  },
  {
    nameID: 'content-types',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 5,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Who are the stakeholders?',
        description:
          'Currently, the Virtual Contributor can read:\n\n*   Text written anywhere in this Subspace\n*   PDF files uploaded in Collections of Links and Documents\n*   PDF files added as a reference to a post or other collaboration tool\n*   Website texts pointed to through a link in a post or other collaboration tool\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.INTRODUCTION],
          },
        ],
      },
    },
  },
  {
    nameID: 'terms-conditions',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 6,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Terms & Conditions',
        description:
          'As a host of a Space, and thus of the Body of Knowledge this Virtual Contributor is based upon, you are responsible for the content in there. To read all Terms and Conditions, [click here](https://welcome.alkem.io/legal).\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.INTRODUCTION],
          },
        ],
      },
    },
  },
  {
    nameID: 'body-of-knowledge-ex1',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 7,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Example 1: Background information',
        description:
          'Click on the ⚙️ at the top right of this post, click EDIT and then update this text with the background information or something else you want your Virtual Contributor to know about.\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.BODY_OF_KNOWLEDGE],
          },
        ],
      },
    },
  },
  {
    nameID: 'body-of-knowledge-ex2',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 8,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Example 2: Random facts and figures',
        description:
          'Use this post to add facts, figures, insights, etc, that you cannot group in a more structure place, like for instance:\n\n*   Alkemio was launched in 2021\n*   <strong>New Zealand Features the World’s Longest Mountain Name.</strong> The name holds the Guinness World Record and consists of 85 characters. The name of this mountain is Taumatawhakatangihangakoauauotamateapokaiwhenuakitanatahu. When translated into English, the word means “the place where Tmatea, the man with the big knees, who slid, climbed, and swallowed mountains, known as – landeater – played his nose flute to his loved one”. Source: <https://mystart.com/blog/8-amazing-facts-about-mountains/>\n*   Etc.\n\nClick on the ⚙️ at the top right of this post, click EDIT and then update this text with the facts and figures you want your Virtual Contributor to know about.\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.BODY_OF_KNOWLEDGE],
          },
        ],
      },
    },
  },
  {
    nameID: 'body-of-knowledge-ex3',
    type: CalloutType.LINK_COLLECTION,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 9,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Example 3: Links and Documents',
        description:
          'Aside from inserting text, you can also upload documents and add links to expand the Body of Knowledge. Click on the plus below to add a link or (PDF) document or click on the ⚙️ at the top right of this post, and click EDIT to update this text.\n',

        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.BODY_OF_KNOWLEDGE],
          },
        ],
      },
    },
  },
  {
    nameID: 'activate',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.CLOSED,
    },
    sortOrder: 10,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: 'Ready? Go!',
        description:
          'To activate your Virtual Contributor,\n\n1.  Click here to go to the <strong>Account tab</strong> of your <strong>Space Settings</strong> (this link will be opened in a new tab).\n2.  Scroll down a little bit and click on CREATE VIRTUAL CONTRIBUTOR.\n3.  Give your VC a name and select this Subspace (Your Virtual Contributor) to use as a Body of Knowledge. Thats it!\n\nAnd then of course the interesting part comes along.. Interact with your VC! It is added to the Space automatically, so add a post in your Knowledge base and ask your VC for its thoughts 👍😊 Not sure how? Read the post about interacting with your VC in the Introduction phase of this flow.\n',
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.GOING_LIVE],
          },
        ],
      },
    },
  },
];
