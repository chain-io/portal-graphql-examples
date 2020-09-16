# Chain.io Portal GraphQL API Examples

This site has code examples for accessing the Chain.io portal API.  

This is the API you would use to perform administrative functions for Chain.io including things like

* [Retrieving data files](./examples/getAttachment.js)
* Checking the status of a flow execution
* Managing user accounts

All of the examples assume that you pass your Chain.io API Keys `CLIENT_ID` and `CLIENT_SECRET` in to your process as an environment variable like:

`CLIENT_ID=ABC CLIENT_SECRET=secretpass node ./examples/getAttachment.js`

The only dependency for these examples is the [Got](https://github.com/sindresorhus/got) library for HTTP requests.  You can substitute any HTTP library with minor adjustments to the code.
