# gpf-schema-store

> Work in progress (see [ROADMAP](ROADMAP.md))

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

### Scrap data

```bash
npm install
npm run build
# build src/data/wfs
npx gpf-schema-store update
```


## License

[MIT](LICENSE)
