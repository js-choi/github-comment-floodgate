# GitHub Comment Floodgate
This is an unofficial GitHub Action that automatically locks issues
if they get flooded with comments beyond a certain threshold rate.
It was inspired by [keithamus/probot-flood](https://github.com/keithamus/probot-flood).

## Usage
Create a `.github/workflows/floodgate.yml` file and enter something like this:

```yaml
name: floodgate
on: issue_comment
jobs:
  floodgate:
    runs-on: ubuntu-latest
    steps:
    - uses: js-choi/github-floodgate@v1
      with:
        # Sixty minutes is the default period.
        minutes-in-period: 60
        # Twelve comments per issue is the default maximum.
        max-comments-per-period: 12
```

See [action.yml](https://github.com/js-choi/github-floodgate/blob/main/action.yml) for documentation on this action’s input parameters.

Edits and deletions of existing comments do not count as new comments.
