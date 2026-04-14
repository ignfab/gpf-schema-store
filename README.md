# gpf-schema-store

> Work in progress (see [ROADMAP](https://github.com/ignfab/gpf-schema-store/wiki))

**Non official / experimental** implementation of [OGC API Features - schema](https://portal.ogc.org/files/108199) by enriching information from the Geoplateforme WFS to ease data discovery by AI (and humans).

## Data model

The data model is :

* **id** : WFS GetCap FeatureType `<Name>` (namespace:name = unique identifier) 
* **namespace** : namespace identifier (e.g `BDTOPO_V3`)
* **name** : name identifier (e.g `batiment`)
* **title** : WFS GetCap `<Title>` "BDTOPO : Bâtiments"
* **description** : WFS GetCap `<Abstract>`
* **properties** : Array of property defined by `name`, `type`, `title` and `description`. `enum` is also available when necessary.

When merged with `data/overwrites`, title and description are overwriten when available.

## Usage

> **WARNING**: The MCP [ignfab/geocontext](https://github.com/ignfab/geocontext) relies on a published version. The following instructions are related to the maintenance of the schema.

### Build

```bash
npm install
npm run build
```

### Test 

```bash
# To run unit test only :
npm run test

# To compute coverage :
npm run test:coverage

# To run integration test on https://data.geopf.fr/wfs
npm run test:all
```

### Configure filtering

Edit [data/namespace-filters.yaml](data/namespace-filters.yaml) to decide which namespaces are kept or ignored and to assign metadata (`product`, `ignoredReason`) using first-match-wins rules.

### Generate namespace report

Update [data/namespaces.csv](data/namespaces.csv) to review every discovered namespace, its computed metadata (`product`, `ignored`, `ignoredReason`), and its collections :

```bash
npx gpf-schema-store update-namespaces
```

### Scrap data from GPF WFS

Fetch WFS schemas from GPF, apply the namespace filtering rules defined in [data/namespace-filters.yaml](data/namespace-filters.yaml), and regenerate `data/wfs` directory :

```bash
# download data/wfs/{namespace}/{name}.json
npx gpf-schema-store update
```

### Check local overwrites

Compare local WFS snapshots stored in `data/wfs` with local overwrite files in `data/overwrites`.

```bash
# check that overwrites are aligned with local snapshots in data/wfs
npx gpf-schema-store check-overwrites
```


### Test local search

Use the `search` command to quickly inspect the results returned by the search engine with its default options.

```bash
# display the top 5 results
npx gpf-schema-store search chef lieu commune --limit 5

# another example
npx gpf-schema-store search bdtopo batiment --limit 3
```

The output shows the collection identifier, the computed score, and MiniSearch match details, which makes it easier to compare ranking behavior before and after a search change.

### Render merged catalog files

Useful for debugging : Write the final merged collection JSON files, as seen by the local catalog after applying `data/overwrites`, to an output directory.

```bash
# write merged files to ./tmp/catalog/{namespace}/{name}.json
npx gpf-schema-store render-catalog ./tmp/catalog

# start from a clean output directory
npx gpf-schema-store render-catalog ./tmp/catalog --clean
```

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

This creates a tarball such as `ignfab-gpf-schema-store-0.1.0.tgz`.

Then, from your local `geocontext` checkout:

```bash
cd /path/to/geocontext
npm install /path/to/gpf-schema-store/ignfab-gpf-schema-store-0.1.0.tgz
npm run build
npm test
```

When you make a new change in `gpf-schema-store`, rebuild and regenerate the tarball, then reinstall it in `geocontext`.

If you only want to test locally without updating `package.json`, use `--no-save`:

```bash
npm install --no-save /path/to/gpf-schema-store/ignfab-gpf-schema-store-0.1.0.tgz
```

If you already installed the local tarball with a saved dependency, restore the published dependency afterwards:

```bash
npm install @ignfab/gpf-schema-store@^0.1.0
```

Using a direct local path like `npm install ../gpf-schema-store` can work too, but it is less predictable because it depends on the local package state and requires extra care to keep `dist/` up to date.

## License

[MIT](LICENSE)
