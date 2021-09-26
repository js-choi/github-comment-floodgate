# GitHub Comment Floodgate
For maintainers of open-source projects that get high amounts of comment traffic.

This is a GitHub Action that automatically locks issues
if they get flooded with comments beyond a certain threshold rate.
It was inspired by [keithamus/probot-flood](https://github.com/keithamus/probot-flood).

## Purpose
If you manage an open-source project, you may be aware that
“[centithreads](https://www.urbandictionary.com/define.php?term=centithread)”
might suddenly occur in the course of mere hours.
These centithreads would be very difficult for almost everyone to keep up with.
Oftentimes they are triggered by heated, emotional debate
that might break your project’s code of conduct.

Chances are that you are an unpaid volunteer in that open-source project,
with your own family and your own separate day job.
You might try your best to read every message and piece of feedback that comes through,
but when a hundred (often lengthy) messages might suddenly occur every day,
it’s simply not possible to keep up.

The bot just would automatically force a cooldown until a volunteer moderator like you
can come look at stuff and ensure everything is okay,
possibly with a warning or some message-hiding.
This temporary cooldown can keep tempers and conduct from spiraling out of control.
If the volunteer moderator finds that the thread is actually doing fine and okay,
then they can unlock it.
And, in the meantime, people can take a break from the high-traffic issue.

Of course, there’s a risk of this accidentally triggering when people
are having rapid but good-faith conversations.
If this happens, you could adjust the bot’s trigger threshold.
But having a temporary cooldown after an intense commenting session
(like an hour of one new message every five minutes)
probably wouldn’t be such a bad thing, even then.

## Usage
Create a `.github/workflows/floodgate.yml` file and enter something like this:

```yaml
name: floodgate
on: issue_comment
jobs:
  floodgate:
    runs-on: ubuntu-latest
    steps:
    - uses: js-choi/github-comment-floodgate@v2
      with:
        # Sixty minutes is the default period.
        minutes-in-period: 60
        # Twelve comments per issue is the default maximum.
        max-comments-per-period: 12
```

See [action.yml](https://github.com/js-choi/github-floodgate/blob/main/action.yml) for documentation on this action’s input parameters.

Edits and deletions of existing comments do not count as new comments.
