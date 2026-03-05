"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };
const rgbaMap = { [C.green]:"0,245,196",[C.blue]:"79,195,247",[C.purple]:"124,92,252",[C.pink]:"244,114,182",[C.yellow]:"251,191,36" };

const licenseColor = { Valid:C.green, Expiring:C.yellow, Expired:C.pink };

const allEquipment = {
  "PV-0041": {
    tag:"PV-0041", serial:"S-10041", type:"Pressure Vessel", client:"Acme Industrial Corp",
    manufacturer:"ASME Corp", model:"PV-Standard-2020", year:2018, location:"Plant A - Bay 3",
    status:"Active", license:"Valid", licenseExpiry:"2026-06-01",
    photos:[],
    nameplate:{
      designCode:"ASME VIII Div 1", designPressure:"10 bar", testPressure:"15 bar",
      designTemp:"200°C", material:"Carbon Steel", capacity:"500L",
      mawp:"10 bar", shellThickness:"5mm", headThickness:"6mm",
      corrosionAllowance:"2mm", jointEfficiency:"1.0", mdmt:"-20°C",
      reliefValve:"10.5 bar",
    },
    auditTrail:[
      { action:"License Renewed", date:"2025-06-01", user:"Admin", details:"License extended 1 year" },
      { action:"Inspection Completed", date:"2026-03-05", user:"John Smith", details:"Statutory inspection - Pass" },
      { action:"Registered", date:"2022-01-15", user:"Admin", details:"Equipment added to register" },
    ],
    documents:[
      { name:"Nameplate Drawing", type:"PDF", size:"2.4MB", date:"2018-03-15" },
      { name:"Design Certificate", type:"PDF", size:"1.8MB", date:"2018-03-15" },
      { name:"Test Report", type:"PDF", size:"3.2MB", date:"2018-04-01" },
    ],
  },
  "BL-0012": {
    tag:"BL-0012", serial:"S-20012", type:"Boiler", client:"SteelWorks Ltd",
    manufacturer:"ThermTech", model:"BL-2015", year:2015, location:"Plant B - Boiler Room",
    status:"Active", license:"Expiring", licenseExpiry:"2026-04-15",
    photos:[],
    nameplate:{
      workingPressure:"16 bar", steamCapacity:"5000 kg/h", heatingSurface:"150 m²", fuelType:"Natural Gas",
    },
    auditTrail:[
      { action:"Last Inspection", date:"2025-09-15", user:"Sarah Johnson", details:"Annual safety check - Pass" },
    ],
    documents:[],
  },
};

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("overview");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/login");
      return;
    }
    setUser(data.user);
    loadEquipment();
  }

  function loadEquipment() {
    const tag = params.tag;
    const equip = allEquipment[tag];
    if (equip) {
      setEquipment(equip);
    }
    setLoading(false);
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedPhotos = [];

    try {
      for (const file of files) {
        const fileName = `${equipment.tag}-${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from("equipment-photos")
          .upload(fileName, file);
        
        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("equipment-photos")
          .getPublicUrl(fileName);
        
        uploadedPhotos.push({
          name: file.name,
          path: fileName,
          url: urlData.publicUrl,
        });
      }
      
      if (uploadedPhotos.length > 0) {
        setEquipment(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...uploadedPhotos],
        }));
        alert("Photos uploaded successfully!");
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteEquipment() {
    if (confirm(`Delete ${equipment.tag}? This cannot be undone.`)) {
      try {
        const { error } = await supabase
          .from("equipment")
          .delete()
          .eq("tag", equipment.tag);
        
        if (error) throw error;
        alert("Equipment deleted");
        router.push("/equipment");
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  }

  if (loading) {
    return <AppLayout><div style={{ padding:"40px" }}>Loading...</div></AppLayout>;
  }

  if (!equipment) {
    return (
      <AppLayout>
        <div style={{ padding:"40px", textAlign:"center" }}>
          <h2 style={{ color:"#fff" }}>Equipment Not Found</h2>
          <button onClick={() => router.push("/equipment")} style={{
            marginTop:"20px", padding:"10px 20px",
            backgroundColor:"#667eea", color:"white", border:"none",
            borderRadius:"6px", cursor:"pointer",
          }}>Back to Equipment</button>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { id:"overview", label:"Overview", icon:"📊" },
    { id:"nameplate", label:"Nameplate Data", icon:"📋" },
    { id:"photos", label:"Photos", icon:"📷" },
    { id:"documents", label:"Documents", icon:"📁" },
    { id:"audit", label:"Audit Trail", icon:"📜" },
  ];

  const lColor = licenseColor[equipment.license];
  const lRgba = rgbaMap[lColor];

  return (
    <AppLayout>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:28 }}>
        <div>
          <a href="/equipment" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Equipment</a>
          <h1 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
            {equipment.tag}
          </h1>
          <p style={{ color:"#64748b", margin:0, fontSize:13 }}>{equipment.serial} · {equipment.type} · {equipment.client}</p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <a href={`/qr-codes?tag=${equipment.tag}`} style={{
            padding:"9px 16px", borderRadius:10, textDecoration:"none",
            background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)",
            color:"#00f5c4", fontWeight:700, fontSize:12,
          }}>🏷️ QR Code</a>
          <button onClick={() => alert("Edit feature coming soon")} style={{
            padding:"9px 16px", borderRadius:10,
            background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
            color:"#7c5cfc", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
          }}>✏️ Edit</button>
          {user?.email?.includes("admin") && (
            <button onClick={deleteEquipment} style={{
              padding:"9px 16px", borderRadius:10,
              background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
              color:"#f472b6", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit",
            }}>🗑️ Delete</button>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Type", value:equipment.type, color:"#4fc3f7" },
          { label:"Status", value:equipment.status, color:equipment.status==="Active"?"#00f5c4":"#f472b6" },
          { label:"License", value:equipment.license, color:lColor },
          { label:"Year Built", value:equipment.year, color:"#fbbf24" },
        ].map(s=>(
          <div key={s.label} style={{
            background:`rgba(${rgbaMap[s.color]},0.07)`,
            border:`1px solid rgba(${rgbaMap[s.color]},0.25)`,
            borderRadius:14, padding:"16px 18px",
          }}>
            <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:2, marginBottom:20, overflowX:"auto", paddingBottom:2 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"10px 16px", borderRadius:"10px 10px 0 0", fontSize:12, cursor:"pointer",
            fontFamily:"inherit", fontWeight:700, whiteSpace:"nowrap",
            background: tab===t.id ? "rgba(124,92,252,0.2)" : "transparent",
            border:"none", borderBottom: tab===t.id ? `2px solid #7c5cfc` : "2px solid transparent",
            color: tab===t.id ? "#7c5cfc" : "#64748b",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16 }}>
          <div style={{
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
            borderRadius:16, padding:"20px",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{ width:4, height:18, borderRadius:2, background:"#4fc3f7" }}/>
              <span style={{ fontWeight:700, fontSize:14, color:"#fff" }}>Equipment Details</span>
            </div>
            {[
              { label:"Manufacturer", value:equipment.manufacturer },
              { label:"Model", value:equipment.model },
              { label:"Location", value:equipment.location },
              { label:"Client", value:equipment.client },
              { label:"License Expiry", value:equipment.licenseExpiry },
            ].map(f=>(
              <div key={f.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:13 }}>
                <span style={{ color:"#64748b" }}>{f.label}</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{f.value}</span>
              </div>
            ))}
          </div>

          <div style={{
            background:"rgba(255,255,255,0.02)", border:`1px solid rgba(${lRgba},0.2)`,
            borderRadius:16, padding:"20px",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <div style={{ width:4, height:18, borderRadius:2, background:lColor }}/>
              <span style={{ fontWeight:700, fontSize:14, color:"#fff" }}>License Status</span>
            </div>
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ fontSize:48, marginBottom:10 }}>🔐</div>
              <span style={{
                padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:700,
                background:`rgba(${lRgba},0.12)`, color:lColor,
                border:`1px solid rgba(${lRgba},0.3)`,
              }}>{equipment.license}</span>
              <p style={{ color:"#64748b", fontSize:12, marginTop:10 }}>Expires: {equipment.licenseExpiry}</p>
            </div>
          </div>
        </div>
      )}

      {tab==="nameplate" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(79,195,247,0.2)",
          borderRadius:16, padding:"20px",
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:14 }}>
            {Object.entries(equipment.nameplate || {}).map(([key, value]) => (
              <div key={key} style={{
                background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"14px",
              }}>
                <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", marginBottom:4, fontWeight:600 }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="photos" && (
        <div>
          <div style={{ marginBottom:16 }}>
            <label style={{
              display:"block", padding:"20px", borderRadius:10,
              border:"2px dashed rgba(0,245,196,0.3)", background:"rgba(0,245,196,0.03)",
              textAlign:"center", cursor:"pointer", transition:"all 0.25s",
            }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(0,245,196,0.6)"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(0,245,196,0.3)"}>
              <div style={{ fontSize:28, marginBottom:8 }}>📷</div>
              <div style={{ color:"#94a3b8", fontSize:13 }}>Click to upload photos</div>
              <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} disabled={uploading}/>
            </label>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
            {equipment.photos && equipment.photos.length > 0 ? (
              equipment.photos.map((photo, idx) => (
                <div key={idx} style={{
                  aspectRatio:"1", borderRadius:12, background:"rgba(255,255,255,0.08)",
                  border:"1px solid rgba(255,255,255,0.1)", display:"flex",
                  alignItems:"center", justifyContent:"center", overflow:"hidden",
                }}>
                  {photo.url ? (
                    <img src={photo.url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={photo.name}/>
                  ) : (
                    <div style={{ color:"#64748b", textAlign:"center" }}>
                      <div style={{ fontSize:24, marginBottom:4 }}>📸</div>
                      <div style={{ fontSize:10 }}>{photo.name}</div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color:"#64748b", gridColumn:"1/-1", textAlign:"center", padding:"20px" }}>
                No photos uploaded yet
              </div>
            )}
          </div>
        </div>
      )}

      {tab==="documents" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, overflow:"hidden",
        }}>
          {equipment.documents && equipment.documents.length > 0 ? (
            equipment.documents.map((doc, i) => (
              <div key={i} style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"14px 20px", borderBottom: i < equipment.documents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                flexWrap:"wrap", gap:10,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:8, flexShrink:0,
                    background:"rgba(79,195,247,0.12)", display:"flex",
                    alignItems:"center", justifyContent:"center", fontSize:16,
                  }}>📄</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{doc.name}</div>
                    <div style={{ fontSize:11, color:"#64748b" }}>{doc.type} · {doc.size} · {doc.date}</div>
                  </div>
                </div>
                <button style={{
                  padding:"6px 14px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                  fontWeight:600, fontSize:12, background:"rgba(0,245,196,0.1)",
                  border:"1px solid rgba(0,245,196,0.3)", color:"#00f5c4",
                }}>⬇ Download</button>
              </div>
            ))
          ) : (
            <div style={{ padding:"40px", textAlign:"center", color:"#64748b" }}>
              No documents uploaded yet
            </div>
          )}
        </div>
      )}

      {tab==="audit" && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, overflow:"hidden",
        }}>
          {equipment.auditTrail && equipment.auditTrail.length > 0 ? (
            equipment.auditTrail.map((entry, i) => (
              <div key={i} style={{
                display:"flex", alignItems:"flex-start", gap:14, padding:"14px 20px",
                borderBottom: i < equipment.auditTrail.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%", background:"#00f5c4",
                  boxShadow:"0 0 6px #00f5c4", flexShrink:0, marginTop:5,
                }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{entry.action}</div>
                  <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{entry.details}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:11, color:"#64748b" }}>{entry.user}</div>
                  <div style={{ fontSize:10, color:"#475569" }}>{entry.date}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding:"40px", textAlign:"center", color:"#64748b" }}>
              No audit trail available
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
