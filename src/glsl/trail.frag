#ifdef GL_ES
    precision lowp float;
#endif

uniform float opacity;

varying vec4 vColor;
varying float vTime;

void main()
{
    if (vTime > 1.0 || vTime < 0.0) {
        discard;
    }
    gl_FragColor = vColor * opacity * vTime;
    // gl_FragColor = vec4(1.0, .0, .0, 1.0);
}
