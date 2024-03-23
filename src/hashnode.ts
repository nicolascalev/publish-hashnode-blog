import axios from 'axios'
import { HashnodePost, MarkdownBlog } from './types'
import { setFailed, getInput, warning } from '@actions/core'
import { slugify } from './utils'

const HASHNODE_PAT = getInput('HASHNODE_PAT')
const HASHNODE_HOST = getInput('HASHNODE_HOST')

export async function getPostsFromHashnode(): Promise<
  HashnodePost[] | undefined
> {
  const postsFromHashNode: HashnodePost[] = []

  // this is the limit of posts to retrieve from hashnode, keep fetching until all posts are retrieved
  let total = 20
  while (total === 20) {
    const last = postsFromHashNode.at(-1)?.id || null
    try {
      const res = await axios.post(
        'https://gql.hashnode.com',
        {
          query: `query {
        publication( host: "${HASHNODE_HOST}" ) { 
          id 
          posts(first: 20${last ? `, after(${last})` : ''}) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }`
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: HASHNODE_PAT
          }
        }
      )

      if (res.data.errors || !res?.data?.data?.publication?.posts?.edges) {
        setFailed('Error fetching posts from hashnode.')
        console.error(res.data.errors)
        return
      }
      const posts = res.data.data.publication.posts.edges.map(
        (post: { node: HashnodePost }) => post.node
      )

      if (!posts) {
        setFailed('Error fetching posts from hashnode.')
        return
      }
      postsFromHashNode.push(...posts)
      total = posts.length
    } catch (err) {
      setFailed('Error fetching posts from hashnode.')
      console.error(err)
    }
  }
  return postsFromHashNode
}

export async function getPublicationId(): Promise<string | undefined> {
  try {
    const res = await axios.post(
      'https://gql.hashnode.com',
      {
        query: `query {
          publication( host: "${HASHNODE_HOST}" ) { 
            id
          }
        }`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: HASHNODE_PAT
        }
      }
    )
    if (res.data.errors || !res?.data?.data?.publication?.id) {
      setFailed('Error fetching publication id from hashnode.')
      console.error(res.data.errors)
      return
    }
    return res.data.data.publication.id as string
  } catch (err) {
    setFailed('Error fetching publication id from hashnode.')
    console.error(err)
  }
}

export async function upsertBlogs(
  markdownBlogs: MarkdownBlog[],
  postsFromHashNode: HashnodePost[],
  publicationId: string
): Promise<void> {
  for (const blog of markdownBlogs) {
    const post = postsFromHashNode.find(
      postItem => postItem.title === blog.attributes.title
    )
    if (post) {
      console.log(`\nUpdating post in Hashnode: ${blog.path}...`)
      await updatePost(post.id, blog)
    } else {
      console.log(`\nCreating post in Hashnode: ${blog.path}...`)
      await createPost(blog, publicationId)
    }
  }
}

export async function updatePost(
  id: string,
  blog: MarkdownBlog
): Promise<void> {
  const mutation = `
    mutation UpdatePost($input: UpdatePostInput!) {
      updatePost(input: $input) {
        post {
          id
          title
          content {
            markdown
          }
          tags {
            name
            slug
          }
          url
        }
      }
    }
  `

  const variables = {
    input: {
      id,
      title: blog.attributes.title,
      contentMarkdown: blog.content,
      tags: blog.attributes.tags
        ? blog.attributes.tags.map(tag => ({ name: tag, slug: slugify(tag) }))
        : []
    }
  }

  try {
    const response = await axios({
      url: 'https://gql.hashnode.com/',
      method: 'post',
      data: {
        query: mutation,
        variables
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: HASHNODE_PAT
      }
    })
    const axiosResponse = response

    if (axiosResponse.data.errors) {
      warning(`\nError updating post in Hashnode: ${blog.attributes.title}`)
      console.error(JSON.stringify(axiosResponse.data.errors, null, 2))
      return
    }

    if (axiosResponse.data) {
      console.log(
        `Updated blog for ${blog.path} sometimes it takes a few minutes to show up on hashnode.`
      )
      console.log(axiosResponse.data.data.updatePost.post.url)
    }
  } catch (err) {
    warning(`\nError updating post in Hashnode: ${blog.attributes.title}`)
    console.error(JSON.stringify((err as any).response?.data, null, 2))
  }
}

export async function createPost(
  blog: MarkdownBlog,
  publicationId: string
): Promise<void> {
  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          title
          content {
            markdown
          }
          tags {
            name
            slug
          }
          url
        }
      }
    }
  `
  const variables = {
    input: {
      title: blog.attributes.title,
      contentMarkdown: blog.content,
      tags: blog.attributes.tags
        ? blog.attributes.tags.map(tag => ({
            name: tag,
            slug: slugify(tag)
          }))
        : [],
      publicationId
    }
  }

  try {
    const response = await axios({
      url: 'https://gql.hashnode.com/',
      method: 'post',
      data: {
        query: mutation,
        variables
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: HASHNODE_PAT
      }
    })

    const axiosResponse = response

    if (axiosResponse.data && axiosResponse.data.errors) {
      console.log(`\nError creating post in Hashnode: ${blog.attributes.title}`)
      console.error(JSON.stringify(axiosResponse.data.errors, null, 2))
      return
    }

    if (axiosResponse.data) {
      console.log(
        `Published blog for ${blog.path} sometimes it takes a few minutes to show up on hashnode.`
      )
      console.log(axiosResponse.data.data.publishPost.post.url)
    }
  } catch (err) {
    console.log(`\nError creating post in Hashnode: ${blog.attributes.title}`)
    console.error(JSON.stringify((err as any).response.data, null, 2))
  }
}
