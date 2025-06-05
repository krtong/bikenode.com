# 🧪 Discord Bot Claude Integration Testing Checklist

## 🚀 Setup & Basic Functionality (HIGH PRIORITY)

### 1. Bot Startup
- [ ] Start bot with `/usr/bin/python3 launch.py`
- [ ] Verify no errors in console
- [ ] Confirm "Bot connected as..." message
- [ ] Check bot shows as online in Discord

### 2. Basic Message Send
- [ ] Send: `!bike c Hello Claude`
- [ ] Verify bot responds with "📨 Message sent to Claude..."
- [ ] Check no errors in bot console

### 3. File System Verification
- [ ] Check `claude_messages.txt` exists
- [ ] Verify message format: `timestamp|channel_id|user_id|username|message`
- [ ] Confirm message content matches what was sent

### 4. Claude Reading Messages
- [ ] Run `python read_messages.py`
- [ ] Verify output shows correct message details
- [ ] Check timestamp, username, and message content

### 5. Claude Responding
- [ ] Run `python respond.py <channel_id> <user_id> "original" "response"`
- [ ] Verify "✅ Response saved" message
- [ ] Check `claude_responses.txt` has correct format

### 6. Discord Response Check
- [ ] Send: `!bike check`
- [ ] Verify embed shows with Claude's response
- [ ] Confirm original message is displayed
- [ ] Check timestamp is correct

## 🔧 Error Handling & Edge Cases (MEDIUM PRIORITY)

### 7. Command Errors
- [ ] Test: `!bike c` (no message)
- [ ] Test: `!bike check` (before any messages)
- [ ] Test: Very long message (>2000 chars)
- [ ] Verify graceful error handling

### 8. Multi-Channel Support
- [ ] Send messages from Channel A
- [ ] Send messages from Channel B
- [ ] Verify `!bike check` only shows channel-specific responses
- [ ] Test channel isolation

### 9. Multi-User Testing
- [ ] User 1 sends message
- [ ] User 2 sends message
- [ ] Verify both appear in `claude_messages.txt`
- [ ] Test responses delivered to correct users

### 10. Special Characters
- [ ] Test message with: `|` (pipe character)
- [ ] Test message with newlines
- [ ] Test message with emojis 🚀
- [ ] Test message with code blocks
- [ ] Verify proper escaping/handling

## 📊 Advanced Testing (LOW PRIORITY)

### 11. Message History
- [ ] Send multiple messages
- [ ] Add multiple responses
- [ ] Verify `!bike check` shows latest
- [ ] Test response ordering

### 12. Persistence Testing
- [ ] Send messages
- [ ] Restart bot
- [ ] Verify messages persist
- [ ] Test `!bike check` still works

## 🐛 Test Scenarios

### Happy Path Test:
```
1. !bike c What is Python?
2. python read_messages.py
3. python respond.py 123456 789012 "What is Python?" "Python is a programming language..."
4. !bike check
```

### Stress Test:
```
1. Send 10 messages rapidly
2. Check all appear in file
3. Respond to all
4. Verify all responses work
```

### Break Test:
```
1. Send message with: Hello|World|Test
2. Send 5000 character message
3. Delete claude_responses.txt and run !bike check
4. Send from DM vs channel
```

## 📝 Test Results Template

```markdown
Test: [Test Name]
Date: [Date/Time]
Result: ✅ PASS / ❌ FAIL
Notes: [What happened]
```

## 🎯 Success Criteria

- [ ] All HIGH priority tests pass
- [ ] No crashes during normal operation
- [ ] Messages reliably saved and retrieved
- [ ] Responses delivered correctly
- [ ] Error messages are user-friendly

## 🔄 Regression Tests

After any changes, re-run:
1. Basic message send/receive flow
2. Multi-channel test
3. Bot restart test

---

**Note**: Start with HIGH priority tests. Only proceed to MEDIUM/LOW if basics work perfectly.