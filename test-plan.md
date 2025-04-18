# Test Plan for Moderator-to-Moderator Mentions Feature

## Setup
1. Create a test subreddit with at least 3 moderators (Mod1, Mod2, Mod3)
2. Install the Mod Mentions app with default settings

## Test Cases

### Test Case 1: Moderator mentioning another moderator (Default setting - ignore enabled)
**Steps:**
1. Log in as Mod1
2. Create a post or comment that mentions Mod2 (e.g., "Hey u/Mod2, what do you think?")
3. Check the app logs and notification destinations

**Expected Result:**
- No notification should be sent
- App logs should show: "Skipping [id] because author u/Mod1 is a moderator"
- No modmail, Slack, or Discord notifications should be sent

### Test Case 2: Regular user mentioning a moderator
**Steps:**
1. Log in as a non-moderator user
2. Create a post or comment that mentions Mod1 (e.g., "I think u/Mod1 should look at this")
3. Check the app logs and notification destinations

**Expected Result:**
- Notification should be sent according to configured settings
- App logs should show processing of the mention
- Modmail, Slack, or Discord notifications should be sent if configured

### Test Case 3: Toggle setting OFF and test moderator-to-moderator mentions
**Steps:**
1. Change the app settings to set `ignoreModeratorsToModerators` to `false`
2. Log in as Mod1
3. Create a post or comment that mentions Mod2
4. Check the app logs and notification destinations

**Expected Result:**
- Notification should be sent
- App logs should NOT show the skipping message
- Modmail, Slack, or Discord notifications should be sent if configured

### Test Case 4: Edge Cases

#### 4.1: Moderator mentioning multiple moderators
**Steps:**
1. Ensure `ignoreModeratorsToModerators` is set to `true`
2. Log in as Mod1
3. Create a post or comment that mentions both Mod2 and Mod3
4. Check the app logs and notification destinations

**Expected Result:**
- No notification should be sent
- App logs should show the skipping message

#### 4.2: Moderator mentioning themselves
**Steps:**
1. Log in as Mod1
2. Create a post or comment that mentions themselves (e.g., "As u/Mod1, I think...")
3. Check the app logs

**Expected Result:**
- No notification should be sent
- This should be skipped both because of the moderator-to-moderator setting and because self-mentions are excluded

#### 4.3: Moderator mentioning both a moderator and a non-moderator
**Steps:**
1. Log in as Mod1
2. Create a post or comment that mentions both Mod2 and a non-moderator user
3. Check the app logs and notification destinations

**Expected Result:**
- No notification should be sent
- App logs should show the skipping message because the author is a moderator

#### 4.4: Username mentions with escaped characters
**Steps:**
1. Log in as a regular user
2. Create comments with the following variations:
   - `u/the\_danish\_dane` (escaped underscores)
   - `u/the_danish_dane` (regular underscores)
   - Mixed variations like `u/the_danish\_dane`
3. Check the app logs and notification destinations

**Expected Result:**
- All variations should trigger notifications
- App logs should show successful detection of mentions
- Modmail, Slack, or Discord notifications should be sent if configured
- No false positives for similar but non-matching usernames

## Verification
After running all tests, verify that:
1. The feature correctly ignores moderator-to-moderator mentions when enabled
2. The feature correctly processes moderator-to-moderator mentions when disabled
3. All edge cases are handled correctly
