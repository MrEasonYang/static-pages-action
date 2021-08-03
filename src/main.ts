import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import xmlParser from 'xml-js'

async function run(): Promise<void> {
  if (github.context.eventName !== 'push') {
    core.info('Not a push event, skip the action.')
    return
  }

  const beforeCommit = github.context.payload.before
  const afterCommit = github.context.payload.after
  core.info(`HEAD^ commit: ${beforeCommit}`)
  core.info(`HEAD commit: ${afterCommit}`)

  if (!beforeCommit || !afterCommit) {
    core.setFailed('Invalid commits info, failed to process the action.')
    return
  }

  const octokit = github.getOctokit(core.getInput('token', {required: true}))

  const response = await octokit.rest.repos.compareCommitsWithBasehead({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    basehead: afterCommit
  })

  if (response.status !== 200) {
    core.setFailed('Failed to request GitHub API to compare commits.')
    return
  }
  if (response.data.files === undefined) {
    core.setFailed('No files fount in the head commits.')
    return
  }

  const filenames = {} as string[]
  for (const file of response.data.files) {
    if (file.status === 'added') {
      filenames.push(file.filename)
    }
  }

  const rssUrl = core.getInput('rss_url', {required: true})
  const resp = await axios.get(rssUrl)
  const rssData = JSON.parse(
    xmlParser.xml2json(resp.data, {compact: true, spaces: 2})
  )

  core.setOutput('filenames', filenames)
  core.setOutput('rssData', rssData)
}

run()
