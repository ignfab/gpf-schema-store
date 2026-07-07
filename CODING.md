# Coding

## Data Organization

* [data/namespace-filters.yaml](data/namespace-filters.yaml) : filter configuration of the WFS namespaces.
* [data/namespaces.csv](data/namespaces.csv) : overview of the selected namespaces.
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

### Configure filtering

Edit [data/namespace-filters.yaml](data/namespace-filters.yaml) to decide which namespaces are kept or ignored and to assign metadata (`ignored`, `product`, `ignoredReason`) using first-match-wins rules.


### Update data

> [!TIP]
> `npm run update:all` runs the full data refresh workflow described below: it regenerates the namespace report, updates source schemas from WFS, and rebuilds the catalog files.

#### Generate namespace report

Update [data/namespaces.csv](data/namespaces.csv) to review every discovered namespace, its computed metadata (`product`, `ignored`, `ignoredReason`), and its collections:

```bash
# generate data/namespaces.csv overview
npm run update:namespaces
```

#### Update source schema

Regenerate the `data/wfs` directory by fetching schemas from [data.geopf.fr/wfs](https://data.geopf.fr/wfs?service=WFS&request=GetCapabilities) and applying filter rules defined in [data/namespace-filters.yaml](data/namespace-filters.yaml) :

```bash
# download data/wfs/{namespace}/{name}.json
npm run update:source
```

### Render collection schema files

Regenerate the `data/catalog` directory by applying `data/overwrites` to schemas from `data/wfs` :

```bash
# generate data/catalog/{namespace}/{name}.json
npm run update:catalog
```

Note that each rendered file is a JSON Schema object with `$schema`, `x-collection-id`, `type`, `title`, `description`, `properties`, and `required`, plus optional `x-ign-*` metadata fields (`x-ign-theme`, `x-ign-selectionCriteria`, `x-ign-representedFeatures`) when available. Geometry properties are represented with `format: "geometry-{type}"` and `x-ogc-role: "primary-geometry"`. The BDTOPO identifier property `cleabs` is annotated with `x-ogc-role: "id"`.

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

This creates a tarball such as `ignfab-gpf-schema-store-0.2.0.tgz`.

Then, from your local `geocontext` checkout:

```bash
cd /path/to/geocontext
npm install /path/to/gpf-schema-store/ignfab-gpf-schema-store-0.2.0.tgz
npm run build
npm test
```

When you make a new change in `gpf-schema-store`, rebuild and regenerate the tarball, then reinstall it in `geocontext`.

If you only want to test locally without updating `package.json`, use `--no-save`:

```bash
npm install --no-save /path/to/gpf-schema-store/ignfab-gpf-schema-store-0.2.0.tgz
```

If you already installed the local tarball with a saved dependency, restore the published dependency afterwards:

```bash
npm install @ignfab/gpf-schema-store@^0.2.0
```

Using a direct local path like `npm install ../gpf-schema-store` can work too, but it is less predictable because it depends on the local package state and requires extra care to keep `dist/` up to date.
