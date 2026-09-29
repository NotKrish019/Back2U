# Back2U UI Implementation Plan

This implementation plan is derived directly from `design.md` and focuses on introducing an authored visual identity with an emphasis on editorial typography, narrative section progression, strong whitespace, and deliberate motion, all while preserving the core product functionality, data security, and existing backend.

## ⚠️ Core Rule: The Non-Negotiable Phased Workflow
All UI implementation must strictly follow this phased procedure. Do not automatically skip to the next phase.

```text
Inspect -> Implement Phase -> Run Tests -> Browser Test -> Responsive Test -> Accessibility Test -> Performance Check -> Report -> STOP -> Wait for Human Approval -> Next Phase
```

## Guiding Principles
1. **Real Data Only:** Never fake requests, mock counters, or hardcode private/claimable data to make layouts look richer.
2. **Privacy Focus:** Protect exact locations, user-submitted photos, and private details unless explicitly authorized. 
3. **Motion is Meaningful:** Animations should be fast, deliberate, and physical (prefer `transform` and `opacity`). Micro-interactions (100–180ms), major transitions (700–1200ms).
4. **Accessible & Responsive:** Support keyboard navigation, respect `@media (prefers-reduced-motion: reduce)`, and treat mobile as a touch-first vertical narrative without relying on hover interactions.

---

## The 18-Phase Execution Strategy

### Phase 0: Motion Foundation
* **Goal:** Prepare shared UI infrastructure, motion tokens, and reusable utilities (reveal/hover/transition). Clean up route transitions. Ensure animations do not cause layout shifts.
* **Testing Gate:** No console/hydration errors, routes work, reduced motion respected, no obvious jank.

### Phase 1: Navigation
* **Goal:** Update navigation interactions with subtle entrances, link hovers, active route markers, and tactile responses. 
* **Mobile:** Animated menu drawer, large touch targets, staggered links.

### Phase 2: Homepage Hero
* **Goal:** Communicate Back2U quickly through a narrative sequence.
* **Composition:** Large typography ("LOST SOMETHING? LET'S GET IT BACK2U.") and primary actions. Introduce a data-independent "Search Lens" visualization (Photo + Location -> Lens -> Match).

### Phase 3: Lost / Found Action Module
* **Goal:** Create two large, asymmetric editorial action areas.
* **Interaction:** Hover block subtly expands, title shifts, arrows move. Use thin borders, whitespace, and oversized type. Stack vertically on mobile.

### Phase 4: Campus Signal
* **Goal:** Present an animated, live-feeling campus activity visualization using *real* aggregate data.
* **Interaction:** Soft expanding/fading rings on markers. Protect user privacy (no exact identities or claims).

### Phase 5: How It Works
* **Goal:** Three-step scroll choreography ("01 SHOW US", "02 TELL US", "03 REVIEW").
* **Interaction:** Number activates, description reveals, inactive steps become secondary based on scroll position. Don't trap mobile scrolling.

### Phase 6: Search Experience
* **Goal:** Staged, non-generic search form (What -> Add Photo -> Where -> When -> Details -> Search).
* **Interaction:** Focus animations (label shifts, border changes). Empty -> drag/upload -> preview -> metadata. Trigger "Search Lens" loading state during real request.

### Phase 7: Search Results
* **Goal:** Editorial candidate blocks (not generic cards).
* **Interaction:** Controlled stagger entry. Subtle hover (2-4% zoom, title shift, metadata emphasis).

### Phase 8: My Reports
* **Goal:** Editorial list of user reports (real Supabase data).
* **Interaction:** List reveals, number/title shifts, status accents. Implement the intentional "NO REPORTS YET" empty state if applicable.

### Phase 9: Report Detail
* **Goal:** Treat the report as an item story (Title, status, date, media, description).
* **Interaction:** Staggered reveals for title, image (subtle 98% -> 100% scale), metadata, and finally actions.

### Phase 10: Report Lost / Report Found
* **Goal:** A fast, progressive submission form.
* **Interaction:** Minimal shake on validation errors. Real database persistence followed by real report detail view upon success.

### Phase 11: Browse
* **Goal:** Display public/authorized records using large imagery, minimal metadata, and subtle hovers.
* **Interaction:** No fake items. Implement an intentional empty state if no records exist.

### Phase 12: Hotspots
* **Goal:** Visual campus signal system with location hovers and category/time filters using real aggregate data.

### Phase 13: Account/Profile
* **Goal:** Refine profile data display (reports, matches, activity).
* **Interaction:** Keep animations subtle and use actual application data.

### Phase 14: Notifications
* **Goal:** Real backend unread markers. Hover interactions to mark as read and open reports. No continuous pulses. 
* **Interaction:** Clear empty state ("ALL QUIET").

### Phase 15: FAQ / Support
* **Goal:** Accessible, animated accordions supporting long answers.
* **Interaction:** Animate height, opacity, and icon (+ / -).

### Phase 16: Footer
* **Goal:** Deep plum section with clear hierarchy.
* **Interaction:** Wordmark reveal, staggered links, small accent motions.

### Phase 17: Global Polish
* **Goal:** After every previous phase is validated, unify motion timing, spacing, typography, responsive behavior, and accessibility states. Final performance audit.

---

## Required Phase Report Format
At the conclusion of *each* phase, the following report must be generated and presented for human validation before proceeding:

```text
PHASE [X] COMPLETE

Implemented:
- ...

Files changed:
- ...

Animations:
- ...

Tests:
- ...

Browser tested:
- URL

Desktop: PASS/FAIL
Tablet: PASS/FAIL
Mobile: PASS/FAIL
Accessibility: PASS/FAIL
Performance: PASS/FAIL

Known issues:
- ...

READY FOR HUMAN VALIDATION.
```
