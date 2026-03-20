export async function extractNameplateData(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/extract-nameplate", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to extract data");
  }

  return await res.json();
}
