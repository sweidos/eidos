import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { initEidos } from '../runtime';
/**
 * Mount once at the root of your application.
 * Registers the service worker and initialises the Eidos runtime.
 *
 * @example
 * <EidosProvider swPath="/eidos-sw.js">
 *   <App />
 * </EidosProvider>
 */
export function EidosProvider({ children, swPath, autoReplay }) {
    useEffect(() => {
        initEidos({ swPath, autoReplay });
        // Run once on mount only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return _jsx(_Fragment, { children: children });
}
