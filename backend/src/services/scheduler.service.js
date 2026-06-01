const Bull = require('bull');
const prisma = require('../config/prisma');
const publisherService = require('./publisher.service');

const postQueue = new Bull('post-publishing', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// Process jobs
postQueue.process(async (job) => {
  const { postId } = job.data;
  await publisherService.publishPost(postId);
});

postQueue.on('failed', async (job, err) => {
  console.error(`Post job ${job.id} failed:`, err.message);
  await prisma.post.update({
    where: { id: job.data.postId },
    data: { status: 'FAILED', failReason: err.message },
  });
});

const schedulePost = async (postId, scheduledAt) => {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await postQueue.add({ postId }, { delay, jobId: `post-${postId}` });
};

const reschedulePost = async (postId, scheduledAt) => {
  await cancelPost(postId);
  await schedulePost(postId, scheduledAt);
};

const cancelPost = async (postId) => {
  const job = await postQueue.getJob(`post-${postId}`);
  if (job) await job.remove();
};

const publishPostNow = async (postId) => {
  await postQueue.add({ postId }, { jobId: `post-${postId}-now-${Date.now()}` });
};

module.exports = { schedulePost, reschedulePost, cancelPost, publishPostNow, postQueue };
