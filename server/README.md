# raml-to-api server

### Why this project require server?
Parsing API structure may be a heavy task, especially if the API definition is rather huge and when you are working on a mobile phone where resources are very limited. When the client registers the API it simple ask server for parsed JSON data instead of parsing it on a client side.

Server saves parsed API definition in the storage and will not download and parse it again if it hasn't changed since last download (using standard HTTP methods). However it is not checking for libraries state. If main file hasn't changed and any of referenced libraries has then it will return incorrect version. It should be fixed in a future.

TODO:

- [ ] use memcache to store recent parsed RAML definitions
- [ ] check RAML's dependencies for change
- [ ] implement analytics for endpoint usage
