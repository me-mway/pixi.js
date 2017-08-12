'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _core = require('../../core');

var core = _interopRequireWildcard(_core);

var _path = require('path');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @author Vico @vicocotea
 * original filter: https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/noise.js
 */

/**
 * A Noise effect filter.
 *
 * @class
 * @extends PIXI.Filter
 * @memberof PIXI.filters
 */
var NoiseFilter = function (_core$Filter) {
    _inherits(NoiseFilter, _core$Filter);

    /**
     * @param {number} noise - The noise intensity, should be a normalized value in the range [0, 1].
     * @param {number} seed - A random seed for the noise generation. Default is `Math.random()`.
     */
    function NoiseFilter() {
        var noise = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.5;
        var seed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Math.random();

        _classCallCheck(this, NoiseFilter);

        var _this = _possibleConstructorReturn(this, _core$Filter.call(this,
        // vertex shader
        'attribute vec2 aVertexPosition;\r\nattribute vec2 aTextureCoord;\r\n\r\nuniform mat3 projectionMatrix;\r\n\r\nvarying vec2 vTextureCoord;\r\n\r\nvoid main(void)\r\n{\r\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\r\n    vTextureCoord = aTextureCoord;\r\n}',
        // fragment shader
        'precision highp float;\r\n\r\nvarying vec2 vTextureCoord;\r\nvarying vec4 vColor;\r\n\r\nuniform float uNoise;\r\nuniform float uSeed;\r\nuniform sampler2D uSampler;\r\n\r\nfloat rand(vec2 co)\r\n{\r\n    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);\r\n}\r\n\r\nvoid main()\r\n{\r\n    vec4 color = texture2D(uSampler, vTextureCoord);\r\n    float randomValue = rand(gl_FragCoord.xy * uSeed);\r\n    float diff = (randomValue - 0.5) * uNoise;\r\n\r\n    // Un-premultiply alpha before applying the color matrix. See issue #3539.\r\n    if (color.a > 0.0) {\r\n        color.rgb /= color.a;\r\n    }\r\n\r\n    color.r += diff;\r\n    color.g += diff;\r\n    color.b += diff;\r\n\r\n    // Premultiply alpha again.\r\n    color.rgb *= color.a;\r\n\r\n    gl_FragColor = color;\r\n}\r\n'));

        _this.noise = noise;
        _this.seed = seed;
        return _this;
    }

    /**
     * The amount of noise to apply, this value should be in the range (0, 1].
     *
     * @member {number}
     * @default 0.5
     */


    _createClass(NoiseFilter, [{
        key: 'noise',
        get: function get() {
            return this.uniforms.uNoise;
        },
        set: function set(value) // eslint-disable-line require-jsdoc
        {
            this.uniforms.uNoise = value;
        }

        /**
         * A seed value to apply to the random noise generation. `Math.random()` is a good value to use.
         *
         * @member {number}
         */

    }, {
        key: 'seed',
        get: function get() {
            return this.uniforms.uSeed;
        },
        set: function set(value) // eslint-disable-line require-jsdoc
        {
            this.uniforms.uSeed = value;
        }
    }]);

    return NoiseFilter;
}(core.Filter);

exports.default = NoiseFilter;
//# sourceMappingURL=NoiseFilter.js.map