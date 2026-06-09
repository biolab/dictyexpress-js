import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import type { PluginOption, ProxyOptions } from 'vite';

const targetDomain = 'app.dictyexpress.org';
const secure = false;

const wsProxyConfig: ProxyOptions = {
    target: `wss://${targetDomain}`,
    ws: true,
    headers: {
        Host: targetDomain,
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
    server: {
        proxy: {
            '/ws': wsProxyConfig,
            '/api': proxyConfig,
            '/saml-auth': proxyConfig,
            // Served in prod from the biolab-singlecell-data bucket via CloudFront;
            // proxy it so the single-cell module loads its data locally too.
            '/single-cell-data': proxyConfig,
        },
    },
});
