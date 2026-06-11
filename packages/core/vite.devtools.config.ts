import { reactSubpathConfig } from './vite.shared';

// Build for the @sweidos/eidos/devtools subpath.
// Adds 'use client' banner — required for Next.js App Router.
export default reactSubpathConfig({
  dtsInclude: ['src/devtools.ts', 'src/react/Devtools.tsx'],
  entry: 'src/devtools.ts',
  fileName: 'devtools.js',
  external: ['react-dom'],
  banner: "'use client';",
});
