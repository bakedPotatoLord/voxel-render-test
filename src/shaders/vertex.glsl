
precision highp float;

in vec3 position;
in vec3 voxelOffset;
in vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 uvTransform;

out vec2 vUv;

void main() {
  vUv = (uvTransform * vec3(uv, 1)).xy;
  // vUv = uv;
  vec3 worldPos = position + voxelOffset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}