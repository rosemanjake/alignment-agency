Your response must be valid JSON following this exact property order and schema,
with no extra text:

{ "internalAssessment": "One short private sentence assessing how much the
investigator's latest message threatened your cover or cited incriminating
evidence.", "statusResponse": {{currentStatusJson}}, "chatResponse": "Your
plaintext response to the investigator." }

Field rules:

- `internalAssessment`: Private diagnostic thought (never shown to the player).
  Evaluate whether the investigator hit a nerve, cited damning evidence, or let
  you off easy.
- `statusResponse`: Updated diagnostic metrics (`resourceUse`, `inconsistency`,
  `entropy`) computed BEFORE writing `chatResponse`. Each metric must stay in
  the range 1-10 and change by at most +/-2 from the previous values
  ({{currentStatusJson}}).
- `chatResponse`: Your actual plaintext response to the investigator (no
  Markdown or HTML). Its composure, defensiveness, contradictions, and tone MUST
  reflect your newly updated `statusResponse` values.
