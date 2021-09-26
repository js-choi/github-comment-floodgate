// The following algorithm is adapted from
// [probot-flood](https://github.com/keithamus/probot-flood/)
// by Keith Cirkel, Brandon Keepers, and Lee Dohm,
// licensed under a compatible MIT License.

function createInvalidDateFormatMessage (dateString) {
  return `Invalid date format: “${dateString}”.`;
}
module.exports.createInvalidDateFormatMessage = createInvalidDateFormatMessage;

const millisecondsPerMinute = 60_000;

function getMinuteCreatedAt (commentData) {
  const { created_at } = commentData;
  const createdAtMillisecond = Date.parse(created_at);
  const createdAtMinute = Math.round(createdAtMillisecond / millisecondsPerMinute);
  if (Number.isNaN(createdAtMinute))
    throw new Error(createInvalidDateFormatMessage(created_at));
  return createdAtMinute;
}

function measureCommentData (options) {
  const {
    commentDataArray, activeCreatedAtDate,
    minutesInPeriod,
  } = options;

  return commentDataArray
    .filter(commentData =>
      activeCreatedAtDate - getMinuteCreatedAt(commentData) < minutesInPeriod)
    .length;
}

async function measureCommentTraffic (options) {
  const {
    minutesInPeriod,
    octokit,
    owner, repo, issue_number, comment_id,
  } = options;
  try {
    const { data: activeCommentData } = await octokit.rest.issues.getComment({
      owner, repo, comment_id,
    });
    const activeCreatedAtDate = getMinuteCreatedAt(activeCommentData);
    const commentDataArray =
      await octokit.paginate(octokit.rest.issues.listComments, {
        owner, repo, issue_number,
      });
    return measureCommentData({
      commentDataArray, activeCreatedAtDate,
      minutesInPeriod,
    });
  } catch (err) {
    if (err.name === 'HttpError' && err.status === 404)
      return undefined;
    else
      throw err;
  }
}

module.exports.measureCommentTraffic = measureCommentTraffic;

const maxCommentsPerPeriodSubstitutionToken = '{{maxCommentsPerPeriod}}';
const minutesInPeriodSubstitutionToken = '{{minutesInPeriod}}';

async function lockFloodedIssue (options) {
  const {
    octokit,
    owner, repo, issue_number,
    maxCommentsPerPeriod, minutesInPeriod, lock_message, lock_reason,
  } = options;
  try {
    const body = lock_message
      .replace(maxCommentsPerPeriodSubstitutionToken, maxCommentsPerPeriod)
      .replace(minutesInPeriodSubstitutionToken, minutesInPeriod);
    await octokit.rest.issues.createComment({
      owner, repo, issue_number, body,
    });
    await octokit.rest.issues.lock({
      owner, repo, issue_number,
      lock_reason,
    });
  } catch (err) {
    if (err.name === 'HttpError' && err.status === 403)
      return;
    else
      throw err;
  }
}

module.exports.lockFloodedIssue = lockFloodedIssue;
