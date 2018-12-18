import * as maptalks from 'maptalks';
import { reshader, mat4, createREGL } from '@maptalks/gl';
import vert from './glsl/trail.vert';
import frag from './glsl/trail.frag';

class TriplineRenderer extends maptalks.renderer.CanvasRenderer {

    needToRedraw() {
        return true;
    }

    draw() {
        this.prepareCanvas();
        if (!this._mesh) {
            this.createMesh();
        }
        const uniforms = this.getUniformValues();
        this._renderer.render(this._shader, uniforms, this._scene);
        this.completeRender();
    }

    drawOnInteracting() {
        this.draw();
    }

    clearCanvas() {
        if (!this.canvas) return;
        this._regl.clear({
            color : [0, 0, 0, 0],
            depth: 1,
        });
    }

    createMesh() {
        this._disposeMesh();

        const layer = this.layer;
        if (!layer._positions || !layer._positions.length) {
            return;
        }
        const geometry = new reshader.Geometry(
            {
                'aPosition' : layer._positions,
                'aColor' : layer._colors,
                'aTime' : layer._times
            },
            layer._indices,
            0,
            { primitive : 'lines' }
        );
        this._mesh = new reshader.Mesh(geometry);
        this._scene.setMeshes(this._mesh);
    }

    _disposeMesh() {
        if (!this._mesh) {
            return;
        }
        this._scene.clear();
        this._mesh.geometry.dispose();
        delete this._mesh;
    }

    _initReshader() {
        const regl = this._regl;

        this._scene = new reshader.Scene();

        this._renderer = new reshader.Renderer(regl);

        const canvas = this.canvas;

        const viewport = {
            x : 0,
            y : 0,
            width : () => {
                return canvas ? canvas.width : 1;
            },
            height : () => {
                return canvas ? canvas.height : 1;
            }
        };
        const scissor = {
            enable: true,
            box: {
                x : 0,
                y : 0,
                width : () => {
                    return canvas ? canvas.width : 1;
                },
                height : () => {
                    return canvas ? canvas.height : 1;
                }
            }
        };

        const config = {
            vert,
            frag,
            uniforms : [
                {
                    name : 'projViewModelMatrix',
                    type : 'function',
                    fn : function (context, props) {
                        const projViewModelMatrix = [];
                        mat4.multiply(projViewModelMatrix, props['projViewMatrix'], props['modelMatrix']);
                        return projViewModelMatrix;
                    }
                },
                'currentTime',
                'trailLength',
                'opacity'
            ],
            extraCommandProps : {
                viewport, scissor,
                depth : {
                    enable : true,
                    func : this.layer.options.depthFunc || 'less'
                },
                blend: {
                    enable: true,
                    func: {
                        src: 'src alpha',
                        dst: 'one'
                    },
                    equation: 'add'
                }
            }
        };

        this._shader = new reshader.MeshShader(config);
    }

    getUniformValues() {
        const map = this.getMap();
        let t = performance.now() / 1000;
        if (!this._startTime) {
            this._startTime = t;
        }
        const layer = this.layer;
        const projViewMatrix = map.projViewMatrix,
            loopTime = layer.options['loopTime'],
            speed = layer.options['speed'];
        return {
            opacity : layer.options['opacity'],
            trailLength : layer.options['trailLength'],
            currentTime : ((t - this._startTime) % loopTime) * speed,
            projViewMatrix
        };
    }

    createContext() {
        if (this.canvas.gl && this.canvas.gl.wrap) {
            this.gl = this.canvas.gl.wrap();
        } else {
            const layer = this.layer;
            const attributes = layer.options.glOptions || {
                alpha: true,
                depth: true,
                // antialias: true
            };
            attributes.preserveDrawingBuffer = true;
            this.gl = this.gl || this._createGLContext(this.canvas, attributes);
        }
        this._regl = createREGL({
            gl : this.gl,
            extensions : [
                'OES_element_index_uint'
            ]
        });
        this._initReshader();
    }

    remove() {
        this._disposeMesh();
        super.remove();
    }

    _createGLContext(canvas, options) {
        const names = ['webgl', 'experimental-webgl'];
        let context = null;
        /* eslint-disable no-empty */
        for (let i = 0; i < names.length; ++i) {
            try {
                context = canvas.getContext(names[i], options);
            } catch (e) {}
            if (context) {
                break;
            }
        }
        return context;
        /* eslint-enable no-empty */
    }
}

export default TriplineRenderer;
