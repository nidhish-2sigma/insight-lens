/* INVENTED sample data for the mock. Nothing in this file comes from the database.

   It exists so that "What worked" (view 11) has enough rows to show its chart. The database holds one targeted
   practice set for this class, with too little later work to judge it, so on real data alone the chart is one
   row that says "too early to tell".

   Every row here is marked "sample" wherever it appears on screen. To see the real data alone, delete this file or
   its <script> tag in index.html: the view then shows only what the export found.

   who:  'all' for the whole class, or names as they appear in data/class.js (a name not in the class is dropped).
   est:  extra points gained against the comparison group; lo and hi are the range it could plausibly be.
   The weeks follow the class's real timeline (unit 1 in weeks 1-3, unit 2 in weeks 4-10, unit 4 from week 11). */
window.ATLAS_SAMPLE = { interventions: [
  { n: 'Reteach: if statements', sn: 'the if-statement reteach', who: 'all', wk: 'Week 6', est: 9, lo: 4, hi: 14,
    dose: 'One lesson, tracing branches line by line',
    cmp: 'the class’s checks on the skill before and after, against its trend on other skills',
    rec: 'Keep it.' },
  { n: 'Parsons warm-up before code tasks', sn: 'Parsons warm-ups', who: 'all', wk: 'Weeks 7–10', est: 5, lo: 1, hi: 9,
    dose: '5 minutes before each code task',
    cmp: 'code tasks in weeks 1–5, adjusted for difficulty',
    rec: 'Keep it.' },
  { n: 'Small group on loops', sn: 'the small group on loops', who: ['Andrew', 'Caroline', 'Donna', 'Laurie', 'Roger', 'Yvette'], wk: 'Weeks 8–10', est: 6, lo: -2, hi: 14,
    dose: '6 sessions of 20 minutes',
    cmp: '6 classmates with similar scores who weren’t in the group',
    rec: 'Keep going; check after the next unit.' },
  { n: 'Lunch coding club', sn: 'the coding club', who: ['Antonio', 'Joan', 'Kyle', 'Lawrence', 'Paula', 'Travis'], wk: 'Weeks 9–12', est: 2, lo: -5, hi: 9,
    dose: '8 sessions of 30 minutes; 2 students came to fewer than half',
    cmp: 'similar classmates who didn’t attend',
    rec: 'Give it a clear goal, or drop it.' },
  { n: 'Messages home about unfinished sets', sn: 'messages home', who: ['Antonio', 'Ashlee', 'Christian', 'Dylan', 'Joan', 'Justin', 'Lawrence', 'Mariah', 'Ray', 'Travis'], wk: 'Weeks 9–12', est: 1, lo: -4, hi: 6,
    dose: 'A message after each unfinished set',
    cmp: 'classmates with as many unfinished sets who got no message',
    rec: 'Call the families still drifting.' },
  { n: 'Extra reading on arrays', sn: 'extra reading', who: 'all', wk: 'Week 11', est: 0, lo: -4, hi: 4,
    dose: 'Two extra readings, about 15 minutes',
    cmp: 'array skill checks against the class’s trend',
    rec: 'Drop it.' }
] };
