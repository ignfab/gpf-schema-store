
# ROADMAP

## 0.0.x - PoC

* [x] Scrap GetCapabilities and DescribeFeatureType from https://data.geopf.fr/wfs
* [x] Allow overwrites and completions (`src/data/BDTOPO_V3/batiment.(json|yaml)` with [bdtopoexplorer.ign.fr - batiment](https://bdtopoexplorer.ign.fr/?id_theme=61&id_classe=331) source data)
* [x] Ensure that it improves search at MCP level (see [experiment with MiniSearch on a branch](https://github.com/ignfab/geocontext/blob/07aa15cc6854792df98d014bd40d25c4b981bfb0/src/gpf/wfs.ts#L14-L51))

## 0.1.x - MVP - allow MCP integration

* [ ] Improve data management to ease change detection and overwrite updates : Create unique file for each WFS FeatureType

```
- data/wfs/BDTOPO_V3/batiment.json - JSON result for DescribeFeatureType (to follow changes with git diff)
- data/overwrites/BDTOPO_V3/batiment.json - schema from bdtopo-explorer
- remove data/gpf-collections.json 
```
* [ ] Review available data on [data.geopf.fr](http://data.geopf.fr/wfs) and improve filtering to **keep only relevant ones** (remove gpf publication test datasets, local data,...)
* [ ] Integrate the lightweight search engine (`search(q: string)` based on MiniSearch from the MCP [ignfab/geocontext](https://github.com/ignfab/geocontext)
* [ ] Define a first working strategy for the search (ponderate between datasets, ...)
* [ ] Add functional tests for the search :

```yaml
- query: "bâtiment"
  expected: ["BDTOPO_V3:batiment"]
#...
```

## 0.2.x - use more data source

* [ ] Retrieve keywords from DescribeFeatureType
* [ ] Parse namespace to extract metadata (`"ADMINEXPRESS-COG.2026"` -> `{"product": ADMINEXPRESS-COG", "version": "2026"}`)

<!--
How to retrieve infos about "ADMINEXPRESS-COG"?

Notify cartes.gouv.fr team that it could be useful to have an URL like `https://cartes.gouv.fr/api/products/ADMINEXPRESS-COG` to retrieve metadata (and **ensure it doesn't exists for now** before facing ISO 19115 metadata...)
-->

* [ ] Retrieve relevant informations from ISO 19115 metadata

<details>
<summary>=>ISO 19115 is not trivial!</summary>

- See [IGNF/validator - doc/metadata.md](https://github.com/IGNF/validator/blob/master/doc/metadata.md) for the model
- See MetadataURL in GetCapabilities for the links :

```bash
curl -sS "https://data.geopf.fr/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities" | xmllint --format - | grep MetadataURL
```

</details>

## Prepare Géoplateforme integration

* [ ] **Use an existing metamodel** instead of [src](src/types.ts) to align with validation requirements (**not required** for now as **an LLM doesn't parse data and doesn't care about model changes**)
* [ ] Illustrate the **expected service at Géoplateforme level** with a **Lightweight REST API** :
    * [x] Get all collections (`/api/collections`) - **too fat** for an LLM (seen on GeoServer implementation)
    * [ ] Get collections by id (`/api/collections/{id}`) - **required to allow the MCP to query features**
    * [ ] Search collection (`/api/collections/search?q={text}`) - **required to allow the MCP to find data**
    * [ ] Get collections by namespace (aka serie) (`/api/collections?namespace=BDTOPO_V3`) - not required for MCP

Create a **lightweight UI** to :

* [ ] Display collection grouping by product (personal experiment is available here : https://www.quadtreeworld.net/geekeries/wfs-explorer/)
* [ ] Allow user to **search collection with a form** (as having to use a LLM based tool to find available data is not very eco-friendly...)
