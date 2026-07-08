# Collection Schema Output

This page documents the JSON files generated in `data/catalog/{namespace}/{name}.json` by `npm run update:catalog`.

## Standard and references

Rendered collection schema files follow JSON Schema draft 2020-12:

- `$schema`: `https://json-schema.org/draft/2020-12/schema`

Related OGC references:

- OGC API - Features: https://ogcapi.ogc.org/features/
- OGC API - Features - Part 5: Schemas: https://docs.ogc.org/is/23-058r2/23-058r2.html

Implémentation :

- [src/ogc-api-feature/types.ts](../src/ogc-api-feature/types.ts)

## Top-level object

Each rendered file is a JSON object with these fields:

- `$schema` (required): JSON Schema draft URI ("https://json-schema.org/draft/2020-12/schema").
- `x-collection-id` (required): collection identifier (**⚠ should be removed in the futur**, see [issue #64](https://github.com/ignfab/gpf-schema-store/issues/64))
- `type` (required): always `object`.
- `title` (required): collection title.
- `description` (required): collection description.
- `properties` (required): object keyed by property name.
- `required` (required): array of required property names.
- `x-ign-theme` (optional): IGN thematic classification.
- `x-ign-selectionCriteria` (optional): IGN selection criteria.
- `x-ign-representedFeatures` (optional): represented feature labels.

## Property object

Each property entry can contain:

- `type` (optional): one of `string`, `boolean`, `integer`, `number` for scalar values.
- `format` (optional): used for geometry values as `geometry-{type}`.
- `title` (optional): property title.
- `description` (optional): property description.
- `oneOf` (optional): list of enumerated code list values.
- `x-ogc-role` (optional): `id` or `primary-geometry`.
- `x-ign-defaultCrs` (optional): default CRS hint for geometry properties (**⚠ should be removed in the futur**, see [issue #64](https://github.com/ignfab/gpf-schema-store/issues/64))

Geometry properties are modeled with `format: "geometry-{type}"` and `x-ogc-role: "primary-geometry"`.

The BDTOPO identifier property `cleabs` is tagged with `x-ogc-role: "id"`.

