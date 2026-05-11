/**
 * Replace each "Response X" label in the given text with its de-anonymized
 * model short name, wrapped in markdown bold (`**name**`). When
 * `labelToModel` is missing, the text is returned unchanged.
 *
 * The "short name" is the segment after the publisher prefix
 * (`openai/gpt-5.1` → `gpt-5.1`); model IDs without a slash use the full ID.
 */
export function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}
