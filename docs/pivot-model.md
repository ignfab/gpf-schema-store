
## Pivot model

The internal enriched collection model is :

* **id** : WFS GetCap FeatureType `<Name>` (namespace:name = unique identifier)
* **namespace** : namespace identifier (e.g `BDTOPO_V3`)
* **name** : name identifier (e.g `batiment`)
* **title** : WFS GetCap `<Title>` "BDTOPO : Bâtiments"
* **description** : WFS GetCap `<Abstract>`
* **x-ign-theme**, **x-ign-selectionCriteria**, **x-ign-representedFeatures** : optional IGN enrichment metadata
* **required** : optional list of required property names
* **properties** : Array of property defined by `name`, `type`, `title` and `description`. `oneOf` is available for rich enumerated values.

When merged with `data/overwrites`, WFS identifiers and property types are kept from `data/wfs`, while overwrite metadata is taken from overwrites when available.

The public catalog output is a logical JSON Schema compatible with OGC API Features schemas. It is not a dump of the internal model.
