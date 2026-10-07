# Insight Lens — interactive mock

A clickable mock of the Insight Lens design in
`insight-lens/research/insight-lens-information-architecture.md`. Two demo sections
and five test shapes, a full term of simulated student work, and every insight
computed from that work rather than typed in by hand.

The goal of the screen: a teacher opens it, sees the state of the class in a few
seconds, and knows what to do next.

## Open it

Double-click `index.html`, or:

```
open index.html
```

No build, no server, no dependencies. It is plain HTML, CSS and ES5 JavaScript and
runs from `file://`.

Deep links work and are shareable:

```
index.html#/s1/understanding               a section and a tab
index.html#/s2/students?view=signal        a sub-view
index.html#/s1/students/s1-14              one student
index.html#/s1/understanding?win=1w        a time window
index.html#/s1/followups?focus=fu-s1-act3  one item on a tab, scrolled to and outlined
index.html#/s1/understanding?path=csa2:4,csa2:4.4   a place in the outline: chapter, then subunit
```

## The sections

The section picker in the top bar lists the two demo sections, then the test shapes.

| | **AP Computer Science A · Period 2** | **Introduction to Python · Block B** |
|---|---|---|
| Students | 32 | 24 rostered, 2 never signed in, 1 active account not on the roster |
| Textbooks | CS Awesome 2.0 (primary), Java Short Labs, Be Prepared for the AP CS Exam | Foundations of Python Programming (primary), Logic Gym |
| How they work | mostly in class — Mon and Thu around 10:00 | mostly homework — evenings and weekends |
| Bands | available | **not** available for this skill set |
| What stands out | a weak skill the next subunit builds on; chapter 3 skipped; completion decaying through chapter 4; 68 submissions to grade; a check-in that did not work | well below typical, with a class-wide dip; an 11-day-old grading queue; a roster problem; three students quiet for three weeks |

**Test shapes** exist to show that the same rules hold on data they were not tuned
for. Each is generated the same way as the demo sections.

| Section | Shape | What it lacks |
|---|---|---|
| Tiny seminar | 6 students | nothing; thresholds must scale down |
| New cohort | 20 students, started last week | two (and four) class weeks of work |
| Self-paced Python | 18 students, no assignments or due dates | assigned work, a shared class time, a second textbook |
| Lecture cohort | 150 students | nothing; thresholds and lists must scale up |
| Single textbook | 22 students, bare data | typical results, a prerequisite map, code questions, bands, a second textbook |

The simulated "today" is **Monday 16 November 2026, 07:30**; the teacher last
opened the Lens on Tuesday 10 November. Term started Monday 24 August.

## How the Lens decides what to show

Everything the Lens says is declared once, in `js/04b-insights.js`. Each card has
one record: what it needs from the data, its time basis, its trigger rule, the
list its headline counts, a "nothing notable" headline, and the findings it
raises. A finding names who it affects, how badly, how soon, which skills or
units it is about, and the exact list its action will act on.

The Brief, the tab counts, the card headlines, the student flags and the button
labels are all read from those records. That is what keeps them from
contradicting each other, and what makes a new section or a new insight behave
the same way without extra work.

**Ranking.** A finding's impact is *share of the roster affected × severity ×
urgency*. There are no fixed slots by type. Students nobody has followed up yet
weigh more than students already being followed up.

**Grouping by cause.** Findings that share a skill are shown as one theme with
one recommended action. A finding also joins a weak skill's theme when the
prerequisite map links them *and* at least half its students are below on that
skill. Student-level findings are grouped by kind (not showing up, working and
not getting there, working habits), one row per student with every reason.
Where questions carry no skill, findings group by unit.

**The Brief** answers two questions that never compete for rows: *what to teach
or fix* (2 to 5 themes) and *who to check on* (1 to 3). Each list shows every
theme above the impact threshold; the rest sit under "lower impact". Grading
and replies stay in the "Waiting on you" tile, and good news has its own lines.
The written brief is built from the same themes: the class in one line, the
teaching priority, who to check on.

**Tabs** open with a map of the class, then every card that fired as one row,
most important first; a row's full analysis opens in place. Cards with nothing
notable, and cards the data cannot support, are one line each. Each tab shows a
count of its cards that fired.

**Missing data.** A card states what it needs: assigned work, typical results,
a prerequisite map, code questions, bands, a second textbook, two or four class
weeks, a shared class time. Where the section lacks one, the card says so and
shows no figure.

**Thresholds** are a share of the roster with a floor, and evidence minimums
scale with class size, so a class of 6 and a class of 150 both work.

## How every screen is laid out

Each finding is one row, read left to right under three headings:

| What we see | How we know | What to do, and why |
|---|---|---|
| a short title and a few facts as chips | one small picture of the evidence | one action, the reason it follows, and one alternative |

* **Few words.** A row has a title, up to three chips, and one line of reason
  beside the button. Sentences, rules and caveats are in the full analysis.
* **Two evidence forms.** Labelled bars on one scale (a few words above them say
  what they measure), or named students. Where the finding is about students,
  each student is a bar on the measure that put them there.
* **Amber is who the action is for.** The amber bar or the amber name is the
  group the button acts on, so the number on a button can be checked against
  the picture beside it.
* **Full analysis opens in place** under its row: on the Brief, the findings
  behind it, each question or student, and other actions; on a tab, the card's
  own chart with how it is worked out.
* **One filled button** per list: the first row. The rest are outlined.

The row is drawn by `js/05b-rows.js` from the shared insight records, so the
Brief and every tab word and picture a finding the same way.

**Brief.** One sentence on the class, then four readings in the same form
(showing up, assigned work, understanding, waiting on you), each marked *On
track* or *Needs attention*. Then three rows to teach or fix and two to check
on, with the rest one click away. Where the practice sets shown would go to
many of the same students, a line offers one combined set. *Did it work?* and
*Good news* use the same three columns.

**Progress, Understanding, Engagement, Work habits.** A compact map first
(the outline of the textbook on Progress and Understanding, weekly
participation on Engagement), then one row per card that has something to look
at, most important first. A card that lists several things of one kind (weak skills,
questions to reteach) shows them as bars, with the one the action is for in
amber.

**The outline, and drilling into it.** Progress and Understanding open on every
chapter of the textbook, started or not, in textbook order. Selecting a chapter
shows all of its subunits; selecting a subunit shows its skills (the ones it
teaches, then any other skill its questions are tagged with); selecting a skill
opens its questions, the students under 35% on it, and a practice set for them.
Progress shows done / in progress / not started at each level; Understanding
shows right first time against typical, and learning bands where they exist.

* **Nothing is opened for the teacher.** The map starts at all chapters. No
  chapter is marked as where the class "is"; the headline says which chapters
  most of the class has started and which have not been started.
* **One position, three places.** The place in the outline is shared by
  Progress, Understanding and the Students grid, and is part of the link
  (`?path=`), so a unit opened in one is the unit shown in the others.
* **Ways in from a finding.** A weak skill's full analysis links to the
  subunits it sits in; a finding about a chapter opens the map at that chapter.

Findings that are about one chapter (pace, skills with no questions, what the
next subunit needs) use the chapter most of the class started most recently,
worked out from the work itself, and name it. The Window control names it too
("Latest chapter started (4)").

**Students.** Opens on *Who needs what*: one row per flagged student with the
reasons, three small pictures of their work and a next step. Students with
nothing flagged are one click away. One filter control replaces the row of
flag chips. In *By chapter*, a cell is one colour and one number; completion,
activity and learning bands are in its tooltip and its evidence drawer.

**Follow-ups.** Each action is a row: what happened, before and after, the
next step. *Each student* opens under the row. Thresholds are folded away at
the bottom.

The earlier Brief is no longer a tab; it still opens at
`index.html#/s1/briefOld`.

The asset links in `index.html` carry a version (`?v=4`). Raise it when the
stylesheet or a script changes, so a normal reload never pairs new scripts
with an old stylesheet.

## What is real and what is not

**Computed from the simulated work** — everything with a number on it. The
generator simulates individual attempts (each with a timestamp, a duration, a
chosen option or a code run and its error), and every figure is derived from
those attempts by `js/04-metrics.js`.

**Interactive** — section and tab switching, textbook and window scoping, every
evidence drawer, opening a headline in place, the theme lifecycle (Done / Not
now, with feedback in a menu, and "Put back"), the practice-set builder
(reading each question before assigning, removing questions, changing the
recipe and time budget, assigning), "Hide names", sorting and filtering
students by flag, the table view on cards that offer one, and the threshold
controls.

**Assigning and checking in actually do something**: each creates a follow-up
with a recheck date that appears on the Follow-ups tab, and the students
involved then count as followed up.

**Static** — buttons that would leave the Lens (Open grading, Generate
questions, Remind, Re-invite, Reply) show a toast saying what they would do.
Nothing persists across a reload; state lives in memory only.

**Not built**: dark mode, keyboard shortcuts beyond tab and enter, printing, and
the "More options…" path in the builder. Question wording in the builder's
preview is sample text.

## Tabs

| Tab | Question it answers |
|---|---|
| Brief | What needs me this week, and why? |
| Progress | Where is the class in the material, and is assigned work getting done? |
| Understanding | What do they get, what don't they, and why? |
| Engagement | Who is showing up, and when? |
| Work habits | How are they working? |
| Students | Who needs what? |
| Follow-ups | What did I do, and did it help? |

Each card has an **i** button. It shows how the card is worked out, what to read
with care, its time basis and its design reference (BR-1 … FU-3), so a card can
be matched to the section of the design document that specifies it.

**Scope controls** appear only where something uses them. The Window control is
shown on tabs with at least one card that follows it. A card whose time basis
differs from the selected window says so beside its title ("whole term", "right
now", "recent assignments").

## Students

Lists open with the students who need attention first: the order is the number
and seriousness of each student's flags, and the flags are the same ones that
feed the Brief. There is no overall score. A-to-Z is an option, and each flag is
a filter. Rosters longer than 40 show the first 40 and offer the rest.

The **By chapter** grid goes three levels deep, through the breadcrumb or by
selecting a column heading:

```
All chapters  ›  4 Data Collections  ›  4.4 Array Traversals
   chapters          subunits               skills assessed there
```

* **Chapters and subunits**: the cell's colour and its number are the same
  quantity, right first time. Completion, recorded activity and, where one
  exists, a learning band are in the tooltip and the evidence drawer.
* **Skills** usually carry three or four questions, so those cells show **one
  dot per question**; the percentage appears once a student has answered three.

The grid shows one textbook at a time and says which. **Textbooks side by
side** shows every attached textbook at chapter level.

A **student page** opens with a one-line reading and a suggested next step.
Previous and next walk the list the teacher came from.

## Checking the rules

```
node tools/check.js            insights for the demo sections, then the checks on every section
node tools/check.js --all      insights for every section
node tools/check.js --checks   the checks only
```

The data, metric and insight files load in Node as well as the browser, so this
runs the same code the interface does. The checks are the rules above, run
against all seven sections in every scope, and the script exits with status 1 if
one fails:

* each Brief list is in order of impact and leads with its highest-impact finding;
* every fired finding has a row on the Brief, and every fired card can raise one;
* a card that lacks its data never fires or shows a figure;
* a headline's count equals the rows beneath it;
* a button's number is the length of the list it acts on;
* numbers with the same name match across tabs, and groups add up to the roster;
* follow-up outcomes are exhaustive, each student counted once;
* no quiet student, and no student who never signed in, sits in a performance group;
* a skill counted as waiting on a gap is in a unit the class will reach;
* no text is set under 12px, and text colours meet 4.5:1 on their surfaces.

## Width

The page has no fixed maximum width: every tab uses the whole window. Charts that
can fill a column are measured after layout and drawn at that exact width, so
their type and marks stay the same size whatever the window is. Prose keeps a
readable line length while tables and charts do not.

Below 900px the side rail collapses and everything is one column, Brief first.

## Files

```
index.html           loads the scripts in order
css/lens.css         all styling; one light theme
js/01-util.js        seeded random numbers, time helpers
js/02-content.js     textbooks, chapters, skills, named questions, the demo sections and test shapes
js/03-generate.js    simulates the term attempt by attempt
js/04-metrics.js     every metric in the design document, computed from those attempts
js/04b-insights.js   one record per card and per finding; ranking, grouping, student flags, the written brief
js/05-charts.js      the visual forms, and the card component
js/05b-rows.js       the row every screen is built from: what we see, how we know, what to do and why
js/06-shell.js       frame, routing, tab layout (map, then rows), drawers, actions, the builder
js/07-tabs-a.js      Brief, Progress, Understanding
js/08-tabs-b.js      Engagement, Work habits, Students, Follow-ups
js/08b-brief.js      the Brief: class status, then rows (the earlier Brief stays in 07-tabs-a)
js/09-app.js         start
tools/check.js       prints the insights and runs the checks
tools/smoke.js       a quick look at the generated world
```

The data is deterministic: each section has a fixed seed, so the same student has
the same story on every load, and a screenshot stays valid.

To add a section, add a spec to `js/02-content.js`. A spec can set `startWeek`,
`selfPaced`, `norms: false`, `graph: false`, `noCode: true`, `bands` and any
roster size; nothing else needs to change.

## Reading the marks

One colour, one meaning:

| Colour | Meaning |
|---|---|
| Blue | done, right, active |
| Mid blue | got there with more tries |
| Pale blue | in progress |
| Red | wrong, still failing |
| Amber | needs attention: late, flagged, below typical |
| Purple | waiting on the teacher: to grade, to reply |
| Green | improved, good news |
| Grey fill | recorded, and neutral |
| Outline | not started |
| Hatching | cannot be seen, which is different from zero |

* Scales that run from weak to strong (grid cells, learning bands) go amber,
  through a neutral middle, to blue. The cells that need attention carry the
  most colour.
* **A student is a bubble that says who it is.** Where there is room, a bubble
  carries the student's initials (their number when names are hidden); selecting
  it opens that student. Bubbles that would overlap merge into one that shows a
  count. The form follows the Student Breakdown graph in the ALPS app.
* **The activity map is a quadrant map.** Its axes cross in the middle at the
  class medians and are named in words at their ends. Each half of an axis is
  stretched on its own so the class fills the plot; exact values are in the
  tooltip and the table view. Pointing at a name lights its bubble.
* **Attention is the only colour among students.** Flagged bubbles are amber and
  keep readable initials even in a crowded strip; everyone else is neutral.
* **Where one part is the point, only that part is coloured.** Start timing shows
  the late share in amber on a neutral bar. Learning bands are a bar centred on
  the middle band, weaker bands to the left.
* A class too large for one bubble each is drawn as columns of counts.
* **A comparison always draws its reference**: ┃ is the class or the typical
  result, and the bar runs from the value to it.
* Every mark has a visible label, legend or count. Tooltips add detail only.
* "Against typical" has one definition: the class and the typical result on the
  same questions, with the words *near*, *below* or *well below typical*.

## Known limits of the mock

* The typical results, the prerequisite map and the item statistics are
  simulated with plausible shapes, not copied from production.
* Hint use is shown as "not recorded" on Work habits, because that signal is not
  reliably in the data today.
* Follow-up comparisons are "after", never "because of": students picked because
  they were lowest on a skill tend to rise somewhat on any recheck.
* The impact weights (severity per finding, the follow-up discount, the 0.15
  threshold) are first values chosen by judgement, not fitted to teacher behaviour.
