import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'dist',target:'es2022',rolldownOptions:{input:['index.html','footer-ink-probe.html']}},worker:{format:'es'},server:{port:5205,strictPort:true}});
