import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
export class MonsterRenderer {
 constructor(){this.models=new Map();this.loader=new GLTFLoader();this.instances=new Set();}
 material(color,metalness=.35){return new THREE.MeshStandardMaterial({color,metalness,roughness:.62,flatShading:true});}
 async create(card,{procedural=false}={}){
  let group;
  if(card.model_url&&!procedural){try{if(!this.models.has(card.model_url))this.models.set(card.model_url,this.loader.loadAsync(new URL(card.model_url,document.baseURI).href));const gltf=await this.models.get(card.model_url);group=clone(gltf.scene);group.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.userData.sharedGeometry=true;}});const box=new THREE.Box3().setFromObject(group);const size=box.getSize(new THREE.Vector3());const extent=Math.max(size.x,size.y,size.z);if(!Number.isFinite(extent)||extent<=0)throw Error('Modelo sem geometria visível.');group.scale.setScalar(2/extent);group.position.y=-box.min.y*group.scale.x;if(gltf.animations.length){group.userData.mixer=new THREE.AnimationMixer(group);group.userData.clips=gltf.animations;const idle=gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0];group.userData.mixer.clipAction(idle).play();}}catch(e){console.warn('Modelo indisponível, usando criatura procedural.',e.message);}}
  if(!group)group=this.procedural(card);
  const root=new THREE.Group();root.add(group);root.userData.creature=group;root.userData.card=card;root.userData.baseY=group.position.y;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.instances.add(root);return root;
 }
 procedural(card){
  const g=new THREE.Group(),body=this.material(card.color),dark=this.material('#263341'),ivory=this.material('#e5ddbb'),gold=this.material('#c6ab74',.65),glow=new THREE.MeshStandardMaterial({color:card.color,emissive:card.color,emissiveIntensity:1.6,roughness:.3});
  const part=(geo,mat,x=0,y=0,z=0,parent=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;};
  const ball=(r,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=part(new THREE.IcosahedronGeometry(r,1),mat,x,y,z);m.scale.set(sx,sy,sz);return m;};
  const box=(x,y,z,mat,px,py,pz)=>part(new THREE.BoxGeometry(x,y,z),mat,px,py,pz);
  const horn=(r,h,mat,x,y,z)=>part(new THREE.ConeGeometry(r,h,5),mat,x,y,z);
  const eyes=(y,z,gap=.15)=>{[-1,1].forEach(s=>ball(.045,glow,s*gap,y,z));};
  g.userData.wings=[];g.userData.floaters=[];
  switch(card.archetype){
  case 'dragon':{
   ball(.55,body,0,1.01,0,.85,1.25,1.1);ball(.4,ivory,0,1.04,.29,.65,1,.5);ball(.34,body,0,1.76,.2,1,1.05,1.15);ball(.25,body,0,1.66,.51,1.15,.55,1.1);eyes(1.8,.49,.16);
   [-1,1].forEach(s=>{horn(.08,.32,ivory,s*.22,2.1,.1).rotation.z=-s*.35;ball(.23,body,s*.43,.48,.12,.75,1.4,1);ball(.17,dark,s*.44,.18,.29,1.2,.7,1.6);const arm=ball(.16,body,s*.51,1.12,.27,.7,1.8,.8);arm.rotation.z=s*.45;
    const wing=new THREE.Group();wing.position.set(s*.4,1.4,-.15);const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(s*1.3,.95);shape.lineTo(s*1.2,.15);shape.lineTo(s*.72,.3);shape.lineTo(s*.85,-.2);shape.lineTo(s*.36,.02);shape.lineTo(0,-.36);const membrane=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:'#9c503d',side:THREE.DoubleSide,roughness:.8,flatShading:true}));wing.add(membrane);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(membrane.geometry),new THREE.LineBasicMaterial({color:'#edaa67'}));wing.add(edge);g.add(wing);g.userData.wings.push({object:wing,sign:s});});
   for(let i=0;i<8;i++){const tail=ball(.2-i*.018,body,Math.sin(i*.35)*.4,.65-i*.055,-.4-i*.18);tail.rotation.z=i*.12;if(i<5)horn(.06,.19,gold,0,1.35-i*.13,-.35-i*.2);}
   break;}
  case 'golem':{
   box(.95,.95,.58,dark,0,1.14,0);ball(.65,body,0,1.2,.03,1,.9,.7);box(.57,.47,.47,body,0,1.98,.02);eyes(2.01,.275,.16);const core=part(new THREE.OctahedronGeometry(.23),glow,0,1.25,.47);g.userData.floaters.push(core);
   [-1,1].forEach(s=>{box(.38,.5,.42,dark,s*.31,.45,.05);box(.48,.26,.58,body,s*.32,.17,.16);const arm=box(.44,.85,.5,body,s*.82,1.07,0);arm.rotation.z=s*.19;ball(.32,body,s*.74,1.64,0);box(.17,.04,.03,glow,s*.65,1.35,.27);});
   for(let i=0;i<7;i++){const rock=part(new THREE.DodecahedronGeometry(.09),body,Math.cos(i)*.95,1.6+Math.sin(i)*.35,Math.sin(i)*.65);g.userData.floaters.push(rock);}break;}
  case 'warrior':case 'knight':{
   const shadow=card.archetype==='knight';box(.6,.64,.35,body,0,1.26,0);ball(.28,dark,0,1.94,0,.9,1.15,.85);box(.44,.13,.04,gold,0,1.94,.23);box(.37,.045,.05,glow,0,1.98,.255);const crest=horn(.13,.3,body,0,2.3,0);crest.rotation.z=.15;
   [-1,1].forEach(s=>{ball(.23,body,s*.46,1.53,0,1,.9,1);box(.17,.58,.21,dark,s*.52,1.13,.03);box(.21,.22,.25,body,s*.53,.79,.08);const leg=box(.21,.64,.24,dark,s*.22,.55,0);leg.rotation.z=s*.06;box(.26,.18,.39,body,s*.24,.17,.1);});
   const sword=box(.1,1.65,.09,glow,.72,1.29,.23);sword.rotation.z=-.15;box(.5,.1,.16,gold,.64,.78,.23);box(.12,.36,.14,dark,.62,.54,.23);part(new THREE.OctahedronGeometry(.16),glow,0,1.35,.26);
   if(shadow){const cape=part(new THREE.ConeGeometry(.68,1.6,5,1,true),this.material('#46355d'),0,1.1,-.2);cape.rotation.y=.65;part(new THREE.TorusGeometry(.4,.015,6,48),glow,0,2.05,-.24);}else{for(let i=0;i<4;i++){const bolt=part(new THREE.OctahedronGeometry(.08),glow,Math.sin(i*2)*.8,1+i*.3,Math.cos(i)*.4);g.userData.floaters.push(bolt);}}break;}
  case 'spirit':{
   ball(.38,body,0,1.25,0,.8,1.45,.75);ball(.29,ivory,0,1.98,.04,.9,1.1,.8);eyes(2.01,.24,.11);
   [-1,1].forEach(s=>{const branch=part(new THREE.CylinderGeometry(.04,.065,.6,5),gold,s*.22,2.35,0);branch.rotation.z=-s*.4;for(let i=0;i<3;i++){const leaf=ball(.21,body,s*(.38+i*.19),1.6+i*.17,-.1,1.7,.55,.4);leaf.rotation.z=s*(.5+i*.3);g.userData.floaters.push(leaf);}const arm=box(.1,.69,.12,gold,s*.4,1.2,0);arm.rotation.z=s*.6;horn(.14,.65,dark,s*.16,.4,.05).rotation.z=s*.2;});
   part(new THREE.OctahedronGeometry(.14),glow,0,1.22,.32);for(let i=0;i<8;i++){const mote=ball(.035,glow,Math.sin(i*3)*.75,.5+(i%4)*.45,Math.cos(i*3)*.6);g.userData.floaters.push(mote);}break;}
  case 'serpent':{
   const pts=[];for(let i=0;i<40;i++){const t=i/39;pts.push(new THREE.Vector3(Math.sin(t*Math.PI*3)*(.65-t*.35),.2+t*1.65,Math.cos(t*Math.PI*3)*.38));}
   part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.18,7,false),body);const top=pts.at(-1);ball(.28,body,top.x,top.y+.13,top.z,1,1.3,1.2);[-1,1].forEach(s=>{horn(.07,.38,ivory,top.x+s*.17,top.y+.5,top.z).rotation.z=-s*.35;ball(.04,glow,top.x+s*.12,top.y+.21,top.z+.25);});for(let i=4;i<34;i+=4){const p=pts[i];const spike=part(new THREE.OctahedronGeometry(.18),glow,p.x,p.y+.2,p.z);spike.scale.set(.45,1.8,.6);}break;}
  default:ball(.7,body,0,1,0);
  }
  return g;
 }
 update(t,dt){for(const root of this.instances){const g=root.userData.creature;g.userData.mixer?.update(dt);for(const w of g.userData.wings||[])w.object.rotation.y=w.sign*(.1+Math.sin(t*2.2)*.09);for(const [i,o]of(g.userData.floaters||[]).entries()){o.rotation.y=t*.6+i;o.rotation.z=Math.sin(t+i)*.14;}g.position.y=(root.userData.baseY||0)+Math.sin(t*1.5+(root.userData.card.id||0))*.025;}}
 play(root,name){const g=root?.userData.creature;if(!g?.userData.mixer)return;const clip=g.userData.clips.find(c=>c.name.toLowerCase().includes(name));if(clip){const action=g.userData.mixer.clipAction(clip);action.reset().setLoop(THREE.LoopOnce,1).play();}}
 dispose(root){if(!root)return;this.instances.delete(root);root.userData.creature?.userData.mixer?.stopAllAction();const materials=new Set(),geometries=new Set();root.traverse(o=>{if(o.geometry&&!o.userData.sharedGeometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}
 async destroy(){for(const o of [...this.instances])this.dispose(o);for(const promise of this.models.values()){try{const gltf=await promise;gltf.scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}}});}catch{}}this.models.clear();}
}
