# Clarifying Questions - GitHub Comment Template

Use this template when posting clarifying questions as a GitHub comment.

## Template Format

```markdown
## 📋 Clarification Questions

I've analyzed the requirements and need clarification before creating the implementation plan:

**1.** [Question 1 - specific and answerable]

**2.** [Question 2 - specific and answerable]

**3.** [Question 3 - specific and answerable]

---

**How to Answer:**

Please reply to this comment with your answers. You can format your reply in any of these ways:

**Option 1: Quoted reply (GitHub quote feature)**
```
> **1.** [Your answer to question 1]
>
> **2.** [Your answer to question 2]
>
> **3.** [Your answer to question 3]
```

**Option 2: Numbered list**
```
1. [Your answer to question 1]

2. [Your answer to question 2]

3. [Your answer to question 3]
```

**Option 3: Bold numbered format**
```
**1.** [Your answer to question 1]

**2.** [Your answer to question 2]

**3.** [Your answer to question 3]
```

Once all questions are answered with the exact numbered format, I'll automatically generate the implementation plan.

You can also manually trigger planning with `workflow: clarify` when ready.

**Workflow ID:** `{workflow_id}`

🤖 Gango ADW - Clarification Phase
```

## Tips

- **No limits on question count** - ask as many questions as needed for complete understanding
- Keep questions specific and answerable
- Each question should be independent (no sub-questions)
- Focus on requirements clarification, not implementation
- **Quality over quantity** - prefer fewer focused questions over many shallow ones
- Use simple, clear language
- Avoid jargon or complex terminology
- Ask only what is truly essential for creating an accurate plan

## Answer Format Requirement

**IMPORTANT:** Answers must be in exact numbered format:
- `1. ` - Simple numbered format
- `> 1. ` - Quoted format (GitHub reply feature)
- `**1.** ` - Bold format

The workflow auto-detects answers using these exact patterns. Other formats won't be recognized.

## Examples

### Good Clarification Set

**Issue:** "Add workout challenge feature"

**Example:** (Number of questions will vary based on issue complexity - this example shows 5, but you may need fewer or more)

```
1. Should challenges have time limits (daily, weekly, monthly)?

2. Can users create custom challenges or only use predefined ones?

3. Should achievements/badges be awarded for completing challenges?

4. Does leaderboard ranking include all users or just friends?

5. Should challenge progress sync across devices in real-time?
```

### User Answer Format (Correct)

**Note:** Answer count matches the number of questions asked (variable based on issue)

```
1. Yes, daily, weekly, and monthly time limits

2. Both custom and predefined challenges

3. Yes, badges should be awarded

4. Leaderboard should include all users

5. Yes, real-time sync across devices
```

### User Answer Format (Incorrect - Won't be detected)

```
Challenge Time Limits: Daily, weekly, monthly
Custom Challenges: Yes
Achievements: Yes
Leaderboard: All users
Real-time Sync: Yes
```
