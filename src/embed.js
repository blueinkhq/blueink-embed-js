import EventEmitter from "eventemitter3";
import isPlainObject from 'lodash.isplainobject';
import pick from 'lodash.pick';
import qs from 'qs';

export const PUBLIC_API_KEY_PARAM = 'publicAPIKey';
export const IFRAME_CLASSNAME = 'blueink-sig-iframe';

/**
 * Event types that can be emitted by BlueInkEmbed. These can be accessed
 * as a static variable on the BlueInkEmbed class, like EVENT.COMPLETE, etc.
 * @example
 *  embed = new BlueInkEmbed(myPublicAPIKey);
 *  embed.on(EVENT.COMPLETE, () => {
 *   console.log('signing complete!'))
 *  });
 * @example
 *  embed = new BlueInkEmbed(myPublicAPIKey);
 *  embed.on(EVENT.ERROR, (eventData) => {
 *   console.log('Signing error occurred.'))
 *   console.log('.'))
 *  });
 * @type {{
 *  LOAD: string,
 *  READY: string,
 *  COMPLETE: string,
 *  AUTH_FAIL: string,
 *  ERROR: string,
 *  TOUCH: string,
 *  AUTH_SUCCESS: string
 * }}s
 */
export const EVENT = {
    /** Any event occurred. Use this if you want to listen for all events with a single callback.s */
    ANY: 'any',
    /** The initial load of the iFrame content is complete. Note, the documents may not yet be ready to sign. */
    LOAD: 'load',
    /** The documents are ready to sign */
    READY: 'ready',
    /** The signing is complete */
    COMPLETE: 'complete',
    /** Signer authentication failed */
    AUTH_FAIL: 'auth_fail',
    /** Signer authentication succeeded. Note, this event is still fired if no authentication options were selected  */
    AUTH_SUCCESS: 'auth_success',
    /** An error that prevents embedded signing from continuing */
    ERROR: 'error',
};

const MIN_PUBLIC_API_KEY_LENGTH = 71;
const PUBLIC_API_KEY_PREFIX = 'public_';
const ALLOWED_MOUNT_OPTIONS = [
    'debug',
    'isTest',
    'locale',
    'redirectURL',
];

/**
 * Custom Error class thrown for some errors in BlueInkEmbed
 */
export class BlueInkEmbedError extends Error {
    /**
     * Create a BlueInkEmbedError
     * @param {string} message - a message providing additional details about the error
     */
    constructor(message) {
        super(message);
        this.name = 'BlueInkEmbedError';
    }
}

/**
 * Class that helps create and manage embedded signing iFrames powered by BlueInk eSignatures.
 * @extends EventEmitter
 */
class BlueInkEmbed extends EventEmitter {
    static _mounted = false;
    _containerEl = null;
    _debugMode = false;
    _iFrameEl = null;
    _iFrameOrigin = null;
    _publicAPIKey = null;

    static EVENT = EVENT;
    static Error = BlueInkEmbedError;

    /**
     * Create a new BlueInkEmbed object
     * @param {string} publicAPIKey - the public API key for your BlueInk API App. This can be obtained
     *  by logging into your BlueInk Dashboard, or via the BlueInk API v2 at /apps/ or /apps/<app_id>/
     */
    constructor(publicAPIKey) {
        super();

        if (!publicAPIKey) {
            throw new TypeError('publicAPIKey must be provided.')
        }

        if (publicAPIKey.length < MIN_PUBLIC_API_KEY_LENGTH) {
            throw new TypeError(
                'publicAPIKey is too short. Please verify you are using a valid BlueInk public API key.'
            );
        }

        if (!publicAPIKey.startsWith(PUBLIC_API_KEY_PREFIX)) {
            throw new TypeError(
                'publicAPIKey is invalid. Please verify you are using a valid BlueInk public API key.'
            )
        }

        this._publicAPIKey = publicAPIKey;
    }

    // Document the methods from the EventEmitter

    /** @method on
     * Register a listener for events that occur in the embedded iFrame
     * @param {string} eventType - One of the EVENT constants, e.g. EVENT.COMPLETE, EVENT.READY, etc.
     * @param {BlueInkEmbed~eventCallback} callback - The callback function that will be invoked when the event occurs.
     */

    /** @method off
     * Remove a previously registered event listener
     * @param {string} eventType - One of the EVENT constants, e.g. EVENT.COMPLETE, EVENT.READY, etc.
     * @param {BlueInkEmbed~eventCallback} callback - The callback function to remove
     */

    /** @method once
     * Register a listener for a single occurrence of an event
     * @param {string} eventType - One of the EVENT constants, e.g. EVENT.COMPLETE, EVENT.READY, etc.
     * @param {BlueInkEmbed~eventCallback} callback - The callback function that will be invokeds
     */

    /**
     *
     * @param {string} container - the css selector of the container into which the embedded signing iFrame
     *  will be injected
     * @param {string} embeddedSigningURL - the embedded signing URL, as returned by an API call to
     *  /packets/<packet_id>/embed_url/
     * @param {object} options - optional arguments
     * @param {boolean} options.debug - if true, additional information will be printed to the console
     *  and displayed in the iFrame (if there is an error)
     * @param {boolean} options.isTest - set to true when testing in a development environment (or locally), to
     *  turn off verification of the referring domain. This is only valid for embedded signing of test Bundles
     *  (which were created with is_test set to true)
     * @param {string} options.locale - set the initial language / locale for the embedded signature iFrame
     * @param {string} options.redirectURL - If provided, the parent page (not the iFrame) will be redirected
     *   to this URL upon successful completion of a signing
     * @throws {BlueInkEmbedError} - when (1) there is already a mounted BlueInkEmbed iFrame instance,
     *  (2) the container element does not exist, or (3) the container selector corresponds to more than one element.
     */
    mount(embeddedSigningURL, container = 'body', options = {}) {
        if (BlueInkEmbed._mounted) {
            throw new BlueInkEmbedError('Cannot mount multiple iFrames at once')
        }

        let cleanOptions;

        // allow container to be omitted
        if (isPlainObject(container)) {
            cleanOptions = pick(container, ALLOWED_MOUNT_OPTIONS);
            container = 'body';
        } else {
            cleanOptions = pick(options, ALLOWED_MOUNT_OPTIONS);
        }

        const containerNodes = document.querySelectorAll(container);

        if (containerNodes.length > 1) {
            throw new BlueInkEmbedError(`More than one element found matching container selector "${container}"`);
        }

        if (containerNodes.length === 0) {
            throw new BlueInkEmbedError(`Cannot find element matching container selector "${container}"`);
        }

        this._debugMode = Boolean(cleanOptions.debug);
        this._containerEl = containerNodes[0];
        this._iFrameOrigin = this._extractOrigin(embeddedSigningURL);

        const processedURL = this._buildFinalURL(embeddedSigningURL, cleanOptions);
        this._iFrameEl = this._createIframe(processedURL, IFRAME_CLASSNAME);
        this._containerEl.appendChild(this._iFrameEl);
        this.registerMessageListener();
        BlueInkEmbed._mounted = true;

        // FIXME - sanity checks on size of container element, after rendering
    }

    /**
     * Remove the BlueInk eSignature iFrame. If there is no iFrame (ie, mount(...) was not
     * called previously), this is a noop.
     */
    unmount() {
        if (this._iFrameEl) {
            this._iFrameEl.parentNode.removeChild(this._iFrameEl);
            this._iFrameEl = null;
            this._iFrameOrigin = null;
            this._containerEl = null;
            this._debugMode = false;
            this.removeMessageListener()
        }
        BlueInkEmbed._mounted = false;
    }

    registerMessageListener() {
        window.addEventListener('message', this._receiveMessage, false);
    }

    removeMessageListener() {
        window.removeEventListener('message', this._receiveMessage, false);
    }

    /**
     *
     * @returns {Element|null} The DOM Element, or null if no embedded signing iFrame currently exists.
     */
    get iFrameEl() {
        return this._iFrameEl;
    }

    _debug(...args) {
        if (this._debugMode) {
            console.debug(...args);
        }
    }
    /**
     * Receive a message from the embedded iFrame and emit an event
     * @param {object} event - an event as dispatched from window.postMessage()
     * @private
     */
    _receiveMessage = (event) => {
        if (event.origin !== this._iFrameOrigin) {
            return;
        }

        if (this._iFrameEl && (event.source !== this._iFrameEl.contentWindow)) {
            this._debug('Received message with correct origin but wrong source. Silently dropping.', event.data);
            return;
        }

        const eventType = event.data && event.data.eventType;

        if (!eventType) {
            this._debug('Received message with no eventType. Silently dropping.');
            return;
        }

        if (!Object.values(EVENT).includes(eventType)) {
            this._debug(`Received message with unknown eventType "${eventType}". Silently dropping.`);
            return;
        }

        this.emit(eventType, event.data);
        this.emit(EVENT.ANY, eventType, event.data);
    };

    /**
     * Create a URL suitable to be used as the embedded iFrame src, by querystring parameters
     * @param {string} embeddedSigningURL - the embedded signing URL, as returned by a BlueInk
     *  API v2 call to /packet/<packet_id>/embed_url/
     * @param {object} options - options, as passed into mount()
     * @returns {string} a URL with querystring parameters which can be used as the src of the embedded iFrame
     * @private
     */
    _buildFinalURL(embeddedSigningURL, options) {
        const optionsWithKey = {
            [PUBLIC_API_KEY_PARAM]: this._publicAPIKey,
            ...options,
        };

        return `${embeddedSigningURL}?${qs.stringify(optionsWithKey)}`;
    }

    /**
     * Create an iFrame Element
     * @param {string} url - the url to be used as the src attribute of the iFrame
     * @param {string} className - a className (or space separated list of classNames) to be used as the className
     *  attribute of the iFrame. Defaults to IFRAME_CLASSNAME if not provided.
     * @returns {HTMLIFrameElement} the (unattached) iFrame element
     * @private
     */
    _createIframe(url, className = IFRAME_CLASSNAME) {
        const iFrame = document.createElement('iframe');
        const origin = this._extractOrigin(url);

        iFrame.className = className;
        iFrame.src = url;
        iFrame.allow = `camera ${origin}; geolocation ${origin}`;

        return iFrame;
    }

    /**
     * Extract a URL origin, suitable for filtering incoming messages sent by window.postMessage
     * to those sent from our embedded iFrame.
     * @param embeddedSigningURL - the original embedded signing URL
     * @returns {string} The origin part of the URL (consisting of protocol, host name and port,
     *  which might be implicit)
     * @private
     */
    _extractOrigin(embeddedSigningURL) {
        const url = new URL(embeddedSigningURL);
        return url.origin;
    }

}

/**
 * An event payload for an error event
 * @typedef {Object} EventErrorData
 * @property {string} message - A description of the error that occurred.
 */

/**
 * An event payload for an error event
 * @typedef {Object} EventAnyData
 * @property {string} eventType - The type of the event. One of EVENT.COMPLETE, EVENT.READY, etc.
 * @property {EventErrorData|null} eventData - Additional data for the event, or null.
 */

/**
 * A callback function that will be invoked with event data.
 * @callback BlueInkEmbed~eventCallback
 * @param {EventAnyData|EventErrorData|null} eventData - depending on the event type
 */

export default BlueInkEmbed;