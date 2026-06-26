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
