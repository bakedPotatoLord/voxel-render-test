import { BufferGeometry, BufferAttribute, Mesh } from "three";

import ndarray from "ndarray";

import compileMesher from "greedy-mesher";



const max_triangles = 1024;

export default class Chunk {
  constructor(size, pos) {
    this.width = size.x;
    this.height = size.y;
    this.depth = size.z;
    this.position = pos.multiply(size);

    this.data = new Uint8Array(this.width * this.height * this.depth);
    this.arr = new ndarray(this.data, [this.width, this.height, this.depth], [1, this.width, this.width * this.height],0);

    this.geo = new BufferGeometry();

    this.map = null


    //for greedy meshing
    this.i = 0
    this.points = new Uint16Array(max_triangles * 3),
    this.uvs = new Uint8Array(max_triangles * 2);

    this.mesher = compileMesher({
      extraArgs: 1,
      order: [0, 1, 2],
      append: (lo_x, lo_y, lo_z, hi_x, hi_y, hi_z, val, result) => {
        this.i = this.quadToMesh(lo_x, lo_y, lo_z, hi_x, hi_y, hi_z, this.points, this.uvs,this.i);
        // console.log("new quad",{lo_x, lo_y, lo_z, hi_x, hi_y, hi_z,i});
      },
    });

    // console.log(this.arr)
  }

  getVoxel(x, y, z) {
    return this.arr.get(x, y, z);
  }

  setVoxel(x, y, z, value) {
    this.arr.set(x, y, z, value);
  }

  forEach(fn) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          fn(x, y, z, this.getVoxel(x, y, z));
        }
      }
    }
  }

  quadToMesh(lo_x, lo_y, lo_z, hi_x, hi_y, hi_z, points, uvs,) {
    // Corner positions
    const px = [lo_x, hi_x];
    const py = [lo_y, hi_y];
    const pz = [lo_z, hi_z];

    // Vertex layout: for each face, define 2 triangles using corner indices
    // Each face is 6 indices into [x, y, z] bitmask
    const faces = [
      // +X
      [
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
      ],
      [
        [1, 0, 0],
        [1, 1, 1],
        [1, 0, 1],
      ],

      // -X
      [
        [0, 0, 0],
        [0, 1, 1],
        [0, 1, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 1],
      ],

      // +Y
      [
        [0, 1, 0],
        [1, 1, 0],
        [1, 1, 1],
      ],
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 1],
      ],

      // -Y
      [
        [0, 0, 0],
        [1, 0, 1],
        [1, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 0, 1],
        [1, 0, 1],
      ],

      // +Z
      [
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
      ],
      [
        [0, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ],

      // -Z
      [
        [0, 0, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
      [
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    ];

    // Basic UVs (assuming full [0,1] square)
    const baseUVs = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 1],
    ];

    let pIdx = this.i;
    let uvIdx = this.i;

    for (let f = 0; f < faces.length; ++f) {
      const tri = faces[f];
      for (let v = 0; v < 3; ++v) {
        const [ix, iy, iz] = tri[v];
        points[pIdx++] = px[ix];
        points[pIdx++] = py[iy];
        points[pIdx++] = pz[iz];

        const [u, v_] = baseUVs[v + (f % 2) * 3]; // use triangle 0 or 1 UVs
        uvs[uvIdx++] = u * 65535;
        uvs[uvIdx++] = v_ * 65535;
      }
    }

    return pIdx;
  }


  /**
   * Computes the mesh for the current chunk, using the stored points and
   * UVs. The returned mesh is a THREE.BufferGeometry.
   *
   * @returns {BufferGeometry} The computed mesh.
   */
  mesh() {
    this.mesher(this.arr, []);

    let pointsView = this.points.subarray(0,this.i);
    let uvsView = this.uvs.subarray(0,(this.i<<1)/3);

    this.geo.setAttribute("position", new BufferAttribute(pointsView, 3));
    this.geo.setAttribute("uv", new BufferAttribute(uvsView, 2));

    this.geo.computeVertexNormals();

    // console.log(verts)
    return this.geo;
  }

  toObject(material) {
    let mesh = new Mesh(this.mesh(), material);
    mesh.position.set(this.position.x, this.position.y, this.position.z);
    return mesh;
  }

  fillVoxels(val){
    this.data.fill(val)
  }

  setMap(map){
    this.map = map
  }

  getMap(){
    return this.map
  }

  get count() {
    return this.data.length;
  }
}
