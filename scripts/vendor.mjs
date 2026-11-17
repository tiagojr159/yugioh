import {mkdir,cp,copyFile} from 'node:fs/promises';
const base='public/assets/vendor';await mkdir(base,{recursive:true});
await cp('node_modules/three/build',base+'/three',{recursive:true});
await cp('node_modules/three/examples/jsm',base+'/addons',{recursive:true});
await copyFile('node_modules/three/LICENSE',base+'/THREE-LICENSE.txt');
await copyFile('node_modules/@ar-js-org/ar.js/three.js/build/ar-threex.mjs',base+'/ar-threex.mjs');
await copyFile('resources/ar/camera_para.dat',base+'/camera_para.dat');
await copyFile('node_modules/@ar-js-org/ar.js/LICENSE',base+'/ARJS-LICENSE.txt');
console.log('Dependências copiadas: carregamento local, sem CDN.');
