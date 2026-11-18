import {mkdir,cp,copyFile,readFile,writeFile} from 'node:fs/promises';
const base='public/assets/vendor';await mkdir(base,{recursive:true});
await cp('node_modules/three/build',base+'/three',{recursive:true});
await cp('node_modules/three/examples/jsm',base+'/addons',{recursive:true});
await copyFile('node_modules/three/LICENSE',base+'/THREE-LICENSE.txt');
// AR.js 3.4.8 discards two initialization promises. Return them so the app
// can report WebAssembly, calibration and controller failures to the player.
let tracker=await readFile('node_modules/@ar-js-org/ar.js/three.js/build/ar-threex.mjs','utf8');
for(const [before,after] of [
 ['h=function(){return new Promise(function(A){G({onRuntimeInitialized:function(){A({instance:this})}})})}', 'h=function(){return G().then(function(A){return{instance:A}})}'],
 ['A()}),this},Y.prototype.getProjectionMatrix', 'A()})},Y.prototype.getProjectionMatrix']
]){if(tracker.split(before).length!==2)throw Error('A estrutura do AR.js mudou; revise a correção de inicialização antes de atualizar.');tracker=tracker.replace(before,after);}
await writeFile(base+'/ar-threex.mjs',tracker);
await copyFile('resources/ar/camera_para.dat',base+'/camera_para.dat');
await copyFile('node_modules/@ar-js-org/ar.js/LICENSE',base+'/ARJS-LICENSE.txt');
console.log('Dependências copiadas: carregamento local, sem CDN.');
