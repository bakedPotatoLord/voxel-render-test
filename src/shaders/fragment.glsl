

precision highp float;

in vec2 vUv;

uniform sampler2D woodTexture;

out vec4 outColor;

void main() {
  
  outColor =  texture(woodTexture,vUv);
}