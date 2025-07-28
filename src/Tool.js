import { Box3, BoxGeometry, Vector3 } from "three"


export default class Tool {
  constructor() {
    this.width = 20
    this.height = 40

    this.pos = new Vector3(0,0,0)

    this.box = new Box3(new THREE.Vector3(-this.width / 2, 0, -this.width / 2), new THREE.Vector3(this.width / 2, this.height, this.width / 2))

    
  }


  toMesh(){

    return BoxGeometry(this.width, this.height, this.depth)
  }
}