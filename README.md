# BlueInk Embed JS Library

A Javascript library to create embedded signing sessions with the BlueInk API.

## Installation

From NPM:
```bash
npm install @blueink360/blueink-embed-js
```

Or if you prefer yarn:
```bash
yarn add @blueink360/blueink-embed-js
```

From CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@blueink360/blueink-embed-js/dist/blueink-embed.min.js"></script>
```

If including this library directly with a script tag, the `BlueInkEmbed`
class will be added to the global namespace.


## Usage

To use the library, you will need a public API key from you BlueInk account.
If you do not have a BlueInk account, you can 
[create one here](https://blueink.com/esignature-api/). You can send
unlimited test Bundles for free, while developing your eSignature integration.

### Quickstart
 
```javascript
import BlueInkEmbed from 'blueink-embed-js';
const embedUrl = 'EMBED-URL-RETURNED-BY-THE-SERVER';
const embed = new BlueInkEmbed('YOUR-PUBLIC-API-KEY');

// Mount the embedded signing iFrame in a div with ID 'iframe-container'
embed.mount(embedUrl, '#iframe-container');

// Optionally, unmount the signing iFrame when done
embed.unmount();
```

### Fuller Example, with Error and Event Handling

This example shows fetching the embedUrl from the server via 
[axios](https://github.com/axios/axios), and handling errors.

```javascript
import BlueInkEmbed from 'blueink-embed-js';

const exampleRequestData = {
    signerName: 'Frank Ricard',
    signerEmail: 'frank@example.com'
};

// This assumes that your server-side App can receive requests
// at /get-embed-url and will create a new Bundle and return
// an embedded signing URL. See the BlueInk API docs for examples.

axios.post('/get-embed-url', exampleRequestData, fd)
    .then(response => {
        try {
            const embedUrl = response.data.embedUrl;
            const embed = new BlueInkEmbed('YOUR-BLUEINK-PUBLIC-API-KEY');
            
            // Setup event listeners to respond to events emitted
            // by the embedded signing iFrame
            embed.on(BlueInkEmbed.EVENT.COMPLETE, () => {
                console.log('signing complete!');
            });

            embed.on(BlueInkEmbed.EVENT.ERROR, (eventData) => {
                console.log('Signing error occurred.');
                console.log(eventData.message);
            });

            embed.mount(embedUrl, '#iframe-container');
        } catch(error) {
            // An error could be thrown if the public API key is invalid, 
            // or if no element was found with id 'iframe-container' 
            console.log(error.message);
        }
    })
    .catch(error => {
        // This catch block would handle if the /get-embed-url
        // request returned a 5XX or 4XX error.
        const message = error.response.data.error || error.message;
        console.log(message);
    });
``` 

### More Resources

* [BlueInkEmbed class and methods](https://blueinkhq.github.io/blueink-embed-js/BlueInkEmbed.html)
* [Events emitted by the BlueInkEmbed instance](https://blueinkhq.github.io/blueink-embed-js/global.html#EVENT)
* [BlueInk API Documentation](https://blueink.com/esignature-api/api-docs/)

## Getting Help / Contributing

If you have a BlueInk Account and need help integrating this library into 
your API project, please contact our support team from your BlueInk
account dashboard.

If you find issues in this codebase, or have any suggestions for improvement 
please create an issue here on github.

We welcome contributions and will consider any pull requests. 

If you are making modifications to the library, or running the project,
locally the following commands should come in handy. We use yarn internally,
but all of the commands below should work with there `npm` equivalents. 

```bash
# Run the tests
$ yarn test
$ yarn test:coverage

# Build a production, minified version of the library
$ yarn run build

# Build a development, unminified version of the library
$ yarn run build:dev

# Run webpack-dev-server, so that the library will be accessible
# at http://localhost:8080/blueink-embed.js
$ yarn run devserver
 
# Build the docs
$ yarn run build:docs
```


## License

MIT