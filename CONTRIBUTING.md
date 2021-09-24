# Contributing to this repository
This is a GitHub Action. If you’re unfamiliar with GitHub Actions, see the [Hello World JavaScript Action](https://github.com/actions/hello-world-javascript-action).

Install dependencies:
```bash
npm install
```

Run tests:
```bash
$ npm test
```

GitHub Actions will run the action’s entry point from `action.yml`. The action.yml defines the action’s inputs and other metadata. See [action.yml’s documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions).

The JavaScript code uses the [GitHub Actions toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages) to interact with the GitHub API. The `@actions/github` package uses the [Octokit REST API](https://octokit.github.io/rest.js).

Actions are run from GitHub repos, so we assemble all JavaScript code into one `dist/index.js` file that is checked into Git:
```bash
npm run prepare
```
This enabling fast and reliable execution, without having to check in `node_modules`.

We tag each specific version like `v1.0.0`, as well as major versions like `v1`. See the [GitHub Actions versioning guidelines](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
