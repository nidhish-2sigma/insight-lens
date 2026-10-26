"""Builds data/prereqs.js: the skills each unit of the class builds on, two levels back, from the learner model's skill graph.

The database records a prerequisite graph for each skill set: knowledge_graph names the graph for a book, and the graph itself is a file
in cloud storage (skill ids as nodes, an edge from a prerequisite to the skill that needs it, with the model's confidence; an LLM judged
each pair). This tool:
  1. re-reads the class's outline and skills through tools/export-atlas.py's own read-only session, so the skill numbers match data/class.js;
  2. finds the newest graph for the main book in knowledge_graph and loads its file: SKILL_GRAPH_FILE, or the object in the bucket named by
     GRAPH_BUCKET (under GRAPH_PREFIX, default learner-model), read with the application-default access token of gcloud;
  3. for each unit: the skills it uses, which are the skills its graded questions are tagged with in item_skill, counted, and only tags
     whose relevance score is above export-atlas.py's MIN_RELEVANCE (50%); the lessons' teaching weights carry no relevance score and do
     not count. Then the skills those need that the unit does not use itself (level 1), kept only when three or more of the unit's
     questions need one (a question whose skills it leads to); the skills three or more of the class's questions check come first (the
     graph spans every book of the skill set, and a prerequisite no question here checks cannot say who is ready), each group ranked by how
     many of the unit's questions need it, then by confidence times use; and what each of those needs (level 2), checked ones first;
  4. lists the class's graded questions that check each prerequisite the class file does not carry, so the page can say who is secure on it,
     and, for every skill in a tree, the class's lessons that teach it (unit_skill_coverage), so the page can say whether it was taught;
  5. sums up ALPS's own levels for the class (the learner model's latest scores, student_performance_predictions), for the page's sources:
     the model, its data cutoff, the share of its levels at each of ALPS's five, and how close a student's scores sit to their own median.

  PGPASSWORD=... GRAPH_BUCKET=... python3 tools/export-prereqs.py [section_id]
  PGPASSWORD=... SKILL_GRAPH_FILE=path/to/graph.json python3 tools/export-prereqs.py [section_id]

The file is facts only; js/atlas.js reads it only when it was built for this very export (same section, units, lessons, questions, skills).
Run it again after every new export.
"""
import datetime as dt
import importlib.util
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from collections import defaultdict

sys.dont_write_bytecode = True   # loading tools/export-atlas.py leaves no __pycache__ in tools/
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('export_atlas', os.path.join(ROOT, 'tools', 'export-atlas.py'))
ex = importlib.util.module_from_spec(spec); spec.loader.exec_module(ex)

L1_KEEP, L2_KEEP = 12, 6        # kept per unit and per prerequisite; the page shows the four the unit needs most
MIN_NEED = 3                    # a prerequisite counts only when three or more of the unit's graded questions need it


def load_class():
    src = open(os.path.join(ROOT, 'data', 'class.js'), encoding='utf-8').read()
    return json.loads(src[src.index('=') + 1:].strip().rstrip(';'))


def load_graph(meta):
    """The graph file, from a local path or from the bucket with an application-default access token."""
    path = os.environ.get('SKILL_GRAPH_FILE')
    if path:
        return json.load(open(path, encoding='utf-8'))
    bucket = os.environ.get('GRAPH_BUCKET')
    if not bucket:
        sys.exit('Set SKILL_GRAPH_FILE to a copy of %s, or GRAPH_BUCKET to the bucket the learner model writes to.' % meta['basename'])
    obj = '%s/%s/%s' % (os.environ.get('GRAPH_PREFIX', 'learner-model'), meta['dirname'], meta['basename'])
    token = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'], capture_output=True, text=True).stdout.strip()
    if not token:
        sys.exit('No application-default access token: run gcloud auth application-default login, or set SKILL_GRAPH_FILE.')
    url = 'https://storage.googleapis.com/storage/v1/b/%s/o/%s?alt=media' % (bucket, urllib.parse.quote(obj, safe=''))
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=120) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    SECTION = int(sys.argv[1]) if len(sys.argv) > 1 else 218
    con = ex.connect()
    q = lambda sql, **kw: con.run(sql, **kw)
    sec = q("select name, curriculum_id from section where section_id = :s", s=SECTION)
    if not sec: sys.exit('No section %d' % SECTION)
    books = ex.read_books(q, SECTION, sec[0][1])
    U, subs, items, subix, iidx = ex.read_outline(q, books)
    skills = ex.read_skills(q, U, subs, items, subix, iidx)

    # the class file must be this very export: the same outline and the same skills, in the same order
    D = load_class()
    if not (D['meta']['section'] == SECTION and len(D['units']) == len(U) and len(D['subs']) == len(subs) and len(D['items']) == len(items)
            and D['skills'] == [s['name'] for s in skills]):
        sys.exit('data/class.js is not the export of section %d as the database has it now: run tools/export-atlas.py first.' % SECTION)

    # the graph for the main book's skill set: the newest knowledge_graph row, else the newest skill_graph of the set
    main = books[0]['id']
    ss = q("select skill_set_id from curriculum_skill_set where curriculum_id = :c and coalesce(ignore, false) = false order by createdon desc limit 1", c=main)
    if not ss: sys.exit('No skill set for %s' % main)
    ssid = ss[0][0]
    kg = q("""select metadata, createdon from knowledge_graph where skill_set_id = :s and :c = any(curricula_ids) and coalesce(ignore, false) = false
              order by createdon desc limit 1""", s=ssid, c=main)
    meta = kg[0][0].get('skill_graph') if kg else None
    built = kg[0][1] if kg else None
    if not meta:
        sg = q("select gcs_file, createdon from skill_graph where skill_set_id = :s and coalesce(ignore, false) = false order by createdon desc limit 1", s=ssid)
        if not sg: sys.exit('No skill graph for skill set %d' % ssid)
        meta, built = sg[0]
    graph = load_graph(meta)
    title = {n['id']: n.get('title') or '' for n in graph['nodes']}
    pre = defaultdict(list)
    for e in graph['edges']:
        pre[e['__to__']].append((e['__from__'], int(e.get('weight') or 0)))
    print('graph: skill set %d · %s · %d skills · %d edges' % (ssid, meta['basename'], len(graph['nodes']), len(graph['edges'])))

    # what each unit uses: the skills its graded questions are tagged with, above the relevance cut, counted
    graded = [it['id'] for it in items if it['type'] in ex.GRADED]
    tag_rows = q("select item_id, skill_id::text, relevance_score from item_skill where item_id = any(:i) and coalesce(ignore, false) = false and relevance_score > :r", i=graded, r=ex.MIN_RELEVANCE)
    item_tags, item_of_skill, tag_rel = defaultdict(list), defaultdict(set), {}
    for item_id, sk, rel in tag_rows:
        item_tags[iidx[item_id]].append(sk); item_of_skill[sk].add(iidx[item_id]); tag_rel[(iidx[item_id], sk)] = round(float(rel), 2)
    # where each skill is taught: the class's lessons with a teaching weight for it. Shown on the page; never a reason to draw a skill
    cov_rows = q("select unit_id, skill_id::text from unit_skill_coverage where unit_id = any(:u) and coalesce(teach_weight, 0) > 0", u=[s['id'] for s in subs])
    taught_in = defaultdict(set)
    for unit_id, sk in cov_rows:
        taught_in[sk].add(subix[unit_id])

    kidx = {s['id']: k for k, s in enumerate(skills)}
    extra, extra_ids = {}, []
    def kid(sk):
        if sk in kidx: return kidx[sk]
        if sk not in extra:
            extra[sk] = len(skills) + len(extra_ids); extra_ids.append(sk)
        return extra[sk]
    name = lambda sk: title.get(sk) or sk
    measured = lambda sk: len(item_of_skill.get(sk, ())) >= 3        # three or more of the class's graded questions check it

    units, n_used, n_qs, in_tree = [], [], [], set()
    for u, un in enumerate(U):
        used = defaultdict(int)
        qs = [ix for j in un['subs'] for ix in subs[j]['items'] if item_tags.get(ix)]
        for ix in qs:
            for sk in item_tags[ix]: used[sk] += 1
        n_used.append(len(used)); n_qs.append(len(qs))
        score, feeds, needq = defaultdict(float), defaultdict(lambda: defaultdict(float)), defaultdict(set)
        for s, w in used.items():
            for p, c in pre.get(s, []):
                if p in used: continue
                score[p] += c * w; feeds[p][s] += c * w
        # the unit's questions each prerequisite stands behind: a question once, however many of its skills need it
        for ix in qs:
            for s in item_tags[ix]:
                for p, c in pre.get(s, []):
                    if p not in used: needq[p].add(ix)
        # level 1: the skills three or more of the class's questions check come first (the graph spans every book of the skill set, and one
        # nothing here checks cannot say who is ready), then what the unit needs most: how many of its questions need it (three or more), then
        # confidence times use. How much evidence the class has on a skill decides only how the page draws it, never whether it is in the tree
        l1 = sorted((p for p in score if len(needq[p]) >= MIN_NEED), key=lambda p: (not measured(p), -len(needq[p]), -score[p], p))[:L1_KEEP]
        cand = set(score)
        rows = []
        for p in l1:
            l2 = sorted({(x, c) for x, c in pre.get(p, []) if x not in used and x not in cand and x != p}, key=lambda xc: (not measured(xc[0]), -xc[1], xc[0]))[:L2_KEEP]
            need = [name(s) for s in sorted(feeds[p], key=lambda s: (-feeds[p][s], s))[:3]]
            rows.append([kid(p), round(score[p]), need, [[kid(x), c] for x, c in l2], len(needq[p])])
            in_tree.add(p); in_tree.update(x for x, c in l2)
        units.append(rows)

    # the class's graded questions that check each prerequisite the class file does not carry
    tags = [sorted(item_of_skill.get(sk, ())) for sk in extra_ids]
    tag_rels = [[tag_rel[(ix, sk)] for ix in ixs] for sk, ixs in zip(extra_ids, tags)]   # each tag's relevance score, in the order of tags

    # ALPS's own levels, summed up for the page's sources: the learner model's latest score for each student and skill
    # (student_performance_predictions, the newest data_cutoff, as the service reads it), rounded to 0 to 100 as the service rounds it and
    # banded at ALPS's cuts. The page draws no level of the model's: it gives each student nearly one score on every skill, which the share
    # of skills whose scores sit within 5 points of each student's own median says
    students = ex.read_students(q, SECTION)
    if [s['name'] for s in students] != D['students']:
        sys.exit('data/class.js lists other students than section %d has now: run tools/export-atlas.py first.' % SECTION)
    pred = q("""with su as (select section_user_id, app_user_id from section_user where section_user_id = any(:su))
                select su.section_user_id, p.skill_id::text, p.performance_score, p.data_cutoff, p.model_type::text, p.publication_id, p.serving_epoch
                from su join lateral (select distinct on (pr.skill_id) pr.skill_id, pr.performance_score, pr.data_cutoff, pr.model_type, pr.publication_id, pr.serving_epoch
                                      from student_performance_predictions pr where pr.app_user_id = su.app_user_id
                                      order by pr.skill_id, pr.data_cutoff desc) p on true""", su=[s['id'] for s in students])
    if not pred: sys.exit('The learner model has no scores for section %d.' % SECTION)
    band = lambda v: 4 if v >= 80 else 3 if v >= 65 else 2 if v >= 55 else 1 if v >= 40 else 0
    runs, n_lv, by_stu, by_sk = defaultdict(int), [0] * 5, defaultdict(list), defaultdict(list)
    for su, sk, score, cutoff, mtype, pub, epoch in pred:
        v = int(round(100.0 * score))
        runs[(mtype, pub, epoch, cutoff)] += 1; n_lv[band(v)] += 1; by_stu[su].append(v); by_sk[sk].append((su, v))
    mtype, pub, epoch, cutoff = max(runs, key=lambda r: r[3])
    med = {su: sorted(vs)[len(vs) // 2] for su, vs in by_stu.items()}
    dev = [sum(v - med[su] for su, v in rows) / len(rows) for rows in by_sk.values() if len(rows) >= 20]
    day0 = dt.date.fromisoformat(D['meta']['day0'])
    alps = {'model': {'type': mtype, 'publication': pub, 'epoch': epoch, 'cutoff': cutoff.isoformat(timespec='seconds'),
                      'day': ((cutoff + dt.timedelta(hours=D['meta']['utcOffset'])).date() - day0).days},
            'scores': len(pred), 'skills': len(by_sk), 'runs': len(runs),
            'share': [round(100 * n / len(pred), 1) for n in n_lv],
            'near': round(100 * sum(abs(d) <= 5 for d in dev) / len(dev)) if dev else None}
    out = {
        'base': {'section': SECTION, 'units': len(U), 'subs': len(subs), 'items': len(items), 'skills': len(skills)},
        'graph': {'skillSet': ssid, 'file': meta['basename'], 'nodes': len(graph['nodes']), 'edges': len(graph['edges']),
                  'built': built.date().isoformat() if isinstance(built, dt.datetime) else str(built)},
        'skills': [name(sk) for sk in extra_ids],
        'minRelevance': ex.MIN_RELEVANCE,
        'used': n_used,
        'questions': n_qs,
        'units': units,
        'tags': tags, 'tagRel': tag_rels,
        'taught': [[kid(sk), sorted(taught_in[sk])] for sk in sorted(in_tree, key=kid) if taught_in.get(sk)],
        'alps': alps,
    }
    path = os.environ.get('PREREQS_OUT') or os.path.join(ROOT, 'data', 'prereqs.js')
    head = ('/* Built by tools/export-prereqs.py on %s from the learner model\'s skill graph for skill set %d (%s) and the class export of section %d.\n'
            '   The edges are the learner model\'s: an LLM judged each pair, and the weight is its confidence. A unit\'s skills are the ones its graded\n'
            '   questions are tagged with at a relevance score above %d%%. alps: ALPS\'s learner model (%s, publication %s, data cutoff %s UTC), summed up:\n'
            '   the share of its levels at each of ALPS\'s five, and the share of skills on which a student\'s score is within 5 points of their own median.\n'
            '   Facts only; js/atlas.js picks what to show. */\n'
            % (dt.date.today().isoformat(), ssid, meta['basename'], SECTION, round(ex.MIN_RELEVANCE * 100), mtype, pub, alps['model']['cutoff']))
    with open(path, 'w', encoding='utf-8') as f:
        f.write(head + 'window.ATLAS_PREREQS=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
    n1 = sum(len(r) for r in units)
    print('wrote %s · %d KB · %d units · %d level-1 prerequisites kept · %d skills the class file does not carry, %d of them checked by a class question · units with no skill above the cut: %s'
          % (os.path.relpath(path, ROOT), os.path.getsize(path) // 1024, len(units), n1, len(extra_ids), sum(1 for t in tags if t), [U[u]['name'] for u, n in enumerate(n_used) if not n]))
    print('ALPS: %s, publication %s, data cutoff %s UTC · %d scores on %d skills · levels %s%% (beginning to mastered) · %s%% of skills within 5 points of the student\'s median · %s'
          % (mtype, pub, alps['model']['cutoff'], alps['scores'], alps['skills'], ' / '.join(str(x) for x in alps['share']), alps['near'],
             'one model run' if len(runs) == 1 else '%d model runs, the newest cutoff named' % len(runs)))


if __name__ == '__main__':
    main()
