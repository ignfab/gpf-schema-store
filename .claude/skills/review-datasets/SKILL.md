---
name: review-datasets
description: Review the ignored datasets of config/datasets.yaml from their CSW metadata records (npm run csw:dump) and set the appropriate ignoredReason (Local data, Test data...). Use when asked to review, sort or triage the datasets, or a given dataset.
---

# Review the datasets of config/datasets.yaml

## Goal

Set the `ignoredReason` of the ignored datasets of [config/datasets.yaml](../../../config/datasets.yaml) from their metadata record, so that the remaining `New dataset, review required` are the datasets worth considering for the MCP.

## Inputs

- The datasets to review : by default the `ignored: true` datasets with `ignoredReason: New dataset, review required`, or the ids given by the user.
- The metadata record of a dataset, in the pivot format (title, abstract, keywords, spatialScope, typed links) :

```bash
npm run build                       # once, the npm scripts rely on dist/cli.js
npm run -s csw:dump -- <fileIdentifier>
```

List the datasets to review :

```bash
python3 -c "
import yaml
for d in yaml.safe_load(open('config/datasets.yaml'))['datasets']:
    if d.get('ignored') and d.get('ignoredReason') == 'New dataset, review required':
        print(d['id'], '|', d['title'])
"
```

## Reasons

| ignoredReason | When |
|---|---|
| `Test data` | test, demo, POC, workshop or personal data (ex : `test`, `Test geopf 8`, `[DEMO] ...`, `BETA-IGN-POC-...`, `jeu de test`, `donnees_timothe`) |
| `Local data` | data restricted to a given area : commune, EPCI, département, région, basin, park, overseas territory (ex : `PPRI agglo Laval`, `Cours d'eau de la Sarthe`, `OCS Nouvelle-Aquitaine`, `deal972_*`) |
| `New dataset, review required` | **when in doubt** (keep it) |

Rules :

- Decide from the title **and** the record (abstract, keywords, producer, links) : the id or the title alone is often ambiguous (ex : `76`, `wms_79_2307`, `projet_06`, acronyms like `CACEM`).
- A product covering all the overseas territories (ex : `CARTO VEGETATION DROM`) is not local.
- The `spatialScope` is a hint only : most local datasets have none, and some national IGN products are tagged `local` / `regional` (ex : `IGNF_SYLVOECOREGIONS`, `IGNF_FRANCE-RELIEF`). Never decide from it alone.
- Test data restricted to an area is `Test data`.
- Only change the `ignoredReason` line of the reviewed datasets : never change `ignored`, `product`, `excludes` or `links`, and never change the other reasons (`Waiting for MCP use case definition`, `Image index dataset`...) unless the user asks.

## Steps

1. List the datasets to review (or use the ids given by the user).
2. For each dataset whose title is not obvious, run `npm run -s csw:dump -- <id>` and read the record.
3. Update the `ignoredReason` lines in `config/datasets.yaml` (keep the file format : one entry per dataset, sorted by id).
4. Report to the user :
   - the counts per reason (before / after);
   - the datasets moved to `Local data` and `Test data` (grouped, with a short justification when not obvious);
   - the datasets kept in review because of a doubt, with the reason of the doubt.
5. Do not commit unless the user asks.
