import Signal from 'mini-signals';
import bitTwiddle from 'bit-twiddle';
import createResource from './resources/createResource';
import BufferResource from './resources/BufferResource';
import { components, data, settings /* @ifdef DEBUG */, debug /* @endif */ } from '@pixi/core';

/**
 * A TextureSource is a wrapper around a texture resource that can be drawn with the
 * WebGL API. It contains information necessary for managing that resource.
 *
 * @class
 * @mixes UpdateComponent
 * @mixes DestroyComponent
 * @mixes UidComponent
 * @memberof texture
 */
export default class TextureSource extends
    components.UpdateComponent(
    components.DestroyComponent(
    components.UidComponent(
    )))
{
    /**
     * @param {TextureResource} resource - The drawable source.
     * @param {number} scaleMode - How to scale the texture source. Either `WebGLRenderingContext.LINEAR`
     *  or `WebGLRenderingContext.NEAREST`.
     * @param {number} wrapMode - How to scale the texture source. Either `WebGLRenderingContext.CLAMP_TO_EDGE`,
     *  `WebGLRenderingContext.REPEAT`, or `WebGLRenderingContext.MIRRORED_REPEAT`.
     * @param {boolean} mipmap - Whether a mipmap should be generated for this texture.
     */
    constructor(
        resource,
        {
            resolution = settings.RESOLUTION,
            width = -1,
            height = -1,
            scaleMode = TextureSource.defaults.scaleMode,
            wrapMode = TextureSource.defaults.wrapMode,
            format = TextureSource.defaults.format,
            type = TextureSource.defaults.type,
            target = TextureSource.defaults.target,
            mipmap = TextureSource.defaults.mipMap,
            premultiplyAlpha = TextureSource.defaults.premultiplyAlpha,
        } = {}
    )
    {
        // make sure our components get initialized
        super();

        // @ifdef DEBUG
        validateTextureSourceParams(arguments[0], arguments[1]);
        // @endif

        /**
         * The width of texture
         *
         * @member {number}
         */
        this.width = width;

        /**
         * The height of texture
         *
         * @member {number}
         */
        this.height = height;

        /**
         * The resolution / device pixel ratio of the texture
         *
         * @member {number}
         * @default 1
         */
        this.resolution = resolution;

        /**
         * The scale mode to apply when scaling this texture
         *
         * @member {number}
         * @see data.SCALE_MODES
         */
        this.scaleMode = scaleMode;

        /**
         * The texture wrapping mode of the texture.
         *
         * @type {number}
         * @see data.WRAP_MODES
         */
        this.wrapMode = wrapMode;

        /**
         * The pixel format of the texture.
         *
         * @member {number}
         * @see data.FORMATS
         */
        this.format = format;

        /**
         * The data type of the texture.
         *
         * @member {number}
         * @see data.TYPES
         */
        this.type = type;

        /**
         * The texture target type of the texture.
         *
         * @member {number}
         * @see data.TARGETS
         */
        this.target = target;

        /**
         * If mipmapping was used for this texture, enable and disable with enableMipmap()
         *
         * @member {boolean}
         */
        this.mipmap = mipmap;

        /**
         * Set to true to enable pre-multiplied alpha
         *
         * @member {boolean}
         */
        this.premultiplyAlpha = premultiplyAlpha;

        /**
         * Dispatched when a not-immediately-available source finishes loading.
         *
         * @member {Signal}
         */
        this.onReady = new Signal();

        /**
         * Dispatched when a not-immediately-available source fails to load.
         *
         * @member {Signal}
         */
        this.onError = new Signal();

        /**
         * Dispatched when the texture is being disposed, but not destroyed.
         *
         * @member {Signal}
         */
        this.onDispose = new Signal();

        /**
         * The underlying texture resource to use when drawing.
         *
         * @private
         * @member {TextureResource}
         */
        this._resource = null;

        /**
         * Whether or not the texture is a power of two, try to use power of two textures as much
         * as you can
         *
         * @private
         * @member {boolean}
         */
        this._isPowerOfTwo = false;

        /**
         * Storage for binding to the resource update signal.
         *
         * @private
         * @member {SignalBinding}
         */
        this._onResourceUpdatedBinding = null;

        // run the resource setter
        this.resource = resource;
    }

    /**
     * Is this texture a power of two in dimensions.
     *
     * @member {boolean}
     */
    get isPowerOfTwo() { return this._isPowerOfTwo; }

    /**
     * Is this texture source ready to be used (does it have a valid width/height)
     *
     * @member {boolean}
     */
    get ready() { return this.width !== -1 && this.height !== -1; }

    /**
     * The real pixel width of this texture (width * resolution)
     *
     * @member {number}
     */
    get realWidth() { return this.width * this.resolution; }

    /**
     * The real pixel height of this texture (width * resolution)
     *
     * @member {number}
     */
    get realHeight() { return this.height * this.resolution; }

    /**
     * The underlying resource object we use when drawing.
     *
     * @member {TextureResource}
     */
    get resource() { return this._resource; }

    set resource(v) // eslint-disable-line require-jsdoc
    {
        if (this._onResourceUpdatedBinding)
        {
            this._onResourceUpdatedBinding.detach();
            this._onResourceUpdatedBinding = null;
        }

        this._resource = createResource(v);
        this._onResourceUpdatedBinding = this._resource.onUpdate.add(this.update, this);

        if (this._resource.loaded)
        {
            this._onResourceReady();
        }
        else
        {
            this._resource.onReady.once(this._onResourceReady, this);
        }
    }

    /**
     * Updates the width/height of the texture based on the resource and resolution.
     *
     * @private
     */
    _updateDimensions()
    {
        const resource = this._resource;

        if (resource && resource.ready)
        {
            this.width = resource.width / this.resolution;
            this.height = resource.height / this.resolution;
        }
    }

    /**
     * Called when the underlying resource is loaded.
     *
     * @private
     */
    _onResourceReady()
    {
        this._updateDimensions();

        if (this.ready)
        {
            this._isPowerOfTwo = bitTwiddle.isPow2(this.realWidth) && bitTwiddle.isPow2(this.realHeight);

            this.update();
            this.onReady.dispatch(this);
        }
    }

    /**
     * Destroys this texture source.
     *
     */
    destroy()
    {
        super.destroy();
        this.dispose();

        if (this._onResourceUpdatedBinding)
        {
            this._onResourceUpdatedBinding.detach();
            this._onResourceUpdatedBinding = null;
        }

        this.onUpdate.detachAll();
        this.onReady.detachAll();
        this.onError.detachAll();
        this.onDispose.detachAll();

        this._resource.destroy();
        this._resource = null;
    }

    /**
     * Frees the texture from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     */
    dispose()
    {
        this.onDispose.dispatch(this);
    }

    /**
     * Helper function that creates a texture source based on the resource you provide.
     *
     * @static
     * @param {string|CanvasImageSource|ArrayBufferView} resource The source to create base texture from.
     * @return {TextureSource} The new base texture.
     */
    static from(resource)
    {
        if (resource.buffer instanceof ArrayBuffer)
        {
            return TextureSource.fromArrayBufferView(resource);
        }

        return new TextureSource(resource);
    }

    /**
     * Helper function that creates a texture source from an array buffer view (Uint8Array, FLoat32Array, etc).
     *
     * @static
     * @param {ArrayBufferView} array The data array to create base texture from.
     * @param {number} format The {@link data.FORMATS} to use for the texture, by default this is RGBA.
     * @param {number} type The {@link data.TYPES} to use for the texture, by default this is auto-detected.
     * @return {TextureSource} The new base texture.
     */
    static fromArrayBufferView(array, width = array.length, height = 1, format = data.FORMATS.RGBA, type = 0)
    {
        if (type === 0)
        {
            if (array instanceof Int8Array) type = data.TYPES.BYTE;
            else if (array instanceof Uint8Array) type = data.TYPES.UNSIGNED_BYTE;
            else if (array instanceof Int16Array) type = data.TYPES.SHORT;
            else if (array instanceof Uint16Array) type = data.TYPES.UNSIGNED_SHORT;
            else if (array instanceof Int32Array) type = data.TYPES.INT;
            else if (array instanceof Uint32Array) type = data.TYPES.UNSIGNED_INT;
            else if (array instanceof Float32Array) type = data.TYPES.FLOAT;
        }

        // @ifdef DEBUG
        debug.ASSERT(
            type !== 0 && Object.keys(data.TYPES).reduce((p, k) => p || type === data.TYPES[k], false),
            'Invalid type given to fromArrayBufferView, or we were unable to detect the correct type.',
            type
        );
        // @endif

        return new TextureSource(
            new BufferResource(array),
            {
                resolution: 1,
                width,
                height,
                scaleMode: data.SCALE_MODES.NEAREST,
                wrapMode: data.WRAP_MODES.CLAMP,
                format,
                type,
                target: data.TARGETS.TEXTURE_2D,
                mipmap: false,
                premultiplyAlpha: false,
            }
        );
    }
}

/**
 * The defaults to use when creating new texture sources.
 *
 * @static
 * @constant
 * @memberof TextureSource
 * @type {object}
 * @property {number} scaleMode
 * @property {number} wrapMode
 * @property {number} format
 * @property {number} type
 * @property {boolean} mipmap
 * @property {boolean} premultiplyAlpha
 * @default SCALE_MODES.LINEAR
 */
TextureSource.defaults = {
    scaleMode: data.SCALE_MODES.LINEAR,
    wrapMode: data.WRAP_MODES.CLAMP_TO_EDGE,
    format: data.FORMATS.RGBA,
    type: data.TYPES.UNSIGNED_BYTE,
    target: data.TARGETS.TEXTURE_2D,
    mipMap: true,
    premultiplyAlpha: true,
};

// @ifdef DEBUG
function validateTextureSourceParams(resource, { scaleMode, wrapMode, format, type, target, mipmap, premultiplyAlpha })
{
    /* eslint-disable max-len */
    debug.ASSERT(!!resource, `Resource is required to create a TextureSource.`, resource);
    debug.ASSERT(Object.keys(data.SCALE_MODES).reduce((p, k) => p || scaleMode === data.SCALE_MODES[k], false), `Invalid scaleMode.`, scaleMode);
    debug.ASSERT(Object.keys(data.WRAP_MODES).reduce((p, k) => p || wrapMode === data.WRAP_MODES[k], false), `Invalid wrapMode.`, wrapMode);
    debug.ASSERT(Object.keys(data.FORMATS).reduce((p, k) => p || format === data.FORMATS[k], false), `Invalid format.`, format);
    debug.ASSERT(Object.keys(data.TYPES).reduce((p, k) => p || type === data.TYPES[k], false), `Invalid type.`, type);
    debug.ASSERT(Object.keys(data.TARGETS).reduce((p, k) => p || target === data.TARGETS[k], false), `Invalid type.`, target);
    debug.ASSERT(typeof mipmap === 'boolean', `Invalid mipmap value.`, mipmap);
    debug.ASSERT(typeof premultiplyAlpha === 'boolean', `Invalid premultiplyAlpha value.`, premultiplyAlpha);

    // Ensure some types match for buffers.
    if (resource.data && resource.data.buffer instanceof ArrayBuffer)
    {
        const w2 = data.DEVICE_SUPPORT.WEBGL2;
        const depthTex = data.DEVICE_SUPPORT.WEBGL_EXTENSIONS.WEBGL_depth_texture;
        const texFloat = data.DEVICE_SUPPORT.WEBGL_EXTENSIONS.WEBGL_depth_texture;
        const texHalfFloat = data.DEVICE_SUPPORT.WEBGL_EXTENSIONS.OES_texture_half_float;

        // validate the length of the array view matches the format expectation
        switch (format)
        {
            case data.FORMATS.RGBA:
                debug.ASSERT(resource.data.length % 4 === 0, 'The RGBA format requires 4 components per pixel.');
                break;

            case data.FORMATS.RGB:
                debug.ASSERT(resource.data.length % 3 === 0, 'The RGB format requires 3 components per pixel.');
                break;

            case data.FORMATS.LUMINANCE_ALPHA:
                debug.ASSERT(resource.data.length % 2 === 0, 'The LUMINANCE_ALPHA format requires 2 components per pixel.');
                break;

            case data.FORMATS.DEPTH_COMPONENT:
            case data.FORMATS.DEPTH_STENCIL:
                debug.ASSERT(w2 || depthTex, 'The DEPTH_COMPONENT and DEPTH_STENCIL formats require either WebGL2 or the WEBGL_depth_texture extension.');
                break;

            // ALPHA, LUMINANCE, DEPTH_COMPONENT, and DEPTH_STENCIL are 1 byte per pixel so no need to check size.
        }

        // validate the correct type/array view combo:
        switch (type)
        {
            // WebGL 1
            case data.TYPES.UNSIGNED_BYTE:
                debug.ASSERT(resource.data instanceof Uint8Array, 'The UNSIGNED_BYTE type requires using an Uint8Array.');
                break;
            case data.TYPES.UNSIGNED_SHORT_5_6_5:
                debug.ASSERT(resource.data instanceof Uint16Array, 'The UNSIGNED_SHORT_5_6_5 type requires using an Uint16Array.');
                break;
            case data.TYPES.UNSIGNED_SHORT_4_4_4_4:
                debug.ASSERT(resource.data instanceof Uint16Array, 'The UNSIGNED_SHORT_4_4_4_4 type requires using an Uint16Array.');
                break;
            case data.TYPES.UNSIGNED_SHORT_5_5_5_1:
                debug.ASSERT(resource.data instanceof Uint16Array, 'The UNSIGNED_SHORT_4_4_4_4 type requires using an Uint16Array.');
                break;

            // WEBGL_depth_texture (and WebGL 2)
            case data.TYPES.UNSIGNED_SHORT:
                debug.ASSERT((w2 || depthTex) && resource.data instanceof Uint16Array, 'The UNSIGNED_SHORT type requires using an Uint16Array, and WebGL2 or WEBGL_depth_texture.');
                break;
            case data.TYPES.UNSIGNED_INT:
                debug.ASSERT((w2 || depthTex) && resource.data instanceof Uint32Array, 'The UNSIGNED_INT_5_9_9_9_REV type requires using an Uint32Array, and WebGL2 or WEBGL_depth_texture.');
                break;
            case data.TYPES.UNSIGNED_INT_24_8:
                debug.ASSERT((w2 || depthTex) && resource.data instanceof Uint32Array, 'The UNSIGNED_INT_5_9_9_9_REV type requires using an Uint32Array, and WebGL2 or WEBGL_depth_texture.');
                break;

            // OES_texture_float (and WebGL 2)
            case data.TYPES.FLOAT:
                debug.ASSERT((w2 || texFloat) && resource.data instanceof Float32Array, 'The FLOAT type requires using an Float32Array, and WebGL2 or OES_texture_float.');
                break;

            // OES_texture_half_float
            case data.TYPES.HALF_FLOAT_OES:
                debug.ASSERT(texHalfFloat && (resource.data instanceof Uint16Array || resource.data instanceof Int16Array), 'The HALF_FLOAT_OES type requires using an Uint16Array or Int16Array, and OES_texture_half_float.');
                break;

            // WebGL 2
            case data.TYPES.BYTE:
                debug.ASSERT(w2 && resource.data instanceof Int8Array, 'The BYTE type requires using an Int8Array, and WebGL2.');
                break;
            case data.TYPES.SHORT:
                debug.ASSERT(w2 && resource.data instanceof Int16Array, 'The SHORT type requires using an Int16Array, and WebGL2.');
                break;
            case data.TYPES.INT:
                debug.ASSERT(w2 && resource.data instanceof Int32Array, 'The INT type requires using an Int32Array, and WebGL2.');
                break;
            case data.TYPES.HALF_FLOAT:
                debug.ASSERT(w2 && (resource.data instanceof Uint16Array || resource.data instanceof Int16Array), 'The HALF_FLOAT type requires using a Uint16Array or Int16Array, and WebGL2.');
                break;
            case data.TYPES.UNSIGNED_INT_2_10_10_10_REV:
                debug.ASSERT(w2 && resource.data instanceof Uint32Array, 'The UNSIGNED_INT_2_10_10_10_REV type requires using an Uint32Array, and WebGL2.');
                break;
            case data.TYPES.UNSIGNED_INT_10F_11F_11F_REV:
                debug.ASSERT(w2 && resource.data instanceof Uint32Array, 'The UNSIGNED_INT_10F_11F_11F_REV type requires using an Uint32Array, and WebGL2.');
                break;
            case data.TYPES.UNSIGNED_INT_5_9_9_9_REV:
                debug.ASSERT(w2 && resource.data instanceof Uint32Array, 'The UNSIGNED_INT_5_9_9_9_REV type requires using an Uint32Array, and WebGL2.');
                break;
            case data.TYPES.FLOAT_32_UNSIGNED_INT_24_8_REV:
                debug.ASSERT(w2 && resource.data instanceof Float32Array, 'The FLOAT_32_UNSIGNED_INT_24_8_REV type requires using an Float32Array, and WebGL2.');
                break;
        }
    }
    /* eslint-enable max-len */
}
// @endif