import { BufferGeometry, BufferAttribute, Mesh } from "three";

import ndarray from "ndarray";

import compileMesher from "greedy-mesher";

export default class Chunk {
  constructor(size, pos) {
    this.width = size.x;
    this.height = size.y;
    this.depth = size.z;
    this.position = pos.multiply(size);

    this.data = new Uint8Array(this.width * this.height * this.depth);
    this.arr = new ndarray(this.data, [this.width, this.height, this.depth], [1, this.width, this.width * this.height],0);

    this.geo = new BufferGeometry();

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

  quadToMesh(lo_x, lo_y, lo_z, hi_x, hi_y, hi_z, points, uvs, indexOffset = 0) {
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

    let pIdx = indexOffset;
    let uvIdx = indexOffset;

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

  greedyMesh() {
    const max_triangles = 1_000;

    let i = 0

    let points = new Uint16Array(max_triangles * 3),
      uvs = new Uint16Array(max_triangles * 2);

    let mesher = compileMesher({
      extraArgs: 1,
      order: [0, 1, 2],
      append: (lo_x, lo_y, lo_z, hi_x, hi_y, hi_z, val, result) => {
        i = this.quadToMesh(lo_x, lo_y, lo_z, hi_x, hi_y, hi_z, points, uvs,i);
        // console.log("new quad",{lo_x, lo_y, lo_z, hi_x, hi_y, hi_z,i});
      },
    });

    mesher(this.arr, []);
    return { points, uvs };
  }

  toMesh() {
    let { points, uvs } = this.greedyMesh();

    this.geo.setAttribute("position", new BufferAttribute(points, 3));
    this.geo.setAttribute("uv", new BufferAttribute(uvs, 2));

    this.geo.computeVertexNormals();

    // console.log(verts)
    return this.geo;
  }

  toObject(material) {
    let mesh = new Mesh(this.toMesh(), material);
    mesh.position.set(this.position.x, this.position.y, this.position.z);
    return mesh;
  }

  fillVoxels(val){
    this.data.fill(val)
  }



  get count() {
    return this.data.length;
  }
}
