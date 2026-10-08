#!/usr/bin/env python3
"""Exports one class from the database to data/class.js, the file the mock (index.html) reads.

It writes facts only: who is in the class, the textbook outline, what each student did on each item and when.
Every figure on screen is worked out from those facts by js/atlas.js, so this file holds no thresholds.

  pip install pg8000
  PGPASSWORD=... python3 tools/export-atlas.py [section_id]

Connection comes from the environment (the Cloud SQL proxy on this machine by default):
  PGHOST 127.0.0.1 · PGPORT 5434 · PGUSER postgres · PGDATABASE anonymized-prod · PGPASSWORD (required)

The session is read-only. Nothing is written to the database.
"""
import datetime as dt
import json
import os
import sys
from collections import defaultdict

import pg8000.native

SECTION = int(sys.argv[1]) if len(sys.argv) > 1 else 218
GRADED = ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
SKILLS_PER_SUB = 3        # skills shown for a subunit: the ones its questions check most
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

if not os.environ.get('PGPASSWORD'):
    sys.exit('Set PGPASSWORD (and PGHOST / PGPORT / PGUSER / PGDATABASE if they differ from the defaults).')
con = pg8000.native.Connection(user=os.environ.get('PGUSER', 'postgres'), password=os.environ['PGPASSWORD'], host=os.environ.get('PGHOST', '127.0.0.1'),
                               port=int(os.environ.get('PGPORT', '5434')), database=os.environ.get('PGDATABASE', 'anonymized-prod'), timeout=600)
con.run("SET default_transaction_read_only = on")
con.run("SET statement_timeout = '600s'")
q = lambda sql, **kw: con.run(sql, **kw)

# ---------- the class ----------
sec = q("select name, curriculum_id, term_start, term_end from section where section_id = :s", s=SECTION)
if not sec: sys.exit('No section %d' % SECTION)
sec_name, cur_id, term_start, term_end = sec[0]
cur_name = q("select display_name from curriculum where curriculum_id = :c", c=cur_id)[0][0]
people = q("""select su.section_user_id, coalesce(nullif(u.preferred_first_name, ''), u.first_name), u.last_name
              from section_user su join app_user u using (app_user_id)
              where su.section_id = :s and su.role = 'student' and coalesce(su.ignore, false) = false and su.deleted_at is null and not u.is_virtual
              order by 2, 3""", s=SECTION)
first_count = defaultdict(int)
for _, f, _l in people: first_count[(f or '').strip()] += 1
students, sidx = [], {}
for su, f, l in people:
    f, l = (f or 'Student').strip(), (l or '').strip()
    sidx[su] = len(students)
    students.append({'id': su, 'name': f if first_count[f] == 1 else '%s %s.' % (f, l[:1])})
if not students: sys.exit('Section %d has no students' % SECTION)
print('class: %s · %s · %d students' % (sec_name, cur_name, len(students)))

# ---------- local time: the database stores UTC; school hours tell us the offset ----------
hours = dict(q("select extract(hour from hour_start)::int, sum(items) from student_activity_hour where section_id = :s group by 1", s=SECTION))
quiet = min(range(24), key=lambda h: sum(hours.get((h + k) % 24, 0) for k in range(6)))      # start of the quietest six hours
OFFSET = ((1 - quiet + 12) % 24) - 12                                                            # put that at 1 am local
day0 = None
def local_day(ts):
    return (ts + dt.timedelta(hours=OFFSET)).date()

# ---------- the textbook outline: every unit and subunit, in order ----------
units = q("""select u.unit_id, u.parent_id, u.level, o.display_id, coalesce(o.display_name, u.unit_name), o.ordering
             from unit u join curriculum_unit_order o on o.unit_id = u.unit_id and o.curriculum_id = :c
             where u.source_curriculum_id = :c and coalesce(u.ignore, false) = false and coalesce(o.ignore, false) = false and coalesce(o.hidden, false) = false and u.level in (1, 2)
             order by u.level, o.ordering""", c=cur_id)
U, uix, subs, subix = [], {}, [], {}
for unit_id, parent, level, disp, name, ordering in units:
    if level == 1:
        uix[unit_id] = len(U); U.append({'id': unit_id, 'num': disp, 'name': name.strip(), 'subs': []})
for unit_id, parent, level, disp, name, ordering in units:
    if level == 2 and parent in uix:
        subix[unit_id] = len(subs); U[uix[parent]]['subs'].append(len(subs))
        subs.append({'id': unit_id, 'u': uix[parent], 'code': disp, 'name': name.strip(), 'items': [], 'skills': []})

rows = q("""select cui.unit_id, i.item_id, i.name, i.item_type::text, coalesce(i.estimated_time, 0), cui.ordering
            from curriculum_unit_item cui join item i using (item_id)
            where cui.curriculum_id = :c and coalesce(cui.ignore, false) = false and coalesce(i.ignore, false) = false
            order by cui.unit_id, cui.ordering""", c=cur_id)
items, iidx = [], {}
for unit_id, item_id, name, typ, est, ordering in rows:
    if unit_id not in subix or item_id in iidx or typ == 'sectionheading': continue
    iidx[item_id] = len(items); subs[subix[unit_id]]['items'].append(len(items))
    items.append({'id': item_id, 'name': (name or '').strip(), 'type': typ, 'sub': subix[unit_id], 'est': est, 'skills': []})

# ---------- what each student did ----------
su_ids = [s['id'] for s in students]
att_rows = q("""with a as (select a.assignment_id, a.section_user_id from assignment a where a.section_user_id = any(:su) and coalesce(a.ignore, false) = false),
                     r as (select a.section_user_id, s.item_id, s.correct, s.timestamp, s.time_spent_ms,
                                  row_number() over (partition by a.section_user_id, s.item_id order by s.timestamp, s.interaction_summary_id) as rn
                           from interaction_summary s join a using (assignment_id)
                           where s.action in ('check', 'code_run') and coalesce(s.ignore, false) = false and s.item_type::text = any(:g))
                select section_user_id, item_id, min(timestamp), coalesce(bool_or(correct) filter (where rn = 1), false), coalesce(bool_or(correct) filter (where rn <= 3), false),
                       coalesce(bool_or(correct), false), count(*), coalesce(sum(time_spent_ms), 0), max(timestamp), coalesce(min(rn) filter (where correct), 0),
                       coalesce(sum(time_spent_ms) filter (where rn = 1), 0)
                from r group by 1, 2""", su=su_ids, g=list(GRADED))
first_ts = min(r[2] for r in att_rows)
day0 = local_day(first_ts) - dt.timedelta(days=local_day(first_ts).weekday())          # the Monday of the first week of work
dnum = lambda ts: (local_day(ts) - day0).days
att = []
for su, item_id, t0, ok1, ok3, ever, tries, ms, t1, okrn, ms1 in att_rows:
    if item_id not in iidx: continue
    att.append([sidx[su], iidx[item_id], int(ok1), int(ok3), int(ever), int(tries), dnum(t0), int(round(ms / 1000)), dnum(t1), int(okrn), int(round(ms1 / 1000))])
print('attempts: %d student-items on %d items, from %s' % (len(att), len({a[1] for a in att}), day0))

open_rows = q("""select section_user_id, item_id, min(hour_start) from student_item_activity_hour
                 where section_id = :s and section_user_id = any(:su) and (opens > 0 or reading_minutes > 0 or media > 0) group by 1, 2""", s=SECTION, su=su_ids)
opens = [[sidx[su], iidx[it], dnum(t)] for su, it, t in open_rows if it in iidx and items[iidx[it]]['type'] not in GRADED]

day_rows = q("""select section_user_id, (hour_start + make_interval(hours => :o))::date, sum(items), sum(graded_attempts), sum(correct_attempts)
                from student_activity_hour where section_id = :s and section_user_id = any(:su) group by 1, 2""", s=SECTION, su=su_ids, o=OFFSET)
daily = [[sidx[su], (d - day0).days, int(n), int(g), int(c)] for su, d, n, g, c in day_rows if (d - day0).days >= 0]

# ---------- skills: what each subunit teaches and checks ----------
# A subunit's skills are the ones it gives most teaching weight to (unit_skill_coverage) that its questions are
# tagged with (item_skill), preferring skills three or more of its questions check. A review subunit teaches nothing new, so it lists what it checks most.
graded_ids = [it['id'] for it in items if it['type'] in GRADED]
tag_rows = q("select item_id, skill_id::text, relevance_score from item_skill where item_id = any(:i) and coalesce(ignore, false) = false order by item_id, relevance_score desc, skill_id", i=graded_ids)
cov_rows = q("select unit_id, skill_id::text, coalesce(teach_weight, 0)::float8, coalesce(assess_weight, 0)::float8 from unit_skill_coverage where unit_id = any(:u)", u=[s['id'] for s in subs])
tags = defaultdict(list)
for item_id, sk, rel in tag_rows: tags[iidx[item_id]].append(sk)
cov = defaultdict(dict)
for unit_id, sk, tw, aw in cov_rows: cov[subix[unit_id]][sk] = (tw, aw)
skills, kidx = [], {}
def kid(sk):
    if sk not in kidx: kidx[sk] = len(skills); skills.append({'id': sk})
    return kidx[sk]
for j, sb in enumerate(subs):
    n_items = defaultdict(int)
    for ix in sb['items']:
        for sk in tags.get(ix, []): n_items[sk] += 1
    taught = sorted((sk for sk, (tw, aw) in cov[j].items() if tw > 0), key=lambda sk: (-cov[j][sk][0], sk))
    checked = [sk for sk in taught if n_items[sk] >= 3][:SKILLS_PER_SUB]                       # first, skills three or more of its questions check
    checked += [sk for sk in taught if 0 < n_items[sk] < 3][:SKILLS_PER_SUB - len(checked)]
    if len(checked) < 2:                                          # a review, a test or a practice set
        rest = sorted((sk for sk in n_items if sk not in checked), key=lambda sk: (-cov[j].get(sk, (0, 0))[1], -n_items[sk], sk))
        checked += rest[:SKILLS_PER_SUB - len(checked)]
    for sk in checked: sb['skills'].append([kid(sk), 1 if cov[j].get(sk, (0, 0))[0] > 0 else 0, 1])
    for sk in taught[:SKILLS_PER_SUB]:                            # among its top skills, one that no question checks
        if n_items[sk] == 0: sb['skills'].append([kid(sk), 1, 0]); break
for ix, it in enumerate(items):
    it['skills'] = [kidx[sk] for sk in tags.get(ix, []) if sk in kidx][:3]
# what each unit builds on: skills an earlier unit teaches (as one of a subunit's listed skills) that this unit's subunits use.
# Left out: skills fewer than three questions check, and skills that only describe a question format (nine in ten of their
# questions are Parsons problems), because neither says anything about what a student knows.
n_tag, n_parsons = defaultdict(int), defaultdict(int)
for ix, it in enumerate(items):
    for k in it['skills']:
        n_tag[k] += 1
        if it['type'] in ('parsonsprob', 'parsonprob'): n_parsons[k] += 1
real_skill = lambda k: n_tag[k] >= 3 and n_parsons[k] < 0.9 * n_tag[k]
first_unit = {}
for sb in subs:
    for k, t, a in sb['skills']:
        if t and (k not in first_unit or sb['u'] < first_unit[k]): first_unit[k] = sb['u']
for u, unit in enumerate(U):
    need, where = defaultdict(float), {}
    for j in unit['subs']:
        for sk, (tw, aw) in cov[j].items():
            k = kidx.get(sk)
            if k is None or first_unit.get(k, 10 ** 6) >= u or not real_skill(k): continue
            need[k] += aw + tw
            if k not in where or aw + tw > where[k][0]: where[k] = (aw + tw, j)
    unit['pre'] = [[k, where[k][1]] for k in sorted(need, key=lambda k: (-need[k], k))[:4]]
names = dict(q("select skill_id::text, coalesce(nullif(title, ''), left(description, 60)) from skill where skill_id::text = any(:k)", k=[s['id'] for s in skills]))
for s in skills: s['name'] = (names.get(s['id']) or 'Skill').strip(); del s['id']
print('outline: %d units, %d subunits, %d items, %d skills' % (len(U), len(subs), len(items), len(skills)))

# ---------- practice sets the teacher targeted (not the textbook's own practice), and what each student did in them ----------
set_rows = q("""select c.coursework_id, trim(c.coursework_name), c.coursework_type::text, c.createdon, c.due_date from coursework c
                where c.section_id = :s and c.coursework_type::text <> 'self_guided_practice' and coalesce(c.ignore, false) = false order by c.createdon""", s=SECTION)
sets, by_name = [], {}
if set_rows:
    res = q("""select ci.coursework_id, a.section_user_id, s.item_id, min(s.timestamp), coalesce((array_agg(s.correct order by s.timestamp))[1], false), coalesce(bool_or(s.correct), false)
               from coursework_item ci join assignment a using (coursework_item_id) join interaction_summary s using (assignment_id)
               where ci.coursework_id = any(:c) and a.section_user_id = any(:su) and s.action in ('check', 'code_run') and coalesce(s.ignore, false) = false
               group by 1, 2, 3""", c=[r[0] for r in set_rows], su=su_ids)
    meta = {r[0]: r for r in set_rows}
    for cid, su, item_id, t0, ok1, ever in res:
        if item_id not in iidx: continue
        _, name, typ, made, due = meta[cid]
        key = (name, made.date())
        if key not in by_name:
            by_name[key] = len(sets); sets.append({'name': name, 'type': typ, 'day': dnum(made), 'due': dnum(due) if due else None, 'rows': []})
        sets[by_name[key]]['rows'].append([sidx[su], iidx[item_id], int(ok1), int(ever), dnum(t0)])
sets = [x for x in sets if len({r[0] for r in x['rows']}) >= 3]

# ---------- assigned work with a due date, and who finished it ----------
cw_rows = q("""select coursework_id, coursework_name, coalesce(coursework_type::text, ''), due_date, unit_id from coursework
               where section_id = :s and coalesce(ignore, false) = false and due_date is not null and visibility in ('published', 'released') order by due_date""", s=SECTION)
cws, cwix, cwkey = [], {}, {}
for cid, name, typ, due, unit_id in cw_rows:
    key = ((name or '').strip(), dnum(due))
    if key not in cwkey: cwkey[key] = len(cws); cws.append({'name': key[0], 'type': typ, 'due': key[1], 'sub': subix.get(unit_id, -1), 'done': set()})
    cwix[cid] = cwkey[key]
if cws:
    for cid, su, status in q("select coursework_id, section_user_id, status::text from coursework_status where coursework_id = any(:c) and section_user_id = any(:su) and coalesce(ignore, false) = false", c=list(cwix), su=su_ids):
        if status in ('completed', 'partially_graded', 'graded', 'returned', 'feedback_seen'): cws[cwix[cid]]['done'].add(sidx[su])
for c in cws: c['done'] = sorted(c['done'])

bug_rows = q("select item_id, status::text, left(feedback, 160) from item_bug_report where item_id = any(:i) and coalesce(ignore, false) = false", i=graded_ids)
bugs = [[iidx[it], status, (fb or '').strip()] for it, status, fb in bug_rows]

out = {
    'meta': {'section': SECTION, 'name': sec_name, 'textbook': cur_name, 'textbookId': cur_id, 'day0': day0.isoformat(), 'utcOffset': OFFSET,
             'termStart': term_start.isoformat() if term_start else None, 'termEnd': term_end.isoformat() if term_end else None,
             'exported': dt.date.today().isoformat(), 'source': os.environ.get('PGDATABASE', 'anonymized-prod')},
    'students': [s['name'] for s in students],
    'units': U, 'subs': subs, 'items': items, 'skills': [s['name'] for s in skills],
    'att': att, 'opens': opens, 'daily': daily, 'coursework': cws, 'bugs': bugs, 'sets': sets,
}
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
path = os.path.join(ROOT, 'data', 'class.js')
with open(path, 'w') as f:
    f.write('/* Exported by tools/export-atlas.py from %s, section %d, on %s. Facts only; js/atlas.js works out every figure. */\n' % (out['meta']['source'], SECTION, out['meta']['exported']))
    f.write('window.ATLAS_DATA=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
print('wrote data/class.js · %d KB · UTC offset %+d h · %d assigned sets with a due date · %d bug reports · %d targeted sets'
      % (os.path.getsize(path) // 1024, OFFSET, len(cws), len(bugs), len(sets)))
con.close()
