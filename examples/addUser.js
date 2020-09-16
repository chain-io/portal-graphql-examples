/**
 * Add a new user to your company
 */

const got = require("got")
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const URL = "https://portal-api.chain.io"

const COMPANY_UUID = 'org123'
const EMAIL = 'sampleUser@chain.io'
// valid values are VIEWER, EDITOR, OWNER
// see https://support.chain.io/hc/en-us/articles/360026177653-Managing-Users-Within-A-Company
const PERMISSION = 'VIEWER' 

async function getAccessToken() {
  const response = await got('https://chainio.auth0.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    json: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: URL,
      grant_type: "client_credentials"
    },
    responseType: 'json'
  })
  console.log('response', JSON.stringify(response.body, null, 2))
  return response.body.access_token
}

const GRAPHQL = `mutation addUser($input:AddUser!) {
  addUser(input:$input) {
    company_uuid
  }
}`
async function addUser(accessToken, companyUUID, email, permission) {
  const response = await got(`${URL}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    json: {
      query: GRAPHQL,
      variables: {
          input: {
          company_uuid: companyUUID,
          user_role: permission,
          email
        }
      }
    },
    responseType: 'json'
  })
  if (response.body.errors && response.body.errors.length > 0) {
    throw new Error(JSON.stringify(response.body.errors))
  }
}

async function run(companyUUID, email, permission) {
  const accessToken = await getAccessToken()
  await addUser(accessToken, companyUUID, email, permission)
  return 'success'
}

run(COMPANY_UUID, EMAIL, PERMISSION)
.then(console.log)
.catch(console.error)
