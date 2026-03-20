export async function extractNameplateData(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/extract-nameplate", {
    method: "POST",
    body: formData,
  });

  const text = await response.text();

  if (!response.ok) {
    let message = "Failed to extract nameplate data.";
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
}
