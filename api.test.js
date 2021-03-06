const API = require('./api');

describe('measureCommentTraffic', () => {
  test('throws with invalid dates', async () => {
    const invalidDate = null;

    const activeComment = {
      created_at: invalidDate,
    };

    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate () {
          return [ activeComment ];
        },

        rest: {
          issues: {
            async getComment () {
              return { data: activeComment };
            },
          },
        },
      },
    };

    await expect(API.measureCommentTraffic(options))
      .rejects.toThrow(API.createInvalidDateFormatMessage(null));
  });

  test('throws if unhandled error occurs in getComment', async () => {
    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate () {
          return [];
        },

        rest: {
          issues: {
            async getComment () {
              throw new Error();
            },
          },
        },
      },
    };

    await expect(API.measureCommentTraffic(options))
      .rejects.toThrow();
  });

  test('returns false if comment no longer exists', async () => {
    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate () {
          return [];
        },

        rest: {
          issues: {
            async getComment () {
              throw { name: 'HttpError', status: 404 };
            },
          },
        },
      },
    };

    await expect(API.measureCommentTraffic(options))
      .resolves.toBeUndefined();
  });

  test('returns false if no other comments in issue', async () => {
    const activeComment = { created_at: '2020-01-01T00:00' };

    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate () {
          return [ activeComment ];
        },

        rest: {
          issues: {
            async getComment () {
              return { data: activeComment };
            },
          },
        },
      },
    };

    await expect(API.measureCommentTraffic(options))
      .resolves.toBe(1);
  });

  test('returns number of comments (1) within period of comment', async () => {
    // This comment does *not* two other comments within the same ten minutes.
    const activeComment = { created_at: '2020-01-01T10:00' };

    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate () {
          return [
            { created_at: '2020-01-01T00:00' },
            { created_at: '2020-01-01T00:01' },
            activeComment,
          ];
        },

        rest: {
          issues: {
            async getComment () {
              return { data: activeComment };
            },
          },
        },
      },
    };

    await expect(API.measureCommentTraffic(options))
      .resolves.toBe(1);
  });

  test('returns number of comments (3) within period of comment', async () => {
    // This comment has two other comments within the same ten minutes.
    const activeComment = { created_at: '2020-01-01T00:02' };

    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate () {
          return [
            { created_at: '2020-01-01T00:00' },
            { created_at: '2020-01-01T00:01' },
            activeComment,
          ];
        },

        rest: {
          issues: {
            async getComment () {
              return { data: activeComment };
            },
          },
        },
      },
    };

    await expect(API.measureCommentTraffic(options))
      .resolves.toBe(3);
  });

  test('calls octokit.rest.issues.getComment with appropriate options', async () => {
    // This comment has two other comments within the same ten minutes.
    const activeComment = { created_at: '2020-01-01T00:02' };
    const owner_symbol = Symbol();
    const repo_symbol = Symbol();
    const comment_id_symbol = Symbol();

    let getcreateCommentWasCalled = false;

    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate (method) {
          return [ activeComment ];
        },

        rest: {
          issues: {
            async getComment ({ owner, repo, comment_id }) {
              if (owner !== owner_symbol)
                throw new Error;
              else if (repo !== repo_symbol)
                throw new Error;
              else if (comment_id !== comment_id_symbol)
                throw new Error;
              else
                getcreateCommentWasCalled = true;
              return { data: activeComment };
            },
          },
        },
      },

      owner: owner_symbol,
      repo: repo_symbol,
      comment_id: comment_id_symbol,
    };

    await API.measureCommentTraffic(options);
    await expect(getcreateCommentWasCalled)
      .toBe(true);
  });

  test('calls octokit.paginate with appropriate options', async () => {
    // This comment has two other comments within the same ten minutes.
    const activeComment = { created_at: '2020-01-01T00:02' };
    const listComments_symbol = Symbol();
    const owner_symbol = Symbol();
    const repo_symbol = Symbol();
    const issue_number_symbol = Symbol();

    let paginateWasCalled = false;

    const options = {
      minutesInPeriod: 10,
      octokit: {
        async paginate (method, { owner, repo, issue_number }) {
          if (method !== listComments_symbol)
            throw new Error;
          else if (owner !== owner_symbol)
            throw new Error;
          else if (repo !== repo_symbol)
            throw new Error;
          else if (issue_number !== issue_number_symbol)
            throw new Error;
          else
            paginateWasCalled = true;
          return [ activeComment ];
        },

        rest: {
          issues: {
            listComments: listComments_symbol,

            async getComment () {
              return { data: activeComment };
            },
          },
        },
      },

      owner: owner_symbol,
      repo: repo_symbol,
      issue_number: issue_number_symbol,
    };

    await API.measureCommentTraffic(options);
    await expect(paginateWasCalled)
      .toBe(true);
  });
});

describe('lockFloodedIssue', () => {
  test('calls octokit.rest.issues.comment with appropriate options', async () => {
    const owner_symbol = Symbol();
    const repo_symbol = Symbol();
    const issue_number_symbol = Symbol();
    const lock_message =
      'Flood! {{maxCommentsPerPeriod}} in the past {{minutesInPeriod}}.';
    const maxCommentsPerPeriod = 3;
    const minutesInPeriod = 10;
    const expected_lock_message =
      `Flood! ${maxCommentsPerPeriod} in the past ${minutesInPeriod}.`;

    let createCommentWasCalled = false;

    const options = {
      maxCommentsPerPeriod, minutesInPeriod, lock_message,

      octokit: {
        rest: {
          issues: {
            async createComment ({ owner, repo, issue_number, body }) {
              if (owner !== owner_symbol)
                throw new Error;
              else if (repo !== repo_symbol)
                throw new Error;
              else if (issue_number !== issue_number_symbol)
                throw new Error;
              else if (issue_number !== issue_number_symbol)
                throw new Error;
              else if (body !== expected_lock_message)
                throw new Error;
              else
                createCommentWasCalled = true;
            },

            async lock () {},
          },
        },
      },

      owner: owner_symbol,
      repo: repo_symbol,
      issue_number: issue_number_symbol,
    };

    await API.lockFloodedIssue(options);
    await expect(createCommentWasCalled)
      .toBe(true);
  });

  test('calls octokit.rest.issues.lock with appropriate options', async () => {
    const owner_symbol = Symbol();
    const repo_symbol = Symbol();
    const issue_number_symbol = Symbol();
    const lock_reason_symbol = Symbol();
    const lock_message = '';

    let lockWasCalled = false;

    const options = {
      lock_reason: lock_reason_symbol,
      lock_message,

      octokit: {
        rest: {
          issues: {
            async createComment () {},

            async lock ({ owner, repo, issue_number, lock_reason }) {
              if (owner !== owner_symbol)
                throw new Error;
              else if (repo !== repo_symbol)
                throw new Error;
              else if (issue_number !== issue_number_symbol)
                throw new Error;
              else if (issue_number !== issue_number_symbol)
                throw new Error;
              else if (lock_reason !== lock_reason_symbol)
                throw new Error;
              else
                lockWasCalled = true;
            },
          },
        },
      },

      owner: owner_symbol,
      repo: repo_symbol,
      issue_number: issue_number_symbol,
    };

    await API.lockFloodedIssue(options);
    await expect(lockWasCalled)
      .toBe(true);
  });

  test('recovers from HTTP 403 errors', async () => {
    const owner_symbol = Symbol();
    const repo_symbol = Symbol();
    const issue_number_symbol = Symbol();
    const lock_message = '';

    let createCommentWasCalled = false;

    const options = {
      lock_message,

      octokit: {
        rest: {
          issues: {
            async createComment () {
              createCommentWasCalled = true;

              throw { name: 'HttpError', status: 403 };
            },

            async lock () {},
          },
        },
      },

      owner: owner_symbol,
      repo: repo_symbol,
      issue_number: issue_number_symbol,
    };

    await API.lockFloodedIssue(options);
    await expect(createCommentWasCalled)
      .toBe(true);
  });

  test('does not recover from other errors', async () => {
    const owner_symbol = Symbol();
    const repo_symbol = Symbol();
    const issue_number_symbol = Symbol();
    const lock_message = '';

    const options = {
      lock_message,

      octokit: {
        rest: {
          issues: {
            async createComment () {
              throw new Error;
            },

            async lock () {},
          },
        },
      },

      owner: owner_symbol,
      repo: repo_symbol,
      issue_number: issue_number_symbol,
    };

    await expect(API.lockFloodedIssue(options))
      .rejects.toThrow();
  });
});
