# CP1: Problem Statement with Evidence

**Course:** CSIC30216, AI-in-the-Loop in Software Project Cycle
**Project focus:** Finding and sharing experimental knowledge in a shared wet lab
**Interviewees:** Five researchers from one academic wet lab, all outside our team

## 1. The problem

**In a shared wet lab, researchers record experiment details and troubleshooting experience inconsistently, and the records are spread across several tools. When a lab member needs to repeat, troubleshoot, or take over a labmate's procedure, they often cannot find these details and have to ask the person who did the experiment.**

The details we mean are practical ones: small protocol changes for a specific strain, primer, plasmid or condition, the reason for each change, what failed, and how it was fixed. If they are written down, they may be in Benchling, Google Drive, the lab NAS, a personal computer or a paper notebook. Some are never written down.

For example, a labmate or new student needs to run a procedure that only one senior member has done before. The basic protocol in Drive does not include that member's changes, and nobody has written down how past problems were solved. So the student asks the senior member directly, or asks the professor, who usually knows who has done which experiment (Participant A). Researchers can usually find their own records, sometimes after checking several devices. Finding someone else's is harder.

**Who experiences it:** graduate students in a shared academic wet lab. This includes students who take over or repeat a labmate's work, often newer members, and the experienced members they ask for help. Participants said asking each other is easy and normal in their lab, so we are not looking at general communication problems.

## 2. How we gathered evidence

We interviewed five researchers from one academic wet lab. They are at different stages of graduate study, and none of them is on our team. We asked about specific recent events, such as "the last time you needed information from an earlier experiment" or "the last time you changed a protocol step," instead of general opinions. Participants A and B were interviewed individually and are described in detail below. Answers from Participants C to E, along with a short follow-up discussion that B also joined, were written down together in one set of notes. We report those as shared themes. Participants are identified by letter only.

This is one lab and five people. It shows the problem exists in this lab, but not how often it happens, how much time it costs, or whether other labs have it. Not every participant had every problem.

## 3. What researchers told us

### Participant A: Master's student, about four years in the lab (since undergraduate study)

- She records mainly in Benchling and also uses a notebook, iPad and Excel. Last week she needed details from one of her own earlier experiments: which amounts of a variable she had already tried. She checked the labels on her plates and tubes, then Benchling, and found it in about 10 minutes without asking anyone.
- She changes protocols when results are not good enough, because each gene, primer and strain, and even the polymerase, can give different results. She records difficult or unfamiliar experiments in detail. She usually does not record changes to routine experiments like PCR, because there are too many conditions to keep track of.
- Labmates mostly ask her about experiments that only she has done. New students also ask her about basic procedures that are already written in the lab's Google Drive, because they do not know where to find them. She said being asked the same thing again and again interrupts her work, but she did not say how often it happens.
- When an experiment fails, she asks the professor first, because the professor usually knows who in the lab has used that experiment, and then asks labmates. She said solutions to past problems are not written down anywhere in the lab.
- She would add her files to a shared place if it meant new members stopped asking her, but she would think again if she had to reorganize her files. She said critical data must stay in the lab because it may be published or patented.

**Summary:** A can find her own records easily. Other people cannot easily get three things from her: changes to routine experiments she does not record, protocols in Drive that new students cannot find, and troubleshooting experience, which only exists in people's heads. The professor's knowledge of who has done what is part of this.

### Participant B: First-year Master's student, starting a third year in the lab

- B uses Benchling for most details, a notebook, GoodNotes for plasmid design, and the lab NAS.
- To look up earlier details such as fragment length or primer temperature, B checks the lab computer, the NAS, Benchling and an iPad. If B knows where the information is, it is found right away. When B does not, one reason is that the lab computer and B's personal computer are not synced. In the example B gave, the information was finally found on the personal computer, without asking anyone. B said that if information cannot be found, B would redesign the work, but this did not happen in this example.
- When experiments fail, B asks labmates or the professor. B said no solutions are written down anywhere.
- In the follow-up discussion, B said small results or changes are only written down if B remembers to.
- All of B's examples were about B's own experiments. B said missing details were not a problem because nobody else uses those records.

**Summary:** B did not describe trouble finding a labmate's records. B's answers show that one person's details are spread over at least four places, and finding them depends on remembering which device has them. We think a labmate without that memory would have a harder time, but we did not observe this. B also said troubleshooting solutions are not written down, which matches A.

### Shared themes from the combined notes (mainly Participants C to E)

- When asked what information gets lost or misunderstood between people, the answer was experiment details. Everyone changes protocols based on hands-on experience, for example the wash volume for a strain, the plasmid concentration used for transformation, or the culture temperature.
- When someone changes a protocol, others find out by asking the person who did the experiment, or by asking for their protocol if they wrote one. Otherwise they ask directly or search Benchling and the NAS.
- Small changes are remembered for about a month if they mattered, and forgotten if they made no difference. What the professor says in person is often not written down.
- Old information was described as hard to find, but never impossible to find. When it was hard to find, it was because the record was kept short, since the detail did not seem important at the time.
- Senior members prepare protocols and spend time teaching new members the details. Pipetting technique and troubleshooting are hard to teach in writing. Troubleshooting was also described as a skill people improve by solving problems themselves.
- Some tools make note-taking harder. Benchling is hard to use on a phone, and Apple Notes syncs between Macs but not with the lab's Windows computers. The notes say the main problem is that there is no single place where everything is stored and can be checked at any time.
- Communication in the lab works well. Lab members are close, and when people understand the professor's instructions differently, they discuss it and ask the professor if needed.

Short-notice meetings, a project partner not doing their share, and sharing papers in the LINE group also came up, but they are outside the scope of this problem.

## 4. Why existing tools and practices do not solve it

| Existing tool or practice | What works | What it does not do for this problem |
| --- | --- | --- |
| **Benchling** | Keeps detailed records. A found her own past work in about 10 minutes. | Only holds what each person chooses to record. A does not record routine changes, and B also has to search other places. A recorded experiment can still be missing the details another person would need. It is also hard to use on a phone (combined notes). |
| **Google Drive (shared protocols)** | Basic protocols are already written and shared. | New students ask A about things already in Drive because they cannot find them. The protocols are general and do not include each person's changes or troubleshooting. |
| **Ask Gemini in Drive** (AI questions about Drive files) | Answers questions about Drive files on eligible Google plans. | The lab's Google account does not have it. Even if it did, it could only use what is written down and stored in Drive. It could not find changes A never recorded, or B's records on the NAS, Benchling or personal computers. |
| **NAS, lab and personal computers, GoodNotes, notebooks** | Flexible places for files, designs and notes. | One person's records end up in several places. B had to remember which device had the data, because the lab and personal computers were not synced. Apple Notes syncs between Macs but not with the lab's Windows computers (combined notes). |
| **Asking the person who did the experiment, or the professor** | Quick, and the only way to pass on hands-on skills and judgment. | Interrupts experienced members (A). Spoken answers are not saved anywhere others can find, and A is asked the same things repeatedly. Troubleshooting solutions are not written down anywhere (A, B). |

The lab already stores a lot of experimental material, but the details another person needs are often missing or hard to find. Adding another storage place or search tool on top of the same incomplete records would not fix this by itself.

## 5. Scope and open questions

Our evidence supports these points:

- Experienced members get repeated questions (A).
- Finding records depends on remembering where they were saved (B).
- Details are often recorded too briefly because they did not seem important at the time (combined notes).
- Troubleshooting solutions are not written down (A, B).
- New members rely on senior members to explain details (combined notes).

Participants said old information was hard to find, but never that it could not be found. Our evidence does not show that anyone had to repeat an experiment because of missing records, and we did not measure time lost.

Hands-on teaching will still be needed, so a tool should support it rather than replace it. The interviews point to these requirements for the design:

- Use existing Benchling, Drive and NAS files instead of asking the lab to move everything.
- Keep the extra documentation work small (A).
- Show who did the experiment, not only the documents (A).
- Keep unpublished data inside the lab (A).
- Leave room for people to learn troubleshooting by working through problems themselves (combined notes).

We have not decided yet whether to focus on troubleshooting knowledge, experiment details, or handover from senior to junior members. We will decide after getting more feedback from users.
