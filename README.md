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
<script src="https://cdnjs.cloudflare.com/ajax/libs/@blueink360/blueink-embed-js/1.0.1/blueink-embed.min.js" />
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

### Fuller Example, with error Handling

This example shows fetching the embedUrl from the server via 
[axios](https://github.com/axios/axios), and handling errors.

```javascript
import BlueInkEmbed from 'blueink-embed-js';

const exampleRequsetData = {
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

See additional documentation for options you can pass when
calling `mount()` here. 

## License

MIT