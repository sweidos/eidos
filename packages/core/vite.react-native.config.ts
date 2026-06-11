import { reactSubpathConfig } from './vite.shared';

// Build for the @sweidos/eidos/react-native subpath.
// @sweidos/eidos is external — both the main bundle and this subpath share the
// same store singleton at runtime (no duplicate state).
export default reactSubpathConfig({
  dtsInclude: ['src/react-native.ts', 'src/react/ProviderRN.tsx', 'src/runtime-rn.ts'],
  entry: 'src/react-native.ts',
  fileName: 'react-native.js',
});
