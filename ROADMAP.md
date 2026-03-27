
# ROADMAP

## MVP

* [x] Scrap GetCapabilities and DescribeFeatureType from 
* [x] Allow overwrites and completions (`src/data/BDTOPO_V3/batiment.(json|yaml)` with [bdtopoexplorer.ign.fr - batiment](https://bdtopoexplorer.ign.fr/?id_theme=61&id_classe=331) data)
* [ ] Lightweight search engine (`search(q: string)` based on MiniSearch for the MCP [ignfab/geocontext](https://github.com/ignfab/geocontext)

## To prepare GPF integration

To illustrate the expected service at GPF level :

* [ ] Lightweight API
  * [ ] Get all collections (`/api/collections`)
  * [ ] Get collections by namespace (aka serie) (`/api/collections?namespace=BDTOPO_V3`)
  * [ ] Get collections by id (`/api/collections/{id}`)
  * [ ] Search collection (`/api/collections/search?q={text}`)
* [ ] A React front to explores types (and note that both AI and humans would like a "search form")

