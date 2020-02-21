import BlueInkEmbed, {BlueInkEmbedError, IFRAME_CLASSNAME, PUBLIC_API_KEY_PARAM} from "./embed";

const FAKE_PUBLIC_API_KEY = 'public_abcd1234567890abcd1234567890abcd123';
const FAKE_EMBED_URL = 'https://secure.blueink.com/embed/abcd1234/abcd1234yVhL3bALas9UJSLINMc9F1zeBJw';


describe('BlueInkEmbed helper methods', () => {
    let embed;

    beforeEach(() => {
        embed = new BlueInkEmbed(FAKE_PUBLIC_API_KEY);
    });

    test('_buildFinalURL', () => {
        // All returned URLs should start with the embedded signing URL
        // with the public API key as a querystring parameter
        const expectedBaseURL = `${FAKE_EMBED_URL}?${PUBLIC_API_KEY_PARAM}=${FAKE_PUBLIC_API_KEY}`;

        expect(embed._buildFinalURL(FAKE_EMBED_URL, {})).toEqual(expectedBaseURL);

        expect(embed._buildFinalURL(FAKE_EMBED_URL, {
            redirectURL: 'https://example.com'
        })).toEqual(`${expectedBaseURL}&redirectURL=https%3A%2F%2Fexample.com`);

        expect(embed._buildFinalURL(FAKE_EMBED_URL, {
            redirectURL: 'https://example.com',
            debug: 1,
            isTest: true,
            locale: 'en',
        })).toEqual(`${expectedBaseURL}&redirectURL=https%3A%2F%2Fexample.com&debug=1&isTest=true&locale=en`);
    });

    test('_createIframe', () => {
        const iFrameEl = embed._createIframe('https://example.com/');

        expect(iFrameEl.tagName).toEqual('IFRAME');
        expect(iFrameEl.src).toEqual('https://example.com/');
        expect(iFrameEl.className).toEqual(IFRAME_CLASSNAME);
        expect(iFrameEl.allow).toEqual('camera https://example.com; geolocation https://example.com');
    })

    test('_extractOrigin', () => {
        expect(embed._extractOrigin(FAKE_EMBED_URL)).toEqual('https://secure.blueink.com')
    })
});


describe('BlueInkEmbed mount and unmount', () => {
    let embed;
    beforeEach( () => {
        embed = new BlueInkEmbed(FAKE_PUBLIC_API_KEY);
    });

    afterEach(() => {
        // Clean up for the next step, since BlueInkEmbed has a static member
        // tracking any open embeds. If embed is not mounted, this is a noop;
        embed.unmount();
    });

    test('mount then unmount', () => {
        document.body.innerHTML = '<div id="iframe-container"></div>';

        embed.mount(FAKE_EMBED_URL, '#iframe-container');

        const iFrameNodes = document.querySelectorAll(`.${IFRAME_CLASSNAME}`);
        expect(iFrameNodes.length).toEqual(1);

        const iFrameEl = iFrameNodes[0];
        expect(iFrameEl.tagName).toEqual('IFRAME');
        expect(iFrameEl.src).toContain(FAKE_EMBED_URL);
        expect(iFrameEl.allow).toContain('geolocation');

        embed.unmount();
        expect(document.querySelectorAll(`.${IFRAME_CLASSNAME}`).length).toEqual(0);
    });

    test('mount with replace then unmount', () => {
        document.body.innerHTML = '<div id="iframe-container"><p>Some</p><p>Text</p></div>';

        const containerEl = document.getElementById('iframe-container');
        expect(containerEl.children.length).toEqual(2);

        embed.mount(FAKE_EMBED_URL, '#iframe-container', { replace: true });

        // Children are replaced with the iFrame
        expect(containerEl.children.length).toEqual(1);
        const iFrameNodes = document.querySelectorAll(`.${IFRAME_CLASSNAME}`);
        expect(iFrameNodes.length).toEqual(1);

        embed.unmount();
        expect(document.querySelectorAll(`.${IFRAME_CLASSNAME}`).length).toEqual(0);
    });

    test('mount with no container selector appends to body', () => {
        embed.mount(FAKE_EMBED_URL);

        const iFrameNodes = document.querySelectorAll(`.${IFRAME_CLASSNAME}`);
        expect(iFrameNodes.length).toEqual(1);

        const iFrameEl = iFrameNodes[0];
        expect(iFrameEl.parentElement.tagName).toEqual('BODY');

        embed.unmount()

        // Verify the 'container' param can be omitted, and options are still handled correctly
        embed.mount(FAKE_EMBED_URL, {debug: true});
        const iFrameElWithOpts = document.getElementsByClassName(IFRAME_CLASSNAME)[0];
        expect(iFrameElWithOpts.src).toContain('debug=true');
    });

    test('mount with options sets iFrame URL', () => {
        document.body.innerHTML = '<div id="iframe-container"></div>';

        embed.mount(FAKE_EMBED_URL, '#iframe-container', {
            debug: true,
            redirectURL: 'https://example.com',
        });

        const iFrameEl = embed.iFrameEl;
        expect(iFrameEl.src).toContain('debug=true');
        expect(iFrameEl.src).toContain('redirectURL=https%3A%2F%2Fexample.com')
    });

    test('mount twice throws BlueInkEmbedError', () => {
        document.body.innerHTML = '<div id="iframe-container"></div>';

        embed.mount(FAKE_EMBED_URL, '#iframe-container');

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '#iframe-container')
        }).toThrow('Cannot mount multiple iFrames');

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '#iframe-container')
        }).toThrow(BlueInkEmbedError);

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '#iframe-container')
        }).toThrow(BlueInkEmbed.Error);
    });

    test('mount into non-existent container throws BlueInkEmbedError', () => {
        document.body.innerHTML = '<div id="iframe-container"></div>';

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '#not-a-valid-id')
        }).toThrow('Cannot find element');

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '#not-a-valid-id')
        }).toThrow(BlueInkEmbedError);
    });

    test('mount with multiple matching container throws BlueInkEmbedError', () => {
        document.body.innerHTML =
            '<div class="repeated-container"></div>' +
            '<div class="repeated-container"></div>'
        ;

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '.repeated-container')
        }).toThrow('More than one element');

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '.repeated-container')
        }).toThrow(BlueInkEmbedError);

        expect(() => {
            embed.mount(FAKE_EMBED_URL, '.repeated-container')
        }).toThrow(BlueInkEmbed.Error);
    });

});

describe('BlueInkEmbed events', () => {
    let embed;
    beforeEach(() => {
        embed = new BlueInkEmbed(FAKE_PUBLIC_API_KEY);
    });

    afterEach(() => {
        // Clean up for the next step, since BlueInkEmbed has a static member
        // tracking any open embeds. If embed is not mounted, this is a noop;
        embed.unmount();
    });

    function postMessageFromFrame(theEmbed, targetWindow, messageData) {
        // The commented out code below could work but, unfortunately, (as of 2019-10-17) jsdom
        // does not set the origin and source of an event when calling postMessage.
        // See: https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/post-message.js#L25
        //
        // This causes our safety checks in BlueInkEmbed._receiveMessage to silently reject the message.
        // As a workaround, we manually call _receiveMessage to fake postMessage the best we can.

        // const messageDataStr = JSON.stringify(messageData);
        // embed.iFrameEl.contentDocument.open();
        // embed.iFrameEl.contentDocument.write(
        //     '<body>' +
        //     `<script>window.parent.postMessage(${}}, '${targetWindow.location.origin}');</script>` +
        //     '</body>'
        // );
        // embed.iFrameEl.contentDocument.close();

        setTimeout(() => {
            theEmbed._receiveMessage({
                data: messageData,
                origin: theEmbed.iFrameEl.contentWindow.location.origin,
                source: theEmbed.iFrameEl.contentWindow,
            })
        });
    }

    test('listeners called when message is received from embedded iFrame', (done) => {
        embed.on(BlueInkEmbed.EVENT.COMPLETE, () => {
            // this will fail if done() is not called
            done();
        });

        document.body.innerHTML = '<div id="iframe-container"></div>';
        embed.mount(FAKE_EMBED_URL, '#iframe-container');

        postMessageFromFrame(embed, window, {eventType: BlueInkEmbed.EVENT.COMPLETE});
    });

    test('ANY listener is called for all message types', (done) => {
        embed.on(BlueInkEmbed.EVENT.ANY, (eventType, eventData) => {
            expect(eventType).toEqual(BlueInkEmbed.EVENT.ERROR);
            expect(eventData.message).toEqual('error occurred');
            done();
        });

        document.body.innerHTML = '<div id="iframe-container"></div>';
        embed.mount(FAKE_EMBED_URL, '#iframe-container');

        postMessageFromFrame(embed, window, {eventType: BlueInkEmbed.EVENT.ERROR, message: 'error occurred'});
    });
});
