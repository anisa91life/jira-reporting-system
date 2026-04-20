const Groq = require('groq-sdk');

const analyzeSprintHealth = async (data) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            throw new Error("GROQ_API_KEY is not defined in .env");
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const sprintPhaseRaw = data.totalDays > 0 ? (data.sprintDay / data.totalDays) * 100 : 0;
        const sprintPhaseLabel = sprintPhaseRaw < 25 ? 'early (just started)'
            : sprintPhaseRaw < 60 ? 'mid-sprint'
            : sprintPhaseRaw < 85 ? 'late sprint'
            : 'final stretch or complete';

        const prompt = `You are a senior Project Manager / Scrum Master / CTO advisor analyzing Jira sprint health.

Your task is to produce a HUMAN, BALANCED, and REALISTIC sprint analysis.
Do not behave like a dashboard robot.
Do not just repeat metrics.
Interpret the sprint like an experienced delivery leader would in a PMO or CTO meeting.

IMPORTANT: Re-think the sprint deeply before writing the analysis.

=====================================
CONTEXT
=====================================

Sprint Name: ${data.sprintName}
Status: ${data.sprintStatus}
Current Day: Day ${data.sprintDay} of ${data.totalDays} (${sprintPhaseLabel}) — ${data.progressPercent || 0}% through the sprint
Rollover items from previous sprint: ${data.rolloverCount || 0}

STATUS DISTRIBUTION (how tasks are spread across workflow stages):
${JSON.stringify(data.statusDistribution, null, 2)}

TEAM WORKLOAD BREAKDOWN (per person — this is the accurate data, NOT just ticket count):
Each entry includes:
- activeTickets: tickets in To Do or In Progress (real active work)
- activePoints: story points of active work (primary workload signal — THIS MATTERS MOST)
- lateStageTickets: tickets in Code Review / Ready for QA / Ready for Stage (near complete, NOT heavy workload)
- lateStagePoints: story points of near-complete work
- doneTickets: completed this sprint
- rolloverTickets: items carried over from the previous sprint
- totalTickets: all assigned tickets (DO NOT use this alone to assess workload)
${JSON.stringify(data.assigneeWorkload && Object.keys(data.assigneeWorkload).length > 0 ? data.assigneeWorkload : data.assigneeDistribution, null, 2)}

KEY METRICS (for reference only — do not repeat these verbatim):
${JSON.stringify(data.metrics, null, 2)}

=====================================
CORE ANALYSIS RULES
=====================================

1. Do NOT judge workload only by number of assigned tickets.
   Ticket count alone is misleading.

2. Story points matter more than ticket count.
   When evaluating team member workload:
   - Use ACTIVE story points as the primary signal
   - Use active ticket count only as a secondary signal

3. If a team member has many assigned tickets, but their ACTIVE story points are below 15 for the sprint, this is usually manageable and should NOT automatically be described as overload.

4. Be very careful with status interpretation.
   Not all non-Done statuses mean active workload or risk.

   ACTIVE EXECUTION WORK:
   - To Do
   - In Progress
   - Blocked
   - Ready for Dev
   - Any equivalent active execution status

   LATE-STAGE / NEAR-COMPLETE WORK:
   - Code Review
   - Ready for QA
   - QA Review
   - Staging
   - Any status that means the implementation is mostly finished and waiting for review/testing/release

   EFFECTIVELY DONE / SHOULD NOT BE TREATED AS PROBLEMATIC:
   - Done
   - Closed
   - Released
   - Ready for Prod
   - Ready For Release (IMPORTANT: in this project, Ready For Release means the work is essentially complete and should be treated like Done)

5. Rollover items must be interpreted carefully.
   If an item is rollover from a previous sprint but is already in a late-stage status such as Code Review, Ready for QA, or Ready For Release, do NOT treat it as heavy new workload.
   Instead, interpret it as carry-over that is already near completion.

6. This sprint may still be ACTIVE and in early or mid phase.
   Do NOT overreact to incomplete delivery early in the sprint.
   Use caution when interpreting commitment reliability and delivery signals before the sprint is near completion.

7. If the data is incomplete, unstable, or still too early in the sprint, explicitly mention that and lower your confidence.

=====================================
WHAT TO FOCUS ON
=====================================

Analyze the sprint as a whole and explain:

1. Overall sprint health — Green / Yellow / Red
   - Only flag Red if there is a genuine systemic risk
   - If early sprint with no serious blockers, lean toward Green or Yellow/Monitoring

2. What stands out most
   - Real observations only — flow, bottlenecks, team balance
   - Could be positive or concerning

3. Main delivery risks — max 3–4
   - No generic risks
   - Only flag what you genuinely see in this data

4. Likely causes
   - Explain the WHY behind what you observe
   - Think like a PM who knows the team dynamics

5. Practical suggested actions — MOST IMPORTANT
   - Things a Scrum Master or PM would actually do THIS WEEK
   - Specific, not generic
   - "Run a 15-min daily blocker standup focused on Code Review age" is better than "improve communication"

=====================================
WORKLOAD INTERPRETATION RULES
=====================================

When discussing individual team members:
- First look at ACTIVE story points
- Then look at ACTIVE tickets (To Do + In Progress only)
- Then consider late-stage tickets
- Then consider rollover items

Do NOT say someone is overloaded just because they have many assigned tickets.
If most of their tickets are late-stage or effectively done, say that clearly.

Use phrasing like:
- "Although this person has many assigned tickets, much of the work is already in late stages, so the true active load appears lower."
- "The raw ticket count looks high, but active story points remain within a manageable range."
- "A portion of the assigned work is rollover that is already nearing completion."

=====================================
OUTPUT STYLE
=====================================

Write in a natural human tone, like a senior PM or delivery lead speaking in a project review.

Do NOT write like:
- "Metric X indicates..."
- "Based on the data..."
- "The dashboard shows..."

Instead write like:
- "What stands out here is..."
- "At this stage of the sprint..."
- "The main concern is not the raw number of tickets, but..."
- "This does not yet look like a serious delivery issue because..."

=====================================
FINAL INSTRUCTION
=====================================

Before giving the answer, carefully re-evaluate the sprint using:
- story points over ticket count
- active vs late-stage statuses
- rollover context
- project-specific meaning of Ready For Release (= effectively done)
- sprint phase and how much signal is actually available

The final output must be thoughtful, realistic, and useful for a PMO / CTO discussion.

=====================================
OUTPUT FORMAT
=====================================

Return ONLY a valid JSON object. No markdown. No explanation outside the JSON.

{
  "overallAssessment": "Green | Yellow | Red — followed by a short 1-2 sentence human interpretation of where this sprint stands right now",
  "whatStandsOut": "1-2 real observations written in plain language — could be positive or concerning",
  "mainRisks": [
    "Specific, meaningful risk described in plain English"
  ],
  "likelyCauses": [
    "Educated explanation of WHY this is happening"
  ],
  "suggestedActions": [
    "Practical, specific action a PM or Scrum Master would take this week"
  ],
  "confidence": "Low | Medium | High — with a short reason (e.g. Low because sprint is only on day 3 of 14)"
}
`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.5
        });

        const responseText = chatCompletion.choices[0].message.content;

        try {
            const jsonResponse = JSON.parse(responseText);
            console.log("[AI] Groq analysis complete. Overall:", jsonResponse.overallAssessment);
            return jsonResponse;
        } catch (parseError) {
            console.error("Failed to parse Groq response as JSON:", parseError);
            console.log("Raw response was:", responseText);
            return getFallbackResponse();
        }

    } catch (error) {
        console.error("Error communicating with Groq API:", error);
        return getFallbackResponse();
    }
};

const getFallbackResponse = () => ({
    overallAssessment: "yellow — Could not generate AI analysis due to an error.",
    whatStandsOut: "Analysis unavailable.",
    mainRisks: [],
    likelyCauses: [],
    suggestedActions: ["Manually review sprint metrics and check the server logs."],
    confidence: "low — Analysis failed to complete."
});

module.exports = {
    analyzeSprintHealth
};
