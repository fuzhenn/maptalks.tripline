import * as maptalks from 'maptalks';
import Color from 'color';
import { vec4 } from '@maptalks/gl';
import { compileStyle } from '@maptalks/feature-filter';
import { toFilterFeature, getIndexArrayType } from './Util';
import TriplineRenderer from './TriplineRenderer';

const options = {
    renderer : 'gl',
    speed : 1,
    trailLength : 5,
    loopTime : 1800,
    timeProperty : 'time',
    forceRenderOnZooming : true,
    forceRenderOnMoving : true,
    forceRenderOnRotating : true,
    style : [
        {
            filter : true,
            symbol : {
                lineColor : [0, 255, 0],
                lineOpacity : 1
            }
        }
    ]
};

class TriplineLayer extends maptalks.Layer {
    constructor(id, trips, options) {
        super(id, options);
        this.setStyle(this.options.style);
        this.setTrips(trips);
        this._trips = trips;
    }

    onAdd() {
        this._parseTrips();
    }

    getTrips() {
        return this._trips;
    }

    setTrips(trips) {
        this._trips = trips;
        if (this.getMap()) {
            this._parseTrips();
        }
        const renderer = this.getRenderer();
        if (renderer) {
            renderer.createMesh();
            renderer.setToRedraw();
        }
        return this;
    }

    setStyle(style) {
        this.options.style = style;
        if (!Array.isArray(style)) {
            style = [style];
        }
        this._cookedStyles = compileStyle(style);
        return this;
    }

    getStyle() {
        return this.options.style;
    }

    _parseTrips() {
        this._positions = [];
        this._colors = [];
        this._times = [];
        this._indices = [];
        const trips = this._trips;
        if (trips.features) {
            this._parseLine(trips.features);
        } else if (!Array.isArray(trips)) {
            this._parseLine(this._trips);
        } else {
            for (let i = 0; i < trips.length; i++) {
                this._parseLine(trips[i]);
            }
        }
        this._positions = new Float32Array(this._positions);
        this._colors = new Uint8ClampedArray(this._colors);
        this._times = new Uint16Array(this._times);
        const type = getIndexArrayType(this._indices.length);
        this._indices = new type(this._indices);
    }

    _parseLine(line) {
        if (Array.isArray(line)) {
            for (let i = 0; i < line.length; i++) {
                this._parseLine(line[i]);
            }
            return;
        }
        const geom = line.geometry ? line.geometry : line;
        if (geom.type === 'MultiLineString') {
            const geom = line.coordinates;
            for (let i = 0; i < geom.length; i++) {
                this._parseCoords(geom[i], line);
            }
        } else {
            this._parseCoords(geom.coordinates, line);
        }
    }

    _parseCoords(coords, geom) {
        const map = this.getMap(),
            glZoom = map.getGLZoom();
        const color = this._getColor(geom),
            coord = new maptalks.Coordinate(0, 0);
        const time = geom.properties[this.options['timeProperty']];

        for (let i = 0; i < coords.length; i++) {
            coord.x = coords[i][0];
            coord.y = coords[i][1];
            const p = map.coordinateToPoint(coord, glZoom);
            const vertexCount = this._positions.length / 2;
            if (vertexCount > 0) {
                this._indices.push(vertexCount - 1, vertexCount);
            }
            this._positions.push(p.x, p.y);
            this._times.push(time[i]);
            this._colors.push(...color);
        }
    }

    _getColor(geom) {
        const g = toFilterFeature(geom);
        const styles = this._cookedStyles;
        for (let i = 0; i < styles.length; i++) {
            if (styles[i]['filter'](g) === true) {
                const lineColor = styles[i].symbol['lineColor'] || [0, 0, 0];
                let lineOpacity = styles[i].symbol['lineOpacity'];
                if (lineOpacity === undefined) {
                    lineOpacity = 1;
                }
                const color = Array.isArray(lineColor) ? lineColor : Color(lineColor).array();
                if (color.length === 3) {
                    color.push(255);
                }
                vec4.scale(color, color, lineOpacity);
                return color;
            }
        }
        return [0, 0, 0, 255];
    }
}

TriplineLayer.mergeOptions(options);

TriplineLayer.registerRenderer('gl', TriplineRenderer);

export default TriplineLayer;
