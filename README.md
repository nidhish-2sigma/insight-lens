# Insight Lens — interactive mock

Two mocks live here. Both are plain HTML, CSS and JavaScript with no build, no
server and no dependencies, and both run from `file://`.

| Open | What it is |
|---|---|
| `index.html` | **The current mock.** The Course Atlas for one real class, read from the database: a table of every student, student profiles and nine views, in Material UI's design language on the Insight Lens colours. |
| `lens.html` | The earlier mock, on invented sections: a Brief and six tabs. Everything from "The earlier mock" down describes it. |

## The current mock (`index.html`)

```
open index.html
```

The screens and their logic came from `Class 7B Course Atlas.html` (kept here
as the source they were taken from). The look is this project's theme. The
numbers are no longer invented: they are worked out from one class in the
`anonymized-prod` database.

**The class on screen**: section 218, "APCS 25-26", 36 students on CS Awesome
2.0 (13 units, 230 subunits), with work from 1 September to 21 December 2025.
The class has started three units (1, 2 and 4) and met 100 skills. Student
names are the anonymised ones the database holds.

### Where the data comes from

```
pip install pg8000
PGPASSWORD=… python3 tools/export-atlas.py [section_id]     # default 218
```

`tools/export-atlas.py` reads one section through the Cloud SQL proxy
(`127.0.0.1:5434`, database `anonymized-prod`, user `postgres`; override with
`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`) and writes `data/class.js`. The
password comes from the environment and is written nowhere. The session is
read-only.

`data/class.js` holds facts only: the students, every unit, subunit and
question in textbook order, the skills each subunit teaches and each question
checks, each student's result on each question (right first time, tries, when),
daily activity, assigned
sets and who finished them, bug reports, and the practice sets the teacher
targeted. It is a script, not JSON, so the page can load it from `file://`.

`js/atlas.js` works out every figure from those facts, so another class needs
only another export. Nothing is assumed about the plan: the database holds no
course plan and no term dates, so "now" is the last week in which half the
class worked, a unit's weeks are the weeks the class worked on it, and no unit
is treated as next.

### How the figures are defined

| Term | Meaning |
|---|---|
| Credit | For one question: a quick question (multiple choice, fill in the blank, click, drag) counts 1 when right first time and ½ on the second try; a code or Parsons task counts 1 when right within three tries and ½ within six. |
| Mastery of a skill | The student's average credit on questions tagged with the skill. When they meet the skill again three or more weeks later, the later checks weigh 60%. Secure is 80% or more, developing 60% or more, and it takes two checks to count. |
| A subunit's skills | Up to three skills the subunit gives most teaching weight to (`unit_skill_coverage`), preferring ones three or more of its questions check (`item_skill`). A review or test subunit lists what it checks most. |
| Started | A quarter of the class has tried one of the subunit's questions. A unit is started when one of its subunits is. |
| The class's questions | Questions a quarter of the class tried. "Practice done" is the share of them a student tried. |
| Weekly activity | The share of that week's class work (questions a quarter of the class first tried that week, plus work in a targeted set) the student had tried by the end of the week. Weeks with fewer than five such questions are breaks. |
| Drifting | Two weeks running below the student's own normal range (from the first weeks of class work), still below it on average since, and below it in the latest week. |
| No working check | Eight or more students tried the question and nobody's answer was ever marked right. It is listed as broken and left out of mastery. |
| Shared weak skill | A taught skill on which a fifth of the class or more is "not yet" at the same time: mastery under 60% on two or more checks. Still weak, improving (down 40% or more from its peak) or recovered (under 8% of the class). |

### What is real, what is approximate, what is missing

| Page | Status |
|---|---|
| Overview, profiles, Effort and mastery, Hardest content, Stall points, Fading skills | Real, by the definitions above. |
| Drifting | Real. Attendance is not recorded, so the signals are class days with no work, assigned sets unfinished and the change in accuracy. |
| On pace | Real counts. The course length is assumed (36 weeks) and the plan is the class's own rate continued. The goal starts at the class's median projection. |
| Shared weak skills | Real. It began as "Misconceptions", but the item bank does not tag wrong answers with the misconception behind them. The view now shows the skills many students are weak in at once, week by week, and who they are. |
| Stall points | Questions only. An open is recorded for only about one in eight of the readings and videos students worked past, so they are left out. |
| Ready for a unit | Approximate. The skill graph lives outside the database, so what a unit builds on is taken from coverage weights: skills an earlier unit teaches that this unit uses most. There is no second level of roots. |
| What worked | One real row: the array review of 8 December, which has too little later work to judge. The other six rows are **invented** (`data/sample.js`) so the chart has something to show; each is marked "sample" on screen. Delete that file, or its script tag, to see the real data alone. |
| Drafted questions in practice sets | Removed. Sets are built only from questions in the item bank. |

The same table, with the database tables behind each page, is at the foot of
every page ("Where the numbers come from"). The action log, which the top bar
opens, is on the What worked page.

Two pages were removed. "Attention now" replayed the last busy lesson minute
by minute; it went with its replay rows in the export and the flags and
profile moments that came from it. "Item health" mapped every question by how
many got it right and how well it separated students; it went with the rows
of first answers in the export. Which questions are broken or misleading is
still worked out, because a practice set leaves those out.

### What is on screen

* **Top bar**: the ALPS frame, the class, and the action log (everything you
  log in any view). Nothing is saved or sent.
* **Pages down the left**, in three groups, each tab with a small number:
  its priority (see the table below). Students opens with the overview:
  one row per student, with their weekly work and skills secure as small
  trend lines, where they stand in the class's latest three units (the unit
  it is on and the two it worked on before; a class far into the course has
  too many started units for one row, and Effort and mastery has them all), their pace, the pages
  that flag them (by the number on their tab), and one next step. Headings sort the table; a name opens
  the profile.
* **No header above the view.** The top bar names the class; the weeks the
  data covers are in the footer. Which units the class has started shows in
  the pages themselves (the grid, and the lists in Hardest content and Stall points).
* **Following a student**: click a name on any page, or a flag number or unit
  cell in the overview, and that student is picked out on every page. A bar
  at the top lists what flags them; "Stop following" or Esc ends it. There is
  no strip of student names across the pages: the overview is the list.
* **One page at a time**: the question, the answer in one line, then the chart,
  the drill-down, and what to do. "How to read" opens beside each question.
* **A chart shares its row.** On a wide window a chart is not stretched across
  the page: it sits on the left, with the panel that explains it on the right.
  That is the scatter beside the three groups to act on (Effort and mastery),
  the outline beside the picked skill or question (Hardest content, Stall
  points), the weak-skill rows, the fading rows and the effect ranges beside
  the picked row (Shared weak skills, Fading skills, What worked), the
  readiness tree beside its
  plan (Ready for a unit), and a student's timeline beside their moments. On
  pace is two charts side by side on one scale, half the class in each. On a
  narrower window the two stack and the chart takes the full width. The grid
  and the tables always take the full width.
* **Little text.** The screens carry labels, numbers and names. Explanations
  sit in "How to read" and in tooltips; evidence is a bar, a chip or a small
  figure, not a sentence; the action is the label on its button.
* Units, subunits and skills that the class has not started are still there:
  an empty column under a grey heading in the grid, and one line of names ("Not started · 1.1 1.2 …")
  under the lists in Hardest content and Stall points. Those lists open closed.
* **Drilling down.** In Effort and mastery the grid shows one level at a time: every unit,
  then the subunits of the unit you click, then the skills of the subunit you
  click. The trail above it ("All units › Selection and Iteration › 2.7 While
  Loops") takes you back up, and the chart underneath follows where you are.
  A page holds ten columns, with arrows beside the trail for the rest; a
  level opens on the first page the class has started, and going back up
  returns to the page you came from.
  In Hardest content and Stall points units open into subunits, and subunits
  into skills or questions, as rows.
* **The grid (Effort and mastery) is a calm table.** A row is a student and a column a
  unit, with white space around every cell. A cell is one small bar whose
  green says how secure, a thin line under it for practice done (red when
  under your line), and a red dot for stuck despite effort. Column names are
  written on a slant, so none is cut short, with the unit's number under
  each. The Class row shows how the class divides in each column. At the
  right, one bar per student divides the skills taught so far into secure,
  developing and not yet, with the number secure. At the foot, each column
  has the class's share of secure standings week by week, and where it is
  now. A student the Drifting page flags is marked "drifting" beside the name. With
  only a few columns (the skills of one subunit) the table is narrower and
  sits in the middle of the page.
* **Fading skills opens on the answer.** It lists only the skills
  that faded, as one chart in the middle of the page. "Show all" brings in
  every skill that was checked again. Nothing is picked to begin with:
  click a skill and the chart of every student appears beside the rows;
  click it again, or the cross, and it goes.
* **Shared weak skills is one calm row a skill.** A small pale area shows the
  share of the class not yet secure week by week, with a thin line on top; a
  bar and a count beside it say how many students are not yet secure now. It
  replaced thick red bands, which made the page a wall of red.

### The pages, by priority

The small number on each tab is the page's priority: how much its question
helps a teacher who is teaching the class, 1 the most. It is a judgement, not
a measurement, and it lives in one list (`PRI` in `js/atlas.js`): change the
order there and the tabs, the "Flagged in" numbers in the overview and the
bar for a followed student all follow. The first three stand out. Hovering a
tab gives the reason.

| Priority | Page | Question it answers | Why it ranks there |
|---|---|---|---|
| 1 | Overview | How is each student doing? | Every student at a glance, with one next step each |
| 2 | Shared weak skills | Which skills are many students weak in, and is that changing? | What to reteach to the whole class |
| 3 | Effort and mastery | Who is doing the work, and is it turning into mastery? | Who needs a reteach, and who needs a nudge |
| 4 | Drifting | Who is drifting, and since when? | Catches a student who is slipping away, early |
| 5 | Ready for a unit | Is the class ready for each unit, and what first? | What to shore up before the next unit |
| 6 | Stall points | Where do students stall, skip or give up? | Where the material loses students |
| 7 | Hardest content | Which units, subunits and skills are hardest? | Where to spend more class time |
| 8 | Fading skills | Which skills fade after they're taught? | What to bring back in warm-ups |
| 9 | On pace | Is each student on pace to reach the goal? | Who will fall short by the end of the year |
| 10 | What worked | Did what I did work? | Whether to keep doing what you tried |

The tabs stay in their three groups (Students, Content, Act and check), each
group listed most helpful first.

Links name the page: `index.html#overview`, `#weak-skills`, `#effort`,
`#drifting`, `#ready`, `#stall-points`, `#hardest`, `#fading`, `#pace`,
`#worked`, and `index.html#s-Mariah` for a student's profile. (In
the script each page also has a fixed id, used by flags and the action log;
the ids are not shown anywhere.)

### The theme

`css/atlas.css` follows Material UI's design language, on the colour tokens of
`css/lens.css` (a Material palette with the ALPS blue as primary):

* **Type**: Roboto, loaded from Google Fonts by `index.html` (without a
  connection the page falls back to Helvetica or Arial). 14px body, 20px
  medium for a page's answer, 16px medium for a section, 12px for captions.
  Emphasis is medium weight (500), in charts too. Nothing is under 12px.
* **Surfaces**: a white app bar and drawer with hairlines; each page is one
  sheet of paper with Material's first elevation; cards inside it are
  outlined. Corners are 4px; chips are full pills.
* **Controls**: contained, outlined and text buttons in sentence case; a
  connected toggle group; an outlined select; a slider with a filled track;
  a checkbox that fills with the primary colour. Students are outlined chips,
  filled once followed; a status is a small tinted chip.
* **Spacing** steps by 8px; a page has 24px of padding.

One colour, one meaning:

| Colour | Meaning |
|---|---|
| Green | right, done, secure, finished, worked |
| Pale green | got there after retries |
| Amber | needs a look: developing, guessing, idle, skipped, coasting |
| Red | wrong or failing: not yet, stuck, gave up, broken, drifting |
| Blue | primary: links, buttons, the page you are on, and the student or row you picked |
| Grey | recorded, and neutral |
| Hatching | cannot be seen: not in the lesson, not started |

Status colours keep their usual meaning everywhere. Mastery in the effort and
mastery grid, and in the overview's "By unit" cells, is a level and not a
verdict, so it is one colour that only gets darker: pale green is not yet, mid
green developing, dark green secure. Red is left there for the two problem
marks: the practice bar under a cell when it is under the line, and the dot
for stuck despite effort. Filled areas that sit side
by side (grid cells, stacked bars) use red `#D3302F`, amber `#E9A400` and a
light green `#81C784`: that set stays apart for red-green colour blindness (it
passes the palette check at every pairing). Thin marks, text and borders use
the theme's darker green, always beside a label or a position that says the
same thing.

The page uses the whole window, and every chart is drawn to the width it is
given, so its text stays the size of the text around it; charts are drawn
again when the window changes size. A chart is given the full width only when
that suits it: the grid's ten columns share the row (the last page steps back
so it is full too, "4–13 of 13 units"), and so do the tables. Every other
chart takes about three fifths of the row beside its panel, or half of it
beside a second chart, once the window is wide enough for both (`duoW` in
`js/atlas.js` decides; below that they stack). The rows in Shared weak skills run
from week 1 to today: nothing is drawn after it, so the rest of the year is
left off.

The script asks for colours by its own names (`--good`, `--bad`, `--watch`,
`--accent` …). The second half of `:root` in `css/atlas.css` answers those
names from the theme, so the script carries no colour of its own: to restyle,
change that block.

### Files

```
index.html             the frame: top bar, views rail, one view
css/atlas.css          its styles, in the Insight Lens theme
data/class.js          the class, exported from the database (facts only)
data/sample.js         invented rows for What worked only, marked as sample on screen
js/atlas.js            the data layer, the overview, the nine views, profiles, events
tools/export-atlas.py  writes data/class.js from the database
```

`node tools/check.js --checks` also checks this mock: no text under 12px in
`css/atlas.css`, text colours at 4.5:1, theme tokens identical to
`css/lens.css`, and that `data/class.js` is whole (every result points at a
student and a question that exist, one result per pair, names only for
students), that the export takes its password from the environment, and that
no chart takes the full page width by itself (each is handed its width and
paired with its panel or a second chart).

The asset links carry a version (`?v=24`). Raise it when the stylesheet, the
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
