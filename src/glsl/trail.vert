/**
* contains code from deck.gl
* https://github.com/uber/deck.gl
* MIT License
*/

attribute vec2 aPosition;
attribute vec4 aColor;
attribute float aTime;

uniform mat4 projViewModelMatrix;
uniform float currentTime;
uniform float trailLength;

varying float vTime;
varying vec4 vColor;

void main() {
    vTime = 1.0 - (currentTime - aTime) / trailLength;
    vColor = aColor / 255.0;
    gl_Position = projViewModelMatrix * vec4(aPosition, 0.0, 1.0);
}
