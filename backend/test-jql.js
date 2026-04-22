const jiraService = require('./src/services/jiraService');
require('dotenv').config();

async function run() {
  try {
    const data = await jiraService.getIssuesByJQL('issueKey in (HAR-271, HAR-145)');
    console.log(JSON.stringify(data.issues.map(i => ({ key: i.key, type: i.fields.issuetype, status: i.fields.status })), null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
