# PrepTalk - Performance Analyzer Agent PRD

**Version:** 1.0  
**Date:** September 2025  
**Status:** `Ready for Development`

---

## 1. Overview

### 1.1 Problem Statement
After completing a mock interview, users receive a raw transcript and recording. This is data, not insight. Users struggle to objectively assess their own performance, identify specific weaknesses, and find actionable steps for improvement. They need a "coach" to review their session and provide expert, data-driven feedback.

### 1.2 Proposed Solution
The **Performance Analyzer Agent** is an AI system that processes a completed interview session (transcript, audio metadata) to generate a detailed performance analysis. It identifies strengths, weaknesses, and actionable feedback, acting as a personalized post-interview coach.

### 1.3 Key Features
- **Transcript Ingestion**: Processes the full conversation transcript from a `session_round`.
- **Multi-Layer Analysis**: Evaluates performance across several dimensions:
    - **Communication Skills**: Pace, clarity, filler words, confidence.
    - **Technical Proficiency**: Accuracy and depth of answers.
    - **Problem-Solving**: Structure and logic of responses.
    - **Behavioral Traits**: Alignment with STAR method, enthusiasm.
- **Actionable Feedback Generation**: Creates specific, evidence-based feedback items.
- **Scoring & Benchmarking**: Provides an overall score and compares it to an ideal standard.
- **Data Persistence**: Saves the analysis to the database, linking it to the session.

### 1.4 Success Metrics
- **Primary**:
    - **Analysis Success Rate**: >97% of completed sessions are successfully analyzed.
    - **Feedback Helpfulness Score**: Average user rating of 4.6/5.0 on the quality of feedback items.
    - **Insight Generation**: 90% of analyses produce at least 3 distinct strengths and 3 areas for improvement.
- **Secondary**:
    - **Analysis Time**: p95 analysis generation time < 5 minutes per round.
    - **Score Correlation**: A positive correlation between our analysis score and user-perceived success in real interviews.

---

## 2. Agent Architecture & Logic

### 2.1 High-Level Flow
```mermaid
graph TD
    A[Start: Session Completed] --> B{1. Gather Data};
    B --> C{2. First Pass: Transcript Analysis};
    C --> D{3. Second Pass: Criteria-Based Scoring};
    D --> E{4. Third Pass: Synthesize & Generate Feedback};
    E --> F[5. Assemble & Save Analysis];
    F --> G[End: Analysis Ready];

    subgraph "Data Sources"
        direction LR
        DS1[Round Transcript] --> B;
        DS2[Curriculum Round (Rubric)] --> B;
        DS3[Audio Metrics] --> B;
    end

    subgraph "Analysis Passes"
        C --> C1[Identify filler words, pace];
        D --> D1[Score against each rubric item];
        E --> E1[Identify strengths & weaknesses];
    end
```

### 2.2 Detailed Step-by-Step Logic

1.  **Gather Data (Step 1)**
    - **Trigger**: A `session_rounds` record is marked as `completed`.
    - **Input**: `session_round_id`.
    - **Action**:
        - Fetch the full `round_transcripts` record, including the structured messages JSON.
        - Fetch the corresponding `curriculum_rounds` record to get the `evaluation_criteria` (the rubric).
        - Fetch any available audio metrics (e.g., speaking pace, silence duration).
    - **Output**: A consolidated "Session Context" object.

2.  **First Pass: Transcript Analysis (Step 2)**
    - **Input**: The "Session Context" object.
    - **Action**: This pass focuses on low-level, objective metrics from the transcript.
        - **Sentiment Analysis**: Tag each message from the candidate with a sentiment (positive, neutral, negative).
        - **Keyword Extraction**: Identify key technical terms, STAR method components ("situation," "task," "action," "result").
        - **Communication Metrics**:
            - Count filler words (`um`, `uh`, `like`).
            - Calculate candidate's speaking pace (words per minute).
            - Measure average response latency (time from end of interviewer question to start of candidate answer).
    - **LLM Prompt (Example)**: "Analyze the following transcript. Identify and count filler words. Extract key technical terms mentioned by the candidate. Tag each candidate response with its primary sentiment."
    - **Output**: An "Enriched Transcript" with metadata annotations.

3.  **Second Pass: Criteria-Based Scoring (Step 3)**
    - **Input**: "Enriched Transcript" and the `evaluation_criteria` from the curriculum.
    - **Action**: This is the core evaluation step. Loop through each criterion in the rubric.
        - For each `criterion` (e.g., "Problem Solving," "Communication"):
            - **LLM Prompt**: "You are an expert interviewer. Based on the provided transcript and the definition of **[Criterion Name]** from the rubric, evaluate the candidate's performance. Find specific examples from the transcript that demonstrate their skill. Assign a score from 0 to 100."
            - **Rubric Definition**: `criterion: {name: "Problem Solving", description: "Ability to break down complex problems...", rubric: {excellent: "...", good: "..."}}`
            - The prompt must include the rubric's definition of excellence for that specific criterion.
    - **Output**: A JSON object of scores, e.g., `{"Problem Solving": 85, "Communication": 70}`.

4.  **Third Pass: Synthesize & Generate Feedback (Step 4)**
    - **Input**: The criteria scores and the "Enriched Transcript".
    - **Action**: This pass synthesizes the scores into human-readable feedback.
        - **Identify Strengths & Weaknesses**:
            - High-scoring criteria are potential strengths.
            - Low-scoring criteria are potential weaknesses.
        - **Generate Actionable Items**:
            - **LLM Prompt**: "Based on the candidate's low score in **[Weakness Area]**, generate a specific, actionable feedback item. The feedback should follow the 'Situation-Impact-Improvement' model. Provide a direct quote from the transcript as evidence."
            - **Example Output**: `feedback_item: {category: 'improvement', skill: 'Communication', text: 'You used "um" 15 times, which can project a lack of confidence. Try pausing to think instead.', evidence: '...'}`.
    - **Output**: A list of `feedback_items` objects.

5.  **Assemble & Save Analysis (Step 5)**
    - **Action**:
        - Calculate the `overall_score` (weighted average of criteria scores).
        - Create a new record in the `round_analyses` table, storing the scores and summary.
        - Create associated records in the `feedback_items` table for each generated piece of feedback.
    - **Output**: The `analysis_id` of the newly created record.

---

## 3. Data Models & Storage

*The agent's output maps to the `round_analyses` and `feedback_items` tables.*

- **`round_analyses` Table**: Stores the high-level analysis.
    - `session_round_id`: Foreign key to the `session_rounds` table.
    - `overall_score`: The final calculated score.
    - `criteria_scores`: JSONB storing the score for each rubric item (from Step 3).
    - `top_strengths`: JSONB array of identified strengths.
    - `key_weaknesses`: JSONB array of identified weaknesses.
    - `analysis_model`: The LLM used for the analysis.

- **`feedback_items` Table**: Stores individual, actionable feedback points.
    - `analysis_id`: Foreign key to the `round_analyses` table.
    - `category`: 'strength', 'improvement', 'tip'.
    - `skill_area`: 'Communication', 'Problem Solving', etc.
    - `feedback_text`: The generated text for the user.
    - `transcript_evidence`: JSONB with quotes and timestamps as evidence.
    - `action_items`: JSONB with suggested actions and resources.

---

## 4. Technical Requirements

### 4.1 Dependencies
- **LLM Provider**: OpenAI (GPT-4-Turbo) or Anthropic (Claude 3 Opus). A model with a large context window is essential.
- **Database**: PostgreSQL.
- **Internal Data**: Access to `session_rounds`, `round_transcripts`, and `curriculum_rounds`.

### 4.2 API & Triggering

- **Trigger**: This agent is not triggered by a direct API call but by an event-driven process.
    - **Option 1 (DB Trigger)**: A PostgreSQL trigger on the `session_rounds` table that fires when `status` is updated to `completed`. The trigger would insert a job into a queue.
    - **Option 2 (Message Queue)**: The application logic that sets the session status to `completed` also publishes a message to a queue (e.g., RabbitMQ, SQS). A worker service consumes from this queue to start the analysis.
- **Job Queue**: A robust job queue (e.g., BullMQ, Celery) is required to manage asynchronous analysis tasks.

#### **Example Job Payload**
```json
{
  "jobType": "analyze_session_round",
  "sessionRoundId": "sr_abc123",
  "retries": 0
}
```

---

## 5. Error Handling & Edge Cases

- **Short/Empty Transcript**: If the transcript is too short for meaningful analysis, the agent should mark the analysis as `failed` with a reason like "Insufficient transcript data."
- **Missing Rubric**: If the `curriculum_round` has no `evaluation_criteria`, the agent should perform a "best-effort" analysis based on a generic rubric but flag the results as `low_confidence`.
- **LLM Hallucination**: Prompts must be engineered to be "grounded" in the transcript. Requesting direct quotes as evidence for every claim reduces the risk of hallucination.
- **Analysis Timeout**: A long transcript could lead to a very long analysis time. The process should be chunked if necessary, and a timeout should be in place (e.g., 10 minutes). If it times out, the job should be marked as failed.
- **Inconsistent Scoring**: To ensure consistency, use the same model and prompt versions for all analyses related to a single curriculum. Store the `analysis_prompt_version` with the results.

---

## 6. Future Improvements

- **V2: Audio-Based Analysis**: Integrate audio processing to analyze tone, intonation, and emotional sentiment, adding another layer of depth to the feedback.
- **V2: Cross-Session Analysis**: Analyze a user's performance across multiple interview sessions to track their progress over time. "Your use of filler words has decreased by 50% since your last practice!"
- **V3: Benchmarking Against Other Users**: Provide percentile rankings. "You scored in the 85th percentile for 'System Design' among all users preparing for this role."
- **V3: Real-Time Feedback (Streaming Analysis)**: As a much more advanced feature, provide live feedback to the user *during* the interview session. This would require a low-latency streaming architecture.