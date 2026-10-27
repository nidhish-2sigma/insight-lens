# Adding Insight Lens to ALPS

The standalone page and embedded view use the same charts, calculations and
evidence. This change prepares the theme and lifecycle for integration; it does
not modify or launch `alps-react-app`.

## Visual contract

| Meaning | Shared convention |
| --- | --- |
| Actions and selection | ALPS `--primary-blue` and `--hover-blue`. Orange `--accent` stays a brand color. |
| Beginning → Mastered | ALPS gray-to-blue performance ramp and level labels. Beginning is measured; it is not missing evidence. |
| Engagement levels | ALPS yellow Low → Very high ramp. Participation percentages and activity against own usual retain their separate, labeled measurements. |
| Correct / incorrect / attention | ALPS green / red / amber. Support counts and score changes remain explicitly labeled aggregates or alerts, rather than alternative performance colors. |
| Missing evidence | Hatched gray with dashed outline for unavailable; empty with solid outline for not attempted. Neither becomes a zero score. |
| Skill | Shared head-and-gear asset, `skill_grey.svg`. The ALPS hint lightbulb is no longer used for skills. |
| Question type | Canonical `ItemTypeIcon` paths and `ITEM_TYPE_FILL_COLOR`. Clickable area and drag/drop stay distinct despite sharing a scoring format. Type colors do not indicate correctness. |
| Answer result | ALPS circular correct/incorrect metaphor. Lens retains first-attempt and retry detail; a neutral `+` badge marks rapid retries without suggesting pending grading. |
| Navigation | Shared skills, analytics, monitoring, assignment, book and history assets; selected icons use primary blue. |

Sources in ALPS: `src/App.css`, `src/utils/colors.js`,
`src/utils/mui-theme.js`, `src/utils/item-type-icon-style.js`,
`src/screens/Enhancements/ItemGraphViz/item-type-icon-paths.js`,
`src/components/PerformanceBatteryV2.jsx`, and `src/assets/svg/`.
Noto Sans, Material-style buttons and surfaces remain consistent with the host.

## React adapter

Load the styles once in this order, after the host’s base styles:

```js
import './insight-lens/css/alps-theme.css';
import './insight-lens/css/atlas.css';
import './insight-lens/css/skills-review.css';
import './insight-lens/css/ready-actions-review.css';
import './insight-lens/css/comparison.css';
import './insight-lens/css/visuals.css';

import './insight-lens/js/alps-design-system.js';
import './insight-lens/js/atlas.js';
```

```jsx
import { useEffect, useRef } from 'react';

export function InsightLensRoute({ classData, prerequisiteData }) {
  const root = useRef(null);

  useEffect(() => {
    const lens = window.InsightLens.mount(root.current, {
      embedded: true,
      data: classData,
      prereqs: prerequisiteData,
      hash: '#skills',
    });
    return () => lens.destroy();
  }, [classData, prerequisiteData]);

  return <div ref={root} style={{ '--il-host-offset': '56px' }} />;
}
```

Keep Noto Sans loading in ALPS. Set `--il-host-offset` to the sticky host
header’s height, or zero when the host already supplies a scroll container.
Embedded mode hides the standalone header. The mount API creates the shell
inside the root, scopes DOM queries and events there, and cleans up listeners
and timers on destroy, including repeated mounts in React Strict Mode.

All Lens variables are private `--il-*` declarations. Selectors stay under
`.insight-lens`, except the opt-in standalone body margin reset. The bridge
reads ALPS’s public variables with standalone fallbacks and never redefines
them. Host controls, generic class names, duplicate IDs and brand colors are
left intact. Dialog / toast / tooltip layers use MUI’s 1300 / 1400 / 1500
convention; override `--il-z-dialog`, `--il-z-toast` or `--il-z-tooltip` if needed.

Embedded navigation stays local and never changes the host URL or subscribes
to its hash changes. Optional `search`, `hash` and
`onNavigate({ search, hash })` options let ALPS store the Lens location. Use
`lens.navigate('?today=2025-11-14#skills')` to navigate externally. A callback
should store the route rather than call `navigate` recursively. Standalone URL
behavior is preserved.

Class data is copied before prerequisite or example-book expansion, so Lens
does not mutate data owned by ALPS. Real classes with several textbooks use
the same data contract. The `?books` demo additionally needs `data/example.js`.
Transient selections, planned actions and groups remain local to the mounted
instance and reset on query changes or unmount, as standalone reloads did.
Production data loading and coursework/group persistence still need ALPS
service adapters.

## Verification and updates

```sh
node tools/sync-alps-design-system.js ../alps-react-app
node tools/sync-alps-design-system.js ../alps-react-app --check
node tools/check.js --checks
```

Sync reads ALPS source and writes only `js/alps-design-system.js` and
`css/alps-theme.css` in Lens. `--check` detects drift without writing.
The main suite verifies contrast, performance levels, raw item types, immutable
host data, root events, local routing and clean remounts alongside the existing
numerical regressions.

`tools/check-alps-browser.js` optionally uses a local Playwright installation
to capture all seven pages and profiles at desktop and phone widths. It also
loads the actual ALPS stylesheet into a host fixture, checks dialogs and host
isolation, and blocks external web requests. Set `PLAYWRIGHT_MODULE`,
`PLAYWRIGHT_EXECUTABLE`, `ALPS_REPO` or `LENS_SCREENSHOTS` when their defaults
do not fit the local setup.
