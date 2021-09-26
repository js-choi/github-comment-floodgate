const { measureCommentTraffic, lockFloodedIssue } = require('./api');

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

    // Note: If the server returns a 404 error (e.g., the active comment no longer exists)
    // then this is set to `undefined`.
    const floodLevel = await measureCommentTraffic({
      minutesInPeriod,
      octokit,
      owner, repo, issue_number, comment_id,
    });

    // Note: If `floodLevel` is `undefined`, then this condition is false.
    if (floodLevel >= maxCommentsPerPeriod) {
      core.notice(
        `⚠️️🌊️ ${owner}/${repo}#${issue_number} is FLOODING as of comment ${comment_id}. Current flood level is ${floodLevel}.`,
      );
      await lockFloodedIssue({
        minutesInPeriod, maxCommentsPerPeriod, lock_message, lock_reason,
        octokit,
        owner, repo, issue_number,
      });
    } else {
      core.info(
        `${owner}/${repo}#${issue_number} is not flooding as of comment ${comment_id}. Current flood level is ${floodLevel}.`,
      );
    }
  } catch (err) {
    failFrom(err);
  }
}

run();
