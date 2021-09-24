const { checkForFlood, lockFloodedIssue } = require('./api');

const core = require('@actions/core');
const github = require('@actions/github');

function failFrom (err) {
  core.setFailed(err.message);
  core.debug(err);
  core.debug(err.stack);
}

process.on('unhandledRejection', reason => {
  failFrom(reason);
});

async function run () {
  try {
    const { payload } = github.context;

    if (payload.action !== 'created') {
      core.info(`No action taken because this is not a new-comment event.`);
      return;
    }

    const repoToken = core.getInput('repo-token');
    const minutesInPeriod = parseInt(core.getInput('minutes-in-period'));
    const maxCommentsPerPeriod = parseInt(core.getInput('max-comments-per-period'));
    const lock_message = core.getInput('lock-message');
    const lock_reason = core.getInput('lock-reason');

    const octokit = github.getOctokit(repoToken);

    const { name: repo, owner: { login: owner } } = payload.repository;

    const issue_number = (
      (payload.issue && payload.issue.number) ||
      (payload.pull_request && payload.issue.pull_request)
    );

    if (issue_number == null) {
      core.warning(`No action taken because this event has no associated issue number.`);
      return;
    }

    const comment_id = payload.comment && payload.comment.id;

    if (comment_id == null) {
      core.warning(`No action taken because this event has no associated comment.`);
      return;
    }

    core.info(`Responding to comment ${comment_id} in ${owner}/${repo}#${issue_number}.`);

    const issueIsFlooding = await checkForFlood({
      minutesInPeriod, maxCommentsPerPeriod,
      octokit,
      owner, repo, issue_number, comment_id,
    });

    if (issueIsFlooding) {
      core.notice(
        `⚠️️🌊️ ${owner}/${repo}#${issue_number} is FLOODING as of comment ${comment_id}.`,
      );
      await lockFloodedIssue({
        lock_message, lock_reason,
        octokit,
        owner, repo, issue_number,
      });
    } else {
      core.info(
        `${owner}/${repo}#${issue_number} is not flooding as of comment ${comment_id}.`,
      );
    }
  } catch (err) {
    failFrom(err);
  }
}

run();
