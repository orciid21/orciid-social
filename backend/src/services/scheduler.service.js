const cron = require('node-cron');
const prisma = require('../config/prisma');
const publisherService = require('./publisher.service');

// In-memory map of scheduled jobs: postId → cron task
const scheduledJobs = new Map();

// On server start, reload ALL pending scheduled posts from DB — including
// past-due ones. Deploys restart this process; a post whose time arrived while
// the server was down would otherwise stay SCHEDULED forever. schedulePost()
// publishes past-due posts immediately, so no extra handling is needed here.
// How overdue a post may be and still be published automatically on boot.
// Anything staler is held back — see initScheduler.
const STALE_POST_HOURS = Number(process.env.STALE_POST_HOURS || 2);

const initScheduler = async () => {
  try {
    const pendingPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
      },
    });

    // A post whose time passed while the server was down still needs publishing —
    // that is why past-due posts are loaded at all. But "past due" and "stale" are
    // not the same thing. After a long outage this loop would fire the entire
    // backlog at once, in one burst, to customers' real Facebook/Instagram/X/
    // LinkedIn/TikTok/YouTube accounts — days-old content, out of order, and
    // impossible to take back. Publishing late is recoverable; publishing a week of
    // backlog simultaneously is not.
    //
    // So anything more than STALE_POST_HOURS overdue is marked FAILED with a
    // readable reason instead. Nothing is deleted: the post keeps its content and
    // shows up in the UI, so it can be reviewed and rescheduled deliberately.
    // A SCHEDULED row with no scheduledAt is held back too. It should not exist,
    // but if one does, schedulePost() compares `null <= now`, which JavaScript
    // coerces to `0 <= now` — true — and publishes it on the spot. Holding it back
    // is the only safe reading of a post with no scheduled time.
    const cutoff = new Date(Date.now() - STALE_POST_HOURS * 60 * 60 * 1000);
    const staleIds = new Set(
      pendingPosts.filter((p) => !p.scheduledAt || p.scheduledAt < cutoff).map((p) => p.id)
    );
    const stale = pendingPosts.filter((p) => staleIds.has(p.id));
    const live = pendingPosts.filter((p) => !staleIds.has(p.id));

    for (const post of stale) {
      const hoursLate = post.scheduledAt
        ? Math.round((Date.now() - post.scheduledAt.getTime()) / 3600000)
        : null;
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          failReason: hoursLate === null
            ? 'Not published automatically: this post had no scheduled time. ' +
              'Review the content and schedule it if you still want it live.'
            : `Not published automatically: it was ${hoursLate}h overdue when the server ` +
              `came back up. Review the content and reschedule it if you still want it live.`,
        },
      });
    }

    for (const post of live) {
      await schedulePost(post.id, post.scheduledAt);
    }

    console.log(
      `Scheduler initialized: ${live.length} posts loaded, ${stale.length} held back as stale`
    );
  } catch (err) {
    console.error('Scheduler init error:', err.message);
  }
};

// Convert a Date to a cron expression (runs once at exact time)
const dateToCron = (date) => {
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  return `${minutes} ${hours} ${dayOfMonth} ${month} *`;
};

const schedulePost = async (postId, scheduledAt) => {
  // Cancel existing job if any
  cancelPost(postId);

  const now = new Date();
  if (scheduledAt <= now) {
    // Past due — publish immediately
    await publisherService.publishPost(postId);
    return;
  }

  const cronExpr = dateToCron(scheduledAt);

  const task = cron.schedule(cronExpr, async () => {
    try {
      await publisherService.publishPost(postId);
    } catch (err) {
      console.error(`Failed to publish post ${postId}:`, err.message);
      await prisma.post.update({
        where: { id: postId },
        data: { status: 'FAILED', failReason: err.message },
      });
    }
    // Remove job after it fires
    scheduledJobs.delete(postId);
    task.stop();
  });

  scheduledJobs.set(postId, task);
};

const reschedulePost = async (postId, scheduledAt) => {
  cancelPost(postId);
  await schedulePost(postId, scheduledAt);
};

const cancelPost = (postId) => {
  const task = scheduledJobs.get(postId);
  if (task) {
    task.stop();
    scheduledJobs.delete(postId);
  }
};

const publishPostNow = async (postId) => {
  cancelPost(postId);
  await publisherService.publishPost(postId);
};

module.exports = { initScheduler, schedulePost, reschedulePost, cancelPost, publishPostNow };
