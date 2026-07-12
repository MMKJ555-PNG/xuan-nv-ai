function normalizeModel(model) {
  if (!model || typeof model.id !== "string") return null;
  const id = model.id.trim();
  return id ? { ...model, id } : null;
}

function uniqueModels(models) {
  const seen = new Set();
  return models.reduce((result, model) => {
    const normalized = normalizeModel(model);
    if (!normalized || seen.has(normalized.id)) return result;
    seen.add(normalized.id);
    result.push(normalized);
    return result;
  }, []);
}

export function clearRemoteModels(models) {
  return uniqueModels(models).filter((model) => model.source !== "remote");
}

export function selectRemoteModels(existingModels, candidates, selectedIds) {
  const manualModels = clearRemoteModels(existingModels);
  const occupiedIds = new Set(manualModels.map((model) => model.id));
  const selected = new Set([...selectedIds].map((id) => id.trim()));
  const remoteModels = uniqueModels(candidates).filter((model) => {
    if (!selected.has(model.id) || occupiedIds.has(model.id)) return false;
    occupiedIds.add(model.id);
    return true;
  });
  return [...manualModels, ...remoteModels.map((model) => ({ ...model, source: "remote" }))];
}

export function reconcileActiveModels(models, textModel, imageModel) {
  const ids = new Set(models.map((model) => model.id));
  return {
    textModel: ids.has(textModel) ? textModel : "",
    imageModel: ids.has(imageModel) ? imageModel : "",
  };
}
