#!/usr/bin/env python3
"""Builds data/example.js: the real class with more books, which the mock shows at index.html?books.

No class in the database with more than a few students has work in more than one book, so a whole class using several
books cannot be shown from real data. This builds one and keeps what is real apart from what is not:

  REAL      the class in data/class.js: its students and all their work in its one book, untouched
  REAL      the outlines of the added books, read from the database: units, lessons, questions, skill tags
  INVENTED  the work of those students in the added books

What is invented follows what the database shows about the sections that do use several books (one-student summer
sections, which is all there is): the main book every week; a book of labs beside it, two or three labs a week on the
topic the main book is on; the exam book at the end. A lab there takes a median of seven runs, half are never marked
right and one in twenty-five runs right first time; an exam-book question is right first time about two times in three.
A second textbook is the commonest book to list beside CS Awesome 2.0, and most listed books have no work yet, so one
is listed here with none.

Each student's invented work follows their own real record: it falls only on days they really worked, in weeks the
class really met new questions; a student does as much of it as of that week's real work, so nobody's weekly line
moves; a lab runs right according to how they do on the main book's coding tasks, and an exam question according to
how they do on the skills it checks. Five students who do most of the main book leave the labs, because that is the
case a teacher most needs to see. The same seed gives the same file.

  PGPASSWORD=... python3 tools/make-example.py

It reads data/class.js, so run tools/export-atlas.py first, and run this again after every new export.
The session is read-only. Nothing is written to the database.
"""
import importlib.util
import json
import math
import os
import random
import statistics
import sys
from collections import defaultdict

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
spec = importlib.util.spec_from_file_location('export_atlas', os.path.join(ROOT, 'tools', 'export-atlas.py'))
ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)

SEED = 20261013
# the books beside the class's own, with the week each is added. None: listed, and not started
ADDED = [('java-short-labs', 5), ('be-prepared-apcsa', 12), ('java-methods', 1)]
# which lessons the class works on, and in which week: (book, lesson code) -> week. A lesson of labs is one task; an exam-book lesson is all its questions.
# The labs follow the main book's topic: if statements beside Selection and Iteration (weeks 4 to 10), arrays beside Data Collections (from week 11).
# Every week here is one in which the class really met new questions, so the example adds no week of work to anyone's record.
PLAN = {('java-short-labs', c): w for c, w in (('3.1', 5), ('3.2', 5), ('3.3', 7), ('3.4', 7), ('3.5', 8), ('3.9', 8),
                                                ('4.2', 9), ('4.3', 9), ('4.5', 10), ('4.6', 10), ('4.9', 10),
                                                ('6.4', 11), ('6.2', 11), ('6.1', 11), ('6.5', 12), ('6.7', 12))}
PLAN.update({('be-prepared-apcsa', c): w for c, w in (('2.1', 12), ('2.2', 12), ('2.3', 12), ('2.4', 12), ('2.5', 12))})
LEAVE_LABS = 5           # students who do the main book and leave the labs
QUICK = ('mchoice', 'fillintheblank', 'clickablearea', 'dragndrop')
RUNS_OK = [1] * 4 + [2] * 10 + [3] * 12 + [4] * 12 + [5] * 12 + [6] * 10 + [7] * 9 + [8] * 8 + [10] * 8 + [12] * 6 + [15] * 5 + [20] * 4   # the run on which a lab that does run right first does


def load_class():
    s = open(os.path.join(ROOT, 'data', 'class.js'), encoding='utf-8').read()
    return json.loads(s[s.index('window.ATLAS_DATA=') + len('window.ATLAS_DATA='):s.rindex(';')])


def main():
    D = load_class()
    if D['meta'].get('books'): sys.exit('data/class.js already has more than one book: the example is for a class with one.')
    N = len(D['students'])
    con = ex.connect()
    q = lambda sql, **kw: con.run(sql, **kw)

    # ---------- the outlines: the class's own book first, so every number in data/class.js keeps its meaning ----------
    ids = [D['meta']['textbookId']] + [b for b, _ in ADDED]
    names = {cid: ex.clean(nm) for cid, nm in q("select curriculum_id, display_name from curriculum where curriculum_id = any(:c)", c=ids)}
    missing = [c for c in ids if c not in names]
    if missing: sys.exit('Not in the database: %s' % ', '.join(missing))
    books = [{'id': c, 'name': names[c], 'short': ex.short_name(names[c]), 'role': 'primary' if n == 0 else 'supplemental'} for n, c in enumerate(ids)]
    U, subs, items, subix, iidx = ex.read_outline(q, books)
    skills = ex.read_skills(q, U, subs, items, subix, iidx)
    con.close()
    nU, nJ, nI, nK = len(D['units']), len(D['subs']), len(D['items']), len(D['skills'])
    same = ([u['id'] for u in U[:nU]] == [u['id'] for u in D['units']] and [s['id'] for s in subs[:nJ]] == [s['id'] for s in D['subs']]
            and [i['id'] for i in items[:nI]] == [i['id'] for i in D['items']] and [k['name'] for k in skills[:nK]] == D['skills'])
    if not same or len(U) <= nU or U[nU]['tb'] != 1: sys.exit('The outline in the database no longer matches data/class.js. Run tools/export-atlas.py, then this again.')

    # ---------- each student's real record ----------
    rng = random.Random(SEED)
    wk = lambda d: d // 7 + 1
    quick = lambda ix: D['items'][ix]['type'] in QUICK
    credit = lambda a: (1 if a[9] == 1 else .5 if a[9] == 2 else 0) if quick(a[1]) else (1 if 1 <= a[9] <= 3 else .5 if 4 <= a[9] <= 6 else 0)
    first = defaultdict(dict)                                   # student -> item -> the day they first tried it
    for a in D['att']: first[a[0]][a[1]] = a[6]
    by_week = defaultdict(lambda: defaultdict(int))             # week -> item -> students who first tried it that week
    for i in first:
        for ix, d in first[i].items(): by_week[wk(d)][ix] += 1
    class_items = {w: [ix for ix, n in by_week[w].items() if n >= N / 4] for w in by_week}     # the class's questions, by the week it met them
    def effort(i, w):                                           # the share of the questions the class met in week w that the student had tried by the end of it
        its = class_items.get(w) or []
        if not its: return 0
        return sum(1 for ix in its if ix in first[i] and wk(first[i][ix]) <= w) / len(its)
    days = defaultdict(set)
    for i, d, n, g, c in D['daily']:
        if n > 0 or g > 0: days[i].add(d)
    weeks_on = defaultdict(set)
    for i in days:
        for d in days[i]: weeks_on[wk(d)].add(i)
    last_week = max(w for w in weeks_on if len(weeks_on[w]) >= N / 2)    # the mock uses nothing after this week, so nothing is invented after it
    att_by = defaultdict(list)
    for a in D['att']: att_by[a[0]].append(a)
    overall = [statistics.mean([credit(a) for a in att_by[i]]) if att_by[i] else 0 for i in range(N)]
    code = [(lambda c: statistics.mean(c) if len(c) >= 5 else overall[i])([credit(a) for a in att_by[i] if not quick(a[1])]) for i in range(N)]
    by_skill = defaultdict(lambda: defaultdict(list))
    for a in D['att']:
        for k in D['items'][a[1]]['skills']: by_skill[a[0]][k].append(credit(a))
    def knows(i, ks):                                           # the student's own average credit on the skills a question checks
        c = [x for k in ks for x in by_skill[i].get(k, [])]
        return statistics.mean(c) if len(c) >= 2 else overall[i]
    for (b, c), w in PLAN.items():
        if w > last_week: sys.exit('Lesson %s %s is planned for week %d, after the last week the mock uses (%d).' % (b, c, w, last_week))
        if not class_items.get(w): sys.exit('Week %d has no class questions; every invented week must be one the class really met new questions in.' % w)

    # ---------- who does what ----------
    doers = sorted(range(N), key=lambda i: -statistics.mean([effort(i, w) for w in sorted({w for _, w in PLAN.items()})]))[:N // 2]
    leave = set(rng.sample(doers, LEAVE_LABS))                  # students who do most of the main book and leave the labs
    lab_share = [0.1 if i in leave else rng.uniform(.86, 1.0) for i in range(N)]
    exam_share = [rng.uniform(.9, 1.0) for i in range(N)]
    take = lambda e: min(.97, .02 + 1.05 * e)                   # a student does as much of what else is set in a week as of that week's questions
    plan = {}
    for j in range(nJ, len(subs)):
        w = PLAN.get((books[U[subs[j]['u']]['tb']]['id'], subs[j]['code']))
        if w: plan[j] = w
    if len(plan) != len(PLAN): sys.exit('A lesson in PLAN is no longer in the database: %d of %d found.' % (len(plan), len(PLAN)))
    # the exam book goes back over the main book's skills: a few of them have slipped, as a class forgets some things and not others
    exam_skills = sorted({k for j in plan for ix in subs[j]['items'] if items[ix]['type'] in QUICK for k in items[ix]['skills']})
    slipped = set(rng.sample(exam_skills, max(1, len(exam_skills) // 5))) if exam_skills else set()

    def a_day(i, w, spread):                                    # a day in week w on which the student really worked, and the day they finished
        ds = sorted(d for d in days[i] if wk(d) == w)
        if not ds: return None
        d = rng.choice(ds)
        return d, min(max(ds), d + (rng.choice([0, 0, 1, 2, 3]) if spread else 0))
    att, labs, exam = [], [], []
    for j, w in sorted(plan.items()):
        graded = [ix for ix in subs[j]['items'] if items[ix]['type'] in ex.GRADED]
        is_lab = bool(graded) and all(items[ix]['type'] == 'activecode' for ix in graded)
        for ix in (graded[:1] if is_lab else graded):
            ks = items[ix]['skills']
            hard = rng.uniform(-.1, .1)                         # some tasks are harder than others
            for i in range(N):
                e = effort(i, w)
                if is_lab:
                    if rng.random() >= take(e) * lab_share[i]: continue
                    dd = a_day(i, w, True)
                    if not dd or dd[1] > last_week * 7 - 1: continue
                    ok = rng.random() < min(.9, max(.05, .05 + .55 * code[i] ** 1.2 + hard))
                    if ok:
                        rn = rng.choice(RUNS_OK); tries = rn + rng.choice([0, 0, 0, 1, 2])
                    else:
                        rn = 0; tries = max(1, min(40, round(math.exp(rng.gauss(math.log(6), .75)))))
                    sec1 = rng.randint(120, 420); sec = sec1 + sum(rng.randint(60, 200) for _ in range(tries - 1))
                    att.append([i, ix, int(rn == 1), int(1 <= rn <= 3), int(ok), tries, dd[0], sec, dd[1], rn, sec1]); labs.append((tries, rn))
                else:
                    if rng.random() >= take(e) * exam_share[i]: continue
                    dd = a_day(i, w, False)
                    if not dd: continue
                    p1 = min(.97, max(.05, .12 + .78 * knows(i, ks) + hard - (.3 if any(k in slipped for k in ks) else .02)))
                    rn = 1 if rng.random() < p1 else 2 if rng.random() < .62 else 3 if rng.random() < .75 else 0
                    tries = rn if rn else rng.choice([1, 2, 3]); sec1 = rng.randint(35, 130); sec = sec1 + sum(rng.randint(15, 60) for _ in range(tries - 1))
                    att.append([i, ix, int(rn == 1), int(1 <= rn <= 3), int(rn > 0), tries, dd[0], sec, dd[0], rn, sec1]); exam.append(rn)

    # ---------- write only what is added. data/class.js stays as exported ----------
    out = {'base': {'section': D['meta']['section'], 'units': nU, 'subs': nJ, 'items': nI, 'skills': nK, 'att': len(D['att'])}, 'seed': SEED,
           'books': [{'id': b['id'], 'name': b['name'], 'short': b['short'], 'role': b['role'], 'added': None if n == 0 else (ADDED[n - 1][1] - 1) * 7, 'invented': n > 0} for n, b in enumerate(books)],
           'units': U[nU:], 'subs': subs[nJ:], 'items': items[nI:], 'skills': [k['name'] for k in skills[nK:]], 'att': att}
    path = os.path.join(ROOT, 'data', 'example.js')
    with open(path, 'w', encoding='utf-8') as f:
        f.write("""/* INVENTED work, on real outlines. Written by tools/make-example.py (seed %d); do not edit by hand.

   This file adds books to the class in data/class.js, so the mock can show a class with more than one book.
   The outlines are real: the units, lessons, questions and skill tags of %s, read from the database.
   The work is not: no result in "att" below was done by any student. It is invented to follow what the few real
   sections with several books show (the main book throughout, labs alongside, the exam book at the end) and each
   student's own real record in the class's one real book.

   The mock reads it only at index.html?books, marks the page "Example" while it does, and the real class is untouched.
   Numbers continue from data/class.js: units from %d, lessons from %d, questions from %d, skills from %d. */\n""" % (SEED, ', '.join(b['name'] for b in books[1:]), nU, nJ, nI, nK))
        f.write('window.ATLAS_BOOKS=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
    pct = lambda n, d: round(100 * n / d) if d else 0
    tries = [t for t, r in labs]; rns = [r for t, r in labs]
    print('books: %s' % ' + '.join('%s (%s)' % (b['name'], b['short']) for b in books))
    print('added: %d units, %d lessons, %d questions, %d skills · %d lessons with invented work · last week used %d' % (len(U) - nU, len(subs) - nJ, len(items) - nI, len(skills) - nK, len(plan), last_week))
    print('labs: %d student-tasks · median %s runs · %d%% run right in the end · %d%% first run · %d%% within 3   (real: 25 student-tasks, 7 · 48%% · 4%% · 16%%)'
          % (len(tries), statistics.median(tries) if tries else '-', pct(sum(1 for r in rns if r), len(rns)), pct(sum(1 for r in rns if r == 1), len(rns)), pct(sum(1 for r in rns if 1 <= r <= 3), len(rns))))
    print('exam book: %d student-questions · %d%% right first time · %d%% within 3   (real: 88 student-questions, 65%% · 97%%)'
          % (len(exam), pct(sum(1 for r in exam if r == 1), len(exam)), pct(sum(1 for r in exam if 1 <= r <= 3), len(exam))))
    print('leave the labs: %s · exam-book skills that slipped: %d of %d' % (', '.join(D['students'][i] for i in sorted(leave)), len(slipped), len(exam_skills)))
    print('wrote data/example.js · %d KB' % (os.path.getsize(path) // 1024))


if __name__ == '__main__':
    main()
