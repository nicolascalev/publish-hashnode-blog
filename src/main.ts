import * as core from '@actions/core'

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

  core.debug('TODO: Implement the action.')
  return

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

  console.log({
    HASHNODE_HOST,
    HASHNODE_PAT,
    GITHUB_SHA
  })
}
