import { supabase } from "@/lib/supabaseClient";

export async function createCertificate(assetId,data,currentUserId){

  const {data:asset,error:assetError}=await supabase
  .from("assets")
  .select(`
    id,
    equipment_id,
    equipment_description,
    location,
    equipment_status,
    clients(company_name),
    asset_nameplate(swl,mawp)
  `)
  .eq("id",assetId)
  .single();

  if(assetError) throw assetError;

  const nameplate = asset.asset_nameplate?.[0] || {};

  const payload = {

    asset_id:asset.id,
    certificate_number:data.certificate_number,
    certificate_type:data.certificate_type,

    company:asset.clients?.company_name || "",

    equipment_description:asset.equipment_description,
    equipment_location:asset.location,
    equipment_id:asset.equipment_id,

    swl:nameplate.swl || "",
    mawp:nameplate.mawp || "",

    equipment_status:asset.equipment_status,

    issued_at:new Date().toISOString(),
    valid_to:data.valid_to,

    legal_framework:data.legal_framework,
    inspector_name:data.inspector_name,

    issued_by:currentUserId,
    created_by:currentUserId

  };

  const {data:result,error}=await supabase
  .from("certificates")
  .insert([payload])
  .select()
  .single();

  if(error) throw error;

  return result;

}
