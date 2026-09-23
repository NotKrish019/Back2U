# Multimodal Instance Retrieval for Lost & Found

## Project in one line

A machine-learning system that retrieves and ranks the **same physical lost item** from found-item images using one or more evidence types: a reference image, a vague natural-language description, visual attributes, and optional contextual signals such as time and location.

## What makes this an ML project

The core deliverable is **not the web application**. The core deliverable is a trained/evaluated multimodal retrieval pipeline that learns object representations and measures whether two observations correspond to the same physical instance.

Primary ML areas:

- Computer vision
- Object detection / segmentation
- Deep visual embeddings
- Metric learning
- Siamese / dual-encoder architectures
- Contrastive or triplet learning
- Fine-grained local-feature matching
- Text-to-image retrieval
- Multimodal fusion and ranking
- Retrieval evaluation

## Product flow

```text
Lost report
  -> image and/or vague text
  -> encode evidence
  -> search found-item gallery
  -> rank candidate instances
  -> optional ownership verification
  -> show likely matches
```

## Important scope decision

RAG is **not part of the core ML problem**. The retrieval system should use learned embeddings and vector similarity / nearest-neighbour search. RAG can be added later only if there is a clear need for natural-language answers over static campus policy/help documents.

## First objective

Before building the UI, prove this:

> Given a query image of an object and a gallery containing other images, can the model retrieve images belonging to the same physical object instance, even when viewpoint, lighting, background, or crop changes?

Then add:

> Can a vague text description improve retrieval when no reference photograph is available?

## Documentation rules

The project must maintain `context.md` as the live memory of the project. After **every completed implementation step, experiment, feature change, architecture change, dataset change, dependency change, or important decision**, update `context.md` before starting the next step.

See `AGENTS.md` and `IMPLEMENTATION_PLAN.md` for the operating rules.
