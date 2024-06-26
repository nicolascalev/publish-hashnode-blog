# Publish blogs to Hashnode from your GitHub projects

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This action was started from
[this version](https://github.com/actions/typescript-action/tree/1da1fe9abb959743f36210ae5423e1dccc805e85)
of the template to generate a TypeScript GitHub action.

## Usage

Example action:

```yaml
name: Post blogs to Hashnode from latest commit

on:
  push:
    branches:
      - main
    paths:
      - 'blog/**.md'
  workflow_dispatch:

jobs:
  update-posts:
    runs-on: ubuntu-latest
    steps:
      - name: Setup Node.js environment
        uses: actions/setup-node@v3
        with:
          node-version: 20

      # This step is only necessary to test the action locally with act
      - name: Install Git
        id: install-git
        run: npm i -g git

      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2 # you must do this to get the last commit
      - run: git checkout HEAD^

      - name: Run script to post blogs to Hashnode
        id: post-blogs
        uses: nicolascalev/publish-hashnode-blog@v1.2
        with:
          HASHNODE_HOST: ${{ secrets.HASHNODE_HOST }}
          HASHNODE_PAT: ${{ secrets.HASHNODE_PAT }}
```

Please notice that front matter is required, here's an example blog:

```markdown
---
title:
  This title is required because that's how the action will find your existing
  blog in Hashnode
tags:
  - When you create a blog, the limit of tags is 5
  - When you update a blog you can add more
  - That's a limitation of the Hashnode API not this action
---

Your content goes here
```

### Considerations

1. You need to have the directory `./blog` at the root of your project or the
   action will fail.
1. The action uses **only** the `blog/**.md` files from the commit that
   triggered the action (the last commit).
1. When using `actions/checkout@v4` you must add the configuration I provided to
   get the files from the last commit. Otherwise GitHub creates a temporary
   branch with all the files.
1. Deleting a `.md` file won't delete your blog in Hashnode.
1. We find the blogs by title. If you change the title of a blog after it's
   creation. A new blog will be created, and you have to delete the old one
   manually.
1. Sometimes the updates can take longer to show in your Hashnode blog. Try also
   opening a new tab.

### Required inputs

1. To set GitHub secrets go to
   `Settings > Secrets and variables > Actions > Repository Secrets >  New repository secret`
1. Your Hashnode host is `[hashnode username].hashnode.dev`
1. You get your Hashnode access token
   [here](https://hashnode.com/settings/developer)

## Contributing

After cloning the repository and installing the dependencies. It's easy to test
the action locally.

1. Copy `.vscode/launch.example.json` to `.vscode/launch.json` and set the right
   environment variables.
1. `GITHUB_SHA` should be a commit that contains changes to a blog.
1. Now you can debug your action without pushing the code to GitHub or using
   act.
1. Before pushing your code, always run `npm run all` to run tests locally, and
   check formatting errors.
1. Run `npm run format:write` to fix format errors automatically.
1. Create a pull request.
