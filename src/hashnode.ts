import axios, { AxiosResponse } from 'axios'
import { HashnodePost, MarkdownBlog } from './types'
import { setFailed, getInput, warning } from '@actions/core'
import { slugify } from './utils'

const HASHNODE_PAT = getInput('HASHNODE_PAT')
const HASHNODE_HOST = getInput('HASHNODE_HOST')

export async function getPostsFromHashnode() {
  const postsFromHashNode: HashnodePost[] = []

  // this is the limit of posts to retrieve from hashnode, keep fetching until all posts are retrieved
  let total = 20
  while (total === 20) {
    const last = postsFromHashNode.at(-1)?.id || null
    const posts = await axios
      .post(
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
      .then(res => {
        if (res.data.errors || !res?.data?.data?.publication?.posts?.edges) {
          setFailed('Error fetching posts from hashnode.')
          console.error(res.data.errors)
          return
        }

        return res.data.data.publication.posts.edges.map(
          (post: { node: HashnodePost }) => post.node
        )
      })
      .catch(err => {
        setFailed('Error fetching posts from hashnode.')
        console.error(err)
      })

    if (!posts) {
      setFailed('Error fetching posts from hashnode.')
      return
    }
    postsFromHashNode.push(...posts)
    total = posts.length
  }
  return postsFromHashNode
}

export async function getPublicationId() {
  const publicationId: string | undefined = await axios
    .post(
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
    .then(res => {
      if (res.data.errors || !res?.data?.data?.publication?.id) {
        setFailed('Error fetching publication id from hashnode.')
        console.error(res.data.errors)
        return
      }
      return res.data.data.publication.id
    })
    .catch(err => {
      setFailed('Error fetching publication id from hashnode.')
      console.error(err)
    })

  return publicationId
}

export async function upsertBlogs(
  markdownBlogs: MarkdownBlog[],
  postsFromHashNode: HashnodePost[],
  publicationId: string
) {
  for (const blog of markdownBlogs) {
    const post = postsFromHashNode.find(
      post => post.title === blog.attributes.title
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

export async function updatePost(id: string, blog: MarkdownBlog) {
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
      id: id,
      title: blog.attributes.title,
      contentMarkdown: blog.content,
      tags: blog.attributes.tags
        ? blog.attributes.tags.map(tag => ({ name: tag, slug: slugify(tag) }))
        : []
    }
  }

  const response = await axios({
    url: 'https://gql.hashnode.com/',
    method: 'post',
    data: {
      query: mutation,
      variables: variables
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: HASHNODE_PAT
    }
  }).catch(err => {
    warning('\nError updating post in Hashnode: ' + blog.attributes.title)
    console.error(JSON.stringify(err.response.data, null, 2))
  })

  const axiosResponse = response as AxiosResponse<any, any>

  if (axiosResponse.data.errors) {
    warning('\nError updating post in Hashnode: ' + blog.attributes.title)
    console.error(JSON.stringify(axiosResponse.data.errors, null, 2))
    return
  }

  if (axiosResponse.data) {
    console.log(`Updated blog for ${blog.path} sometimes it takes a few minutes to show up on hashnode.`)
    console.log(axiosResponse.data.data.updatePost.post.url)
  }
}

export async function createPost(blog: MarkdownBlog, publicationId: string) {
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

  const response = await axios({
    url: 'https://gql.hashnode.com/',
    method: 'post',
    data: {
      query: mutation,
      variables: variables
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: HASHNODE_PAT
    }
  }).catch(err => {
    console.log('\nError creating post in Hashnode: ' + blog.attributes.title)
    console.error(JSON.stringify(err.response.data, null, 2))
  })

  const axiosResponse = response as AxiosResponse<any, any>

  if (axiosResponse.data && axiosResponse.data.errors) {
    console.log('\nError creating post in Hashnode: ' + blog.attributes.title)
    console.error(JSON.stringify(axiosResponse.data.errors, null, 2))
    return
  }

  if (axiosResponse.data) {
    console.log(`Published blog for ${blog.path} sometimes it takes a few minutes to show up on hashnode.`)
    console.log(axiosResponse.data.data.publishPost.post.url)
  }
}
