---
name: review-datasets
description: Review the ignored datasets of config/datasets.yaml from their CSW metadata records (npm run csw:dump) and set the appropriate ignoredReason (Local data, Test data, Waiting for MCP use case definition...). Use when asked to review, sort or triage the datasets, or a given dataset.
---

# Review the datasets of config/datasets.yaml

## Goal

Set the `ignoredReason` of the ignored datasets of [config/datasets.yaml](../../../config/datasets.yaml) from their metadata record :

- flag the datasets that are out of scope (`Test data`, `Local data`);
- flag the datasets that seem relevant for the MCP [ignfab/geocontext](https://github.com/ignfab/geocontext) (`Waiting for MCP use case definition`), so that they can be enabled once a use case is defined.

The MCP relies on this library to describe and query the **WFS collections** of the Géoplateforme (`gpf_wfs_search_types`, `gpf_wfs_describe_type`, `gpf_wfs_get_features`) : a dataset is only usable through its WFS links.

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
| `Service record` | set by `npm run update:datasets` for the records of type `service` (ex : the `GeoPF_*` records of the Géoplateforme APIs) : nothing to review |
| `Private data` | all the publications of the record (`wfs`, `wms`, `wmts`, `tms` links) are private (`https://data.geopf.fr/private/...`, authentication required) : not usable by the MCP |
| `No WFS layers` | the record has no `wfs` link (raster / tiles only : `SCAN *`, orthophotos, `Plan IGN`, Cassini maps, DEM..., or WMS / WMTS only) : not usable by the MCP |
| `Waiting for MCP use case definition` | dataset relevant for the MCP (see below) |
| `New dataset, review required` | **when in doubt** (keep it), and the datasets that are neither out of scope nor relevant for the MCP |

The reasons are checked in this order : `Test data`, `Local data`, `Private data`, `No WFS layers`, then `Waiting for MCP use case definition` (ex : a test dataset without WFS link is `Test data`, a dataset with private WMS layers only is `Private data`).

`Private data` : a dataset with at least one public publication (ex : a public WMS and a private WFS) is not `Private data` (it may be `No WFS layers` when its WFS layers are all private : mention it as a doubt).

`No WFS layers` :

- only the `links` of the record count (`type: wfs`, see `npm run -s csw:dump`);
- if a WFS collection seems to exist on the Géoplateforme for the dataset (ex : a namespace matching the name of its WMS / WMTS layer in the [WFS GetCapabilities](https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities)), keep it in `New dataset, review required` and mention it as a doubt : the link could be added with `links`;
- the `links` already defined in config/datasets.yaml for the dataset count as WFS links.

A dataset is relevant for the MCP (`Waiting for MCP use case definition`) when **all** of the following apply :

- it has at least one `wfs` link in its record (otherwise `No WFS layers`);
- it covers France (metropolitan France, possibly with the overseas territories, or all the overseas territories) : it is neither `Test data` nor `Local data`;
- it describes objects of the territory that help answer a question about a place : environment and protected areas, risks, agriculture, forest, land cover, energy, water, transport and networks, heritage, tourism labels, statistics by commune / EPCI... (ex : `IGNF_RPG`, `IGNF_BD-FORET`, `INAO_AOC-VITICOLES`, `MTECT_CORINE-LAND-COVER`, `CDL_PARCELLES`, `FSV_STATIONS-VERTES`);
- it is published by a recognized producer (IGN, ministries, public bodies, national associations...) and is not obsolete (ex : `INRAE_CARTE-DES-SOLS`, flagged as obsolete in its title, stays in review).

The following datasets are **not** relevant and stay in `New dataset, review required` :

- beta or demonstrator datasets (`BETA-*`, `Démonstrateur ...`) : mention them as doubts;
- datasets already covered by an enabled product (ex : the BD TOPO themes) : mention them as doubts.

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
   - the datasets moved to `Private data` and `No WFS layers` (grouped by producer or family, no need to list each SCAN);
   - the datasets moved to `Waiting for MCP use case definition` (grouped by theme or producer);
   - the datasets kept in review because of a doubt, with the reason of the doubt.
5. Do not commit unless the user asks.
