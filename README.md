# gpf-schema-store

> Work in progress (see [ROADMAP](https://github.com/ignfab/gpf-schema-store/wiki))

**Non official / experimental** implementation of [OGC API Features - schema](https://portal.ogc.org/files/108199) by enriching information from the Geoplateforme WFS to ease data discovery by AI (and humans).

It aims to provide a "semantic layer" for the [MCP geocontext](https://github.com/ignfab/geocontext), pending an equivalent OGC API Features implementation on the Geoplateforme side.

## Installation

```bash
npm install @ignfab/gpf-schema-store
```

## Usage

### Load the catalog

```ts
import { getCollectionCatalog } from "@ignfab/gpf-schema-store";

const catalog = getCollectionCatalog();
```

### List collections

> [!NOTE]
> Not in use the [MCP geocontext](https://github.com/ignfab/geocontext) (using an LLM as a search engine is not efficient)

```ts
const collections = catalog.list();
console.log("collections:", collections.length);
```

> **Long term** : should rely on `GET /collections` from OGC API Feature implementation on the french Géoplateforme

### Get the schema of a collection

> [!NOTE]
> In use in the [MCP geocontext](https://github.com/ignfab/geocontext) to provide the "semantic layer" for the collection 

```ts
// Note : "batiment" = "buildings" in french
const bdtopoBatiment = catalog.getById("BDTOPO_V3:batiment");
console.log(`BDTOPO_V3:batiment schema : ${JSON.stringify(bdtopoBatiment,null,2)}`);
```

> **Long term** : should rely on `GET /collections/{id}/schema` from OGC API Feature - schema implementation on the french Géoplateforme.

### Search collections by keywords

> [!NOTE]
> In use in the [MCP geocontext](https://github.com/ignfab/geocontext) to search for available collections

```ts
// Note "pont" = "bridge" in french
const matches = catalog.search("pont", { limit: 3 });
console.log("top matches:", matches);
```

> **Long term**: it should rely on a search service on the French Geoplateforme that uses schema information (especially enum values), for example `GET /collections/search?q={query}` or an improved version of the current [*Service Géoplateforme de recherche*](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/recherche/).

## Coding

Maintenance and contributor commands are documented in [CODING.md](CODING.md).

## License

[MIT](LICENSE)
