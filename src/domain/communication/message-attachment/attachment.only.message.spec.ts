import { ReceivedAttachment } from '@alkemio/matrix-adapter-lib';
import {
  ATTACHMENT_ONLY_MESSAGE_TEXT,
  isAttachmentOnlyMessage,
} from './attachment.only.message';

const attachment = (display_name: string): ReceivedAttachment => ({
  display_name,
  mime_type: 'image/png',
  size: 10,
});

describe('isAttachmentOnlyMessage', () => {
  it.each<{
    name: string;
    body: string | undefined;
    attachments: ReceivedAttachment[] | undefined;
    expected: boolean;
  }>([
    {
      name: 'no attachments, with text',
      body: 'Hello',
      attachments: undefined,
      expected: false,
    },
    {
      name: 'no attachments, empty text',
      body: '',
      attachments: [],
      expected: false,
    },
    {
      name: 'one attachment, empty body',
      body: '',
      attachments: [attachment('shot.png')],
      expected: true,
    },
    {
      name: 'one attachment, undefined body',
      body: undefined,
      attachments: [attachment('shot.png')],
      expected: true,
    },
    {
      name: 'one attachment, body equals the display name',
      body: 'shot.png',
      attachments: [attachment('shot.png')],
      expected: true,
    },
    {
      name: 'one attachment, body equals the display name with surrounding whitespace',
      body: '  shot.png\n',
      attachments: [attachment('shot.png')],
      expected: true,
    },
    {
      name: 'one attachment with a caption',
      body: 'look at this',
      attachments: [attachment('shot.png')],
      expected: false,
    },
    {
      name: 'two attachments, empty body',
      body: '   ',
      attachments: [attachment('a.png'), attachment('b.png')],
      expected: true,
    },
    {
      name: 'two attachments, body equals one name',
      body: 'a.png',
      attachments: [attachment('a.png'), attachment('b.png')],
      expected: false,
    },
  ])('$name → $expected', ({ body, attachments, expected }) => {
    expect(isAttachmentOnlyMessage(body, attachments)).toBe(expected);
  });
});

describe('ATTACHMENT_ONLY_MESSAGE_TEXT', () => {
  it('is the framed-picture emoji', () => {
    expect(ATTACHMENT_ONLY_MESSAGE_TEXT).toBe('\u{1F5BC}\u{FE0F}');
    expect(ATTACHMENT_ONLY_MESSAGE_TEXT).toBe('🖼️');
  });
});
