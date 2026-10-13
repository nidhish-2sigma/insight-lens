/* INVENTED sample data for the mock. Nothing in this file comes from the database.

   It exists so that "My actions" (view 11) has enough rows to show its chart. Every row is one of the four things a teacher can do in
   the product: a reteach, coursework, content to practice, or a group. The database holds one targeted
   practice set for this class, with too little later work to judge it, so on real data alone the chart is one
   row that says "too early to tell".

   Every row here is marked "sample" wherever it appears on screen. To see the real data alone, delete this file or
   its <script> tag in index.html: the view then shows only what the export found.

   who:  'all' for the whole class, or names as they appear in data/class.js (a name not in the class is dropped).
   when: the date, or dates, it was done; shown as written.
   est:  extra points gained against the comparison group; lo and hi are the range it could plausibly be.
   The dates follow the class's real timeline (unit 1 in September, unit 2 from late September to early November, unit 4 from 10 November). */
window.ATLAS_SAMPLE = { interventions: [
  { n: 'Reteach: if statements', sn: 'the if-statement reteach', who: 'all', when: '6 Oct', est: 9, lo: 4, hi: 14,
    dose: 'One lesson, tracing branches line by line',
    cmp: 'the class’s checks on the skill before and after, against its trend on other skills',
    rec: 'Keep it.' },
  { n: 'Parsons warm-up before code tasks', sn: 'Parsons warm-ups', who: 'all', when: '13 Oct to 9 Nov', est: 5, lo: 1, hi: 9,
    dose: '5 minutes before each code task',
    cmp: 'code tasks in weeks 1–5, adjusted for difficulty',
    rec: 'Keep it.' },
  { n: 'Small group on loops', sn: 'the small group on loops', who: ['Andrew', 'Caroline', 'Donna', 'Laurie', 'Roger', 'Yvette'], when: '20 Oct to 9 Nov', est: 6, lo: -2, hi: 14,
    dose: '6 sessions of 20 minutes',
    cmp: '6 classmates with similar scores who weren’t in the group',
    rec: 'Keep going; check after the next unit.' },
  { n: 'Extra practice sets on loops', sn: 'the extra loop sets', who: ['Antonio', 'Joan', 'Kyle', 'Lawrence', 'Paula', 'Travis'], when: '27 Oct to 23 Nov', est: 2, lo: -5, hi: 9,
    dose: '8 short sets of 5 questions; 2 students did fewer than half',
    cmp: 'similar classmates who got no extra set',
    rec: 'Give each set one skill, or drop them.' },
  { n: 'Pair work on unfinished sets', sn: 'the pair work', who: ['Antonio', 'Ashlee', 'Christian', 'Dylan', 'Joan', 'Justin', 'Lawrence', 'Mariah', 'Ray', 'Travis'], when: '27 Oct to 23 Nov', est: 1, lo: -4, hi: 6,
    dose: 'Paired with a classmate for one lesson a week',
    cmp: 'classmates with as many unfinished sets who worked alone',
    rec: 'No clear effect; try groups of three with one secure student.' },
  { n: 'Extra reading on arrays', sn: 'extra reading', who: 'all', when: '10 Nov', est: 0, lo: -4, hi: 4,
    dose: 'Two extra readings, about 15 minutes',
    cmp: 'array skill checks against the class’s trend',
    rec: 'Drop it.' }
] };
