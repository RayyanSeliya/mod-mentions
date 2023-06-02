import { Devvit, getSetting, RedditAPIClient } from '@devvit/public-api';
import { CommentSubmit, Metadata, PostSubmit } from '@devvit/protos';

const reddit = new RedditAPIClient();
const lc = Devvit.use(Devvit.Types.RedditAPI.LinksAndComments);
Devvit.use(Devvit.Types.HTTP);

Devvit.addSettings([
  {
    type: 'boolean',
    name: 'reportContent',
    label: 'Report Content',
    helpText: 'Submit report on content that mentions a subreddit moderator',
    defaultValue: true
  },
  {
    type: 'boolean',
    name: 'lockContent',
    label: 'Lock Content',
    helpText: 'Lock content that mentions a subreddit moderator',
    defaultValue: false
  },
  {
    type: 'boolean',
    name: 'removeContent',
    label: 'Remove Content',
    helpText: 'Remove content that mentions a subreddit moderator',
    defaultValue: false
  },
  {
    type: 'boolean',
    name: 'modmailContent',
    label: 'Send Modmail',
    helpText: 'Send modmail about content that mentions a subreddit moderator',
    defaultValue: false
  },
  {
    type: 'string',
    name: 'slackWebhook',
    label: 'Slack Webhook URL',
    helpText: 'Send notification to Slack about content that mentions a subreddit moderator',
    defaultValue: "",
    onValidate: (event) => {
      if (event.value && !(event.value?.startsWith("https://hooks.slack.com/")))
        return "Must be valid Slack webhook URL";
    }
  },
  {
    type: 'string',
    name: 'discordWebhook',
    label: 'Discord Webhook URL',
    helpText: 'Send notification to Discord about content that mentions a subreddit moderator',
    defaultValue: "",
    onValidate: (event) => {
      if (event.value && !(event.value?.startsWith("https://discord.com/api/webhooks/")))
        return "Must be valid Discord webhook URL";
    }
  },
  {
    type: 'string',
    name: 'excludedMods',
    label: 'Exclude Moderators',
    helpText: 'Comma-separated list of subreddit moderators to exclude from notifications and actions',
    defaultValue: "AutoModerator"
  }
]);

Devvit.addTrigger({
  event: Devvit.Trigger.PostSubmit,
  handler: checkPostModMention
});

Devvit.addTrigger({
  event: Devvit.Trigger.CommentSubmit,
  handler: checkCommentModMention
});

async function checkPostModMention(event: PostSubmit, metadata?: Metadata) {

  const reportContent = await getSetting('reportContent', metadata) as boolean;
  const lockContent = await getSetting('lockContent', metadata) as boolean;
  const removeContent = await getSetting('removeContent', metadata) as boolean;
  const modmailContent = await getSetting('modmailContent', metadata) as boolean;
  const slackWebhook = await getSetting('slackWebhook', metadata) as string;
  const discordWebhook = await getSetting('discordWebhook', metadata) as string;

  if (!reportContent && !lockContent && !removeContent && !modmailContent && !slackWebhook && !discordWebhook)
    throw new Error('No actions are enabled in app configuration');

  let excludedMods = await getSetting('excludedMods', metadata) as string;
  excludedMods = excludedMods.replace(/(\/?u\/)|\s/g, ""); // Strip out user tags and spaces
  const excludedModsList = excludedMods.toLowerCase().split(",");
  excludedModsList.push('mod-mentions');

  // Get list of subreddit moderators, excluding any defined in configuration
  // Has trouble on subreddits with a large number of moderators (e.g. r/science)
  const subreddit = await reddit.getSubredditById(String(event.subreddit?.id), metadata);
  const moderators = [];
  for await(const moderator of subreddit.getModerators())
    if (!excludedModsList.includes(moderator.username.toLowerCase()))
      moderators.push(moderator.username);

  // Check if any subreddit moderators are mentioned in post title or text
  // Not robust, only returns first mention and cannot handle substrings (e.g. u/spez vs. u/spez_bot)
  const post = await reddit.getPostById(String(event.post?.id), metadata);
  const textLowerCase = post.title.toLowerCase() + " " + String(post.body).toLowerCase();
  const index = moderators.findIndex(v => textLowerCase.includes(`u/${v.toLowerCase()}`));

  if (index >= 0) {

    const moderator = moderators[index];
    console.log(`${post.id} mentions u/${moderator}`);
    const permalink = `https://www.reddit.com${post.permalink}`;
    
    // Report Post
    if (reportContent) {
      await lc.Report(
        {
          thingId: post.id,
          reason: `Post mentions the moderator u/${moderator}`
        },
        metadata
      );
      console.log(`Reported ${post.id}`);
    }

    // Lock Post
    if (lockContent) {
      await post.lock();
      console.log(`Locked ${post.id}`);
    }

    // Remove Post
    if (removeContent) {
      await post.remove();
      console.log(`Removed ${post.id}`);
    }

    // Send Modmail
    if (modmailContent) {
      const text = `The following post by u/${post.authorName} mentions the moderator u/${moderator}:\n\n` +
                  `**Link:** https://www.reddit.com${post.permalink}\n\n` +
                  `**Title:** ${post.title}` +
                  ((post.body) ? `\n\n**Body:** ${post.body}` : "")
      await reddit.sendPrivateMessage(
        {
          to: `/r/${subreddit.name}`,
          subject: "Moderator Mentioned",
          text: text,
        },
        metadata
      );
      console.log(`Sent modmail about ${post.id}`);
    }

    // Send to Slack
    if (slackWebhook) {
      const slack_payload = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `u/${moderator} has been mentioned in a post:`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Link:* https://www.reddit.com${post.permalink}\n` +
                      `*User:* <https://www.reddit.com/user/${post.authorName}|u/${post.authorName}>\n` +
                      `*Title:* ${post.title}` +
                      ((post.body) ? `\n*Body:* ${post.body}` : "")
              }
            ]
          }
        ]
      };
      await fetch(slackWebhook, {
        method: 'POST',
        body: JSON.stringify(slack_payload)
      });
      console.log(`Sent Slack message about ${post.id}`);
    }

    // Send to Discord
    if (discordWebhook) {
      const discord_payload = {
        username: "Moderator Mentions",
        content: `u/${moderator} has been mentioned in a post`,
        embeds: [
          {
            fields: [
              {
                name: "Link",
                value: permalink
              },
              {
                name: "User",
                value: `[u/${post.authorName}](https://www.reddit.com/user/${post.authorName})`
              },
              {
                name: "Title",
                value: post.title
              }
            ]
          }
        ]
      };

      if (post.body)
        discord_payload.embeds[0].fields.push({
          name: "Body",
          value: post.body
        });

      await fetch(discordWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(discord_payload)
      });
      console.log(`Sent Discord message about ${post.id}`);
    }

  }
}

async function checkCommentModMention(event: CommentSubmit, metadata?: Metadata) {

  const reportContent = await getSetting('reportContent', metadata) as boolean;
  const lockContent = await getSetting('lockContent', metadata) as boolean;
  const removeContent = await getSetting('removeContent', metadata) as boolean;
  const modmailContent = await getSetting('modmailContent', metadata) as boolean;
  const slackWebhook = await getSetting('slackWebhook', metadata) as string;
  const discordWebhook = await getSetting('discordWebhook', metadata) as string;

  if (!reportContent && !lockContent && !removeContent && !modmailContent && !slackWebhook && !discordWebhook)
    throw new Error('No actions are enabled in app configuration');

  let excludedMods = await getSetting('excludedMods', metadata) as string;
  excludedMods = excludedMods.replace(/(\/?u\/)|\s/g, ""); // Strip out user tags and spaces
  const excludedModsList = excludedMods.toLowerCase().split(",");
  excludedModsList.push('mod-mentions');

  // Get list of subreddit moderators, excluding any defined in configuration
  // Has trouble on subreddits with a large number of moderators (e.g. r/science)
  const subreddit = await reddit.getSubredditById(String(event.subreddit?.id), metadata);
  const moderators = [];
  for await(const moderator of subreddit.getModerators())
    if (!excludedModsList.includes(moderator.username.toLowerCase()))
      moderators.push(moderator.username);

  // Check if any subreddit moderators are mentioned in comment text
  // Not robust, only returns first mention and cannot handle substrings (e.g. u/spez vs. u/spez_bot)
  const comment = await reddit.getCommentById(String(event.comment?.id), metadata);
  const bodyLowerCase = comment.body.toLowerCase();
  const index = moderators.findIndex(v => bodyLowerCase.includes(`u/${v.toLowerCase()}`));

  if (index >= 0) {

    const moderator = moderators[index];
    console.log(`${comment.id} mentions u/${moderator}`);

    const permalink = `https://www.reddit.com/r/${subreddit.name}` + 
                      `/comments/${comment.postId.slice(3)}` +
                      `/comment/${comment.id.slice(3)}/`;
    
    // Report Comment
    if (reportContent) {
      await lc.Report(
        {
          thingId: comment.id,
          reason: `Comment mentions the moderator u/${moderator}`
        },
        metadata
      );
      console.log(`Reported ${comment.id}`);
    }

    // Lock Comment
    if (lockContent) {
      await comment.lock();
      console.log(`Locked ${comment.id}`);
    }

    // Remove Comment
    if (removeContent) {
      await comment.remove();
      console.log(`Removed ${comment.id}`);
    }

    // Send Modmail
    if (modmailContent) {
      const text = `The following comment by u/${comment.authorName} mentions the moderator u/${moderator}:\n\n` +
                  `**Link:** ${permalink}\n\n` +
                  `**Body:** ${comment.body}`
      await reddit.sendPrivateMessage(
        {
          to: `/r/${subreddit.name}`,
          subject: "Moderator Mentioned",
          text: text,
        },
        metadata
      );
      console.log(`Sent modmail about ${comment.id}`);
    }

    // Send to Slack
    if (slackWebhook) {
      const slack_payload = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `u/${moderator} has been mentioned in a comment:`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Link:* ${permalink}\n` +
                      `*User:* <https://www.reddit.com/user/${comment.authorName}|u/${comment.authorName}>\n` +
                      `*Body:* ${comment.body}`
              }
            ]
          }
        ]
      };
      await fetch(slackWebhook, {
        method: 'POST',
        body: JSON.stringify(slack_payload)
      });
      console.log(`Sent Slack message about ${comment.id}`);
    }
  
    // Send to Discord
    if (discordWebhook) {
      const discord_payload = {
        username: "Moderator Mentions",
        content: `u/${moderator} has been mentioned in a comment`,
        embeds: [
          {
            fields: [
              {
                name: "Link",
                value: permalink
              },
              {
                name: "User",
                value: `[u/${comment.authorName}](https://www.reddit.com/user/${comment.authorName})`
              },
              {
                name: "Body",
                value: comment.body
              }
            ]
          }
        ]
      };
      await fetch(discordWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(discord_payload)
      });
      console.log(`Sent Discord message about ${comment.id}`);
    }
  }
}

export default Devvit;