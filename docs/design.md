# Back2U --- Animated UI Design Handover

**Reference:** Agence Foudre (`agencefoudre.com`)\
**Purpose:** phased frontend/UI implementation specification for
Antigravity\
**Project:** Back2U --- university Lost & Found

## 1. Core direction

Study the reference for its **interaction principles**, not its
branding.

The reference's strongest qualities are: - authored visual identity
rather than generic SaaS styling - oversized editorial typography -
narrative section progression - strong whitespace and unusual
composition - media-led sections - horizontal/slider exploration -
controlled scroll choreography - tactile micro-interactions - deliberate
page transitions - playful but purposeful motion - a lightweight,
performance-conscious implementation

Agence Foudre's published project description says its site uses Kirby
CMS with barba.js, Locomotive Scroll, Vanilla JS and Vite.js,
emphasizing optimized assets, controlled animation and a lightweight
structure. Do **not** copy that stack automatically; Back2U's existing
stack remains authoritative.

Back2U is a student Lost & Found product, not an agency portfolio.
Translate the interaction language into:

**campus + editorial + human + useful + playful + trustworthy**

Avoid: - generic SaaS dashboards - university ERP aesthetics -
AI/neural-network visuals - excessive gradients - floating-card
overload - neon/cyberpunk styling - copying Agence Foudre's colors or
visual identity - animation for animation's sake

------------------------------------------------------------------------

# 2. Non-negotiable phased workflow

Antigravity MUST work one phase at a time.

``` text
Inspect
  ↓
Implement ONLY current phase
  ↓
Run tests
  ↓
Browser test
  ↓
Responsive test
  ↓
Accessibility test
  ↓
Performance check
  ↓
Report
  ↓
STOP
  ↓
Human validates
  ↓
Next phase
```

Never automatically continue to the next phase.

At the end of every phase, report: - what changed - files changed -
animations added - tests run - browser URL tested -
desktop/tablet/mobile result - accessibility result - performance
result - known issues

Then STOP and wait for human approval.

------------------------------------------------------------------------

# 3. Source of truth

### Existing Back2U repository

Authoritative for: - functionality - Firebase Auth - FastAPI -
Supabase - APIs - database - security - business logic - ML integration
boundary - real application data

### This document

Authoritative for: - interaction direction - motion language - component
behavior - phased UI implementation - visual translation of the
reference

### Existing Back2U brand

Preserve the existing Back2U palette, logo, typography tokens and
component system unless this document explicitly calls for an
enhancement.

Never replace working backend/API behavior for visual convenience.

------------------------------------------------------------------------

# 4. Back2U visual system

Use the existing Back2U palette, not the reference site's palette.

The established direction is:

-   **Warm cream:** primary canvas
-   **Deep plum / near-black navy:** strong type, navigation, footer,
    dark sections
-   **Coral / red-orange:** primary action and active accent
-   **Yellow:** secondary playful accent
-   **Lilac:** secondary supporting accent
-   **Pale blue:** neutral supporting state

Do not use every accent at once.

Color should have semantic purpose.

Typography: - oversized editorial headlines - short deliberate line
breaks - strong numerical labels - compact metadata - small uppercase
utility labels - generous whitespace

Avoid making every section look like a collection of SaaS cards.

------------------------------------------------------------------------

# 5. Motion language

Motion should feel: - deliberate - physical - smooth - slightly
playful - responsive - premium - fast enough for a student product

Avoid: - constant floating - excessive parallax - random particles -
continuous pulsing - heavy 3D - fake AI animations - large delays before
useful content appears

Every animation should communicate: - a state change - hierarchy -
direction - feedback - discovery - or navigation

If it communicates nothing, don't add it.

Suggested timing: - micro interaction: 100--180ms - normal transition:
250--450ms - section reveal: 500--900ms - major narrative transition:
700--1200ms

Prefer transform/opacity/clip-path where practical.

Respect `prefers-reduced-motion`.

------------------------------------------------------------------------

# 6. Reference interaction principles to translate

The reference homepage uses a narrative progression: introductory
statement → large typographic hero → people/media storytelling → project
showcase → impact statement → expertise/process → differentiators → FAQ
→ contact. Its content also uses media playback, carousels and
multi-step contact interaction.

Back2U should use the same **principle of continuous storytelling**, but
with product-oriented content:

``` text
Hero
 ↓
Lost / Found actions
 ↓
Campus Signal
 ↓
How It Works
 ↓
Search
 ↓
Results
 ↓
Reports
 ↓
Support
```

Do not turn the entire site into a portfolio.

------------------------------------------------------------------------

# 7. Phase 0 --- Motion foundation

Prepare shared UI infrastructure only.

Tasks: - inspect current component architecture - identify existing
animation tools - create shared motion tokens - create reusable
reveal/hover/transition utilities - respect reduced motion - clean up
route-transition listeners - ensure animations cannot cause layout
shifts

Do not redesign pages.

### Gate

-   app starts
-   no console errors
-   routes work
-   no hydration errors
-   reduced motion works
-   no obvious jank

STOP.

------------------------------------------------------------------------

# 8. Phase 1 --- Navigation

Keep current Back2U navigation structure.

Desktop: - logo - Browse - Hotspots - My Reports - Find an item -
account

Animation: - subtle entrance on initial page load - link hover
moves/underlines subtly - active route gets a stable accent marker -
Find an item gets a tactile arrow/border response

Mobile: - animated menu drawer - links stagger in/out - no hover
dependency - large touch targets

Do not over-animate the navigation.

STOP after testing.

------------------------------------------------------------------------

# 9. Phase 2 --- Homepage hero

Goal: immediately communicate Back2U.

Hero concept:

``` text
LOST
SOMETHING?

LET'S GET
IT BACK2U.
```

Use existing approved product copy where it already exists.

Primary actions: - I LOST SOMETHING - I FOUND SOMETHING

## Search Lens

Replace any rotating real-item-photo hero with a data-independent
visual.

Concept:

``` text
PHOTO
 +
DESCRIPTION
 +
LOCATION
 ↓
SEARCH LENS
 ↓
POSSIBLE MATCH
```

It must not display actual private/claimable records.

Animation: 1. headline reveal 2. supporting copy reveal 3. CTA reveal 4.
Search Lens enters last 5. subtle scan motion 6. subtle pointer/parallax
response 7. hover can pause/focus interaction

No neural-network aesthetic.

STOP after browser/responsive/accessibility testing.

------------------------------------------------------------------------

# 10. Phase 3 --- Lost / Found action module

Create two large editorial action areas:

``` text
I LOST SOMETHING
Find it

I FOUND SOMETHING
Help return it
```

Do not make them generic giant colored buttons.

Use: - oversized type - thin borders - whitespace - asymmetric
composition - arrow - small accent response

Hover: - block subtly expands - title shifts 4--8px - arrow moves -
border/accent strengthens - secondary information may reveal

Entire area is clickable.

Mobile stacks vertically.

STOP.

------------------------------------------------------------------------

# 11. Phase 4 --- Campus Signal

Preserve the existing Campus Signal concept.

Turn it into an animated, live-feeling but truthful campus activity
visualization.

Possible interaction: - abstract campus map - aggregate markers -
category indicators - subtle activity pulses - hover reveals aggregate
information

Privacy: - no identities - no private report details - no claimable
photos - no sensitive exact information

Animation:

``` text
marker appears
 ↓
soft ring expands
 ↓
ring fades
 ↓
marker remains
```

If there is no real data, show an honest no-activity state.

Never fabricate campus activity.

STOP.

------------------------------------------------------------------------

# 12. Phase 5 --- How It Works

Preserve the current three-step concept:

``` text
01 SHOW US THE ITEM
02 TELL US WHAT YOU REMEMBER
03 REVIEW POSSIBLE MATCHES
```

Use controlled scroll choreography.

As the user scrolls: - current step becomes dominant - number
activates - description reveals - previous/next steps become secondary

Desktop may use controlled sticky behavior.

Mobile should use normal vertical progression.

Do not trap mobile scrolling.

STOP.

------------------------------------------------------------------------

# 13. Phase 6 --- Search experience

Search is the core product interaction.

Possible inputs: - image - description - category - location -
date/time - contextual information

Make the form feel staged rather than like a generic form:

``` text
WHAT DID YOU LOSE?
 ↓
ADD A PHOTO
 ↓
WHERE?
 ↓
WHEN?
 ↓
ANYTHING DISTINCTIVE?
 ↓
SEARCH
```

Focus animation: - label shifts - border changes - helper text appears

Upload:

``` text
empty
 ↓
drag/upload
 ↓
preview
 ↓
metadata
```

Search execution:

``` text
SEARCH
 ↓
inputs compress slightly
 ↓
Search Lens activates
 ↓
real loading state
 ↓
real result / real empty state / real error
```

Never fake search results.

STOP.

------------------------------------------------------------------------

# 14. Phase 7 --- Search results

Avoid a generic card-grid dashboard.

Use editorial candidate rows/blocks.

Candidate may show: - authorized image - item information -
location/date where permitted - match information - action

Entry: - controlled stagger

Hover: - image 2--4% zoom - title shift - arrow movement - metadata
emphasis

Never reveal private information simply for visual richness.

STOP.

------------------------------------------------------------------------

# 15. Phase 8 --- My Reports

This page MUST use real database/API data.

Never hardcode: - report names - report counts - match counts - returned
counts - demo images - fake statuses

Editorial list:

``` text
01
LOST REPORT
Item title
Location
Status
→
```

Animation: - list reveal - number shift - title shift - arrow response -
status accent

Empty state:

``` text
NO REPORTS YET.

Lost something?
Start a report and we'll help you get it Back2U.
```

If Supabase has zero records, show zero records.

Never populate fake records to make the page look full.

STOP.

------------------------------------------------------------------------

# 16. Phase 9 --- Report detail

Treat a report as an item story.

Structure: - large title - status/type - date - location - media -
description - actions

Animation: - title reveal - image reveal - metadata reveal - actions
last

Image reveal can use a subtle 98% → 100% scale.

Do not aggressively zoom.

STOP.

------------------------------------------------------------------------

# 17. Phase 10 --- Report Lost / Report Found

Forms must remain functional first.

Possible progression:

``` text
ITEM
 ↓
PHOTO
 ↓
WHERE
 ↓
WHEN
 ↓
DISTINCTIVE DETAILS
 ↓
SUBMIT
```

Transitions should be quick.

Validation: - minimal shake - clear error - correct focus - no blocking
animation

Success: - clear confirmation - then real report detail

The record must actually persist to Supabase.

STOP.

------------------------------------------------------------------------

# 18. Phase 11 --- Browse

Browse only real authorized/publicly visible data.

Use: - large imagery where appropriate - editorial composition - minimal
metadata - subtle hover

No fake item cards.

No private reports.

If no appropriate records exist, show an intentional empty state.

STOP.

------------------------------------------------------------------------

# 19. Phase 12 --- Hotspots

Use a visual campus signal system, not an analytics dashboard.

Possible interactions: - location hover - category filter - date/time
filter - aggregate markers

Use real aggregate data.

If insufficient real data exists, communicate that honestly.

STOP.

------------------------------------------------------------------------

# 20. Phase 13 --- Account/Profile

Show actual application data:

-   authenticated user
-   reports
-   matches
-   returned items
-   permitted activity

No hardcoded names or counters.

Keep animations subtle.

STOP.

------------------------------------------------------------------------

# 21. Phase 14 --- Notifications

Use real backend data.

Interaction: - unread marker - hover - mark read - open related report

No continuous pulse.

Empty state:

``` text
ALL QUIET.

We'll let you know when something changes.
```

STOP.

------------------------------------------------------------------------

# 22. Phase 15 --- FAQ / Support

Use animated accordion.

Closed:

``` text
Question +
```

Open:

``` text
Question −
Answer
```

Use animated height/opacity and icon rotation.

Must support long answers and keyboard access.

STOP.

------------------------------------------------------------------------

# 23. Phase 16 --- Footer

Use deep plum.

Suggested hierarchy:

``` text
BACK2U.

Lost something?
Found something?

Browse
Search
Report Lost
Report Found
Support
Privacy
Terms
```

Entrance: - wordmark reveal - links stagger - small accent motion

Do not make it unnecessarily huge.

STOP.

------------------------------------------------------------------------

# 24. Phase 17 --- Global polish

Only after every previous phase is validated:

-   unify motion timing
-   fix spacing
-   fix typography
-   fix responsive behavior
-   remove animation inconsistencies
-   audit keyboard states
-   audit reduced motion
-   audit loading/error/empty states
-   audit performance
-   remove unused animation code

No new visual concept should be introduced in this final phase without
validation.

------------------------------------------------------------------------

# 25. Page transitions

The reference uses a narrative navigation approach and its published
technology description identifies barba.js and Locomotive Scroll among
its tools.

Back2U should borrow the **principle**, not necessarily the libraries.

Desired:

``` text
current page
 ↓
content exits gently
 ↓
new page enters
```

Requirements: - browser back/forward works - refresh works - deep links
work - no blank flashes - no long artificial loading - reduced-motion
mode works

Use existing project routing/animation infrastructure where possible.

------------------------------------------------------------------------

# 26. Scroll choreography

Use scroll reveals selectively: - opacity - translateY - clip-path - 98%
→ 100% scale - masked text

Avoid: - everything moving at once - extreme parallax - excessive pinned
sections - scroll hijacking

Native touch and keyboard scrolling must remain usable.

------------------------------------------------------------------------

# 27. Horizontal interactions

Use only where useful: - media galleries - report image gallery -
process progression - campus signal exploration

Desktop: - drag/wheel/arrows

Mobile: - native horizontal swipe

Critical information must never be accessible only through a hidden
horizontal gesture.

------------------------------------------------------------------------

# 28. Cursor interactions

Desktop only.

Possible: - subtle CTA attraction - image preview - drag cursor - Search
Lens response

Never make the cursor a gimmick.

Disable on: - touch - keyboard navigation - reduced-motion users

------------------------------------------------------------------------

# 29. Component principles

Prefer reusable components such as:

``` text
Navigation
PageTransition
Reveal
AnimatedText
EditorialButton
ArrowLink
SearchLens
LostFoundAction
CampusSignal
ProcessSteps
ReportList
ReportCard
SearchForm
SearchResult
EmptyState
ErrorState
LoadingState
NotificationItem
FAQAccordion
Footer
```

Do not create duplicates if equivalent components already exist.

------------------------------------------------------------------------

# 30. Real-data rule

Animation must never hide missing functionality.

Bad:

``` text
fake request
 ↓
beautiful loading
 ↓
fake result
```

Good:

``` text
real request
 ↓
real loading
 ↓
real response
```

or:

``` text
real request
 ↓
real loading
 ↓
no results
 ↓
honest empty state
```

No fake application data in normal production flows.

------------------------------------------------------------------------

# 31. Privacy rule

Back2U deals with potentially claimable real objects.

Never place real lost/found records or user-submitted photos on the
public landing page simply to make it visually interesting.

Only display data the current user is authorized to see.

------------------------------------------------------------------------

# 32. Accessibility

Every phase must respect:

``` css
@media (prefers-reduced-motion: reduce)
```

Reduced motion: - remove large parallax - minimize page transitions -
remove cursor effects - reduce stagger - preserve
information/functionality

Keyboard: - all controls focusable - visible focus - logical tab order -
no hover-only essential information

Dynamic UI: - correct ARIA state - accessible dialogs - accessible
accordions - appropriate live regions for meaningful async updates

------------------------------------------------------------------------

# 33. Responsive behavior

Do not simply shrink desktop.

### Desktop

-   asymmetry
-   large type
-   hover
-   controlled scroll effects

### Tablet

-   simplify composition
-   reduce motion distance

### Mobile

-   vertical narrative
-   touch-first
-   no hover dependency
-   normal scrolling preferred
-   smaller animation distances
-   large tap targets

Test every phase at desktop, tablet and mobile widths.

------------------------------------------------------------------------

# 34. Performance

Prefer: - transform - opacity - clip-path when appropriate - lazy
loading - responsive images - animation cleanup - IntersectionObserver
where appropriate

Avoid expensive layout animation when possible.

Do not add a large animation dependency for a single small effect.

------------------------------------------------------------------------

# 35. Phase testing gate

For every phase:

## Functional

-   [ ] page loads
-   [ ] no console errors
-   [ ] no runtime errors
-   [ ] existing functionality still works

## Animation

-   [ ] entry
-   [ ] exit
-   [ ] hover
-   [ ] focus
-   [ ] mobile
-   [ ] reduced motion

## Responsive

-   [ ] desktop
-   [ ] tablet
-   [ ] mobile

## Accessibility

-   [ ] keyboard
-   [ ] visible focus
-   [ ] semantic states
-   [ ] reduced motion

## Performance

-   [ ] no obvious jank
-   [ ] no runaway animation
-   [ ] listeners cleaned up
-   [ ] no layout shift caused by animation

Then STOP.

------------------------------------------------------------------------

# 36. Required phase report

At the end of every phase:

``` text
PHASE X COMPLETE

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

Do not start the next phase.

------------------------------------------------------------------------

# 37. Phase order

Implement exactly:

1.  Motion foundation
2.  Navigation
3.  Homepage hero + Search Lens
4.  Lost / Found actions
5.  Campus Signal
6.  How It Works
7.  Search experience
8.  Search results
9.  My Reports
10. Report detail
11. Report Lost / Report Found
12. Browse
13. Hotspots
14. Account/Profile
15. Notifications
16. FAQ/Support
17. Footer
18. Global polish + responsive/accessibility/performance

------------------------------------------------------------------------

# 38. What must never change during UI work

Unless explicitly approved: - Firebase Authentication - Supabase
database - FastAPI behavior - API contracts - ML integration boundary -
report ownership/security - real-data behavior - privacy rules

------------------------------------------------------------------------

# 39. Back2U creative principles

### Found, not manufactured

The interface represents real objects and real people. It should feel
human.

### Campus energy

Motion can suggest a living campus, but must never fabricate campus
activity.

### A little unexpected

Use asymmetry, large type, spacing and playful micro-motion
intentionally.

### Fast when it matters

A student searching for a lost object should never wait for decorative
animation.

### Trustworthy

Real data, real status, real actions, real results.

------------------------------------------------------------------------

# 40. Final target

The finished interface should feel:

``` text
EDITORIAL
+
CAMPUS
+
PRODUCT
+
PLAYFUL MOTION
+
HUMAN STORYTELLING
```

not:

``` text
GENERIC SAAS
+
AI DASHBOARD
+
ANIMATION GIMMICKS
```

The reference is inspiration for **intentionality and interaction
quality**, not a template.

The objective is a Back2U interface that feels equally authored and
sophisticated while remaining unmistakably Back2U.

## Final instruction to Antigravity

Do not "make Back2U look like Agence Foudre."

Instead:

``` text
Understand reference interaction
        ↓
Translate into Back2U product context
        ↓
Implement one phase
        ↓
Test it thoroughly
        ↓
STOP
        ↓
Human validates
        ↓
Implement next phase
```

Never implement the whole redesign at once.

END OF HANDOVER
