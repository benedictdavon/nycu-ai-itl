# Evaluation Plan

## 1. Problem Grounding

### 1.1 Who specifically has the collaboration problem?
**Academic wet-lab researchers** (graduate students [M.S./Ph.D.], postdoctoral researchers, and research assistants) working in shared life science, biochemistry, or bioengineering laboratories. Specifically, this affects lab members who need to inherit, replicate, or troubleshoot experimental protocols originally developed or run by their labmates.

### 1.2 What do they currently do instead of your tool?
* **Ad-hoc verbal asking ("asking around"):** When an experiment fails or yields unexpected results, researchers typically walk around the lab or send messages to ask who has encountered the issue before and how they solved it.
* **Fragmented documentation:** Previous records are scattered across disparate tools—commercial Electronic Lab Notebooks (ELNs like Benchling), shared cloud drives (Google Drive/lab NAS), paper notebooks, messaging threads, and personal unshared notes.
* **Omission of tacit context:** Critical troubleshooting knowledge (e.g., subtle protocol adjustments, reagent batch quirks, negative results, and "what went wrong") is documented inconsistently or not at all, as existing tools impose high manual friction during bench work.
* **Tribal knowledge dependency:** When a senior researcher or protocol author graduates or leaves the lab, critical protocol intuition is often lost, forcing newer members to reinvent solutions through trial and error.

### 1.3 What would be observably different about their collaboration if your tool worked?
* **Autonomous context retrieval:** Researchers encountering protocol anomalies or questions could independently find and understand past troubleshooting history and protocol variations without needing the original author present.
* **Fewer synchronous interruptions:** Senior lab members and original experimenters would receive significantly fewer direct clarification questions ("How did you get this assay to work?", "Did you change the buffer concentration?").
* **Accelerated troubleshooting cycles:** The time spent blocked on an experimental failure would drop from days (waiting to ask the right colleague) to minutes, reducing redundant mistakes and wasted laboratory reagents.

---

## 2. Evaluation Plan Draft

### 2.1 Success Definition
We will know our tool works if wet-lab researchers facing an experimental roadblock or protocol question can retrieve and understand the relevant historical context or troubleshooting resolution in under **5 minutes**, resulting in at least a **50% reduction in direct clarification inquiries** directed to the original experimenter, with users reporting high confidence in applying the retrieved insight.

* **Decision Boundary & Role of AI:**
  * **Human-in-the-Loop Model:** The human researcher remains the ultimate decision-maker regarding experimental protocol execution, biological safety, and reagent handling. If AI is used, it serves as an indexing, contextualization, and retrieval assistant (e.g., parsing unstructured lab logs, mapping error symptoms to historical fixes, and summarizing prior experimental context).
  * **What Success Means for this Model:** Success requires that **the AI's suggestions and surfaced insights are sufficiently accurate, relevant, and context-rich to be worth the researcher's attention**, without generating hallucinations in protocol parameters (e.g., temperatures, concentrations, timing) or creating unnecessary cognitive overhead.
  * *(Note: Whether the tool relies on generative AI, structured contextual indexing, or semi-automated logging is **TBD — to be determined by CP1** as the core interaction pattern is finalized based on user interviews).*

### 2.2 Target Users
* **Profile:** 4–6 academic wet-lab researchers (graduate students and research assistants in molecular biology, bioengineering, or chemistry) who regularly conduct bench experiments and share protocols with lab peers.
* **Access Strategy:** Direct recruitment through existing personal networks and university lab contacts (e.g., NYCU biological science/bioengineering research groups) with whom preliminary discovery interviews have already been initiated.

### 2.3 Method
* **Evaluation Type:** **Structured observation paired with a brief post-task interview.**
* **Timing:** Roughly at **CP1 (Checkpoint 1)** milestone (approximately 2–3 weeks from initial design).
* **Execution:**
  1. **Scenario-Based Observation:** Participants are given a realistic laboratory troubleshooting scenario (e.g., diagnosing a failed assay or identifying undocumented parameter adjustments from a prior labmate's dataset).
  2. **Comparative Task:** Participants attempt to locate the necessary troubleshooting context using current status-quo practices (searching Benchling/Drive/notes or identifying who they would need to ask) versus using the prototype tool.
  3. **Metrics Collected:** Task completion time, success rate in locating the correct past resolution, and whether the researcher feels the need to reach out to the original author.
  4. **Post-Task Brief Interview (10 minutes):** Assess perceived clarity, cognitive load, trust in the retrieved documentation, and willingness to integrate the tool into daily bench workflows.

### 2.4 Minimum Evidence Threshold
What is the smallest amount of evidence that would be convincing?
* **At least 4 out of 5 (80%)** tested wet-lab researchers can independently identify the correct troubleshooting context or past experimental adjustment within **5 minutes** without needing to ask the original experimenter.
* **At least 4 out of 5 (80%)** participants state in the post-task debrief that the surfaced information provided sufficient context to take the next experimental step immediately, rather than waiting to verify with a colleague.
