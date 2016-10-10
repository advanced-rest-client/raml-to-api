# raml-to-api client library
A library that supports RAML to API specification.
It reads a RAML file and creates javascript interface to interact with the API  without using any additional libraries.

### TL;DR
Short paragraph of the big idea. Currently API provider has to create an SDK library to be used oon a web page and programers need to use them in order to use the API without making raw requests to the endpoints. I believe that it's wrong approach. When you use couple of different API providers on your website you will end up with downloading megabites of libraties and you'll drown in different SDK's libraries structures. This project is an idea of how to end this nonsense. It creates an unified interface to interact with different APIs based on [RAML] specification.

## Registering an API (required!)
Include this library into your project.

```html
<script src="path/to/raml-to-api-client.js"></script>
```

The library scans for the `<link>` tag in the head of the page with `rel` attribute
set to `alternate` and `type` set to `application/raml`:

```html
<link href="/path/to/api.raml" rel="alternate" type="application/raml" title="api-name"/>
```
This way the website tells the library that it's using an API defined in the `${currentDomain}/path/to/api.raml` file.
The API file doesn't need to be in the same domain. It also doesn't need to be owned by the website author. It is just a source file of (any) API definition that will be registered in the browser.


## `navigator.requestApiProvider()`
The library exposes a function `navigator.requestApiProvider()` that will return a promise with a handler to the API defined for the given name. The name passed as an argument has to be the same as defined in `<link>`'s title attribute.

#### Example
```javascript
navigator.requestApiProvider('api-name').then((api) => {
  // use API.
}).catch((e) => {
  // Registration of the API wasn't possible. Consider including API's SDK libraries.
});
```

## Using the API
The promise returned by the `navigator.requestApiProvider()` result with an API object representing a structure of endpoints and methods available in the API.

While endpoint is an object, methods are represented as functions that can be called to perform an API request.

Consider following example:
```yaml
#%RAML 1.0
title: GitHub API
version: v3
baseUri: https://api.github.com
mediaType:  application/json
/search:
  /code:
    get:
```
It says that the GitHub API has one endpoint `/search` and it has one sub-endpoint `/code` with one method `GET`. To call `GET /search/code` you'd use the following code:

```javascript
// github name is registered in the <link> element
navigator.requestApiProvider('github').then((api) => {
  api.search.code.get().then((results) => {});
}).catch((e) => {
  // Registration of the API wasn't possible. Consider including API's SDK libraries.
});
```
### Query parameters
But the real API for search in GitHub is quite different. Real [RAML] structure would be:

```yaml
#%RAML 1.0
title: GitHub API
version: v3
baseUri: https://api.github.com
mediaType:  application/json
/search:
  /code:
    get:
      description: Query the code base.
      queryParameters:
        q:
          type: String
          description: The search terms.
          required: true
        sort:
          type: String
          description: The sort field.
        order:
          type: String
          description: The sort order if sort parameter is provided.
```

The same endpoint but this time it requires to provide a `q` parameter and optionally `sort` and `order` parameters.
If the endpoint can accept parameter(s) the method function will accept an argument. It will read a `queryParameters` property of this object and set it to the API call.

```javascript
let params = {
  queryParameters: {
    q: 'addClass in:file language:js repo:jquery/jquery'
  }
};
api.search.code.get(params).then((results) => {});
```  

Note that the library will encode query parameters before sending the request. So the final URL of this call will be:
`https://api.github.com/search/code?q=addClass+in:file+language:js+repo:jquery/jquery
`.

### Named URI parameters
In GitHub API to get the gist you have to call `GET /gists/:id` endpoint. [RAML]'s equivalent is:
```yaml
/gists:
  /{gistId}:
    get:
```
In this case to enter a path with named parameters the library will register a function on an endpoint with the same name as the parameter:

```javascript
api.gists.gistId(1234).get().then((gist) => {}).catch((e) => {});
```

### Payload

Now consider following example:
```yaml
#%RAML 1.0
title: GitHub API
version: v3
baseUri: https://api.github.com
mediaType:  application/json
/gists:
  /{gistId}:
    /comments:
      post:
        body:
          type: object
          properties:
            body:
              type: String
              description: Text of the comment to the gist.
              required: true
```
It will use the same `params` object to initialize the function call but payload is read from the `body` property:

```javascript
let params = {
  body: {
    // Body is required parameter by the API.
    body: 'Just commenting for the sake of commenting'
  }
};
api.gists.gistId(1234).comments.post(body).then((results) => {});
```

Naturally `queryParameters` and `body` can be used at the same time if API allows this:
```javascript
let params = {
  body: {
    body: 'Just commenting for the sake of commenting'
  },
  queryParameters: {
    q: 'addClass in:file language:js repo:jquery/jquery'
  }
};
```

### Required, optional and undefined parametres
#### Required parameters
If the API requires a parameter (either in body, URI or queryParameter) it must be specified in the API call or else it will never going to be executed and the promise will reject with the error details:

```json
{
  "message": "Missing required parameter: param-name[, paramN]",
  "domain": "missing-required-parameter",
  "parameters": ["param-name", "paramN"]
}
```
#### Optional parameters
They can be provided in the request but the API provider will not reject the call if they are not present in the request. Basically nothing happens.

#### Undefined parameters
If a parameter that is not defined in the [RAML] source file has been passed to the request (either to the payload or `queryParameters`) then the API provider **will use them in the request**. However a warning will be printed to the console informing that the undefined property has been set.
API provider can't be sure how's the API react on this parameters and the request may be rejected. So if you planing to set parameters that aren't defined in the API spec file then always do error checking.

## Authentication
The library will provide an interface to authenticate the user in the API according to [RAML]'s definition.

```javascript
api.auth.authorize(optType, optOptions);
```
Depending on a [RAML] definition this function accpet different set of arguments (described below).

If the API allows only one type of authorization (e.g. `oauth-2-0`) then `optType` is not required and can be replaced by the `optOptions` parameter (if any options are allowed). To debug which auth interfaces are available you can check an `api.auth.types` array to get the list of available auth types:
```javascript
console.log(api.auth.types);
// ["oauth-2-0", "oauth-1-0", "basic"]
```
This property will always return an array even if none of auth types is defined.
Names in the list are `securityScheme`'s defined keys and can vary. You can use it to access auth configuration (which is read only):
```javascript
console.log(api.auth['oauth-2-0']);
// {
//   "description": "Auth description",
//   "type": "OAuth 2.0",
//   "settings": { See RAML spec }
//   "describedBy": { See RAML spec }
// }
```

If the API defines more than one `securityScheme` and the `optType` is not set or is not a string then it will use first available type to authorize the user. But you can always pass the type key (one of `api.auth.types` array elements) to select a specific type.

### OAuth 2.0
Don't requires any parameters. Optional parameter is `scope` where the API defined scope can be overrated. It will open new window/tab with defined endpoint.
```javascript
api.auth.authorize({
  'scope': ['shuttle', 'cargo-bay-1']
});
```

### Basic Authentication
Requires the `user` and `passwd` properties passed to the `optOptions` object:
```javascript
api.auth.authorize({
  'user': 'jim',
  'passwd': 'kirk'
});
```

### Other standard types
Don't requires any parameters. The browser will handle login/password queries if needed.

### Non-standard types
If RAML file defines a non standard authentication scheme it will require to set parameters that are defined in the `describedBy` section of the [RAML] file.
See the example [RAML] file: https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md/#x-other

In this case you can set `SpecialToken` parameter by calling:
```javascript
api.auth.setParams('x-name-of-the-type',{
  'SpecialToken': 'I am a doctor, not an OAuth server.'
});
```
This function accepts two arguments. First is the name of the configuration and second is the name of the property to set. The library will determine if it should be set in `headers` or `queryParameters` section.

### `api.auth.clear()`
The function will clear any data set to the auth object like generated OAuth tokens, passed login and passowrd or other tokens. It resets the state of the auth object.

## Global values
You can set a default value for given properties. The value of set object will be inserted if the value for the same property is not set during the method call. It is helpful when the API defines a special header or a query string that must be included when making a request do different endpoints.
The header will be inserted only if the method accepts given parameter.

### Global headers
`api.globals.headers = headersObj` Set this property with the map of headers to set global headers.

```javascript
api.globals.headers = {
  'x-ship-id': 'NCC-1701'
};
console.log(api.globals.headers);
// {'x-ship-id': 'NCC-1701'}
```
The value of this header will be used in all methods that accept this header.

### Global `queryParameters`
Same as above but it set the value for query parameters. Setter to call is `api.globals.queryParameters = parametersObject`.

## Types
The library includes information about types (object, resources) used by the API endpoinds if they are defined in the [RAML] file. If gives a convinient way of generating an empty (values) object for given method by calling `createType()` on a method object. This function is attached to every method function that accepts a type. So in the gits comments example:

```yaml
#%RAML 1.0
title: GitHub API
version: v3
baseUri: https://api.github.com
mediaType:  application/json
/gists:
  /{gistId}:
    /comments:
      description: List of comments in the Gist.
      post:
        description: Create a comment to the Gist.
        body:
          type: object
          properties:
            body:
              type: String
              description: Text of the comment to the gist.
              required: true
```
you can call `api.gists.gistId(1234).comments.post.getType()` to generate following object:
```
{
  'body': ''
}
```
When you make a request with payload the library **will not check for type specification errors**. You are free to use **any** type of paylod but if it's not a structure defined by the API you should check the response for errors.

## Console documentation
Finally the API structure is nothing without the documentation. Most of objects will have a `docs` property with a value defined in the source [RAML] file. You can just print it in a console to see object's documentation.

From the gist example above, calling the code below till print the documentation.
```javascript
api.gists.gistId(1234).comments.docs
// List of comments in the Gist.
api.gists.gistId(1234).comments.post.docs
// Create a comment to the Gist.
// Comment resource:
// Object: {
//   "body" {String} - Text of the comment to the gist. Required.
// }
```

If the api (meaning [RAML]) has a `documentation` node it can be accessed via:
```javascript
api.docs
```
Then it print a table with the documentation pages.

[RAML]: https://github.com/raml-org/raml-spec/blob/master/versions/raml-10/raml-10.md
