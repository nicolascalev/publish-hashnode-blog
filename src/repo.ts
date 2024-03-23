import { readFileSync, existsSync } from 'fs'
import { simpleGit } from 'simple-git'
import fm from 'front-matter'
import { BlogFrontMatterAttributes } from './types'
import { warning } from '@actions/core'

export async function getMarkdownBlogsFromLastCommit() {
  // process.env.GITHUB_SHA is the commit hash of the last commit which triggered the action and is provided by github actions
  const paths = await simpleGit()
    .show(['--name-only', process.env.GITHUB_SHA as string])
    .then(res => res.split('\n'))
  const regex = new RegExp('blog/.*\\.md')
  const markdownBlogsPaths = paths.filter(path => regex.test(path))
  console.log(
    'Markdown blogs found in last commit: ' + markdownBlogsPaths.length
  )

  const markdownBlogs = []
  for (const path of markdownBlogsPaths) {
    if (!existsSync(path)) {
      console.log(
        '\nFILE FOR BLOG DELETED. Now you have to delete it from Hashnode manually. ' +
          path
      )
      const beforeDeleted = await simpleGit().show(['HEAD^:' + path])
      const markdownBeforeDeleted = fm<BlogFrontMatterAttributes>(beforeDeleted)
      if (markdownBeforeDeleted.attributes.title) {
        console.log(
          'Title of deleted blog: ' +
            markdownBeforeDeleted.attributes.title +
            '\n'
        )
      }
      continue
    }

    const content = readFileSync(path, 'utf-8')
    const markdown = fm<BlogFrontMatterAttributes>(content)
    if (!markdown.attributes.title) {
      warning(
        'BlOG SKIPPED! Blog must contain a title in the frontmatter. Path: ' +
          path
      )
      continue
    }
    markdownBlogs.push({
      attributes: markdown.attributes,
      content: markdown.body,
      path
    })
  }
  return markdownBlogs
}