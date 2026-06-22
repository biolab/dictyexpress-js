import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import type { PluginOption, ProxyOptions } from 'vite';

const targetDomain = 'app.dictyexpress.org';
// The Resolwe websocket backend lives on a different host than the HTTP API:
// the app.dictyexpress.org CloudFront distribution has no /ws route.
const wsTargetDomain = 'app.genialis.com';
const secure = false;

const wsProxyConfig: ProxyOptions = {
    target: `wss://${wsTargetDomain}`,
    ws: true,
    headers: {
        Host: wsTargetDomain,
    },
    secure: false,
};

const proxyConfig: ProxyOptions = {
    target: `https://${targetDomain}`,
    secure,
    changeOrigin: true,
    headers: {
        Host: targetDomain,
        Origin: `https://${targetDomain}`,
        Connection: 'keep-alive',
    },
};

// In prod the fast lambda routes are same-origin behaviors on the app's
// CloudFront distribution. Locally there's no CloudFront, so proxy each route
// straight to its API Gateway host (changeOrigin sets the execute-api Host).
const apiGatewayProxy = (host: string): ProxyOptions => ({
    target: `https://${host}`,
    changeOrigin: true,
    secure: true,
});

const proxy: Record<string, ProxyOptions> = {
    '/ws': wsProxyConfig,
    '/api': proxyConfig,
    '/saml-auth': proxyConfig,
    // Served in prod from the biolab-singlecell-data bucket via CloudFront;
    // proxy it so the single-cell module loads its data locally too.
    '/single-cell-data': proxyConfig,
    '/find-similar': apiGatewayProxy('sl48nzcp1a.execute-api.us-east-1.amazonaws.com'),
    '/go': apiGatewayProxy('diue278in7.execute-api.us-east-1.amazonaws.com'),
};

const injectConfigScriptToIndex = (): PluginOption => {
    return {
        name: 'build-html',
        apply: 'build',
        transformIndexHtml: (html) => {
            return {
                html,
                tags: [
                    {
                        tag: 'script',
                        attrs: {
                            src: '/config.js?version=3.0',
                            charset: 'utf-8',
                        },
                        injectTo: 'head',
                    },
                ],
            };
        },
    };
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), svgr(), viteTsconfigPaths(), injectConfigScriptToIndex()],
    build: {
        sourcemap: true,
        outDir: 'build',
        // https://github.com/vitejs/vite/issues/15012
        rollupOptions: {
            onwarn(warning, defaultHandler) {
                if (warning.code === 'SOURCEMAP_ERROR') {
                    return;
                }

                defaultHandler(warning);
            },
        },
    },
    define: { global: 'window' },
    // Shared by both the dev server (`yarn start`) and the production preview
    // (`yarn serve`) — vite preview does not read `server.proxy`.
    server: { proxy },
    preview: { proxy },
});
