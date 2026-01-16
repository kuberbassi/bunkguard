
import { useEffect } from 'react';

/**
 * Hook to warn users about unsaved changes.
 * Checks for:
 * 1. Browser navigation (Refresh/Close Tab) -> using 'beforeunload' event
 * 2. React Router navigation (Back/Forward/Link) -> Not fully blocked in v6.4+ without UNSAFE methods, 
 *    but we can try to intercept or just rely on beforeunload for critical stuff.
 * 
 * Note: React Router v6 removed `usePrompt` and `useBlocker`. `unstable_useBlocker` is available but 
 * for a simple solution, `beforeunload` covers the most dangerous "accidental close" cases.
 */
export const useUnsavedChanges = (isDirty: boolean) => {

    // Handle Browser Level (Refresh / Close Tab)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome
                return ''; // Required for Legacy
            }
        };

        if (isDirty) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);
};
