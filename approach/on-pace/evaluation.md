# How the methods were tested, and the results

## The test

- **Class**: section 218 in `data/class.js` (36 students, exported 13 Oct 2026). Its work ran from 3 Sep 2025 to 5 Feb 2026.
- **As-of days**: 1 Oct, 15 Oct, 1 Nov, 15 Nov and 1 Dec 2025, the weeks the class was working.
- **Goal dates**: 15, 30 and 45 days after each as-of day.
- **Goals**: every unit whose goal has five or more skills (10 units), for every student. That is 5,400 projections.
- **How a projection was made**: the page's own code (`js/atlas.js`) was run as of the as-of day (`?today=`), so it saw only answers given by then. The proposed method's rates were also learned from that data only.
- **What it was compared with**: the number the page itself counts on the goal date (the code run with `?today=` set to the goal date). The test measures how well each method predicts the page's own count.
- **The methods**:
  - *page today*: `paceOf` as it is. Each student's net gain over the 30 days ending at their latest check, extended to the goal date.
  - *no change*: projected = now.
  - *proposed*: [method.md](method.md), with the class's pace as the schedule.
  - *plan what-if*: the same, assuming every remaining goal skill is reached by the goal date.
  - *true schedule*: the same, given how many new goal skills each student actually met by the goal date. This is known only afterwards, so it measures the student part of the method on its own.

### The measures, in plain words

- **Average miss**: how far the projection is from the actual count, in skills, on average.
- **Big-miss measure (RMSE)**: the same, but big misses weigh more: one miss of 4 weighs as much as four misses of 2. Lower is better.
- **Bias**: the average of projected minus actual. Plus means too high.
- **Gain correlation**: whether the students projected to gain more did gain more (0 = no link, 1 = perfect). "No change" projects no gains, so it has none.
- **80% range holds**: how often the actual count fell inside the method's 80% range. About 80% is right.

## Results

### All goals: 5,400 projections

| Method | Average miss | Big-miss (RMSE) | Bias | Gain correlation |
|---|---|---|---|---|
| Page today | 2.02 | 3.06 | +1.44 | 0.29 |
| No change | 0.96 | 1.91 | −0.71 | – |
| **Proposed (class pace)** | **0.90** | **1.47** | **+0.15** | **0.58** |
| Proposed (plan what-if) | 1.75 | 2.37 | +1.33 | 0.51 |
| Proposed (true schedule) | 0.71 | 1.26 | −0.20 | 0.73 |

The proposed range holds the actual count **79%** of the time.

### The unit the class was in: 540 projections

This is the goal a teacher most often picks. It was Unit 2 on the October days and 1 Nov, and Unit 4 on 15 Nov and 1 Dec.

| Method | Average miss | Big-miss (RMSE) | Bias | Gain correlation |
|---|---|---|---|---|
| Page today | 4.29 | 5.52 | +3.44 | 0.10 |
| No change | 2.20 | 3.09 | −1.77 | – |
| **Proposed (class pace)** | **2.09** | **2.65** | **+0.18** | **0.18** |
| Proposed (plan what-if) | 2.52 | 3.13 | +0.75 | 0.03 |
| Proposed (true schedule) | 1.63 | 2.20 | −0.87 | 0.62 |

The proposed range holds 58% of the time here. The schedule moves most on the unit in progress, and the range only partly allows for it.

### By how far ahead the goal date is

| Goal date | Page today (miss, bias) | No change | Proposed | Proposed range holds |
|---|---|---|---|---|
| 15 days | 1.17, +0.55 | 0.77, −0.56 | **0.72, −0.04** | 81% |
| 30 days | 2.01, +1.43 | 1.02, −0.76 | **0.93, +0.14** | 78% |
| 45 days | 2.87, +2.35 | 1.10, −0.82 | **1.06, +0.37** | 77% |

The page today gets worse the further ahead it looks, because it stretches a short burst of gains across the whole period. The proposed method stays close.

### By as-of day

| As-of day | Average real gain | Page today (miss, bias) | No change | Proposed | True schedule |
|---|---|---|---|---|---|
| 1 Oct 2025 | 1.88 | 2.44, +1.02 | 2.00, −1.88 | **1.33, −0.38** | 1.25, −0.69 |
| 15 Oct 2025 | 1.26 | 2.25, +1.02 | 1.62, −1.26 | **1.33, −0.19** | 1.23, −0.37 |
| 1 Nov 2025 | 0.26 | 2.02, +1.86 | **0.67, −0.26** | 0.89, +0.64 | 0.53, +0.10 |
| 15 Nov 2025 | 0.08 | 1.91, +1.85 | **0.24, −0.08** | 0.62, +0.54 | 0.24, −0.02 |
| 1 Dec 2025 | 0.09 | 1.52, +1.39 | **0.29, −0.09** | 0.35, +0.16 | 0.29, −0.02 |

- **While the class was gaining** (October), the proposed method is much better than "no change", which cannot see any progress coming.
- **Once the class slowed** (from November), almost nobody gained. "No change" was then right by default, and the proposed method ran a little high, because the class's pace of the month before no longer held. The page today ran high by nearly two skills.

## Which part does what

Each row adds one piece to the proposal, or changes one choice, and reruns the whole test (`node approach/on-pace/backtest.js` with the option shown).

| Version | Average miss | Big-miss (RMSE) | Bias | Gain correlation | Range holds | RMSE with true schedule | Unit in progress: RMSE, bias |
|---|---|---|---|---|---|---|---|
| **Proposal** | **0.90** | **1.47** | **+0.15** | **0.58** | **79%** | **1.26** | **2.65, +0.18** |
| + fading of mastered skills (`--keep`) | 0.97 | 1.49 | −0.40 | 0.60 | 86% | 1.55 | 2.56, −1.05 |
| + recovery of weak skills (`--recover`) | 1.44 | 1.97 | +0.88 | 0.44 | 74% | 1.54 | 3.78, +1.77 |
| + catching up on skills the class met (`--catchup`) | 0.96 | 1.51 | +0.29 | 0.57 | 80% | 1.26 | 2.72, +0.42 |
| all three | 1.18 | 1.66 | +0.46 | 0.52 | 87% | 1.36 | 3.09, +0.78 |
| pace over 15 days (`--pace-days 15`) | 0.84 | 1.47 | −0.06 | 0.56 | 74% | – | 2.61, −0.26 |
| pace over 45 days | 0.98 | 1.53 | +0.17 | 0.52 | 79% | – | 2.67, +0.16 |
| pace over 60 days | 1.07 | 1.63 | +0.17 | 0.43 | 77% | – | 2.71, +0.16 |

- **Recovery is left out.** Learned from the class's history before each as-of day, the rates at which weak skills become mastered came out about twice the term's real rates. Early weeks are busy and early scores swing on few checks. Counting them pushed every projection up.
- **Fading is left out, but it is close.** It ranks students' gains within a goal better (below), and it does slightly better on the unit in progress. But it projects 0.4 skills too low on average, and with the true schedule it is clearly worse (1.55 against 1.26). That means its gains with the class's pace partly come from cancelling the pace's own over-estimate.
- **Catching up is left out**: it adds a little bias and no accuracy.
- **30 days for the pace**: 15 days is as accurate on average but its range holds less often. Longer windows are worse.
- **Cross-class difficulty** (`item_metrics.p_first` as a per-skill factor on the first-week rate) was tried on an earlier version of the method. It moved the error by about 0.03 skills, and its numbers include later data. Not included.

## Ranking students against each other within one goal

Within the same goal, as-of day and goal date, the rank correlation between projected gains and actual gains:

| Method | All goals | Unit in progress |
|---|---|---|
| Page today | −0.12 | 0.05 |
| Proposed | 0.02 | 0.13 |
| Proposed + fading | 0.20 | 0.13 |
| Proposed, true schedule | 0.20 | 0.12 |

- Gains are small and noisy. Over 30 days, 78% of projections saw a gain of 0 to 2 skills (55% none at all, and 10% lost some). On the unit in progress 35% gained three or more. **No method ranks who gains well**, and today's method ranks it slightly backwards.
- The proposal's strength is the level and the calibration of each projection, not ranking small gains. If the page wants to rank students by trajectory (for example "catching up"), adding fading is the better choice.

## Where the method misses

- **The schedule.** The class's work swings: 3,051 first tries on questions in the second half of September, 577 in the first half of October, 3,217 in the second half. Then 1,500 in early November, 431 in late November and 244 in early December. Any 30-day pace is wrong at a turn. On Unit 4 as of 15 Nov, the pace said the class would reach 12 of the 14 skills left by 15 Dec. It reached 1. The worked example in [method.md](method.md) follows three students through it.
- **The teacher's plan.** As a forecast the what-if runs high (+1.33). In none of the 15 tests on the unit the class was in did the class reach all of that unit's goal skills by the goal date. It is offered as a question the teacher asks, not as the default forecast.
- **While the class is gaining fast.** On 1 Oct the method had four weeks of history. It still beat the alternatives, but in October its range held only 74% (1 Oct) and 65% (15 Oct) of the time, against 80% to 89% from November. Fast gains are the hardest to place.
- **The range on the unit in progress** held 58% of the time, under the 80% it aims for. The schedule part of the spread is too small there.

## The learner model's scores

The learner model's stored scores (`student_performance_predictions`) were checked as a possible "mastered now" and as a basis for projection. For this class they are one snapshot (6 Feb 2026) and do not follow the evidence: rank agreement with the page's score is 0.07, and only 0.4% reach the model's own mastered cut. Details are in [data-sources.md](data-sources.md). They were not used.

## Limits of this test

- **One class and one term.** The rates are learned per class, so the method itself carries over, but how well it does should be checked on more classes. The learner model's own calibration used 40 classes on this skill set, so there are classes to check it on.
- **The truth is the page's own count.** Mastered means a score of 80% or more on two or more checks, the mock's estimate. A different definition (the learner model's, once its scores can be trusted) would need the test rerun.
- **The page today was run exactly as it is**, including its "Too early to tell", which leaves 216 of the 5,400 projections without a number. Its figures are over the rest.
- **The test reads the past as of each day** from the export of 13 Oct 2026. Answers recorded late, if any, would be visible to it a little early.

## How to rerun

From the repository root (Node 18 or later; a few minutes):

```
node approach/on-pace/backtest.js                              the tables above
node approach/on-pace/backtest.js --example 2025-11-15 30      one goal, student by student
node approach/on-pace/backtest.js --keep                       the proposal with fading (also --recover, --catchup)
node approach/on-pace/backtest.js --pace-days 15               the class's pace over another window
node approach/on-pace/backtest.js --json rows.json             every projection, for further analysis
```

The script reads `js/atlas.js`, `data/class.js` and `data/sample.js`, and changes nothing.
