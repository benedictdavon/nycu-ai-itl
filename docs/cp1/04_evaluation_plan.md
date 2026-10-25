### 2. Evaluation Plan

#### 2.1 Success Definition

We will know our tool works if **at least 4 out of 5 researchers outside our team can retrieve and correctly interpret relevant documented experimental context within 5 minutes using the prototype**, without needing additional clarification to identify the information required for the task.

We will evaluate this outcome through task completion time, retrieval accuracy, contextual understanding, and the need for additional clarification. The 5-minute target is an initial evaluation benchmark, not a threshold established by the CP1 interviews.

The evaluation will focus on three types of information identified in CP1: 
(1) protocol modifications and experimental parameters
(2) the reasons behind previous experimental adjustments
(3) troubleshooting experiences, including failed attempts and how problems were resolved.

#### 2.2 Target Users

* **Profile:** Graduate students and research assistants working in a shared academic wet lab who conduct experiments, maintain experimental records, or need to repeat or take over procedures previously performed by labmates. Both less-experienced researchers seeking existing procedures and experienced researchers whose experimental knowledge is frequently requested are relevant user groups.
* **Evaluation Sample:** Recruit approximately 4–5 researchers from the same academic wet lab who are outside our project team. Where possible, include both less-experienced researchers who need to retrieve labmates' experimental knowledge and experienced researchers who are frequently asked about their procedures. We will prioritize participants from the CP1 discovery study, subject to availability, to evaluate the prototype against the workflows and documentation practices already identified.
* **Access Strategy:** Recruit through existing contacts in the participating laboratory. Use de-identified or appropriately authorized experimental records and avoid exposing confidential, unpublished, or patent-sensitive information. If representative historical records cannot be shared, use anonymized or researcher-approved scenarios based on the interview findings.

#### 2.3 Method

* **Evaluation Type:** Structured observation of scenario-based retrieval tasks, followed by a brief semi-structured interview.
* **Timing:** Conduct the evaluation within 1–2 weeks after the AI tool is completed, once the prototype and test scenarios are ready, and before the end-of-semester project evaluation.

* **Execution step**

1. **Step 1. Scenario Preparation:** 
Develop realistic tasks based on the interview findings. Examples include locating a labmate's previous protocol modification, finding the reason for a particular parameter change, or identifying a documented solution to a previously encountered experimental problem. Scenarios should use information that is available to the participant or explicitly included in the test materials.**

2. **Step 2. Baseline Task:** 
Ask participants to complete a comparable information-retrieval task using their current practices, such as searching Benchling, Google Drive, the lab NAS, or personal notes, or identifying what additional information they would need from a colleague. Record the time required, the information found, and whether clarification from another researcher is necessary. Asking a colleague should be recorded as a legitimate existing workflow, not automatically treated as a failure.

3. **Step 3. Prototype Task:**
Ask participants to complete a comparable task using the proposed tool. Measure task completion time, whether they identify the correct experimental context, whether they correctly interpret the retrieved information, and whether they can distinguish documented facts from missing or uncertain information.

4. **Step 4. Comparative Analysis:**
Compare baseline and prototype performance across the tasks. Because the sample is small, focus on individual task outcomes, descriptive summaries, and observed usability issues rather than claiming statistically significant improvements. Where possible, use comparable tasks and vary task order to reduce practice effects.

5. **Step 5. Post-Task Interview:** 
Ask participants whether the retrieved information was understandable and relevant, whether they would still need to consult the original experimenter, what information was missing, and whether the tool would fit their existing workflow. Also investigate concerns about documentation effort, data access, confidentiality, and trust in retrieved experimental records.

* **Metrics Collected:**
  * **Task completion time:** Time taken to locate the required information.
  * **Retrieval accuracy:** Whether the retrieved information matches a predefined answer key or the verified historical record.
  * **Context completeness:** Whether the information includes relevant experimental conditions, protocol modifications, reasons for changes, and troubleshooting outcomes where available.
  * **Clarification need:** Whether the participant needs additional information from the original experimenter or another lab member.
  * **User confidence and usability:** Participants' reported confidence in understanding the information and their willingness to use the tool in future work.
  * **Performance improvement:** Compare task completion time and retrieval accuracy between the existing workflow and the prototype for comparable tasks. Report whether the prototype improves retrieval performance and identify cases where existing practices remain more effective.

#### 2.4 Minimum Evidence Threshold

The initial evaluation will use **five researchers where feasible**. The following thresholds are provisional criteria for deciding whether the prototype merits further development, rather than evidence of general effectiveness across laboratories.

* **Finding the Right Information:** At least **4 out of 5 participants (80%)** correctly locate the relevant documented experimental context or protocol modification within **5 minutes** using the prototype, without requiring additional clarification to identify the information needed for the task.
* **Understanding the Information:** At least **4 out of 5 participants (80%)** correctly explain the relevant experimental details and distinguish documented findings from missing or uncertain information.
* **Usefulness for Experimental Work:** At least **4 out of 5 participants (80%)** report that the retrieved information would help them understand the previous experiment or decide what information to verify before proceeding.
* **Safety and reliability:** No observed instance of the tool presenting an invented experimental parameter or unsupported troubleshooting claim as a verified fact. Any such instance will trigger a review of the retrieval, presentation, and verification mechanisms before further testing.

The evaluation will also document cases where the prototype does not outperform current practices, where participants still need to consult colleagues, and where existing records do not contain the information required to answer the task. These outcomes will help distinguish retrieval problems that the tool could address from undocumented knowledge that must first be captured. Given the small, single-laboratory sample, results will be treated as formative usability and feasibility evidence. 

#### 2.5 Human-AI boundary

* **AI Role:** The AI is intended to help researchers retrieve relevant experimental records, identify protocol modifications, and summarize documented reasons for experimental adjustments and troubleshooting outcomes. It should base its responses on available records, distinguish documented information from missing or uncertain details, and avoid presenting unsupported claims as verified facts.

* **Human Role:** Researchers remain responsible for verifying retrieved information and experimental parameters, judging whether the information applies to their specific experimental context, and deciding how to proceed. They must assess whether the retrieved information is sufficient and seek clarification from the original experimenter when necessary.

* **Implementation Approach:** The specific implementation has not yet been decided, as the project is still in the planning stage. Based on the CP1 discovery findings, we will further explore whether generative AI, structured search, contextual indexing, or a combination of approaches would best address the identified information-retrieval challenges. The final approach will be determined during subsequent design and development. Regardless of the implementation, the tool is intended to support researchers in retrieving and understanding experimental knowledge, while leaving verification and experimental decision-making to humans.