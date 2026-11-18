# CP1: Draft Evaluation Plan

## 1. Success Definition

We will know our tool works if **at least 4 out of 5 researchers outside our team can retrieve and correctly interpret relevant documented experimental context within 5 minutes using the prototype**, without needing additional clarification to identify the information required for the task.

We will evaluate this outcome through task completion time, retrieval accuracy, contextual understanding, and the need for additional clarification. The 5-minute target is an initial evaluation benchmark, not a threshold established by the CP1 interviews.

The evaluation will focus on three types of information identified in CP1: 
(1) protocol modifications and experimental parameters
(2) the reasons behind previous experimental adjustments
(3) troubleshooting experiences, including failed attempts and how problems were resolved.

## 2. Target Users

* **Profile:** Graduate students and research assistants working in a shared academic wet lab who conduct experiments, maintain experimental records, or need to repeat or take over procedures previously performed by labmates. Both less-experienced researchers seeking existing procedures and experienced researchers whose experimental knowledge is frequently requested are relevant user groups.
* **Evaluation Sample:** Recruit approximately 4–5 researchers from the same academic wet lab who are outside our project team. Where possible, include both less-experienced researchers who need to retrieve labmates' experimental knowledge and experienced researchers who are frequently asked about their procedures. We will prioritize participants from the CP1 discovery study, subject to availability, to evaluate the prototype against the workflows and documentation practices already identified.
* **Access Strategy:** Recruit through existing contacts in the participating laboratory. Use de-identified or appropriately authorized experimental records and avoid exposing confidential, unpublished, or patent-sensitive information. If representative historical records cannot be shared, use anonymized or researcher-approved scenarios based on the interview findings.

## 3. Method

* **Evaluation Type:** Structured observation of scenario-based retrieval tasks, followed by a brief semi-structured interview.
* **Timing:** Run the sessions in **Weeks 13–14 (Nov 30 – Dec 13)**, after the CP2 prototype is ready (Week 12, Nov 23), so that results and any design changes can be reported in CP3 (Week 15, Dec 14). Before that, we will do a dry run within the team to check the scenarios and task timing.

* **Execution step**

1. **Step 1. Scenario Preparation:** 
Develop realistic tasks based on the interview findings. Examples include locating a labmate's previous protocol modification, finding the reason for a particular parameter change, or identifying a documented solution to a previously encountered experimental problem. Scenarios should use information that is available to the participant or explicitly included in the test materials.

2. **Step 2. Baseline Task:** 
Ask participants to complete a comparable information-retrieval task using their current practices, such as searching Benchling, Google Drive, the lab NAS, or personal notes, or identifying what additional information they would need from a colleague. Record the time required, the information found, and whether clarification from another researcher is necessary. Asking a colleague should be recorded as a legitimate existing workflow, not automatically treated as a failure.

3. **Step 3. Prototype Task:**
Ask participants to complete a comparable task using the proposed tool. Measure task completion time, whether they identify the correct experimental context, whether they correctly interpret the retrieved information, and whether they can distinguish documented facts from missing or uncertain information.
At least one prototype task uses a question whose answer exists only in a saved discussion (03, D3‑4), for example one saved during the contributor task or the team dry run, using an approved sample. This tests the core collaboration claim: once a contributor's answer is saved, the next requester can find it without asking that contributor again.

4. **Step 4. Contributor Task:**
Ask the experienced participants to act as the `contributor` (see 03, D2‑3a / D2‑3b). Each uploads one of their own records that they are willing to share, or an approved sample record, then reviews the record the tool extracts and confirms or corrects it. Record the time taken, the number and type of corrections, and whether the tool invented any detail that was not in the original. This tests the other side of the collaboration: Participant A would share files if it stopped repeated questions, but would reconsider if it meant reorganizing files (02 §3).

5. **Step 5. Comparative Analysis:**
Compare baseline and prototype performance across the tasks. Because the sample is small, focus on individual task outcomes, descriptive summaries, and observed usability issues rather than claiming statistically significant improvements. Where possible, use comparable tasks and vary task order to reduce practice effects.

6. **Step 6. Post-Task Interview:** 
Ask participants whether the retrieved information was understandable and relevant, whether they would still need to consult the original experimenter, what information was missing, and whether the tool would fit their existing workflow. Ask contributors whether the review step is acceptable extra work for their real records. Also investigate concerns about documentation effort, data access, confidentiality, and trust in retrieved experimental records.

* **Metrics Collected:**
  * **Task completion time:** Time taken to locate the required information.
  * **Retrieval accuracy:** Whether the retrieved information matches a predefined answer key or the verified historical record.
  * **Context completeness:** Whether the information includes relevant experimental conditions, protocol modifications, reasons for changes, and troubleshooting outcomes where available.
  * **Clarification need:** Whether the participant needs additional information from the original experimenter or another lab member.
  * **Saved-answer reuse:** Whether the participant finds the answer from a saved discussion without needing to contact the original contributor.
  * **Contributor effort:** Time to review and confirm an extracted record, and the number of corrections needed.
  * **User confidence and usability:** Participants' reported confidence in understanding the information and their willingness to use the tool in future work.
  * **Performance improvement:** Compare task completion time and retrieval accuracy between the existing workflow and the prototype for comparable tasks. Report whether the prototype improves retrieval performance and identify cases where existing practices remain more effective.

## 4. Minimum Evidence Threshold

The initial evaluation will use **five researchers where feasible**. The following thresholds are provisional criteria for deciding whether the prototype merits further development, rather than evidence of general effectiveness across laboratories.

* **Finding the Right Information:** At least **4 out of 5 participants (80%)** correctly locate the relevant documented experimental context or protocol modification within **5 minutes** using the prototype, without requiring additional clarification to identify the information needed for the task.
* **Understanding the Information:** At least **4 out of 5 participants (80%)** correctly explain the relevant experimental details and distinguish documented findings from missing or uncertain information.
* **Usefulness for Experimental Work:** At least **4 out of 5 participants (80%)** report that the retrieved information would help them understand the previous experiment or decide what information to verify before proceeding.
* **Improvement over Current Practice:** For at least **4 out of 5 participants**, the prototype task is either faster than the comparable baseline task or finds information that the baseline search missed. If the prototype does no better than current practice, the retrieval results above are not enough on their own.
* **Acceptable Contributor Effort:** Every experienced participant who does the contributor task (we aim for at least two) confirms an extracted record within **5 minutes** and says they would do this for their real records. Like the retrieval target, the 5-minute figure is an initial benchmark, not a number from the interviews.
* **Safety and reliability:** No observed instance of the tool presenting an invented experimental parameter or unsupported troubleshooting claim as a verified fact. Any such instance will trigger a review of the retrieval, presentation, and verification mechanisms before further testing.

The evaluation will also document cases where the prototype does not outperform current practices, where participants still need to consult colleagues, and where existing records do not contain the information required to answer the task. These outcomes will help distinguish retrieval problems that the tool could address from undocumented knowledge that must first be captured. Given the small, single-laboratory sample, results will be treated as formative usability and feasibility evidence. 

## 5. Human-AI Boundary

The tool uses AI. As described in 03, the `encoder` and `decoder` are local language models, so experimental records are not sent to an outside AI service.

**What the AI decides**

* **Drafting records:** The `encoder` turns an uploaded record into a draft `M`, and decides whether the record is clear enough or needs follow-up questions to the `contributor` (03, D2‑3a / D2‑3b).
* **Answering:** The `decoder` decides which stored records are relevant to a question and how to summarize them, and always links the original records it used and names their contributors (03, D3‑1).
* **Knowing when it cannot answer:** The `decoder` decides whether the stored records are enough to answer. If they are not, it says what is missing or uncertain instead of guessing (03, D3‑2).
* **Suggesting a person:** If the `requester` asks, the `decoder` suggests the `contributor` with the most relevant records (03, D3‑3).

**What the humans decide**

* **The contributor** decides what to upload, and confirms or corrects every draft `M`. Nothing enters the `M database` without a contributor's confirmation (03, D2‑3a).
* **The requester** decides whether to see hints or a full answer (03, D3‑1a), whether to ask a person, and which contributor to ask. The requester can ignore the AI's suggestion. The requester and contributor also decide together whether a discussion resolved the question and should be saved (03, D3‑4).
* **Every researcher** checks experimental parameters against the linked original record before using them, and makes all experimental and safety decisions. The AI never passes a requester's question to another person without the requester's consent (03, D3‑2 / D3‑3).

**Not decided yet, and when we will decide**

* **Which local model, and whether it is good enough:** Our only confirmed hardware is one team member's lab machine with an 8 GB GPU. We will test extraction and answering on sample records during the build phase and decide before CP2 (Week 12). If a local model is not accurate enough, we will revisit the design and record the change in `DECISIONS.md`.
* **The rule for "enough to answer" (03, D3‑1 / D3‑2):** This is still an open question in 03. We will set it during the build phase and check it in the safety criterion above.