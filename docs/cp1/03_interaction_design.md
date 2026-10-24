# CP1: Interaction Design Sketch
This system organizes information scattered across the laboratory into searchable knowledge, helping lab members obtain answers and access the original materials. When the available information is insufficient, it seeks assistance from relevant contributors with the requester's consent and preserves discussions that successfully resolve questions as new information for future retrieval.

## D1. Information Representation
| ID | Design Specification |
|---|---|
| D1‑1 | `info` refers to any laboratory-related information, whether accessible over a network or offline. Sources include, but are not limited to, Benchling, Google Drive, NAS, and handwritten paper records. Information types include, but are not limited to, programs, documents, images. |
| D1‑2 | `M` is a precise plain-text description of `info`. Each `info` item corresponds to exactly one `M`. |
| D1‑3 | `M` can be rendered as understandable Markdown. Where appropriate, the Markdown includes links to the original `info` associated with `M`. |
| D1‑4 | `M` must include at least one `contributor`. Research project groups and other attributes may be added as appropriate using tags or groups. |

## D2. Input — Encoder System
The `encoder` is a local language model that interprets and organizes unstructured records to produce `M`. See [02 §5](https://github.com/benedictdavon/nycu-ai-itl/blob/main/docs/cp1/02_problem_statement.md#5-scope-and-open-questions).
The surrounding system handles acquiring `info` and triggering updates, aiming to improve information coverage, synchronization, and accuracy.

| ID | Design Specification |
|---|---|
| D2‑1 | A `contributor` is a lab member who has contributed to an `info` item. Contributors may include professors. |
| D2‑2a | For information accessible over a network, when the time since the corresponding `M` was last updated exceeds a configured interval, the `encoder` accesses the `info` through tools. |
| D2‑2b | For offline information, when the time since the corresponding `M` was last updated exceeds a configured interval, the `encoder` asks a `contributor` whether the associated `info` has changed. If it has, the contributor is asked to upload the updated information. |
| D2‑2c | An `info` item that the `encoder` has never encountered must be proactively submitted by a `contributor`; the encoder cannot discover information that has not been made available to it. |
| D2‑3a | If the `encoder` considers the `info` sufficiently clear, it converts the information into `M` and notifies a `contributor` for review. The contributor may discuss and revise the content with the encoder. Only after the contributor confirms it is `M` added to the `M database`. |
| D2‑3b | If the `encoder` considers the `info` unclear, it asks a `contributor` for additional explanations until the conditions in D2‑3a are met. |

## D3. Output — Decoder System
The `decoder` is a local language model that interprets the requester's natural-language questions, finds relevant information, and organizes it into an answer. See [02 §5](https://github.com/benedictdavon/nycu-ai-itl/blob/main/docs/cp1/02_problem_statement.md#5-scope-and-open-questions).

| ID | Design Specification |
|---|---|
| D3‑1 | A `requester` submits a question through a text-based question-and-answer interface. If the `decoder` considers the `M database` sufficiently clear to answer the question, it provides an answer together with the original `info` linked to the relevant `M`. |
| D3‑1a | A `requester` who wants to learn how to troubleshoot may enable a setting that makes the `decoder` provide hints instead of a detailed answer. |
| D3‑2 | If the `decoder` considers the available information insufficient to answer clearly, it explains its uncertainties and tentative inferences, then asks whether the `requester` wants to seek help from another person. |
| D3‑3 | If the `requester` wants to seek help, they may select a `contributor` themselves or ask the `decoder` to find a contributor with the most relevant expertise in the `M database`. If no sufficiently relevant contributor is found, the decoder notifies the requester. |
| D3‑4 | The `requester` discusses the question with the selected `contributor` using any communication method. If both confirm that the question has been resolved, the requester saves the discussion as `info`, such as conversation screenshots and other files, and sends it to the `decoder` to indicate resolution. This information is then processed according to D2‑3a / D2‑3b. |
| D3‑5 | If the discussion in D3‑4 does not resolve the question, the `decoder` follows D3‑2 and asks whether the `requester` wants to seek help from another person. |

## Design Questions That May Remain Open at CP1
- How contributors are notified under D2-3a / D2-3b.
- The criteria used by the decoder to judge whether it can answer accurately under D3-1 / D3-2.
- An example of an `M` / `info` pair.
- The initial implementation scope and its feasibility.
- Access permissions for different lab members.

## Design Coverage of Requirements and Interview Findings

The original 15 items and their IDs are retained for comparison with the earlier problem statement. Four supplementary findings from [02 §3](https://github.com/benedictdavon/nycu-ai-itl/blob/main/docs/cp1/02_problem_statement.md#3-what-researchers-told-us) are added below as F3‑1 through F3‑4; these are local traceability labels for this table, not IDs assigned in 02.

Ratings assess the mechanisms specified in the current D1–D3 design, not implementation completion or measured user outcomes. Green indicates an explicit mechanism addressing the item; yellow indicates partial coverage or a remaining dependency; red indicates that no mechanism is specified or that the requirement remains unresolved. Interview statements are attributed to their participants or the combined notes rather than assumed to apply to every researcher.

| ID | Item | Design Coverage | Reason |
|---|---|---|---|
| 4‑1 | Benchling limitations | 🟡&nbsp;Partially&nbsp;Addressed | D2‑2a accesses existing records, and D2‑3a / D2‑3b provide contributor review and clarification. These mechanisms help with recorded but unclear details. D2‑2c still depends on contributors submitting new information, so unrecorded protocol changes may remain absent. |
| 4‑2 | Google Drive limitations | 🟢&nbsp;Addressed&nbsp;in&nbsp;Design | D2‑2a and D3‑1 provide question-based retrieval of available records and return the original materials. This directly addresses locating existing protocols without knowing their file location, as described by Participant A; it does not recover changes that were never supplied. |
| 4‑3 | Ask Gemini in Drive limitations | 🟢&nbsp;Addressed&nbsp;in&nbsp;Design | The local encoder and decoder provide retrieval and answers without requiring Gemini availability on the lab's account. D2‑2a / D2‑2c cover accessible and submitted information from the sources in D1‑1. Unsubmitted information remains unavailable. |
| 4‑4 | NAS, personal computers, and GoodNotes limitations | 🟡&nbsp;Partially&nbsp;Addressed | D1‑1 includes network-accessible and offline information, and D2‑2b / D2‑2c allow uploads. This provides a submission route for records on personal devices, but it does not specify direct GoodNotes integration or synchronization between devices. |
| 4‑5 | Directly asking researchers | 🟡&nbsp;Partially&nbsp;Addressed | D3‑3 helps identify a contributor, D3‑4 preserves resolved discussions, and D3‑5 asks for consent before seeking further help. This supports finding help and reusing answers, but coverage still depends on recorded contributor information, their availability, and submission of the discussion. |
| 5a‑1 | Repeated questions to senior researchers | 🟡&nbsp;Partially&nbsp;Addressed | D3‑1 supports retrieval before asking someone, and D3‑4 returns resolved discussions to the knowledge base. Reuse is therefore supported for submitted, reviewed answers, while unsubmitted or unresolved exchanges remain unavailable. This addresses the repeated interruptions reported by A only in part. |
| 5a‑2 | Difficulty locating existing records | 🟢&nbsp;Addressed&nbsp;in&nbsp;Design | D2‑2a / D2‑2b / D2‑2c make accessible or submitted records available through the system, and D3‑1 returns answers with original materials. The design supports locating covered records without remembering their device or folder. B's reported search concerned B's own records; difficulty for another labmate was an inference in 02, not an observed event. |
| 5a‑3 | Incomplete experimental documentation | 🟡&nbsp;Partially&nbsp;Addressed | D2‑3a / D2‑3b allow contributors to correct extracted content and explain unclear records. These steps can improve submitted documentation, but D2‑2c cannot discover important details that nobody records or supplies. This limitation applies to the routine changes reported by A and the brief records described in the combined notes. |
| 5a‑4 | Unrecorded troubleshooting knowledge | 🟡&nbsp;Partially&nbsp;Addressed | A and B reported that troubleshooting solutions were not written down. D3‑4 captures newly resolved discussions and processes them through D2‑3a / D2‑3b. The design does not automatically collect existing experience that remains only in people's heads. |
| 5a‑5 | Junior researchers' dependence on senior researchers | 🟡&nbsp;Partially&nbsp;Addressed | D3‑1 supports retrieval and D3‑1a provides hints for learning, while D3‑3 / D3‑4 retain access to experienced contributors. The combined notes describe hands-on skills and judgment that are difficult to teach in writing, so human instruction remains necessary. |
| 5b‑1 | Reuse existing files | 🟢&nbsp;Addressed&nbsp;in&nbsp;Design | D1‑1 accepts existing records, D2‑2a accesses network information through tools, and D2‑2b / D2‑2c accept uploads. The design can build on existing sources without requiring all original files to be moved or reorganized. |
| 5b‑2 | Low documentation overhead | 🟡&nbsp;Partially&nbsp;Addressed | D1‑1 accepts existing information formats, and D3‑4 allows discussion screenshots and other files to be submitted. This reduces the need to rewrite material into a fixed form, but review, clarification, update requests, and discussion submission still require contributor or requester effort. |
| 5b‑3 | Show experiment owners | 🟡&nbsp;Partially&nbsp;Addressed | D1‑4 requires at least one contributor, and D3‑3 helps identify a relevant person. However, D2‑1 defines contribution to information, which does not necessarily identify who performed the experiment. That distinction is not explicitly shown to the requester. |
| 5b‑4 | Keep unpublished data private | 🔴&nbsp;Pending&nbsp;Discussion | The encoder and decoder use local language models, which addresses the inference location. Access permissions, data isolation, and the complete data-transfer policy remain unspecified, so the design does not yet fully address A's requirement for unpublished data to stay inside the lab. |
| 5b‑5 | Support independent troubleshooting | 🟢&nbsp;Addressed&nbsp;in&nbsp;Design | D3‑1a explicitly lets requesters choose hints instead of detailed answers. D3‑1 and D3‑2 / D3‑3 also provide retrieval and optional human assistance. This creates a mechanism for the learning preference described in the combined notes; its learning benefit has not been evaluated. |
| F3‑1 | Professor helps identify who has done an experiment (Participant A) | 🟡&nbsp;Partially&nbsp;Addressed | D2‑1 allows professors to contribute, D1‑4 records contributors, and D3‑3 finds relevant people. However, the professor's knowledge of who performed which experiment must first be submitted and confirmed; the design does not automatically acquire that knowledge or define a separate professor workflow. |
| F3‑2 | Mobile note-taking and cross-platform synchronization difficulties (combined notes) | 🔴&nbsp;Not&nbsp;Addressed | The combined notes describe Benchling being difficult to use on a phone and Apple Notes not synchronizing with the lab's Windows computers. D1‑1 accepts existing materials, but no mobile note-taking interface or cross-platform synchronization mechanism is specified. General upload support does not by itself resolve these reported difficulties. |
| F3‑3 | Small protocol changes are forgotten (combined notes) | 🟡&nbsp;Partially&nbsp;Addressed | The combined notes describe meaningful small changes being remembered for about a month and inconsequential changes being forgotten. D2‑2b can prompt contributors to update known offline information, but D2‑2c still relies on proactive submission of new information. The design does not ensure that unrecorded changes are captured before they are forgotten. |
| F3‑4 | Professor's verbal instructions are often not recorded (combined notes) | 🟡&nbsp;Partially&nbsp;Addressed | D2‑1 allows professors to contribute, and D2‑2c / D2‑3a / D2‑3b support manual submission and review. D3‑4 can preserve instructions included in a resolved discussion. Instructions given outside this workflow still require someone to record and submit them; there is no general capture mechanism for spoken instructions. |

Summary of design coverage (19 items): 🟢 5 Addressed in Design, 🟡 12 Partially Addressed, 🔴 2 Not Addressed / Pending Discussion
