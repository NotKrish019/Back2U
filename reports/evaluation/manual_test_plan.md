# Manual Test Plan (LP-RIEM-MM1)

## A — Known objects
Test standard items from the known categories:
- laptop
- bottle
- cup
- shoe
- camera

## B — Difficult known objects
Test known categories under challenging conditions:
- different viewpoint
- poor lighting
- clutter
- partial occlusion
- small object

## C — Unknown objects
Test non-target categories to ensure they are rejected or sent to review:
- chair
- keyboard
- table
- monitor
- other unrelated objects

## D — Instance re-identification
Test using a known physical object but a different view from the gallery (to verify it matches the correct physical instance, not just the category).

## E — Hard negative
Use an item whose nearest gallery candidates contain visually similar objects from the same category (e.g., a black laptop query vs. multiple different black laptops in the gallery).

## F — Text-only
Test semantic retrieval:
- "black laptop"
- "blue bottle"
- "white shoe"

## G — Image + text
Test multimodal retrieval:
- image + "black laptop with sticker"

## H — Conflict
Test the system's ability to maintain physical visual evidence rather than blindly following contradictory text:
- image = laptop
- text = "blue shoe"
