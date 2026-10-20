# Coding

## Data Organization

* [config/datasets.yaml](config/datasets.yaml) : datasets from the metadata records of [data.geopf.fr/csw](https://data.geopf.fr/csw) with the decisions (activation, WFS exclusions, additional WFS links).
* `data/csw` : copy of the metadata records of the non-ignored datasets (`{fileIdentifier}.json`, pivot format with typed links, never edited).
* `data/wfs` : schema from the WFS GetCapabilities / DescribeFeatureType
* `data/overwrites` : additional information about schemas from sources like https://bdtopoexplorer.ign.fr/ (see [docs/overwrite-format.md](docs/overwrite-format.md))
* `data/catalog` : result of the enrichment process (JSON Schema extended by "OGC API Feature - schema")

## Warnings

- `src/index.ts` is the public API of the library (**changes may break geocontext integration**)
- `src/catalog` : public API for the `CollectionCatalog` with an in-memory implementation (**we should be able to implement a `GpfCollectionCatalog` once OGC API Feature is implemented with schema and search in the Geoplateforme**)

## Usage

> **WARNING**: The MCP [ignfab/geocontext](https://github.com/ignfab/geocontext) relies on a published version. The following instructions are related to the maintenance of the gpf-schema-store library and its embedded data.

### Build

```bash
npm install
npm run build
```

### Test

```bash
# To run unit tests only:
npm run test

# To compute coverage:
npm run test:coverage

# To run all tests, including the live search integration suite
npm run test:all
```

> See [test/integration/search/use-case.yaml](test/integration/search/use-case.yaml) for the search tests.

### Configure datasets

[config/datasets.yaml](config/datasets.yaml) lists the metadata records of [data.geopf.fr/csw](https://data.geopf.fr/csw) by `fileIdentifier` (`source: csw`) and the datasets without metadata record (`source: manual`, ex: `GPU`).

```yaml
datasets:

  - id: IGNF_BD-TOPO
    source: csw
    title: BD TOPO®
    product: BDTOPO_V3
    excludes:
      - type: wfs
        pattern: BDTOPO_V3_DIFF:*
        reason: Historical data

  - id: GPU
    source: manual
    title: Géoportail de l'Urbanisme
    product: GPU
    links:
      - type: wfs
        name: wfs_du:*

  - id: IGNF_SCAN-25
    source: csw
    title: SCAN 25®
    ignored: true
    ignoredReason: New dataset, review required
```

| Field | Purpose |
|---|---|
| `id` | `fileIdentifier` of the record (`source: csw`) or local identifier (`source: manual`) |
| `source` | `csw` or `manual` |
| `title` | title (refreshed from the record for `csw`) |
| `ignored` / `ignoredReason` | decision for the whole dataset (`false` by default) |
| `product` | associated product |
| `excludes[]` | excluded WFS collections : `type: wfs` + `pattern` on the typename (`*` as wildcard) + `reason` |
| `links[]` | WFS links (`type: wfs` + `name: {namespace}:{name}`) completing those of the record (required for `manual`) |
| `missing` | `true` when the record is no longer found in the CSW (managed by `update:datasets`) |

A WFS collection `{namespace}:{name}` is selected when :

* at least one non-ignored dataset has a WFS link on its **namespace** (from `data/csw/{id}.json` or `links`);
* none of these candidates excludes it (**exclusions always win**, ex : `BDTOPO_V3:erp` is excluded by `IGNF_BD-TOPO` while `IGNF_BD-HAIE` references `BDTOPO_V3:haie`).

> [!NOTE]
> The file is rewritten by `npm run update:datasets` (sorted by `id`, comments are not preserved) : justifications go into `ignoredReason` and `excludes[].reason`. To enable a dataset, set `ignored: false` (or remove `ignored`), then run `npm run update:csw`.

### Update data

> [!TIP]
> `npm run update:all` runs the full data refresh workflow described below : `update:datasets`, `update:csw`, `update:wfs` and `update:catalog`.

> [!WARNING]
> The `update:*` commands rely on `dist/cli.js` : run `npm run build` first (especially after a `git pull`).

#### Update datasets

Update [config/datasets.yaml](config/datasets.yaml) from the list of the records of [data.geopf.fr/csw](https://data.geopf.fr/csw) :

```bash
npm run update:datasets
```

* new records are added with `ignored: true` and `ignoredReason: New dataset, review required` (warning);
* service records (`type: service`, ex : the `GeoPF_*` records of the Géoplateforme APIs) are flagged with `ignoredReason: Service record` when they are new or still `New dataset, review required` (warning). The distinction between `dataset` and `series` is not used (not reliable);
* the `title` of the `csw` entries is refreshed;
* disappeared records are flagged with `missing: true` (warning), the flag is removed when the record comes back;
* `manual` entries are never modified (warning if they have no `links`);
* records whose `fileIdentifier` is not usable as a file name (`^[A-Za-z0-9._-]+$`) are skipped (warning).

#### Update CSW records

Download the records of the non-ignored datasets (ISO 19139 `GetRecordById`) to `data/csw` (fully replaced) :

```bash
# download data/csw/{fileIdentifier}.json
npm run update:csw
```

To inspect any record of the CSW (ignored or not) in the same pivot format, without writing anything :

```bash
npm run -s csw:dump -- IGNF_BD-TOPO
```

> [!TIP]
> The [datasets-review](.claude/skills/datasets-review/SKILL.md) skill relies on `csw:dump` to review the `ignoredReason` of the ignored datasets.

#### Update WFS schemas

Regenerate the `data/wfs` directory by fetching schemas from [data.geopf.fr/wfs](https://data.geopf.fr/wfs?service=WFS&request=GetCapabilities) for the collections selected by [config/datasets.yaml](config/datasets.yaml) (a warning is displayed for each WFS namespace without dataset) :

```bash
# download data/wfs/{namespace}/{name}.json
npm run update:wfs
```

### Render collection schema files

Regenerate the `data/catalog` directory by applying `data/overwrites` to schemas from `data/wfs` :

```bash
# generate data/catalog/{namespace}/{name}.json
npm run update:catalog
```

Each rendered file is a JSON Schema draft 2020-12 object (`$schema: https://json-schema.org/draft/2020-12/schema`).

See [docs/collection-schema.md](docs/collection-schema.md) for the full structure and IGN/OGC extension fields.

## Advanced testing

### Check local overwrites

Compare local WFS snapshots stored in `data/wfs` with local overwrite files in `data/overwrites`.

```bash
# check that overwrites are aligned with local snapshots in data/wfs
npm run check:overwrites
```

### Test local search

Use the `search` command to quickly inspect the results returned by the search engine with its default options.

```bash
# display the top 5 results
npm run cli search chef lieu commune -- --limit 5

# another example (without "npm run" and extra " -- ")
node dist/cli.js search bdtopo batiment --limit 3
```

The output shows the collection identifier, the computed score, and MiniSearch match details, which makes it easier to compare ranking behavior before and after a search change.

## Test a local package build in geocontext

If you want to test a local change from this package inside [`geocontext`](https://github.com/ignfab/geocontext), the simplest and most reliable workflow is to install a local tarball generated with `npm pack`.

This is the recommended approach because it is very close to a real npm publish:

* it uses the package `files` / `exports` configuration
* it only installs what would actually be shipped
* it avoids some of the resolution quirks of `npm link`

From this repository:

```bash
npm run build
npm pack
```

This creates a tarball such as `ignfab-gpf-schema-store-0.3.0.tgz`.

Then, from your local `geocontext` checkout:

```bash
cd /path/to/geocontext
npm install /path/to/gpf-schema-store/ignfab-gpf-schema-store-0.3.0.tgz
npm run build
npm test
```

When you make a new change in `gpf-schema-store`, rebuild and regenerate the tarball, then reinstall it in `geocontext`.

If you only want to test locally without updating `package.json`, use `--no-save`:

```bash
npm install --no-save /path/to/gpf-schema-store/ignfab-gpf-schema-store-0.3.0.tgz
```

If you already installed the local tarball with a saved dependency, restore the published dependency afterwards:

```bash
npm install @ignfab/gpf-schema-store@^0.3.0
```

Using a direct local path like `npm install ../gpf-schema-store` can work too, but it is less predictable because it depends on the local package state and requires extra care to keep `dist/` up to date.
