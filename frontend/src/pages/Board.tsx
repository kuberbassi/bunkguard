import React, { useEffect, useState } from 'react';
import { Tldraw, Editor, type TLStoreSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import api from '@/services/api';
import { useToast } from '@/components/ui/Toast';

// Use CDN for tldraw assets to avoid 404 errors in production
const TLDRAW_VERSION = '4.2.1'; // Match your package.json version

// tldraw license key from environment variable
const TLDRAW_LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY || '';

const assetUrls = {
    fonts: {
        draw: `https://unpkg.com/tldraw@${TLDRAW_VERSION}/fonts/Shantell_Sans-Tldrawish.woff2`,
        monospace: `https://unpkg.com/tldraw@${TLDRAW_VERSION}/fonts/IBMPlexMono-Medium.woff2`,
        sansSerif: `https://unpkg.com/tldraw@${TLDRAW_VERSION}/fonts/IBMPlexSans-Medium.woff2`,
        serif: `https://unpkg.com/tldraw@${TLDRAW_VERSION}/fonts/IBMPlexSerif-Medium.woff2`,
    },
};

const Board: React.FC = () => {
    const { showToast } = useToast();
    const [snapshot, setSnapshot] = useState<TLStoreSnapshot | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBoard();
    }, []);

    const loadBoard = async () => {
        try {
            const response = await api.get('/api/board');
            if (response.data && Object.keys(response.data).length > 0) {
                setSnapshot(response.data);
            }
        } catch (error) {
            console.error("Failed to load board", error);
            showToast('error', 'Failed to load board');
        } finally {
            setLoading(false);
        }
    };

    const handleMount = (editor: Editor) => {
        let saveTimeout: ReturnType<typeof setTimeout>;

        editor.store.listen(() => {
            // Batch saves with minimal delay for performance
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                try {
                    // Try getting snapshot from editor directly or store
                    const snapshot = (editor as any).getSnapshot();
                    await api.post('/api/board', snapshot);
                } catch (error) {
                    // console.error("Failed to save board", error); // Suppress frequent errors
                }
            }, 500); // Reduced from 2000ms to 500ms
        });
    };

    if (loading) return <div className="h-full flex items-center justify-center">Loading Board...</div>;

    return (
        <div className="h-[calc(100vh-2rem)] w-full relative rounded-3xl overflow-hidden border border-outline-variant/20 shadow-xl touch-none overscroll-none">
            <Tldraw
                licenseKey={TLDRAW_LICENSE_KEY}
                persistenceKey="bunkguard-board-backend"
                snapshot={snapshot}
                onMount={handleMount}
                assetUrls={assetUrls}
            />
        </div>
    );
};


export default Board;
