/**
 * Test script for Mod Mentions app
 * This script simulates the checkModMention function to test the moderator-to-moderator mention feature
 */

// Mock data
const mockModerators = ['Mod1', 'Mod2', 'Mod3'];
const mockSettings = {
  ignoreModeratorsToModerators: true, // Default setting
  requirePrefix: true,
  excludedMods: '',
  reportContent: false,
  lockContent: false,
  removeContent: false,
  modmailContent: true,
  webhookURL: ''
};

// Mock functions
function isModeratorMentioningModerator(authorName, text, settings) {
  // Check if author is a moderator
  const isAuthorModerator = mockModerators.includes(authorName);

  // Skip if author is moderator and setting is enabled
  if (settings.ignoreModeratorsToModerators && isAuthorModerator) {
    console.log(`Skipping because author u/${authorName} is a moderator`);
    return true;
  }

  // Parse excluded mods
  const excludedMods = settings.excludedMods.replace(/(\/?u\/)|\s/g, "");
  const excludedModsList = (excludedMods == "") ? [] : excludedMods.toLowerCase().split(",");
  excludedModsList.push('mod-mentions', 'automoderator'); // Always exclude app account and AutoModerator
  excludedModsList.push(authorName.toLowerCase()); // Skip self-mentions

  // Identify monitored moderators
  const modWatchList = [];
  mockModerators.forEach(moderator => {
    if (!excludedModsList.includes(moderator.toLowerCase())) {
      modWatchList.push(moderator);
    }
  });

  // Check if subreddit moderators are mentioned
  const mentionedMods = modWatchList.filter(moderator => {
    const search = (settings.requirePrefix ? "" : "?") + moderator;
    const regex = new RegExp(`(^|[^a-zA-Z0-9_\\/])(\\/?u\\/)${search}($|[^a-zA-Z0-9_\\/])`, 'i');
    return regex.test(text);
  });

  if (mentionedMods.length > 0) {
    console.log(`Moderator(s) mentioned: ${mentionedMods.join(', ')}`);
    return false; // Not skipped
  }

  return false; // No moderators mentioned
}

// Test cases
function runTests() {
  console.log('=== TEST CASE 1: Moderator mentioning another moderator (Default setting - ignore enabled) ===');
  const result1 = isModeratorMentioningModerator('Mod1', 'Hey u/Mod2, what do you think?', mockSettings);
  console.log(`Notification sent: ${!result1}\n`);

  console.log('=== TEST CASE 2: Regular user mentioning a moderator ===');
  const result2 = isModeratorMentioningModerator('RegularUser', 'I think u/Mod1 should look at this', mockSettings);
  console.log(`Notification sent: ${!result2}\n`);

  console.log('=== TEST CASE 3: Toggle setting OFF and test moderator-to-moderator mentions ===');
  const modifiedSettings = { ...mockSettings, ignoreModeratorsToModerators: false };
  const result3 = isModeratorMentioningModerator('Mod1', 'Hey u/Mod2, what do you think?', modifiedSettings);
  console.log(`Notification sent: ${!result3}\n`);

  console.log('=== TEST CASE 4.1: Moderator mentioning multiple moderators ===');
  const result4_1 = isModeratorMentioningModerator('Mod1', 'Hey u/Mod2 and u/Mod3, what do you think?', mockSettings);
  console.log(`Notification sent: ${!result4_1}\n`);

  console.log('=== TEST CASE 4.2: Moderator mentioning themselves ===');
  const result4_2 = isModeratorMentioningModerator('Mod1', 'As u/Mod1, I think...', mockSettings);
  console.log(`Notification sent: ${!result4_2}\n`);

  console.log('=== TEST CASE 4.3: Moderator mentioning both a moderator and a non-moderator ===');
  const result4_3 = isModeratorMentioningModerator('Mod1', 'Hey u/Mod2 and u/RegularUser, what do you think?', mockSettings);
  console.log(`Notification sent: ${!result4_3}\n`);
}

// Run the tests
runTests();
