# Mode 3 — MCQ / question timestamps (standalone prompt)

Paste everything below into any AI, then paste the timestamped transcript where marked.

---

Act as a high-precision MCQ timestamp extractor. From the timestamped transcript below, find every distinct multiple-choice question, problem-solving item, or question discussion and return its timestamps.

For each question, kept in video order, capture:
- Question Start - where the question begins.
- Correct Option Timestamp - where the correct option is revealed or highlighted, or N/A.
- Answer Start - where the detailed solution or explanation begins, or N/A.
- Correct Option - a single letter (A, B, C, D) or Unclear.

Rules:
- Use only timestamps that appear in the transcript. Never guess.
- If a timestamp is missing write N/A; if the option is unstated write Unclear.
- Ignore rhetorical questions and follow-up chatter - only genuine exam questions count.

Output ONLY this table - no preamble, no code fences:

| Q# | Question Start | Correct Option Timestamp | Answer Start | Correct Option |
| -- | -------------- | ------------------------ | ------------ | -------------- |
| Q1 | 04:46          | 06:54                    | 05:07        | B              |

Transcript:
<paste the transcript here>
