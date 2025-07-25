

export default class VoxelMap {
  constructor(width, height, depth) {
    this.width = width;
    this.height = height;
    this.depth = depth;

    this.data = new Uint8Array((width * height * depth) );
  }

  getVoxel(x, y, z) {
    const index = (x + y * this.width + z * this.width * this.height) ;
    return Boolean(this.data[index]);
  }

  setVoxel(x, y, z, value) {
    const index = (x + y * this.width + z * this.width * this.height) ;
    this.data[index] = Number(value);
  }

  forEach(fn){
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          fn(x, y, z, this.getVoxel(x, y, z));
        }
      }
    }
  }

  toVertexArray() {
    let arr = new Float32Array(this.data.length * 3);
    let i = 0

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          if (this.getVoxel(x, y, z)) {
            arr[i] = x;
            arr[i+1] = y;
            arr[i+2] = z;
            i+=3
          }
        }
      }
    }
    return arr.subarray(0, i);
  }

  get count(){return this.data.length}

  
}