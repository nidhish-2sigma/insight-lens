"""Checks queries.sql without the database: runs it in DuckDB on the export rebuilt as database tables, and compares every answer
with the page's own, day by day.

  node approach/drifting/backtest.js --tables /tmp/drifting-tables.json
  python3 approach/drifting/check-sql.py /tmp/drifting-tables.json          (needs DuckDB: pip install duckdb)

What it shows: on data shaped like the database, the SQL leaves out what it should (backtest.js adds those rows on purpose) and gives
the page's answers. What it cannot show: that the real tables hold what the export read from them. Run queries.sql on the database for
that (data-sources.md says what to expect for section 218).

DuckDB reads Postgres SQL nearly as Postgres does. The queries were written to run unchanged in both: parameters are filled in as text,
and nothing here edits the SQL.
"""
import datetime as dt
import json
import os
import random
import re
import sys

import duckdb

HERE = os.path.dirname(os.path.abspath(__file__))
SQL = open(os.path.join(HERE, 'queries.sql'), encoding='utf-8').read()
QUERIES = [s.strip() for s in re.split(r';\s*\n', SQL) if re.search(r'\bselect\b', s)]
assert len(QUERIES) == 9, 'queries.sql should hold 9 queries, not %d' % len(QUERIES)

SCHEMA = {
    'section_user': 'section_user_id int, app_user_id int, section_id int, role varchar, ignore boolean, deleted_at timestamp',
    'app_user': 'app_user_id int, is_virtual boolean',
    'assignment': 'assignment_id int, section_user_id int, ignore boolean, coursework_item_id int',
    'interaction_summary': 'interaction_summary_id int, assignment_id int, item_id int, item_type varchar, action varchar, correct boolean, "timestamp" timestamp, ignore boolean',
    'unit': 'unit_id int, parent_id int, level int, source_curriculum_id varchar, ignore boolean',
    'curriculum_unit_order': 'curriculum_id varchar, unit_id int, ordering real, display_id varchar, display_name varchar, hidden boolean, ignore boolean',
    'curriculum_unit_item': 'curriculum_id varchar, unit_id int, item_id int, ordering real, ignore boolean',
    'student_activity_hour': 'section_id int, section_user_id int, hour_start timestamp, items int, graded_attempts int, correct_attempts int',
    'coursework': 'coursework_id int, section_id int, coursework_name varchar, coursework_type varchar, due_date timestamp, visibility varchar, ignore boolean, unit_id int, curriculum_id varchar',
    'coursework_status': 'coursework_id int, section_user_id int, status varchar, ignore boolean',
}


def main():
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    meta, con, bad = data['meta'], duckdb.connect(), []
    for t, cols in SCHEMA.items():
        con.execute('create table %s (%s)' % (t, cols))
        rows = data['tables'][t]
        if rows:
            con.executemany('insert into %s values (%s)' % (t, ','.join('?' * len(rows[0]))), rows)

    def run(k, as_of=None):
        q = QUERIES[k - 1].replace(':section_id', str(meta['section'])).replace(':curriculum_id', "'%s'" % meta['curriculum']).replace(':utc_offset', '(%d)' % meta['offset'])
        if as_of:
            q = q.replace(':as_of', "'%s'" % as_of)
        cur = con.execute(q)
        names = [d[0] for d in cur.description]
        return [dict(zip(names, r)) for r in cur.fetchall()]

    students = run(1)
    print('query 1: %d students' % len(students))
    first = {(r['section_user_id'], r['item_id']): r['first_day'].isoformat() for r in run(3)}
    want = {(s, i): d for s, i, d in data['firstTries']}
    print('query 3: %d first tries; the same as the export: %s' % (len(first), first == want))
    if first != want:
        bad.append('query 3')

    n = dict.fromkeys((4, 5, 6, 7, 8), 0)
    for day in data['days']:
        T, S = day['day'], {s['id']: s for s in day['students']}
        rows = run(4, T)
        for r in rows:
            s = S[r['section_user_id']]
            status = ('not judged: nobody in the class worked in the last five days' if day['idle'] else 'not judged: too few earlier blocks with class work' if s['norm'] is None
                      else 'not judged: the class as a whole slowed' if day['slow'] else 'drifting' if s['dr'] else 'working less' if s['watch'] else 'normal')
            since = r['drifting_since'].isoformat() if r['drifting_since'] else None
            normal = None if r['normal'] is None else int(r['normal'])
            n[4] += 1
            if (r['status'], since, normal) != (status, s['dr'], s['norm']):
                bad.append('query 4, %s, student %d: %s %s %s; the page: %s %s %s' % (T, r['section_user_id'], r['status'], since, normal, status, s['dr'], s['norm']))
        c = rows[0]
        got = (int(c['class_judged']), int(c['class_low_now']), int(c['class_last_five_days']), int(c['class_usual'] or 0), c['class_last_work'].isoformat())
        if got != (day['njudge'], day['nlow'], day['c0'], day['cnorm'], day['lastwork']):
            bad.append('query 4, %s, the class: %s; the page: %s' % (T, got, (day['njudge'], day['nlow'], day['c0'], day['cnorm'], day['lastwork'])))
        for k, field, sig in ((6, 'days_without_work', 'miss'), (7, 'sets_unfinished', 'work'), (8, 'accuracy_change_points', 'acc')):
            for r in run(k, T):
                n[k] += 1
                if int(r[field]) != S[r['section_user_id']]['sig'][sig]:
                    bad.append('query %d, %s, student %d: %s; the page: %s' % (k, T, r['section_user_id'], r[field], S[r['section_user_id']]['sig'][sig]))
        if T in ('2025-10-15', '2025-11-15', data['days'][-1]['day']):
            for r in run(5, T):
                s = S[r['section_user_id']]
                n[5] += 1
                if (int(r['n']), int(r['class_n'])) != (s['wb'][r['block']], s['ctot'][r['block']]):
                    bad.append('query 5, %s, student %d, block %d: %s %s; the page: %s %s' % (T, r['section_user_id'], r['block'], r['n'], r['class_n'], s['wb'][r['block']], s['ctot'][r['block']]))
    print('queries 4, 6, 7 and 8: %d student-days each, over %d days · query 5: %d student-blocks on 3 days' % (n[4], len(data['days']), n[5]))

    # query 2 against the export's own rule (tools/export-atlas.py), on made-up hours whose quietest six start at each hour of the day
    for quiet in range(24):
        rnd, q2 = random.Random(quiet), duckdb.connect()
        hours = {h: rnd.randint(50, 400) for h in range(24)}
        for k in range(6):
            hours[(quiet + k) % 24] = rnd.randint(0, 5)
        q2.execute('create table student_activity_hour (%s)' % SCHEMA['student_activity_hour'])
        q2.executemany('insert into student_activity_hour values (%d, 1000, ?, ?, 0, 0)' % meta['section'], [(dt.datetime(2025, 10, 1, h), v) for h, v in hours.items()])
        start = min(range(24), key=lambda h: sum(hours.get((h + k) % 24, 0) for k in range(6)))
        got = q2.execute(QUERIES[1].replace(':section_id', str(meta['section']))).fetchone()
        if tuple(got) != (start, ((1 - start + 12) % 24) - 12):
            bad.append('query 2, quiet from %d: %s' % (quiet, got))
    print('query 2: the UTC offset of 24 made-up classes, against the export\'s rule')

    print('differences: %d' % len(bad))
    for b in bad[:30]:
        print('  ' + b)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
