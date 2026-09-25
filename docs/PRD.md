# Product Requirements Document (PRD)

## 1. Product name

**Multimodal Lost Property Re-Identification & Ownership Verification**

Working short name: **LostLens**

## 2. Product vision

Help people recover lost belongings by using machine learning to retrieve the most likely **same physical item** from found-item reports, even when the owner only remembers a vague textual description and may not have an old photograph.

## 3. Problem

Traditional lost-and-found workflows are usually based on manual searching, category labels, keyword descriptions, or broad visual similarity. These approaches struggle when many objects belong to the same category and look similar.

Example:

> “I lost a black water bottle near the library. It had a red sticker.”

A useful system should narrow the candidate set without falsely treating every black bottle as the same item.

## 4. Target users

### Primary

- University students
- University staff
- Campus security / lost-and-found desk personnel

### Secondary future users

- Schools
- Offices
- Hospitals
- Hotels
- Airports
- Event venues

## 5. Primary use cases

### UC-1: Text-only lost report

A user has no photograph and enters a short, vague description.

Expected behavior:

- parse likely object category and attributes
- retrieve compatible found-item candidates
- rank candidates
- avoid overconfident exact-match claims

### UC-2: Image-assisted lost report

A user has an old photograph of the item.

Expected behavior:

- encode the reference image
- perform instance-level retrieval against found items
- return top-k candidates

### UC-3: Found-item submission

A finder uploads a photograph and basic metadata.

Expected behavior:

- detect/segment the item
- extract visual representation/attributes
- create retrieval representation
- store item securely

### UC-4: Multimodal search

The user supplies image + text.

Expected behavior:

- fuse the evidence
- rank candidates using learned or calibrated scoring

### UC-5: Ownership verification

A candidate match is found.

Expected behavior:

- ask a limited number of hidden-detail questions when safe and useful
- compare claimant answers with private item attributes
- provide a verification outcome for workflow purposes

## 6. Core product features

### P0 - must have

- Report lost item
- Report found item
- Image upload
- Text description
- Candidate retrieval
- Top-k ranked matches
- Candidate similarity/evidence display
- Basic authentication/session handling
- Model inference API

### P1 - should have

- Fine-grained attribute extraction
- Image + text multimodal retrieval
- Instance-level matching using old reference image
- Ownership verification
- Duplicate/near-duplicate report detection

### P2 - optional

- Location-aware ranking
- Time-aware ranking
- Notifications
- Admin moderation dashboard
- RAG-powered campus help/FAQ module

## 7. Non-goals

- Facial recognition
- Identity verification using biometrics
- Guaranteeing legal ownership
- Fully autonomous handover
- Nationwide production deployment
- Training a giant foundation model from scratch
- RAG as the core retrieval engine

## 8. Product success criteria

The product is successful when the trained system can demonstrate measurable improvement over a simple embedding baseline on an instance-retrieval benchmark, while supporting at least one practical text-only retrieval path and one image-assisted path.

Suggested technical targets should be finalized only after the baseline is measured.

## 9. Important UX rule

The interface must not imply certainty when the model only has weak evidence.

Use:

- `Possible match`
- `High similarity`
- `Needs verification`

rather than:

- `This definitely belongs to you`

## 10. Future scalability

The ML architecture should remain independent of the campus UI so it can later support other property-recovery environments.
