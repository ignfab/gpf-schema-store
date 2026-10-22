# Overwrite format

Overwrite files live in `data/overwrites/{namespace}/{name}.json`. The current format does not contain root `id`, `namespace`, or `name`; those values are derived from the WFS snapshot and file path.

```json
{
  "title": "Point de repère",
  "x-ign-theme": "Transport",
  "description": "Point créé par le gestionnaire du réseau routier...",
  "x-ign-selectionCriteria": "Les objets Point de repère retenus sont...",
  "x-ign-representedFeatures": ["Point de repère routier"],
  "properties": [
    {
      "name": "cote",
      "type": "string",
      "title": "Côté",
      "description": "Côté de la route...",
      "oneOf": [
        {
          "const": "D",
          "title": "D",
          "description": "Chaussée droite."
        }
      ]
    }
  ],
  "required": ["cleabs", "geometrie"]
}
```

The overwrite `type` field is accepted as overwrite input only. The merged catalog always keeps the WFS property type.

## Traceability (`x-ign-sources`, `x-ign-generated`)

Two optional root fields keep track of how an overwrite was written. They are kept in `data/overwrites` only (traceability for the maintainers) and are **not propagated** to `data/catalog`.

```json
{
  "title": "Potentiel solaire sur toiture (méthode simplifiée)",
  "x-ign-sources": [
    {
      "title": "Métadonnée de produit - Potentiel solaire photovoltaïque sur bâtiment (CEREMA)",
      "path": "https://cerema.box.com/shared/static/geukigd7e5b0gv1jb5rwk85lj407klz9.pdf",
      "version": "2023"
    }
  ],
  "x-ign-generated": {
    "by": "ai",
    "tool": "Claude Code (claude-opus-5-5)",
    "date": "2026-10-21",
    "reviewed": {
      "by": "mborne",
      "date": "2026-10-21"
    }
  }
}
```

* `x-ign-sources` (optional) : sources used to write the schema, inspired by the [Frictionless Data Package `sources`](https://datapackage.org/standard/data-package/#sources) property (collection level only) :
  * `title` (required) : title of the source
  * `path` (required) : URL of the source
  * `version` (optional) : version / vintage of the source
* `x-ign-generated` (optional) : how the overwrite was produced (missing => unknown / legacy) :
  * `by` (required) : `ai` or `human`
  * `tool` (optional) : the tool / model used when `by` is `ai`
  * `date` (optional) : generation date (`YYYY-MM-DD`)
  * `reviewed` (optional) : `{ by, date? }` when a human reviewed the content (missing => not reviewed)
