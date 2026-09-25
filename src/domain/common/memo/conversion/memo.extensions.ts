import { getSchema, mergeAttributes } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import StarterKit from '@tiptap/starter-kit';
import { Iframe } from './Iframe';
import { ImageExtension } from './image.extension';

const StaticImageExtension = ImageExtension.extend({
  renderHTML({ HTMLAttributes }) {
    const attributes = Object.fromEntries(
      Object.entries(HTMLAttributes)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([name, value]) => [
          name,
          typeof value === 'number' ? value.toString() : value,
        ])
    );
    return ['img', mergeAttributes(this.options.HTMLAttributes, attributes)];
  },
});

export const memoExtensions = [
  StarterKit.configure({ link: false }),
  StaticImageExtension,
  Link.configure({ openOnClick: false }),
  Highlight,
  Iframe,
  Table,
  TableRow,
  TableHeader,
  TableCell,
];

export const memoSchema = getSchema(memoExtensions);
