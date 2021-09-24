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

function assessFloodStatus (options) {
  const {
    commentDataArray, activeCreatedAtDate,
    minutesInPeriod, maxCommentsPerPeriod,
  } = options;
  
  return commentDataArray
    .filter(commentData =>
      activeCreatedAtDate - getMinuteCreatedAt(commentData) < minutesInPeriod)
    .length >= maxCommentsPerPeriod;
}

async function checkForFlood (options) {
  const {
    minutesInPeriod, maxCommentsPerPeriod,
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
    return assessFloodStatus({
      commentDataArray, activeCreatedAtDate,
      minutesInPeriod, maxCommentsPerPeriod,
    });
  } catch (err) {
    if (err.name === 'HttpError' && err.status === 404)
      return false;
    else
      throw err;
  }
}

module.exports.checkForFlood = checkForFlood;

async function lockFloodedIssue (options) {
  const {
    octokit,
    owner, repo, issue_number,
    lock_message, lock_reason,
  } = options;
  try {
    await octokit.rest.issues.createComment({
      owner, repo, issue_number,
      body: lock_message,
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
