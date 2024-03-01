/**
* This script will resubmit all flows for a given trading partner that match the search criteria.
* It will search for all flows that have a start date between the START_DATE_AFTER and START_DATE_BEFORE
* It will resubmit them in order of start date.
*
* For debugging purposes, it will write out the executions it plans to resubmit to a file called executions.json.
* As it executes, the resubmitted executions are written to a file called resubmitted.json.
* If you have an issue and it crashes, you can use the resubmitted.json file to see which executions were resubmitted
* and then restart the script with a new START_DATE_AFTER to pick up where you left off or read and
* filter out executions in the filterFunction function.
*
*/

const request = require('request')
const _ = require('lodash')
const fs = require('fs')

// Configuration
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

const START_DATE_AFTER = '2024-01-01T00:00:00.000Z'
const START_DATE_BEFORE = '2024-01-01T00:00:01.000Z'

// Which flows will be resubmitted?
// these are the same options you see in the portal search
// you must specify at least companyUUID and partnerUUID
// and the user must have access to the trading partner
const SEARCH_OPTS = {
  // required search params
  companyUUID: 'enter your company/workspace uuid from the portal here',
  partnerUUID: 'enter your tradingp partner / integration uuid from the portal here'

  // optional search params
  // flow_uuid: '<insert here>',
  // statuses: 'LOGICAL_FAILURE'
  // dataTag: 'myTag'
}

// End Configuration
const secrets = {
  audience: 'https://portal-api.chain.io',
  grant_type: 'client_credentials',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET
}
const FE_QUERY = `query flowExecutionsByTP(
  $companyUUID:ID!,
  $partnerUUID:ID,
  $cursor:String,
  $startDateAfter:DateTime,
  $startDateBefore:DateTime,
  $statuses:FlowStatusFilter,
  $dataTag:String,
  $flow_uuid:ID
  ) {
    company(company_uuid:$companyUUID) {
      my_role
      tradingPartners(partner_uuid:$partnerUUID) {
        company_role
        flowExecutionSearch(
        cursor:$cursor,
        startDateAfter:$startDateAfter,
        startDateBefore:$startDateBefore,
        statuses:$statuses,
        dataTag:$dataTag,
        flow_uuid:$flow_uuid
        ) {
            recordsReturned
            totalRecords
            hasMoreRecords
            searchCapped
            data {
              flow_uuid
              flow_name
              invocation_uuid
              flowTypeLabel
              start_date
              statusLabel
              status
              cursor
              company_uuid
              partner_uuid
              summary_message
              data_tags {
                label
                value
              }
            }
          }
        }
      }
    }`

const RESUBMIT_QUERY = `mutation doResend($input: FlowExecutionIDInput!) {
  resubmitFlowExecution(input: $input) {
    resubmitted
    message
  }
}`

async function asyncRequest (options) {
  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (error) {
        reject(error)
        return
      }
      resolve(JSON.parse(body))
    })
  })
}

async function getAuthToken () {
  const options = {
    method: 'POST',
    url: 'https://chainio.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(secrets)
  }
  return (await asyncRequest(options)).access_token
}

async function getPage (startAfter, startBefore, cursor, authToken) {
  const req = {
    query: FE_QUERY,
    variables: {
      ...SEARCH_OPTS,
      startDateAfter: startAfter,
      startDateBefore: startBefore
    }
  }
  if (cursor) {
    req.variables.cursor = cursor
  }
  const options = {
    method: 'POST',
    url: 'https://portal-api.chain.io/graphql',
    headers: {
      authorization: `Bearer ${authToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(req)
  }
  return asyncRequest(options)
}

function makeExecutions (page) {
  if (!page?.data?.company?.tradingPartners) {
    console.log('bad page', page)
  }
  return page.data.company.tradingPartners.reduce((executions, tp) => {
    if (!tp.flowExecutionSearch) {
      console.log('bad tp', tp)
    }
    const augmentedExecutions = tp.flowExecutionSearch.data.map(fe => ({
      ...fe,
      partner_uuid: tp.partner_uuid,
      partner_name: tp.partner_name
    }))
    return [
      ...executions,
      ...augmentedExecutions
    ]
  }, [])
}

async function getExecutions (authToken, startAfter, startBefore) {
  console.log('getting executions %s - %s', startAfter, startBefore)
  let cursor
  let executions = []
  let pageCount = 1
  do {
    console.log('getting page %s %d', startAfter, pageCount)
    pageCount += 1
    const page = await getPage(startAfter, startBefore, cursor, authToken)
    if (page.errors) {
      console.error(page.errors)
      throw new Error(JSON.stringify(page.errors))
    }
    const pageExecutions = makeExecutions(page)
    executions = [
      ...executions,
      ...pageExecutions
    ]
    if (pageExecutions.length > 0) {
      cursor = pageExecutions[pageExecutions.length - 1].cursor
    } else {
      cursor = null
    }
  } while (cursor)
  return executions
}

function filterFunction (execution) {
  // add any additional filtering you want to do on the search results here
  // only return true if you want to resubmit the execution
  return true
}

async function getAll (authToken, startAfter, startBefore) {
  const executions = await getExecutions(authToken, startAfter, startBefore)
  return _(executions).flatten().sortBy('start_date').value().filter(filterFunction)
}

async function resubmitOne (authToken, execution) {
  console.log('will resubmit %s', execution.invocation_uuid)
  return asyncRequest({
    method: 'POST',
    url: 'https://portal-api.chain.io/graphql',
    headers: {
      authorization: `Bearer ${authToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      query: RESUBMIT_QUERY,
      variables: {
        input: {
          invocation_uuid: execution.invocation_uuid
        }
      }
    })
  })
}

async function resubmitAll (authToken, executions) {
  // resubmit each execution in order
  const executed = []
  for (const ex of executions) {
    // resubmit one execution
    await resubmitOne(authToken, ex)
    executed.push(ex.invocation_uuid)
    fs.writeFileSync('resubmitted.json', JSON.stringify(executed, null, 2))
  }
}

async function doWork () {
  const authToken = await getAuthToken()
  const executions = await getAll(authToken, START_DATE_AFTER, START_DATE_BEFORE)

  const uniqueExecutions = _(executions).map('invocation_uuid').uniq().value().length
  if (executions.length !== uniqueExecutions) {
    throw new Error(`duplicate executions found: ${executions.length} executions, ${uniqueExecutions} unique executions`)
  }
  // write out the executions to a file
  fs.writeFileSync('executions.json', JSON.stringify(executions, null, 2))
  await resubmitAll(authToken, executions)
  return executions.length
}

doWork().then(console.log).catch(console.error)
