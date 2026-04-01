# gpf-schema-store

> Work in progress (see [ROADMAP](/wiki))

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

### Build

```bash
npm install
npm run build
```

### Test 

```bash
npm run test
```

### Scrap data from GPF WFS

Fetch WFS schemas from GPF, apply namespace filtering rules from `data/namespace-filters.yaml`, then regenerate `data/wfs`.

```bash
# download data/wfs/{namespace}/{name}.json
npx gpf-schema-store update
```

### Generate namespace report

Generate `data/namespaces.csv` to review every discovered namespace, its computed metadata (`product`, `ignored`, `ignoredReason`), and its collections.

```bash
# generate data/namespaces.csv
npx gpf-schema-store update-namespaces
```

### Configure namespace filtering

Edit `data/namespace-filters.yaml` to decide which namespaces are kept or ignored and to assign metadata (`product`, `ignoredReason`) using first-match-wins rules.

See [data/namespace-filters.yaml](data/namespace-filters.yaml)

## License

[MIT](LICENSE)
