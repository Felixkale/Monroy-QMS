async function handleSubmit() {
  if (!form.tag || !form.type || !form.client) {
    alert("Please fill in all required fields (Tag, Type, Client)");
    return;
  }

  setUploading(true);
  try {
    // Check if equipment already exists
    const { data: existing, error: checkError } = await supabase
      .from("equipment")
      .select("tag")
      .eq("tag", form.tag)
      .single();

    if (existing) {
      alert("Equipment with this tag already exists");
      setUploading(false);
      return;
    }

    // Insert new equipment
    const { data, error } = await supabase
      .from("equipment")
      .insert([{
        tag: form.tag.toUpperCase(),
        serial: form.serial,
        type: form.type,
        client: form.client,
        manufacturer: form.manufacturer,
        model: form.model,
        year: form.year ? parseInt(form.year) : null,
        location: form.location,
        status: form.status,
        nameplate: {
          designCode: form.designCode,
          designPressure: form.designPressure,
          testPressure: form.testPressure,
          designTemp: form.designTemp,
          material: form.material,
          capacity: form.capacity,
          mawp: form.mawp,
          shellThickness: form.shellThickness,
          headThickness: form.headThickness,
          corrosionAllowance: form.corrosionAllowance,
          jointEfficiency: form.jointEfficiency,
          mdmt: form.mdmt,
          reliefValve: form.reliefValve,
          workingPressure: form.workingPressure,
          steamCapacity: form.steamCapacity,
          heatingSurface: form.heatingSurface,
          fuelType: form.fuelType,
          swl: form.swl,
          proofLoad: form.proofLoad,
          ropeDetails: form.ropeDetails,
          hookSerial: form.hookSerial,
          receiverVolume: form.receiverVolume,
          reliefSetting: form.reliefSetting,
          compressorCapacity: form.compressorCapacity,
        },
        photos: form.photos.map(p => ({ name: p.name, url: p.url })),
        documents: form.documents.map(d => ({ name: d.name, url: d.url })),
      }]);

    if (error) {
      console.error("Insert error:", error);
      alert(`Error: ${error.message}`);
      return;
    }

    alert("Equipment registered successfully!");
    setSubmitted(true);
  } catch (error) {
    console.error("Error:", error);
    alert("Error registering equipment: " + error.message);
  } finally {
    setUploading(false);
  }
}
