import { readFileSync, existsSync } from 'fs'
import { simpleGit } from 'simple-git'
import fm from 'front-matter'
import { BlogFrontMatterAttributes, MarkdownBlog } from './types'
import { warning, info } from '@actions/core'

export async function getMarkdownBlogsFromLastCommit(): Promise<
  MarkdownBlog[]
> {
  // process.env.GITHUB_SHA is the commit hash of the last commit which triggered the action and is provided by github actions
  const res = await simpleGit().show([
    '--name-only',
    process.env.GITHUB_SHA as string
  ])
  info(
    `\ngit show --name-only ${process.env.GITHUB_SHA as string} response: ${res}`
  )
  const paths = res.split('\n')
  const regex = new RegExp('blog/.*\\.md')
  const markdownBlogsPaths = paths.filter(path => regex.test(path))
  info(`Markdown blogs found in last commit: ${markdownBlogsPaths.length}`)

  const markdownBlogs = []
  for (const path of markdownBlogsPaths) {
    if (!existsSync(path)) {
      info(
        `\nFILE FOR BLOG DELETED. Now you have to delete it from Hashnode manually. ${path}`
      )
      const beforeDeleted = await simpleGit().show([`HEAD^:${path}`])
      const markdownBeforeDeleted = fm<BlogFrontMatterAttributes>(beforeDeleted)
      if (markdownBeforeDeleted.attributes.title) {
        info(
          `Title of deleted blog: ${markdownBeforeDeleted.attributes.title}\n`
        )
      }
      continue
    }

    const content = readFileSync(path, 'utf-8')
    const markdown = fm<BlogFrontMatterAttributes>(content)
    if (!markdown.attributes.title) {
      warning(
        `BlOG SKIPPED! Blog must contain a title in the frontmatter. Path: ${path}`
      )
      continue
    }
    markdownBlogs.push({
      attributes: markdown.attributes,
      content: markdown.body,
      path
    } as MarkdownBlog)
  }
  return markdownBlogs
}
