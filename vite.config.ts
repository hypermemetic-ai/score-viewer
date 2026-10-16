import {defineConfig} from 'vite';
import {converterAssets} from './scripts/guitar-pro-assets.ts';
export default defineConfig({plugins:[converterAssets()],base:'./',build:{outDir:'dist',target:'es2022',rolldownOptions:{input:['index.html','footer-ink-probe.html']}},worker:{format:'es'},server:{port:5205,strictPort:true}});
