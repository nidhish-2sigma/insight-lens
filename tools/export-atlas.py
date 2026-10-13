#!/usr/bin/env python3
"""Exports one class from the database to data/class.js, the file the mock (index.html) reads.

It writes facts only: who is in the class, the outline of each of its books, what each student did on each item and when.
Every figure on screen is worked out from those facts by js/atlas.js, so this file holds no thresholds.

  pip install pg8000
  PGPASSWORD=... python3 tools/export-atlas.py [section_id]

Connection comes from the environment (the Cloud SQL proxy on this machine by default):
  PGHOST 127.0.0.1 · PGPORT 5434 · PGUSER postgres · PGDATABASE anonymized-prod · PGPASSWORD (required)
  ATLAS_OUT=some/path.js writes the file there instead of data/class.js

A class can list more than one book. The section lists them in section_curriculum: one or more primary, any number
supplemental, each with an order and the date it was added. Every unit, subunit and item belongs to one book, and no
item sits in two. Skills are shared: the books of one subject tag their items from one skill set, so a skill keeps one
number here whichever book checks it. The export writes the books in order (the primary ones first), says which book
each unit and each assignment is from (tb), and gives each book a short name for the places on screen with little room.
A class with one book is written exactly as it was before the export knew about books: no tb, no list of books.

The session is read-only. Nothing is written to the database.
"""
import datetime as dt
import json
import os
import re
import sys
from collections import defaultdict

GRADED = ('mchoice', 'activecode', 'parsonsprob', 'parsonprob', 'fillintheblank', 'clickablearea', 'dragndrop')
SKILLS_PER_SUB = 3        # skills shown for a subunit: the ones its questions check most
SHORT_MAX = 18            # a book's short name: whole words of its title up to this many characters
SMALL = ('of', 'for', 'the', 'and', 'in', 'to', 'a', 'an', 'with', 'on', 'using')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def connect():
    """A read-only session. The password comes from the environment and is written nowhere."""
    import pg8000.native
    if not os.environ.get('PGPASSWORD'):
        sys.exit('Set PGPASSWORD (and PGHOST / PGPORT / PGUSER / PGDATABASE if they differ from the defaults).')
    con = pg8000.native.Connection(user=os.environ.get('PGUSER', 'postgres'), password=os.environ['PGPASSWORD'], host=os.environ.get('PGHOST', '127.0.0.1'),
                                   port=int(os.environ.get('PGPORT', '5434')), database=os.environ.get('PGDATABASE', 'anonymized-prod'), timeout=600)
    con.run("SET default_transaction_read_only = on")
    con.run("SET statement_timeout = '600s'")
    return con


def short_name(name):
    """A short name for a book: its title up to the first dash or colon, then whole words up to SHORT_MAX characters,
    never ending on a small word. "Be Prepared for the AP Computer Science Exam in Java" gives "Be Prepared"."""
    head = re.split(r'\s[-—–:·|]\s|:\s', name)[0].strip() or name
    out = []
    for w in head.split():
        if out and len(' '.join(out + [w])) > SHORT_MAX: break
        out.append(w)
    while len(out) > 1 and out[-1].lower() in SMALL: out.pop()
    return ' '.join(out) or name


def clean(t):
    """A title as it should read on screen: a book's source escapes "#"."""
    return (t or '').replace('\\#', '#').strip()


def read_books(q, section, cur_id):
    """The section's books, in order: the primary ones first (the one the section itself names before the rest), then the
    supplemental ones, each group in the section's own order. A section with no list has the one book it names."""
    rows = q("""select sc.curriculum_id, sc.role, sc.createdon, c.display_name
                from section_curriculum sc join curriculum c using (curriculum_id)
                where sc.section_id = :s and coalesce(sc.ignore, false) = false
                order by (sc.role <> 'primary'), (sc.curriculum_id <> :c), sc.ordering, sc.section_curriculum_id""", s=section, c=cur_id)
    if not rows:
        rows = [[cur_id, 'primary', None, q("select display_name from curriculum where curriculum_id = :c", c=cur_id)[0][0]]]
    books = []
    for cid, role, added, name in rows:
        name = clean(name) or cid
        books.append({'id': cid, 'name': name, 'short': short_name(name), 'role': role, 'added': added})
    return books


def read_outline(q, books):
    """Every unit, subunit and item of every book, in order: the first book's, then the next. One flat list of each.
    A unit says which book it is from (tb). Two items that share a position come in the order of their ids, so two
    runs give the same file."""
    U, uix, subs, subix, items, iidx = [], {}, [], {}, [], {}
    for tb, book in enumerate(books):
        units = q("""select u.unit_id, u.parent_id, u.level, o.display_id, coalesce(o.display_name, u.unit_name), o.ordering
                     from unit u join curriculum_unit_order o on o.unit_id = u.unit_id and o.curriculum_id = :c
                     where u.source_curriculum_id = :c and coalesce(u.ignore, false) = false and coalesce(o.ignore, false) = false and coalesce(o.hidden, false) = false and u.level in (1, 2)
                     order by u.level, o.ordering, u.unit_id""", c=book['id'])
        for unit_id, parent, level, disp, name, ordering in units:
            if level == 1:
                uix[unit_id] = len(U); U.append({'id': unit_id, 'num': disp, 'name': clean(name), 'subs': [], 'tb': tb})
        for unit_id, parent, level, disp, name, ordering in units:
            if level == 2 and parent in uix:
                subix[unit_id] = len(subs); U[uix[parent]]['subs'].append(len(subs))
                subs.append({'id': unit_id, 'u': uix[parent], 'code': disp, 'name': clean(name), 'items': [], 'skills': []})
        rows = q("""select cui.unit_id, i.item_id, i.name, i.item_type::text, coalesce(i.estimated_time, 0), cui.ordering
                    from curriculum_unit_item cui join item i using (item_id)
                    where cui.curriculum_id = :c and coalesce(cui.ignore, false) = false and coalesce(i.ignore, false) = false
                    order by cui.unit_id, cui.ordering, i.item_id""", c=book['id'])
        for unit_id, item_id, name, typ, est, ordering in rows:
            if unit_id not in subix or item_id in iidx or typ == 'sectionheading': continue
            iidx[item_id] = len(items); subs[subix[unit_id]]['items'].append(len(items))
            items.append({'id': item_id, 'name': clean(name), 'type': typ, 'sub': subix[unit_id], 'est': est, 'skills': []})
    return U, subs, items, subix, iidx


def read_skills(q, U, subs, items, subix, iidx):
    """What each subunit teaches and checks, the skills each item is tagged with, and what each unit builds on.
    A subunit's skills are the ones it gives most teaching weight to (unit_skill_coverage) that its questions are
    tagged with (item_skill), preferring skills three or more of its questions check. A review subunit, or a lesson in
    a book with no coverage weights (a book of labs), teaches nothing new by that measure, so it lists what it checks most.
    Skills are numbered in the order the subunits first name them, so the first book's numbers do not change when a
    book is added after it. Returns the skills as [{'id', 'name'}]."""
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
        if len(checked) < 2:                                          # a review, a test, a practice set, or a lesson of labs
            rest = sorted((sk for sk in n_items if sk not in checked), key=lambda sk: (-cov[j].get(sk, (0, 0))[1], -n_items[sk], sk))
            checked += rest[:SKILLS_PER_SUB - len(checked)]
        for sk in checked: sb['skills'].append([kid(sk), 1 if cov[j].get(sk, (0, 0))[0] > 0 else 0, 1])
        for sk in taught[:SKILLS_PER_SUB]:                            # among its top skills, one that no question checks
            if n_items[sk] == 0: sb['skills'].append([kid(sk), 1, 0]); break
    for ix, it in enumerate(items):
        it['skills'] = [kidx[sk] for sk in tags.get(ix, []) if sk in kidx][:3]
    # what each unit builds on: skills an earlier unit teaches (as one of a subunit's listed skills) that this unit's subunits use.
    # "Earlier" is the order of the list: the book's own earlier units, and every unit of a book listed before it.
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
    for s in skills: s['name'] = (names.get(s['id']) or 'Skill').strip()
    return skills


def write(out, path, header):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(header)
        f.write('window.ATLAS_DATA=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')


def main():
    SECTION = int(sys.argv[1]) if len(sys.argv) > 1 else 218
    con = connect()
    q = lambda sql, **kw: con.run(sql, **kw)

    # ---------- the class and its books ----------
    sec = q("select name, curriculum_id, term_start, term_end from section where section_id = :s", s=SECTION)
    if not sec: sys.exit('No section %d' % SECTION)
    sec_name, cur_id, term_start, term_end = sec[0]
    books = read_books(q, SECTION, cur_id)
    multi = len(books) > 1
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
    print('class: %s · %s · %d students' % (sec_name, ' + '.join(b['name'] for b in books), len(students)))

    # ---------- local time: the database stores UTC; school hours tell us the offset ----------
    hours = dict(q("select extract(hour from hour_start)::int, sum(items) from student_activity_hour where section_id = :s group by 1", s=SECTION))
    quiet = min(range(24), key=lambda h: sum(hours.get((h + k) % 24, 0) for k in range(6)))      # start of the quietest six hours
    OFFSET = ((1 - quiet + 12) % 24) - 12                                                            # put that at 1 am local
    def local_day(ts):
        return (ts + dt.timedelta(hours=OFFSET)).date()

    # ---------- the outline of every book: every unit and subunit, in order ----------
    U, subs, items, subix, iidx = read_outline(q, books)

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
    if not att_rows: sys.exit('Section %d has no graded work yet' % SECTION)
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
    skills = read_skills(q, U, subs, items, subix, iidx)
    print('outline: %d %s, %d units, %d subunits, %d items, %d skills' % (len(books), 'book' if not multi else 'books', len(U), len(subs), len(items), len(skills)))

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

    # ---------- assigned work with a due date, and who finished it. An assignment belongs to one book (coursework.curriculum_id) ----------
    cw_rows = q("""select coursework_id, coursework_name, coalesce(coursework_type::text, ''), due_date, unit_id, curriculum_id from coursework
                   where section_id = :s and coalesce(ignore, false) = false and due_date is not null and visibility in ('published', 'released') order by due_date""", s=SECTION)
    cws, cwix, cwkey, bix = [], {}, {}, {b['id']: n for n, b in enumerate(books)}
    for cid, name, typ, due, unit_id, cur in cw_rows:
        key = ((name or '').strip(), dnum(due))
        if key not in cwkey:
            cwkey[key] = len(cws)
            cws.append({'name': key[0], 'type': typ, 'due': key[1], 'sub': subix.get(unit_id, -1), 'tb': bix.get(cur, U[subs[subix[unit_id]]['u']]['tb'] if unit_id in subix else 0), 'done': set()})
        cwix[cid] = cwkey[key]
    if cws:
        for cid, su, status in q("select coursework_id, section_user_id, status::text from coursework_status where coursework_id = any(:c) and section_user_id = any(:su) and coalesce(ignore, false) = false", c=list(cwix), su=su_ids):
            if status in ('completed', 'partially_graded', 'graded', 'returned', 'feedback_seen'): cws[cwix[cid]]['done'].add(sidx[su])
    for c in cws: c['done'] = sorted(c['done'])

    graded_ids = [it['id'] for it in items if it['type'] in GRADED]
    bug_rows = q("select item_id, status::text, left(feedback, 160) from item_bug_report where item_id = any(:i) and coalesce(ignore, false) = false", i=graded_ids)
    bugs = [[iidx[it], status, (fb or '').strip()] for it, status, fb in bug_rows]

    # ---------- the file. A class with one book is written as it always was; one with more also lists its books, and each unit and assignment names its book ----------
    if not multi:
        for row in U + cws: del row['tb']
    out = {
        'meta': {'section': SECTION, 'name': sec_name, 'textbook': books[0]['name'], 'textbookId': books[0]['id'], 'day0': day0.isoformat(), 'utcOffset': OFFSET,
                 'termStart': term_start.isoformat() if term_start else None, 'termEnd': term_end.isoformat() if term_end else None,
                 'exported': dt.date.today().isoformat(), 'source': os.environ.get('PGDATABASE', 'anonymized-prod')},
        'students': [s['name'] for s in students],
        'units': U, 'subs': subs, 'items': items, 'skills': [s['name'] for s in skills],
        'att': att, 'opens': opens, 'daily': daily, 'coursework': cws, 'bugs': bugs, 'sets': sets,
    }
    if multi:
        out['meta']['books'] = [{'id': b['id'], 'name': b['name'], 'short': b['short'], 'role': b['role'], 'added': dnum(b['added']) if b['added'] else None} for b in books]
    path = os.environ.get('ATLAS_OUT') or os.path.join(ROOT, 'data', 'class.js')
    write(out, path, '/* Exported by tools/export-atlas.py from %s, section %d, on %s. Facts only; js/atlas.js works out every figure. */\n' % (out['meta']['source'], SECTION, out['meta']['exported']))
    print('wrote %s · %d KB · UTC offset %+d h · %d assigned sets with a due date · %d bug reports · %d targeted sets'
          % (os.path.relpath(path, ROOT) if path.startswith(os.path.abspath(ROOT)) else path, os.path.getsize(path) // 1024, OFFSET, len(cws), len(bugs), len(sets)))
    con.close()


if __name__ == '__main__':
    main()
