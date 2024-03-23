export type MarkdownBlog = {
  attributes: BlogFrontMatterAttributes
  content: string
  path: string
}

export type BlogFrontMatterAttributes = {
  title: string
  tags?: string[]
}

export type HashnodePost = {
  id: string
  title: string
}
