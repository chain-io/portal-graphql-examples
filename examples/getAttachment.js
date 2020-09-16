/**
 * This example retrieves the content of the first file attached to a flow execution.  
 * 
 * To have it retrieve all files change line 94 to a loop
 *
 **/
const got = require("got")

// SET THESE VALUES TO WHAT CAME IN FROM A CHAIN.IO WEBHOOK
const webhookContent = {
  organization_uuid: "orguuid123-456",
  partner_uuid: "partneruuid123-456",
  invocation_uuid: "invocationuud123-456"
}

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const URL = "https://portal-api.chain.io"


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

const GRAPH_QUERY = `query files($companyUUID:ID!,$partnerUUID:ID!,$invocationUUID:ID!) {
  company(company_uuid:$companyUUID) {
    company_uuid
    company_name
    tradingPartners(partner_uuid:$partnerUUID) {
      flowExecution(invocation_uuid:$invocationUUID) {
        files {
          file_name
          file_key
          created_time
				}
			}
    }
  }
}`
async function getFileList(accessToken, companyUUID, partnerUUID, invocationUUID) {
  const variables = {
    companyUUID,
    partnerUUID,
    invocationUUID
  }
  const response = await got(`${URL}/graphql`, {
    method: 'POST',
    body: JSON.stringify({
      query: GRAPH_QUERY,
      variables
    }),
    responseType: 'json',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'content-type': 'application/json'
    }
  })
  return response.body
}

function getFileLinks(companyUUID, graphResponse) {
  const files = graphResponse.data.company.tradingPartners[0].flowExecution.files
  return files.map(f => `${URL}/file/${companyUUID}/${f.file_key}`)
}

async function getFile(accessToken, link) {
  const response = await got(link, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    responseType: 'json'
  })
  const downloaded = await got(response.body.downloadUrl)
  return downloaded.body
}

async function run(companyUUID, partnerUUID, invocationUUID) {
  const accessToken = await getAccessToken()
  const graphqlResult = await getFileList(accessToken, companyUUID, partnerUUID, invocationUUID)
  const fileLinks = getFileLinks(companyUUID, graphqlResult)
  if (fileLinks.length === 0) return null
  const firstFileBody = await getFile(accessToken, fileLinks[0])
  return firstFileBody
}


run(webhookContent.organization_uuid, webhookContent.partner_uuid, webhookContent.invocation_uuid)
.then(console.log)
.catch(console.error)
