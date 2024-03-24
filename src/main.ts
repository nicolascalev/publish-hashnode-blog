import * as core from '@actions/core'
import { existsSync } from 'fs'
import { getMarkdownBlogsFromLastCommit } from './repo'
import { getPostsFromHashnode, getPublicationId, upsertBlogs } from './hashnode'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  // core.getInput('')
  // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
  // core.debug('')
  // Set outputs for other workflow steps to use
  // core.setOutput('name', 'value')
  // Fail the workflow run if an error occurs
  // core.setFailed('message')

  const HASHNODE_HOST = core.getInput('HASHNODE_HOST')
  const HASHNODE_PAT = core.getInput('HASHNODE_PAT')
  const GITHUB_SHA = process.env.GITHUB_SHA

  // check that all those variables are set, this is only for testing locally because the action will fail earlier if they are not set
  if (!HASHNODE_HOST || !HASHNODE_PAT || !GITHUB_SHA) {
    core.setFailed(
      'Set the env variables in .vscode/launch.json to test locally.'
    )
    return
  }

  core.info('\nAttempting to post to Hashnode...')
  core.info(
    'WARNING: We find blogs based on the title of the blog. The title hast to be unique. Also if you change the title after the blog has been posted, we will create a new post and you have to delete the old one manually.'
  )
  core.info(
    'WARNING: If you delete a blog, it will not be deleted from Hashnode. You have to delete it manually.'
  )

  // check that /blog directory exists
  if (!existsSync('blog')) {
    core.setFailed('No blog directory found')
    return
  }

  core.info('\nGetting blog/**.md files from last commit...')
  const markdownBlogs = await getMarkdownBlogsFromLastCommit()

  if (markdownBlogs.length === 0) {
    core.info('No markdown blogs found in last commit')
    return
  }

  core.info('\nGetting all posts from hashnode...')
  const postsFromHashNode = await getPostsFromHashnode()

  core.info('\nGetting publication id from hashnode...')
  const publicationId = await getPublicationId()
  if (!publicationId) {
    core.setFailed('No publication id found in hashnode')
    return
  }

  // check if the blogs in the last commit exist in the hashnode posts
  await upsertBlogs(markdownBlogs, postsFromHashNode!, publicationId)
}
