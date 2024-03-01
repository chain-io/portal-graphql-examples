# Chain.io Portal GraphQL API Examples

This site has code examples for accessing the Chain.io portal API.  

This is the API you would use to perform administrative functions for Chain.io including things like

* [Retrieving data files](./examples/getAttachment.js)
* [Adding new users](./examples/addUser.js)
* [Resubmitting flows based on search parameters](./examples/resubmitFlowsBasedOnSearch.js)

All of the examples assume that you pass your Chain.io API Keys `CLIENT_ID` and `CLIENT_SECRET` in to your process as an environment variable like:

`CLIENT_ID=ABC CLIENT_SECRET=secretpass node ./examples/getAttachment.js`

The only dependency for these examples is the [Got](https://github.com/sindresorhus/got) library for HTTP requests.  You can substitute any HTTP library with minor adjustments to the code.

## Getting and using an API Key

To request an api key, email support@chain.io and include the email address of an existing Chain.io user as well as a link to the company page for the company you'd like access to.

For more information on accessing the API, see this [help article](https://support.chain.io/hc/en-us/articles/360053497734-Using-the-Chain-io-Portal-GraphQL-API)

To explore the API visit https://portal.chain.io/graphql (You must log into the Chain.io portal to access this page).
