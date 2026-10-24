# Proposed System Design

D1. Information Representation
| ID | Design Specification |
|---|---|
| D1‑1 | Let `Info` represent any program, document, image, or video stored in Benchling, Google Drive, or NAS. Assume that `M` is a precise and concise representation of any `Info`, with each `Info` corresponding to exactly one `M`. |
| D1‑2 | `M` does not need to be directly understandable by humans. |
| D1‑3 | `M` can be converted into human-readable Markdown. When appropriate, the Markdown output includes links to the original `Info` associated with `M`. |
| D1‑4 | `M` may contain metadata such as information owners, research projects, and other attributes, organized using tags or groups. |

D2. Input — Encoder System
| ID | Design Specification |
|---|---|
| D2‑1 | Assume that the Encoder System can access any laboratory-related `Info` stored in Benchling, Google Drive, or NAS, including its last modification timestamp. |
| D2‑2 | Assume that the Encoder System can always convert Info into `M` and ensure that `M` is updated within a specified time interval whenever its corresponding Info is modified. |
| D2‑3 | If the Encoder System determines that an `Info` item is difficult to convert into `M`, it notifies the information owner and requests additional explanations. |
| D2‑4 | The Encoder System should make recording `Info` as simple and convenient as possible, minimizing documentation overhead to avoid discouraging information collection. |

D3. Output — Decoder System
| ID | Design Specification |
|---|---|
| D3‑1 | The Decoder System attempts to answer any user query as accurately as possible using the `M` database. |
| D3‑2 | If the Decoder System determines that it cannot answer a query with sufficient accuracy, it notifies the most relevant information owner. The information owner and the requester then discuss the problem. If the problem is resolved, the discussion is saved as new `Info` and processed by the Encoder System. If the problem remains unresolved, the Decoder System contacts the next most relevant information owner. |

**Open Issue — Permission Management:** Access control, information privacy, and permission management have not yet been defined and remain subject to further discussion.

The following 15 items are derived from `02_problem_statement.md`, covering the limitations of existing tools (4-x), evidence-based findings (5a-x), and design requirements (5b-x). The evaluations indicate how well the proposed system addresses each item at the design level, assuming the defined system capabilities are achievable.

| ID   | Item                                                 | Evaluation             | Reason                                                                                                                                                                                                      |
| ---- | ---------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4‑1  | Benchling limitations                                | 🟡 Partially Addressed | D2‑1 and D2‑2 enable existing records to be processed, while D2‑3 requests additional explanations when needed. However, modifications that were never recorded may remain undetected.                |
| 4‑2  | Google Drive limitations                             | 🟢 Addressed           | D2‑1 and D3‑1 allow users to retrieve relevant information without knowing the exact location of the original SOP or document.                                                                       |
| 4‑3  | Ask Gemini in Drive limitations                      | 🟢 Addressed           | D2‑1 and D3‑1 provide a unified retrieval mechanism across multiple sources without depending on Gemini availability.                                                                                |
| 4‑4  | NAS, personal computers, and GoodNotes limitations   | 🟡 Partially Addressed | D2‑1 covers NAS, but information stored exclusively on personal computers or GoodNotes is not explicitly included.                                                                                   |
| 4‑5  | Directly asking researchers                          | 🟢 Addressed           | D3‑2 routes unanswered questions to relevant information owners and preserves successful discussions for future retrieval, reducing repetitive inquiries.                                            |
| 5a‑1 | Repeated questions to senior researchers             | 🟢 Addressed           | D3‑1 and D3‑2 prioritize database retrieval and preserve newly resolved questions, reducing the need to repeatedly contact senior researchers.                                                       |
| 5a‑2 | Difficulty locating existing records                 | 🟢 Addressed           | D2‑1, D2‑2, and D3‑1 enable centralized retrieval through the M database without requiring users to know where original files are stored.                                                             |
| 5a‑3 | Incomplete experimental documentation                | 🟡 Partially Addressed | D2‑3 and D2‑4 support additional explanations and easier documentation, but the system may not detect important details that were never recorded.                                                    |
| 5a‑4 | Unrecorded troubleshooting knowledge                 | 🟢 Addressed           | D3‑2 preserves successful troubleshooting discussions as new information and sends them through the encoder system.                                                                                  |
| 5a‑5 | Junior researchers' dependence on senior researchers | 🟡 Partially Addressed | D3‑1 enables independent information retrieval, while D3‑2 provides access to experienced researchers when needed. However, some practical skills may still require direct instruction.               |
| 5b‑1 | Reuse existing files                                 | 🟢 Addressed           | D2‑1 and D2‑2 process existing Benchling, Drive, and NAS information without requiring migration of the original files.                                                                              |
| 5b‑2 | Low documentation overhead                           | 🟢 Addressed           | D2‑4 explicitly defines minimizing documentation effort as a system requirement, while D2‑3 requests additional explanations only when necessary. Implementation feasibility will be evaluated later. |
| 5b‑3 | Show experiment owners                               | 🟢 Addressed           | D1‑4 allows ownership metadata to be stored in M, and D3‑2 uses this information to identify relevant people.                                                                                         |
| 5b‑4 | Keep unpublished data private                        | 🔴&nbsp;Pending&nbsp;Discussion | Access permissions, data isolation, and restrictions on external data transmission have not yet been defined.                                                                                               |
| 5b‑5 | Support independent troubleshooting                  | 🟡 Partially Addressed | D3‑1 supports information retrieval, but the system does not explicitly define whether it should provide troubleshooting hints, guided steps, or complete answers.                                   |

Summary: 🟢 9 Addressed, 🟡 5 Partially Addressed, 🔴 1 Pending Discussion
