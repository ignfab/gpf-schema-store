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

### Check local overwrites

Compare local WFS snapshots stored in `data/wfs` with local overwrite files in `data/overwrites`.

```bash
# check that overwrites are aligned with local snapshots in data/wfs
npx gpf-schema-store check-overwrites
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

### Tester la recherche locale

La commande `search` permet d'inspecter rapidement les résultats fournis par le moteur de recherche avec ses options par défaut.

```bash
# afficher les 5 premiers résultats
npx gpf-schema-store search chef lieu commune --limit 5

# autre exemple
npx gpf-schema-store search bdtopo batiment --limit 3
```

La sortie affiche l'identifiant de la collection, son titre et le score calculé par le moteur, ce qui permet de comparer facilement le comportement avant/après un changement de ranking.

## License

[MIT](LICENSE)
