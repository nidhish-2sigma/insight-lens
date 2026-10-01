# Insight Lens — interactive mock

A clickable mock of the Insight Lens design in
`insight-lens/research/insight-lens-information-architecture.md`. Two sections, a
full term of simulated student work, and all 44 insights computed from that work
rather than typed in by hand.

## Open it

Double-click `index.html`, or:

```
open index.html
```

No build, no server, no dependencies. It is plain HTML, CSS and ES5 JavaScript and
runs from `file://`.

Deep links work and are shareable:

```
index.html#/s1/understanding            a section and a tab
index.html#/s2/students?view=signal     a sub-view
index.html#/s1/students/s1-14           one student
index.html#/s1/progress?tb=csa2&win=1w  textbook and window
```

## The two sections

Both belong to one teacher, so the section switcher in the top bar is worth using:
the same screens tell different stories.

| | **AP Computer Science A · Period 2** | **Introduction to Python · Block B** |
|---|---|---|
| Students | 32 | 24 rostered, 2 never signed in, 1 active account not on the roster |
| Textbooks | CS Awesome 2.0 (primary), Java Short Labs, Be Prepared for the AP CS Exam | Foundations of Python Programming (primary), Logic Gym |
| How they work | mostly in class — Mon and Thu around 10:00 | mostly homework — evenings and weekends |
| Bands | available | **not** available for this skill set, so cells fall back to first-try success |
| What stands out | chapter 3 skipped; completion decaying through chapter 4; 68 submissions to grade; a check-in that did not work | a class-wide dip; 11-day-old grading queue; a roster problem; three students quiet for three weeks |

The simulated "today" is **Monday 16 November 2026, 07:30**; the teacher last
opened the Lens on Tuesday 10 November. Term started Monday 24 August.

## What is real and what is not

**Computed from the simulated work** — everything with a number on it. The
generator simulates individual attempts (each with a timestamp, a duration, a
chosen option or a code run and its error), and every figure in the interface is
derived from those attempts by `js/04-metrics.js`. So the numbers reconcile: the
68 on the Brief is the same 68 the Progress tab breaks down by assignment, and the
class-level first-try percentage is what you get by opening each student's cells
and adding them up. Change a threshold on Follow-ups and the preview recounts
against real records.

**Interactive** — section and tab switching, textbook and window scoping, every
evidence drawer (select a cell, a question, a bar, a dot or a name), the queue card
lifecycle (done / watch / dismiss / not relevant / useful), the practice-set
builder (removing questions, changing the recipe and time budget, assigning), "Hide
names", the table view on cards that offer one, and the threshold controls.

**Assigning actually does something**: it creates a follow-up with a recheck date
that then appears on the Follow-ups tab and on the Brief.

**Static** — buttons that would leave the Lens (Open grading, Generate questions,
Remind students, Re-invite, Reply) show a toast saying what they would do. Nothing
persists across a reload; state lives in memory only.

**Not built**: dark mode, keyboard shortcuts beyond tab and enter, printing, and
the "Preview as student" and "More options…" paths in the builder.

## Tabs

| Tab | Question it answers | Insight ids |
|---|---|---|
| Brief | What needs me this week? | BR-1 … BR-6 |
| Progress | Where is the class in the material, and is assigned work getting done? | PR-1 … PR-7 |
| Understanding | What do they get, what don't they, and why? | UN-1 … UN-12 |
| Engagement | Who is showing up, and when? | EN-1 … EN-5 |
| Work habits | How are they working? | WH-1 … WH-6 |
| Students | Who needs what? | ST-1 … ST-5 |
| Follow-ups | What did I do, and did it help? | FU-1 … FU-3 |

Each card shows its id so it can be matched to the section of the design document
that specifies it.

## Drilling down to a skill

The **Students › By unit** grid goes three levels deep, through the breadcrumb or
by selecting a column heading:

```
All chapters  ›  4 Data Collections  ›  4.4 Array Traversals
   chapters          subunits               skills assessed there
```

The marks change with the level, because the evidence does:

* **Chapters and subunits** carry enough questions for a rate, so the cell is
  tinted by the band (or by first-try success where bands are unavailable), shows
  that student's first-try percentage, a bar of recorded activity against the
  class, and a strip of correct / incorrect / awaiting grading / not started.
* **Skills** usually carry three or four questions, where a percentage would round
  away the detail. Those cells show **one dot per question** — right first time,
  right after more than one try, never right, awaiting grading, not started — so
  the teacher counts rather than trusts a rate. The percentage appears only once a
  student has answered three.

Selecting any cell opens the evidence behind it. At skill level that is every
question on the skill with the student's attempts in order, and a one-click
practice set on exactly that skill.

Sorting is per column: pick "Lowest first try", "Least complete" or "Most time"
and then the column to sort by.

## Checking the data

```
node tools/check.js
```

Prints every insight for both sections as text — class first-try, the frontier,
the funnel, root gaps, reteach candidates, trajectories, quiet students, retry
patterns, follow-up outcomes and so on. The data and metric files load in Node as
well as the browser, so this runs the same code the interface does. Useful for
checking that a change to the generator still produces a class worth looking at.

## Width

The page has no fixed maximum width: every tab uses the whole window. Charts that
can fill a column are measured after layout and drawn at that exact width, so
their type and marks stay the same size whatever the window is — a stretched
viewBox would have scaled the labels up with the chart. The unit grid spreads its
cells into the space available, up to a size past which a larger cell would say
nothing more, and prose keeps a readable line length while tables and charts do
not. Resizing the window redraws the fitted charts.

## Files

```
index.html          loads the scripts in order
css/lens.css        all styling; one light theme
js/01-util.js       seeded random numbers, time helpers
js/02-content.js    textbooks, chapters, skills, named questions, the two section specs
js/03-generate.js   simulates the term attempt by attempt
js/04-metrics.js    every metric in the design document, computed from those attempts
js/05-charts.js     the eleven visual forms
js/06-shell.js      frame, routing, drawers, the queue, the builder
js/07-tabs-a.js     Brief, Progress, Understanding
js/08-tabs-b.js     Engagement, Work habits, Students, Follow-ups
js/09-app.js        start
tools/check.js      prints every insight for both sections
```

The data is deterministic: each section has a fixed seed, so the same student has
the same story on every load, and a screenshot stays valid.

## Reading the marks

* **Students are countable dots.** One dot is one student and selecting it opens
  that student.
* **Not started is an outline**, never a grey fill — grey fills mean a recorded
  state.
* **Hatching means "cannot be seen"**, which is different from zero.
* **A comparison always draws its reference**: ┃ is the class or the platform
  norm, and the bar runs from the value to it.
* **Bands are capped by coverage.** A unit that is a quarter scored cannot show
  better than the second band; the drawer says so.
* Amber marks attention, not failure. Blue is correct, red is incorrect, amber is
  awaiting grading.

## Known limits of the mock

* The platform norms, the prerequisite graph and the item statistics are
  simulated with plausible shapes, not copied from production.
* Hint use is deliberately shown as "not recorded" on Work habits, because that
  signal is not reliably in the data today.
* Follow-up comparisons are "after", never "because of": students picked because
  they were lowest on a skill tend to rise somewhat on any recheck.
