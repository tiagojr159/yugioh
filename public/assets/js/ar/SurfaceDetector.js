import * as THREE from 'three';
export class SurfaceDetector{
 constructor(scene){this.reticle=new THREE.Mesh(new THREE.RingGeometry(.085,.105,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}));this.reticle.matrixAutoUpdate=false;this.reticle.visible=false;scene.add(this.reticle);this.generation=0;}
 async initialize(session){const generation=++this.generation;const viewer=await session.requestReferenceSpace('viewer');const source=await session.requestHitTestSource({space:viewer});if(generation!==this.generation){source.cancel();return;}this.source?.cancel();this.source=source;}
 update(frame,space){if(!frame||!this.source)return;const hit=frame.getHitTestResults(this.source)[0];const pose=hit?.getPose(space);if(!pose){this.reticle.visible=false;return;}const matrix=new THREE.Matrix4().fromArray(pose.transform.matrix);const normal=new THREE.Vector3(0,1,0).transformDirection(matrix);this.reticle.visible=normal.y>.8;if(this.reticle.visible)this.reticle.matrix.copy(matrix);}
 dispose(){++this.generation;this.source?.cancel();this.reticle.geometry.dispose();this.reticle.material.dispose();this.reticle.removeFromParent();}
}
