"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import AppLayout from "../../../components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6" };

export default function ImportCertificatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) { router.push("/login"); return; }
    setUser(data.user);
    setLoading(false);
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!file) { alert("Please select a file"); return; }
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("certificates").upload(fileName, file);
      if (uploadError) throw uploadError;
      alert("✅ Certificate imported successfully!");
      router.push("/certificates");
    } catch (error) {
      alert("Error uploading certificate: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div style={{ marginBottom:"2rem" }}>
        <a href="/certificates" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Certificates</a>
        <h1 style={{ fontSize:"clamp(20px,5vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>Import Certificate</h1>
        <p style={{ color:"#64748b", margin:0, fontSize:13 }}>Upload an existing PDF certificate</p>
      </div>

      <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"clamp(16px,4vw,24px)" }}>
        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={{
            border:`2px dashed ${dragActive ? C.purple : "rgba(124,92,252,0.3)"}`,
            borderRadius:12, padding:"3rem 2rem", textAlign:"center",
            background: dragActive ? "rgba(124,92,252,0.1)" : "rgba(255,255,255,0.02)",
            cursor:"pointer", transition:"all 0.3s", marginBottom:"2rem",
          }}>
          <div style={{ fontSize:40, marginBottom:"1rem" }}>📄</div>
          <p style={{ fontSize:"clamp(14px,3vw,16px)", fontWeight:700, color:"#fff", margin:"0 0 8px" }}>Drag & drop your PDF here</p>
          <p style={{ fontSize:12, color:"#64748b", margin:"0 0 1.5rem" }}>or click to select file</p>
          <input type="file" accept=".pdf" onChange={e=>setFile(e.target.files?.[0]||null)} style={{ display:"none" }} id="file-input" />
          <label htmlFor="file-input" style={{
            display:"inline-block", padding:"10px 24px", borderRadius:10,
            background:`linear-gradient(135deg,${C.purple},${C.blue})`,
            color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit",
          }}>Choose File</label>
        </div>

        {/* File Selected */}
        {file && (
          <div style={{ background:"rgba(0,245,196,0.1)", border:"1px solid rgba(0,245,196,0.3)", borderRadius:12, padding:"1.5rem", marginBottom:"2rem" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:14, fontWeight:700, color:"#fff", margin:"0 0 4px" }}>📄 {file.name}</p>
                <p style={{ fontSize:11, color:"#64748b", margin:0 }}>{(file.size/1024/1024).toFixed(2)} MB</p>
              </div>
              <button onClick={()=>setFile(null)} style={{
                padding:"8px 14px", borderRadius:8, cursor:"pointer",
                background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
                color:C.pink, fontWeight:600, fontSize:12, fontFamily:"inherit", whiteSpace:"nowrap",
              }}>Remove</button>
            </div>
          </div>
        )}

        <button onClick={handleUpload} disabled={!file || uploading} style={{
          width:"100%", padding:"12px", borderRadius:10,
          cursor: !file || uploading ? "not-allowed" : "pointer",
          background:`linear-gradient(135deg,${C.green},${C.blue})`,
          border:"none", color:"#fff", fontWeight:700, fontSize:14,
          fontFamily:"inherit", opacity: !file || uploading ? 0.6 : 1,
        }}>{uploading ? "⏳ Uploading..." : "📤 Upload Certificate"}</button>
      </div>
    </AppLayout>
  );
}
