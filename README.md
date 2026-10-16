# Insight Lens — interactive mock

Two mocks live here. Both are plain HTML, CSS and JavaScript with no build, no
server and no dependencies, and both run from `file://`.

| Open | What it is |
|---|---|
| `index.html` | **The current mock.** The Course Atlas for one real class, read from the database: seven pages and student profiles, in the theme and the words of the ALPS app (`alps-react-app`): its colours, its type and its names for a level. |
| `lens.html` | The earlier mock, on invented sections: a Brief and six tabs. Everything from "The earlier mock" down describes it. |

## The current mock (`index.html`)

```
open index.html
```

The screens and their logic came from `Class 7B Course Atlas.html` (kept here
as the source they were taken from). The look and the names are the ALPS
app's (`alps-react-app`): its colours, Noto Sans, and its words for a level
(Beginning, Attempted, Familiar, Proficient, Mastered), for what a page
measures (performance, engagement) and for the book (textbook). The
numbers are no longer invented: they are worked out from one class in the
`anonymized-prod` database.

**The class on screen**: section 218, "APCS 25-26", 36 students on CS Awesome
2.0 (13 units, 230 subunits), with work from 1 September 2025 to 5 February
2026; the export is dated 13 October 2026, and that is "today" on the pages.
The class has started three units (1, 2 and 4) and met 100 skills. Student
names are the anonymised ones the database holds.

**A class with more than one textbook.** A section can list several books
(`section_curriculum`), and the export writes every one of them. The real
class has one, so its pages say nothing about textbooks. To see the pages with
several, open `index.html?books`, or press "See an example with three more
textbooks" in the footer: the same class with three more books, whose outlines
are real and whose work is invented (`data/example.js`); the page says
"Example" while it is on. With work in two or more books, every page and a
profile start their controls with one filter, **Textbook**: all the textbooks, or one
of them (`?book=java-short-labs` in the address). `reports/more-than-one-book.md`
has what the database shows about such classes and the rules the pages follow.

**What a teacher sees first.** On 13 October 2026 every component of every
page was reviewed as a teacher seeing it for the first time
(`reports/first-time-teacher-review.md`), with the budget of two to three
minutes for all the pages together. The pages were then cut to what fits that
look: one question, one answer in a sentence, one picture with its key on the
page, the names, and the button; everything else one click away. The report's
afterword has the before and after, and which of its open decisions were
taken.

Run `node tools/check-pace.js` for the target scope, date-dependent estimates,
controls, narrow and wide chart markup, and multiple-book behavior. These
checks also run as part of `node tools/check.js --checks`.

### Where the data comes from

```
pip install pg8000
PGPASSWORD=… python3 tools/export-atlas.py [section_id]     # default 218
```

`tools/export-atlas.py` reads one section through the Cloud SQL proxy
(`127.0.0.1:5434`, database `anonymized-prod`, user `postgres`; override with
`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`) and writes `data/class.js`
(`ATLAS_OUT=path` writes it elsewhere). The password comes from the
environment and is written nowhere. The session is read-only. It writes every
book the section lists, the primary ones first, gives each a short name for
the places with little room, and marks each unit and each assignment with its
book (`tb`). A class with one book is written exactly as it was before the
export knew about books. Two items or two lessons that share a position come
in the order of their ids, so two runs give the same file. A question checks
a skill only when its tag's relevance score (`item_skill.relevance_score`:
25%, 50%, 75% or 100%) is above 50% (`MIN_RELEVANCE`, shared with the
prerequisite tool). Every tag on this class's questions scores 75% or 100%,
so the cut changes nothing in `data/class.js`.

```
PGPASSWORD=… python3 tools/make-example.py
```

`tools/make-example.py` builds `data/example.js`, the example with three more
books. It reads `data/class.js` and the outlines of Java Short Labs, Be
Prepared and Java Methods from the database (real), and invents the class's
work in the first two, following what the few real sections with several
books show and each student's own real record. It says so at the top of the
file, and the same seed gives the same file. Run it again after every new
export.

```
PGPASSWORD=… GRAPH_BUCKET=… python3 tools/export-prereqs.py
PGPASSWORD=… SKILL_GRAPH_FILE=graph.json python3 tools/export-prereqs.py
```

`tools/export-prereqs.py` builds `data/prereqs.js`: the skills each unit
builds on, two levels back, for Ready for a unit. The database holds no
edges. Its `knowledge_graph` table (and the older `skill_graph`) names the
graph file of the book's skill set, and the learner model keeps that file in
its cloud bucket. The tool finds the newest one and reads it from
`SKILL_GRAPH_FILE`, or from the bucket named by `GRAPH_BUCKET` (under
`GRAPH_PREFIX`, default `learner-model`) with the token of `gcloud auth
application-default login`. The bucket and the password come from the
environment and are written nowhere. In that file an LLM judged each pair of
skills, and the weight on an edge is its confidence.

The tool re-reads the outline through `tools/export-atlas.py`'s read-only
session and stops unless `data/class.js` is that very export. A unit's
skills are the ones its graded questions are tagged with at more than 50%
relevance. The lessons' teaching weights carry no relevance score, so they do
not count; a unit with no such question, Stories here, has no tree. Level 1
is what the unit's skills need that the unit does not use itself, ranked by
the edge's confidence times how many of the unit's questions check the skill.
Level 2 is what each of those needs. The skill set spans other books, so at
both levels the skills that three or more of this class's questions check
come first: a skill nothing here checks cannot say who is ready. The file
also names, for every skill in a tree, the class's lessons with a teaching
weight for it, so the page can say whether it was taught. Run it again after
every new export. Without the file the page falls back to the coverage
weights.

`data/class.js` holds facts only: the students, every unit, subunit and
question in textbook order, the skills each subunit teaches and each question
checks, each student's result on each question (right first time, tries, when),
daily activity, assigned
sets and who finished them, bug reports, and the practice sets the teacher
targeted. It is a script, not JSON, so the page can load it from `file://`.

`js/atlas.js` works out every figure from those facts, so another class needs
only another export. Nothing is assumed about the plan: the database holds no
course plan, no term dates and no timetable, so today is the export date (an
"As of" date picker under the answer on every page re-reads them as of
another day, `index.html?today=YYYY-MM-DD`), a unit's days are the days the class worked on it, nothing
is counted in weeks, no class day is assumed, and no unit is treated as next.
Students may work on any part at any time: all of it counts as work, and a
profile says when a student is catching up on an earlier unit or working
ahead. For the demo, the Drifting page opened without a day in the address
moves to the latest day it can judge (the class working, fewer than half of
it low); the address shows that day and "Back to today" returns to the
export date.

### How the figures are defined

| Term | Meaning |
|---|---|
| Credit | For one question: a quick question (multiple choice, fill in the blank, click, drag) counts 1 when right first time and ½ on the second try; a code or Parsons task counts 1 when right within three tries and ½ within six. |
| Performance on a skill | The student's score: their average credit on questions tagged with the skill. When they meet the skill again 21 days or more later, the later checks weigh 60%. The level is ALPS's band of the score (`perf_thresholds`): Beginning under 40%, Attempted from 40%, Familiar from 55%, Proficient from 65%, Mastered from 80%. It takes two checks to count; with one the level is unavailable, with none not attempted. Where a page acts on a group, the levels fold into three: mastered; familiar or proficient; beginning or attempted. |
| A unit's key skills | The skills its own summary, test, exercise and practice lessons check that are also carried forward: named by two or more lessons and checked by three or more questions, or needed by a later unit. In the product this list would be the teacher's to edit; here it is worked out from the book. |
| A student's level in a unit | ALPS's unit band, read on the key skills the class has been checked on so far: the level of the student's mean score on the ones they have a level on, capped by the share of them that is (ALPS's coverage caps: under 25% at most Attempted, under 50% at most Familiar, under 80% at most Proficient). With none, unavailable. The scatter's height is that mean score; a student the cap holds down is drawn at the top of their level's band, and the hover says why. The grid's cells and a profile's chips read the same function. A subunit's level is read the same way on its own skills. Pace counts mastered skills in the selected goal instead. |
| Pace | The teacher picks a target unit and a calendar date. The goal is mastered on all of that unit's key skills plus the earlier skills its lessons use, counted once. Unrelated earlier skills and later units are excluded. Each student's net increase on this set in the 30-day period ending at their latest recorded check sets their rate. The projection adds gains from the selected "As of" date to the deadline, capped at the goal, assuming learning continues or resumes at that observed pace. The unrecorded gap before "As of" is not extrapolated; a flat or declining observed rate adds no gains. Fewer than two checked skills (one for a one-skill goal), or checks on only one day with skills still to learn, means too early to estimate. The dotted line spreads the goal evenly from the class's first encounter with a required skill to the deadline; it is a reference, not a recorded timetable. |
| A subunit's skills | Up to three skills the subunit gives most teaching weight to (`unit_skill_coverage`), preferring ones three or more of its questions check (`item_skill`). A review or test subunit lists what it checks most. |
| Started | A quarter of the class has tried one of the subunit's questions. A unit is started when one of its subunits is. |
| The class's questions | Questions a quarter of the class tried. Engagement is the share of them a student tried. (ALPS's own engagement score is a percentile of time and attempts; this is the plain share, and the page says so on its axis.) |
| Work in five days | The questions a student first tried in a five-day block, on any unit: a student catching up on an earlier unit, or working ahead, is working. Blocks count back from today, so the latest block is always the last five days. A block in which nobody in the class worked is a break, read from the data, and is left out. A student's normal is the middle of their earlier blocks, the latest two left out. |
| Drifting | Under half their own normal in the last five days and in the live block before, judged only while classmates are not low too: when the class as a whole has stopped (no work by anyone in the last five days) or slowed (half the class or more under half their normal), the page says so and singles out nobody. |
| No working check | Eight or more students tried the question and nobody's answer was ever marked right. It is listed as broken and left out of every level. |
| Shared weak skill | A taught skill on which a fifth of the class or more is beginning or attempted at the same time: a score under 55% on two or more checks. Its line is the share of the students checked on it (eight or more) who have mastered it, five days at a time, drawn upward on a fixed 0 to 100% scale. Getting worse when that share fell 10 points or more over the last 30 days of class work, improving when it rose 10 or more, recovered when under 8% of the class is beginning or attempted, still weak otherwise. |
| The class's books | The section's list: one or more primary ("main") and any number supplemental. A unit, a lesson and a question belong to one book. A skill is shared: the books of one subject tag their questions from one skill set. The main book sets where the class is. A book with no work yet is named in the footer and nowhere else. |
| The textbook filter | With work in two or more books, the first control on every page and on a profile: "All textbooks", or one textbook with work. "All textbooks" puts the books together: a page that offers units groups them by book, each with a letter the filter keys. One book narrows the page to its units, lessons and questions, the skills its lessons use, and the work done in it. A student's level on a skill does not change with the filter: the evidence stays every question on the skill, in every book. |
| A lab | A question in a book of labs, where nine in ten questions are coding tasks. A lab is work done, never a check on a skill: it counts in engagement and in five days' work, and is left out of every level. A unit of labs is drawn as one gray bar, the share of its labs tried. On a page about a book of labs, "gave up" reads "not right yet", in gray. |

### What is real, what is approximate, what is missing

| Page | Status |
|---|---|
| Profiles, Engagement and performance, Skills (by unit and faded), Stall points | Real, by the definitions above. |
| Drifting | Real. Attendance is not recorded, so the signals are class days with no work, assigned sets unfinished and the change in accuracy. |
| On pace | Real skill evidence, with a conditional projection if learning resumes at each student's latest observed pace. The evidence dates are shown in the row's tooltip, and older evidence is labeled on the page. The target's earlier skills are inferred from textbook coverage, rather than a skill dependency graph. The default deadline is 30 days after the selected "As of" date; the teacher can choose any date on or after the "As of" date. All relevant lessons count even before the class starts them; the earlier-skill list is not truncated to the readiness tree's top four. |
| Skills (weak now) | Real. It began as "Misconceptions", but the item bank does not tag wrong answers with the misconception behind them. The view now shows the skills many students are weak in at once, five days at a time, and who they are. |
| Stall points | Questions only. An open is recorded for only about one in eight of the readings and videos students worked past, so they are left out. |
| Ready for a unit | Real edges, judged by a model. What a unit builds on, two levels back, comes from the learner model's skill graph (`data/prereqs.js`), in which an LLM judged each pair of skills. A unit's skills are the ones its graded questions are tagged with at more than 50% relevance. The skill set spans other books, so some prerequisites are checked by no question in this class: those are drawn dashed, counted under the tree, and never colour the answer. A ring needs eight students with two or more checks, and its share is of those students: the ones at the level the teacher picks on the readiness line, or above. Under each skill, a book says it was taught (a lesson that a quarter of the class worked on has a teaching weight for it). Its hover says how many questions check it, how many students answered two or more, and when it was last asked; whether the class answered its questions at all is no mark, since on the skills drawn it is nearly everyone. Without the file, and for the example's books, coverage weights stand in. |
| My actions | The log is what you did in this session. One real practice set: the array review of 8 December, with too little later work to judge. Six more rows are **invented** (`data/sample.js`), fenced off under "Sample rows", marked sample, counted in no headline and attached to no student. Delete that file, or its script tag, to see the real data alone. |
| Drafted questions in practice sets | Removed. Sets are built only from questions in the item bank. |
| The textbook filter | Real arithmetic on whatever the export holds. The days a student worked are not split by book, so under a picked book the five-day blocks are the whole class's. |
| The example with three more books (`?books`) | The class and its work in CS Awesome 2.0: real. The outlines of Java Short Labs, Be Prepared and Java Methods: real, from the database. The work in the first two: **invented** (`data/example.js`), and the page says so while it is on. |

The same table, with the database tables behind each page, is at the foot of
every page ("Where the numbers come from"). The log of everything you did,
which the top bar opens, is the My actions page.

Two pages were removed. "Attention now" replayed the last busy lesson minute
by minute; it went with its replay rows in the export and the flags and
profile moments that came from it. "Item health" mapped every question by how
many got it right and how well it separated students; it went with the rows
of first answers in the export. Which questions are broken or misleading is
still worked out, because a practice set leaves those out.

### What is on screen

Every page is built for a teacher's first look: one question, one answer in a
sentence, one picture with its key on the page, the names, and the button that
does the thing. What the first look does not need is one click away, in a
fold that remembers whether it is open. The budget behind this, and the
measurements, are in `reports/first-time-teacher-review.md`.

Every button is one of the four things a teacher can do in the product: a
reteach (to everyone, or in a small group), coursework (a practice set built
from the item bank), content to practice (the unit's own work, assigned), or
a group. Nothing is sent, launched, marked or changed in the course, and a
page offers a button only where one of the four fits: a drifting student
gets none, because none of the four answers that.

* **Top bar**: the ALPS frame, the class, and My actions (everything you log
  on any page). Nothing is saved or sent. The way to the example with more
  books is in the footer, with the rest of what is said about the data.
* **Pages down the left**, in three groups, in order of how much each helps
  a teacher (no numbers: a first-time reader took them for counts). Students
  opens with Engagement and performance. There is no overview page: a student's flags
  are in the bar for a followed student, each opening its page, and their
  one next step and practice set are on their profile.
* **No header above the view.** The top bar names the class; the day the data
  runs to (today, the export date) and the day of the latest work are in the
  footer.
* **Following a student**: click a name on any page and that student is
  picked out on every page. A bar at the top lists what flags them, each
  flag naming its page on hover; "Stop following" or Esc ends it.
* **One page at a time**: the question, the answer in one line, then the
  picture, the names, and what to do. "How to read" opens beside each
  question, in fifty words or so.
* **A chart shares its row.** On a wide window a chart is not stretched across
  the page: it sits on the left, with the panel that explains it on the right.
  That is the scatter beside the three groups to act on (Engagement and performance),
  the worst questions or the outline beside the picked question (Stall
  points), the weak-skill rows, the fading rows and the effect ranges beside
  the picked row (Skills, My actions), the readiness tree beside its plan
  (Ready for a unit), and a student's timeline beside their moments. On a
  narrower window the two stack and the chart takes the full width.
* **Little text.** The screens carry labels, numbers and names. Explanations
  sit in "How to read" and in tooltips; evidence is a bar, a chip or a small
  figure, not a sentence; the action is the label on its button.
* **What the class has not started is counted, not shown**: "+10 not started"
  beside the unit picker on Engagement and performance, under the outlines, and on a
  profile, with the names on hover. Only Ready for a unit lists every unit,
  because there the future is the point.
* **Engagement and performance opens on one unit's chart**: everyone placed
  by engagement, the share of its questions they tried (across), and
  performance, their mean score on its key skills (up), with ALPS's level
  bands up the left edge and its cuts (40, 55, 65 and 80%) on the axis. The
  three groups to act on sit beside it with a button each: struggling (doing
  the work, beginning or attempted), low engagement and coasting. A select
  picks the unit, among the started ones. The grid of every student is
  folded under the chart ("Every student, by unit"): a row a student, a
  column a started unit, each cell the student's level as ALPS's battery
  (four blocks, as many filled in the level's colour as the level; dashed
  when unavailable), a thin line under it for engagement (red when under
  your line), and a red dot for struggling. Column names are
  written on a slant, with the unit's number under each, and the Class row
  shows how the class divides. A unit heading opens its subunits, a subunit
  its skills; the trail above takes you back up. The line and the sort are
  inside the fold with the grid. A student the Drifting page flags is marked
  "drifting" beside the name.
* **Drifting is in dates, five days at a time.** The line is the questions a
  student tried per five days, on any unit, against their own normal; the
  stretches in which nobody in the class worked are hatched and the line does
  not run through them. The figure names its dates ("9 Oct to 13 Oct: 0
  questions, normal 23"). When the class as a whole is idle or slowing, the
  page says that and names nobody. Students under half their normal in the
  last five days only are one line of names. A profile's timeline is drawn
  the same way, and the profile says when a student is catching up on an
  earlier unit or working ahead.
* **On pace keeps `main`'s tracks**: a solid bar for each student's required
  skills mastered now, a dashed continuation to the selected date, the goal
  line and the dotted share due today. Status groups and the sort by status,
  projection or name remain; a wide page uses two charts on the same scale.
  The teacher picks a **Target unit** and a **By** date in a calendar field.
  "Skills in this goal" opens the exact list, split into target key skills
  and earlier skills used here. Profiles and followed-student flags use the
  same selected goal. An older export uses each student's latest recorded
  learning period and labels the forecast as assuming work resumes at that
  pace. Hover for the period's dates. A flat observed pace stays flat;
  missing history is shown as "Too early to tell".

* **Skills is one page with three views.** *Weak now* lists the skills a fifth
  of the class or more is weak in, under a heading a status (getting worse,
  still weak, improving, recovered), worst first, each row a line for the
  share of the students checked on the skill who have mastered it (lower is
  worse, so a hard skill sits low or falls), with a filter for the
  skills introduced through a unit (a time axis carries dates only, never
  units, because a student may redo an earlier unit's work at any time), with "faded: 71% → 10%"
  under a skill that was once higher; the panel opens with a card naming the
  unit and subunit where the skill was introduced, the day the class met it
  and the questions on it (click it to open the grid there), then names who
  and offers a reteach. Click a day on a line to see who was where that day;
  a second day on the same skill compares the two, by where each student is
  on the later day and where they were before (lost it: a review set; never
  got it and fell back: a small-group reteach; familiar or proficient: a
  practice set; got it; held), and a day on another skill compares the two
  skills on the later day (beginning or attempted on both: form a group). Buttons appear on today's
  lists only; a past day offers "Compare with now". A day also lists the
  questions on the skill that its students who have not mastered it are
  getting wrong, the last 30 days of class work first; two days list what the
  students who were doing better on the earlier day got wrong in between. A
  question counts as wrong with no credit and as a retry with half credit
  (both lower a level, so every drop has its questions on the list), the
  names are on hover, and a question opens Stall points at it. It is all
  drawn: the class on a day is one bar as ALPS draws a class (its five
  levels, mastered first, then unavailable, hatched) with its key, two days are two bars on one scale, the cards
  carry the bar's colours, and each question is a bar of the students it
  lists, in Stall points' colours (got it wrong, needed retries, right first
  time) with an empty part for those who did not try, its counts inside. The left and right arrows
  pick a day on a focused row, and Esc clears it. *By unit* is the outline of the textbook with a bar a row, the class by
  ALPS level (what was Hardest content). *Faded* is the before-and-after of every skill that was
  checked again (what was Fading skills); nothing is picked to begin with,
  and a click on a skill opens the chart of every student beside the rows.
  The old links still open their view.
* **Stall points opens on the worst questions**: the eight where the most
  students gave up or skipped, as one ranked list with the lesson code; the
  outline of the textbook is the second view, and a "Where they stall" link from
  the Skills page opens the outline at the lesson.
* **Ready for a unit asks which unit is next** and picks the first one not
  started after the unit the class is in; one select holds every unit, with
  "done" and "now" on the started ones. Under it is the **readiness line**
  ("Level needed"): ALPS's levels from attempted up as four stops on one line,
  each with its battery and what the class is at it for this unit (ready,
  groups first, not ready). The teacher picks the level the unit needs, proficient
  to begin with, and the tree, the plan and the answer read it. Under the line
  is a tree two levels deep: the top row is what the unit's skills need, the
  row under it what those need, each a ring of the share of the class at the
  picked level or above (red under 60%, amber under 80%, green ready), with a
  book under it, filled when the class was taught it and hollow when not;
  its hover says how many questions check it, how many students answered
  two or more, and when it was last asked. The skills the class has evidence on are
  picked first, up to four on top and two under each, and they run weakest
  first, left to right, so the first ring is where to start. The page keeps
  its text to what a decision needs: the unit box carries its name alone, the
  rows are not named (the links show them), the key is one line drawn with
  the tree's own marks ("Share mastered", the three ring colours, the two
  books), and the plan's cards name skills without their shares, which the
  rings show. A small group holds only the students checked
  on its skill and below the picked level on it; the ones never checked are
  counted apart, names on hover. Going further stays for the students who
  have mastered every skill shown, whatever the level. A card with nothing in
  it is left out and one line says so ("Nothing to reteach."); a name's remove
  button shows when the pointer is on its row. The second row draws only
  skills with evidence; the others are counted under the tree ("+8 more
  prerequisites", names on hover).
* **A plan group can be put on the tree.** The small group's card and the
  ready-to-go-further card each have a "Show on tree" button: the tree
  then shows that group alone (each ring the share of its students at the
  level), says so above it ("Small group · 4 students"), and "Whole class"
  goes back. The plan, the stops and the answer stay the class's. A new
  unit starts on the whole class; on a phone the page scrolls up to the tree.
* **Ready for a unit has four other versions of its tree to compare,**
  switched in one select beside the unit picker ("Version") and opened
  from the address with `?rv=1` to `?rv=4`. Each keeps the current tree's
  rings, links, books, key and plan cards and changes one thing: v1 runs the
  tree left to right, names beside the rings; v2 is radial, the unit in the
  middle, the skills it builds on around it and what those build on further
  out; v3 is the current tree with each ring and link sized by how much the
  unit's questions lean on the skill (the skill graph's weight); v4 is the
  current tree with each ring split by ALPS level over the students checked on
  the skill (mastered first, a white gap between levels; the hover counts the
  ones not checked twice), so its arcs agree with the share inside. Each has
  its own "How to read". The page opens on the current version.
* **The tree is drawn plainly in every version.** A ring is a light track and
  one round-ended arc (a share, in its status colour) or ALPS's level arcs
  (v4); the share inside has a small % sign; the unit is a box in the primary
  tint; the links are thin right-angled elbows from one rail (a fan from the
  centre in v2), and on the radial tree a label sits clear of its ring.
* **Students are listed to be scanned, never as chips.** Every list of
  students on every page is one list: a row a student, in alphabetical
  order, with a hairline under each, in columns that run down then across
  once it is long. Where the page has the number behind a student's place,
  it sits at the right of the row and a short caption names it: key skills
  mastered or questions tried on Engagement and performance, questions
  tried against their normal on Drifting, the score on Skills, the score when
  taught and later on the faded skills, and how many of a group's skills on Ready for a unit.
  A name still opens the student; a group on Ready keeps its button to take
  a student out.
* **A picker with many options is one select, never a row of buttons**: the
  unit on Engagement and performance, the next unit on Ready for a unit, the
  unit filters on the Skills page, the goal unit on On pace, and the Textbook
  filter. With several textbooks the units are grouped by textbook inside the
  select.
* **My actions opens on the log** of everything you did today, then the
  practice sets you targeted, judged on later work. The invented sample rows
  sit in a fold of their own, marked invented, counted in no headline and
  attached to nobody.
* **More than one textbook.** With one textbook nothing on any page says
  "textbook". With more, the top bar counts them ("CS Awesome 2.0 + 3
  textbooks") and the
  footer names every one, a book with no work yet among them. Every page and
  a profile then start their controls with the Textbook filter, one select,
  which keys each textbook to a letter: A, B, C. Under "All textbooks" the grid has a label
  over each book's columns, the outlines (Skills by unit, Stall points) group
  by book, and every unit select groups its units by book. A unit or lesson of another book says its book
  wherever the page is not about that book. The main book's units are the
  bands of time, the units a level is read in, and the units pace is read
  against.
* **A book of labs** is drawn as work, not as a level: a gray bar for the
  share of its labs tried, red when under your line. Under "All textbooks" the
  labs are named under the outlines and not ranked in them; under the labs
  book, Stall points shows which labs the class has not got to run yet. A
  unit of labs has no level and is never a unit a student is behind in. A
  book with work in fewer than four five-day blocks gives too little to judge
  drifting: the page says so, and the figures go blank rather than read as
  zero.

### The pages, in order

The rail lists the pages in order of how much each question helps a teacher
who is teaching the class. It is a judgement, not a measurement, and it lives
in one list (`PRI` in `js/atlas.js`): change the order there and the rail and
the order of a student's flags follow. No number is shown: a first-time
teacher read the numbers on the tabs as counts. Hovering a tab gives the
reason.

| Order | Page | Question it answers | Why it ranks there |
|---|---|---|---|
| 1 | Skills | Which skills are many students weak in, and which first? | What to reteach to the whole class |
| 2 | Engagement and performance | Who is engaged, and is it showing in their performance? | Who needs a reteach, and who needs a nudge |
| 3 | Drifting | Who is drifting, and since when? | Catches a student who is slipping away, early |
| 4 | Ready for a unit | Which unit do you teach next, and is the class ready for it? | What to shore up before the next unit |
| 5 | Stall points | Where do students stall, skip or give up? | Where the material loses students |
| 6 | On pace | Will each student reach the target unit's key skills by the goal date? | Who is projected to miss the selected unit goal |
| 7 | My actions | What have I done, and did it work? | What you did, and whether it worked |

The tabs stay in their three groups (Students, Content, Act and check), each
group listed most helpful first.

Links name the page: `index.html#engagement` (where the pages open), `#skills`
(`#hardest` and `#fading` open its other two views), `#drifting`, `#ready`,
`#stall-points`, `#pace`, `#actions`, and `index.html#s-Mariah` for a
student's profile; the older names `#weak-skills` and `#worked` still open
the page they named, and `#effort` and `#overview` open Engagement and performance. (In the script each page also has a fixed id, used by
flags and the log; the ids are not shown anywhere.)

### The theme and the names

The look and the words are the ALPS app's (`alps-react-app`, read on 16
October 2026; only values were taken from it): its colours (`src/App.css`,
`src/utils/colors.js`, `src/utils/mui-theme.js`), its type, and its names for
what a page measures. `css/atlas.css` and `css/lens.css` hold the same theme
tokens.

* **Type**: Noto Sans, ALPS's typeface, loaded from Google Fonts by
  `index.html` (without a connection the page falls back to Helvetica or
  Arial). 14px body, 20px medium for a page's answer, 16px medium for a
  section, 12px for captions. Emphasis is medium weight (500), in charts too.
  Nothing is under 12px.
* **Surfaces**: a white app bar and drawer with hairlines; each page is one
  sheet of paper with Material's first elevation; cards inside it are
  outlined. Corners are 4px on surfaces and 10px on buttons, as in ALPS;
  chips are full pills.
* **Controls**: contained, outlined and text buttons in sentence case; a
  connected toggle group; an outlined select; a slider with a filled track;
  a checkbox that fills with the primary colour. A status is a small tinted
  chip.
* **Spacing** steps by 8px; a page has 24px of padding.

**Names.** ALPS's word wherever the two apps mean the same thing:

| ALPS's word | Was | Where |
|---|---|---|
| Performance, and its levels: Beginning, Attempted, Familiar, Proficient, Mastered | mastery; secure, developing, not yet | every page |
| Engagement | effort, practice done | the scatter, the grid, a profile |
| Engagement and performance | Effort and mastery | the page (`#engagement`; `#effort` still opens it) |
| Struggling | Stuck despite effort | its card, the grid's dot, a student's flag |
| Low engagement | Not doing the work | its card, a student's flag |
| Unavailable (practised, no level yet) | Too early (one check) | a level's key, the grid, a class bar |
| Textbook | book | the filter, the footer, the hints |

Where a page acts on a group of levels it names the levels: *mastered*;
*familiar or proficient* (a practice set); *beginning or attempted* (a
reteach). Groups and verdicts ALPS has no word for keep theirs: on track,
keep going, coasting, too early to tell, and the pace and weak-skill
statuses. The buttons keep their verbs.

**The levels are ALPS's, cuts included.** A skill's level is the band of its
score: Beginning under 40%, Attempted from 40%, Familiar from 55%, Proficient
from 65%, Mastered from 80% (ALPS's `perf_thresholds`). A unit's level is
ALPS's unit band on the unit's key skills (see "A student's level in a
unit"). ALPS's names on the old cuts would have called students familiar who
are not familiar in ALPS, so the cuts moved with the names: the line between
the two lower groups is 55% (it was 60%), and the unit band replaces the old
standing (a share of key skills secure, with the hard third gating mastered).

**Colours**, one meaning each:

| Colour | Meaning |
|---|---|
| ALPS's performance ramp: gray `#D7D7D7`, then `#E3F2FD`, `#90CAF9`, `#1876D2`, `#0D47A1` | a level, Beginning to Mastered |
| Hatched pale gray in a dashed outline | unavailable: practised, no level yet |
| Empty in a solid outline | not attempted, or not checked twice |
| Green `#408B4D` | right, done, finished, worked, ready |
| Pale green | got there after retries |
| Yellow `#E19F01` | needs a look: guessing, idle, skipped, coasting, under 80% |
| Red `#DC3545` | wrong or failing: struggling, low engagement, gave up, broken, drifting |
| Blue `#1864F2` | primary: links, buttons, the page you are on, and the student or row you picked |
| Gray | recorded, and neutral |
| Hatching | cannot be seen: not in the lesson, not started |

A level is drawn the way ALPS draws it. For one student it is ALPS's battery:
four blocks, as many filled in the level's colour as the level (none for
Beginning), and four dashed outlines when it is unavailable. Attempted's one
block is so pale that it keeps a thin outline in the next blue, or the picked
column's tint would hide it and it would read as Beginning. For a class it is
ALPS's stacked bar, mastered first, its unavailable part hatched. Red stays
off the levels, for the two problem marks: the engagement line under a cell
when it is under your line (yellow when coasting), and the dot for
struggling. White text sits only on the two darkest blues and on red: under
white, ALPS's green fails 4.5:1, so nothing white is written on it.

The page uses the whole window, and every chart is drawn to the width it is
given, so its text stays the size of the text around it; charts are drawn
again when the window changes size. A chart is given the full width only when
that suits it: the grid's columns share the row (ten at a time, with the last
page stepping back so it is full too), and so do the tables. Every other
chart takes about three fifths of the row beside its panel, or half of it
beside a second chart, once the window is wide enough for both (`duoW` in
`js/atlas.js` decides; below that they stack). The rows of the Skills page run
from the first day of work to a little after the latest: nothing is drawn
after that, so an idle stretch is left off.

The script asks for colours by its own names (`--good`, `--bad`, `--watch`,
`--accent` …). The second half of `:root` in `css/atlas.css` answers those
names from the theme, so the script carries no colour of its own: to restyle,
change that block.

### Files

```
index.html               the frame: top bar, views rail, one view
css/atlas.css            its styles, in the ALPS app's theme
data/class.js            the class, exported from the database (facts only)
data/sample.js           invented rows for My actions only, fenced off and marked as sample on screen
data/example.js          the example with three more books: real outlines, invented work, and it says so
data/prereqs.js          what each unit builds on, two levels back, from the learner model's skill graph
js/atlas.js              the data layer, the pages, profiles, events
tools/export-atlas.py    writes data/class.js from the database, every book the section lists
tools/make-example.py    writes data/example.js from data/class.js and the database
tools/export-prereqs.py  writes data/prereqs.js from the database and the skill graph file
reports/                 the multi-book write-up, and the first-time-teacher review with its afterword on what was built
```

`node tools/check.js --checks` also checks this mock: no text under 12px in
`css/atlas.css`, text colours at 4.5:1, theme tokens identical to
`css/lens.css`, and that `data/class.js` is whole (every result points at a
student and a question that exist, one result per pair, names only for
students), that the export takes its password from the environment, and that
no chart takes the full page width by itself (each is handed its width and
paired with its panel or a second chart). It also holds the rules for a
class with several books: a class with one is drawn as it always was, every
page has the same filter, a level does not change with the book, a lab is
never a check, and the example keeps real and invented apart and was built
for this very export. And the rules behind what a teacher sees first: one
level on the grid and the profile, ALPS's unit band read from a unit's key skills; no
overview page; sample rows attached to nobody; no priority numbers; the
skills pages as one; the weak-skills line is the share mastered, so lower is worse; every "How to read" at fifty words or so;
every action one of the four a teacher can take; time in dates, with
today the export date, recent the last five days, and no class day assumed;
and the prerequisite tree, read only from a graph file built for this very
export, starting from question tags above 50% relevance, with a ring only
where eight students were checked, read at the level picked on the readiness
line (a higher level never says the class is more ready), a taught symbol under every skill, and
the evidence's depth and date on hover. And ALPS's theme and words: its
colours and Noto Sans, its five levels at its cuts, a level drawn as its
battery or its stacked bar, and none of the old words (secure, not yet,
developing, effort and mastery) on screen.

The asset links carry a version (`?v=41`). Raise it when the stylesheet, the
script or the data changes, so a normal reload never pairs a new script with
an old stylesheet.

`data/class.js` holds per-student records. They come from the anonymised copy,
but decide before committing whether the file belongs in the repository.

---

# The earlier mock (`lens.html`)

A clickable mock of the Insight Lens design in
`insight-lens/research/insight-lens-information-architecture.md`. Two demo sections
and five test shapes, a full term of simulated student work, and every insight
computed from that work rather than typed in by hand.

The goal of the screen: a teacher opens it, sees the state of the class in a few
seconds, and knows what to do next.

## Open it

```
open lens.html
```

Deep links work and are shareable:

```
lens.html#/s1/understanding               a section and a tab
lens.html#/s2/students?view=signal        a sub-view
lens.html#/s1/students/s1-14              one student
lens.html#/s1/understanding?win=1w        a time window
lens.html#/s1/followups?focus=fu-s1-act3  one item on a tab, scrolled to and outlined
lens.html#/s1/understanding?path=csa2:4,csa2:4.4   a place in the outline: chapter, then subunit
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
`lens.html#/s1/briefOld`.

The asset links in `lens.html` carry a version (`?v=4`). Raise it when the
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
lens.html            loads the scripts in order
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
