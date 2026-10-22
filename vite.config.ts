import {defineConfig} from 'vite';
import {converterAssets} from './scripts/guitar-pro-assets.ts';
import {viewerDerivedIdentity} from './scripts/derived-identity.ts';

/** Derived files on disk are bound to the code that makes them
 * (scripts/derived-identity.ts), so another engraver never reads them. */

export default defineConfig({plugins:[converterAssets()],base:'./',define:{__VIEWER_DERIVED_IDENTITY__:JSON.stringify(viewerDerivedIdentity(import.meta.dirname))},
 build:{outDir:'dist',target:'es2022',rolldownOptions:{input:['index.html','footer-ink-probe.html']}},worker:{format:'es'},server:{port:5205,strictPort:true}});
