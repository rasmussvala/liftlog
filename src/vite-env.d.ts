/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __APP_COMMIT__: string
// 'liftlog', or 'liftlog-preview' in a PR preview, so a preview never touches the real logbook.
declare const __DATA_NAMESPACE__: string
