import type { PrismTheme } from 'prism-react-renderer';

// Syntax theme matched to the eidos design tokens (tailwind.config.js).
export const eidosCodeTheme: PrismTheme = {
  plain: {
    color: '#F8FAFC', // eidos-text
    backgroundColor: '#1E293B', // eidos-surface
  },
  styles: [
    {
      types: ['comment', 'prolog', 'doctype', 'cdata'],
      style: { color: '#94A3B8', fontStyle: 'italic' }, // eidos-muted
    },
    {
      types: ['punctuation'],
      style: { color: '#CBD5E1' }, // eidos-text-dim
    },
    {
      types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol', 'deleted'],
      style: { color: '#FBBF24' }, // eidos-amber
    },
    {
      types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'],
      style: { color: '#22C55E' }, // eidos-accent
    },
    {
      types: ['operator', 'entity', 'url'],
      style: { color: '#CBD5E1' },
    },
    {
      types: ['atrule', 'attr-value', 'keyword'],
      style: { color: '#38BDF8' }, // eidos-blue
    },
    {
      types: ['function', 'class-name'],
      style: { color: '#F8FAFC' },
    },
    {
      types: ['regex', 'important', 'variable'],
      style: { color: '#F87171' }, // eidos-red
    },
  ],
};
