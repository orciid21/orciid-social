const cron = require('node-cron');
const prisma = require('../config/prisma');
const publisherService = require('./publisher.service');

// In-memory map of scheduled jobs: postId → cron task
const scheduledJobs = new Map();

// On server start, reload ALL pending scheduled posts from DB — including
// past-due ones. Deploys restart this process; a post whose time arrived while
// the server was down would otherwise stay SCHEDULED forever. schedulePost()
// publishes past-due posts immediately, so no extra handling is needed here.
const initScheduler = async () => {
  try {
    const pendingPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
      },
    });

    for (const post of pendingPosts) {
      await schedulePost(post.id, post.scheduledAt);
    }

    console.log(`Scheduler initialized: ${pendingPosts.length} posts loaded`);
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
