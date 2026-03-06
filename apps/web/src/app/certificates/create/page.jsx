"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

export default function CreateCertificatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Equipment, 3: Inspector, 4: Preview
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signatureRef = useRef(null);
  const canvasRef = useRef(null);

  const [formData, setFormData] = useState({
    // Basic Info
    certificateNumber: `CERT-${Date.now()}`,
    certificateType: "Load Test Certificate",
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "issued",

    // Equipment
    equipmentDescription: "",
    equipmentLocation: "",
    identificationNumber: "",
    swl: "",
    mawp: "",
    equipmentStatus: "pass",

    // Company/Client
    company: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",

    // Inspector
    inspectorName: "",
    inspectorID: "",
    inspectorEmail: "",
    inspectorPhone: "",
    inspectorSignature: null,

    // Legal Framework
    legalFramework: "Mines and Quarries Act CAP 4.4:02, Factories Act 44.01, Machinery and Related Industries Safety and Health Regulations",
  });

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
    setLoading(false);
  }

  function startSignaturePad() {
    setShowSignaturePad(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#333';

      let isDrawing = false;

      canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
      });

      canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
      });

      canvas.addEventListener('mouseup', () => isDrawing = false);
      canvas.addEventListener('mouseout', () => isDrawing = false);
    }, 100);
  }

  function saveSignature() {
    const signature = canvasRef.current.toDataURL();
    setFormData({ ...formData, inspectorSignature: signature });
    setShowSignaturePad(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleCreateCertificate() {
    try {
      const { error } = await supabase
        .from('certificates')
        .insert([{
          certificate_number: formData.certificateNumber,
          certificate_type: formData.certificateType,
          issued_at: new Date(formData.issueDate).toISOString(),
          valid_to: formData.expiryDate,
          status: formData.status,
          legal_framework: formData.legalFramework,
        }]);

      if (error) throw error;

      alert("✅ Certificate created successfully!");
      router.push("/certificates");
    } catch (error) {
      alert("Error creating certificate: " + error.message);
    }
  }

  if (loading) return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div style={{ marginBottom:"2rem" }}>
        <a href="/certificates" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Certificates</a>
        <h1 style={{ fontSize:"clamp(20px,5vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
          Create New Certificate
        </h1>
        <p style={{ color:"#64748b", margin:0, fontSize:13 }}>Step {step} of 4</p>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom:"2rem" }}>
        <div style={{
          display:"flex", gap:"0.5rem", marginBottom:"1rem"
        }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{
              flex:1, height:"4px", borderRadius:"2px",
              background: s <= step ? C.purple : "rgba(255,255,255,0.1)",
              transition:"all 0.3s",
            }}/>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, padding:"clamp(16px,4vw,24px)",
        }}>
          <h2 style={{ fontSize:"clamp(16px,3vw,20px)", fontWeight:700, margin:"0 0 20px", color:"#fff" }}>
            Basic Information
          </h2>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:"1.5rem" }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Certificate Number
              </label>
              <input
                value={formData.certificateNumber}
                onChange={e => setFormData({...formData, certificateNumber: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Certificate Type
              </label>
              <select
                value={formData.certificateType}
                onChange={e => setFormData({...formData, certificateType: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", cursor:"pointer",
                }}
              >
                <option>Load Test Certificate</option>
                <option>Equipment Certification</option>
                <option>ISO Certification</option>
                <option>Compliance Certificate</option>
              </select>
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={e => setFormData({...formData, issueDate: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", cursor:"pointer",
                }}
              >
                <option value="issued">Issued</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Equipment Details */}
      {step === 2 && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, padding:"clamp(16px,4vw,24px)",
        }}>
          <h2 style={{ fontSize:"clamp(16px,3vw,20px)", fontWeight:700, margin:"0 0 20px", color:"#fff" }}>
            Equipment Details
          </h2>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:"1.5rem" }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Equipment Description
              </label>
              <input
                value={formData.equipmentDescription}
                onChange={e => setFormData({...formData, equipmentDescription: e.target.value})}
                placeholder="e.g., Bottle Jack, Pressure Vessel, Boiler"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Equipment Location
              </label>
              <input
                value={formData.equipmentLocation}
                onChange={e => setFormData({...formData, equipmentLocation: e.target.value})}
                placeholder="e.g., Khoemacau Mine"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Identification Number
              </label>
              <input
                value={formData.identificationNumber}
                onChange={e => setFormData({...formData, identificationNumber: e.target.value})}
                placeholder="e.g., B&E 001"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                SWL (Safe Working Load)
              </label>
              <input
                value={formData.swl}
                onChange={e => setFormData({...formData, swl: e.target.value})}
                placeholder="e.g., 50 TON"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                MAWP (Maximum Allowable Working Pressure)
              </label>
              <input
                value={formData.mawp}
                onChange={e => setFormData({...formData, mawp: e.target.value})}
                placeholder="e.g., 10 bar"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Equipment Status
              </label>
              <select
                value={formData.equipmentStatus}
                onChange={e => setFormData({...formData, equipmentStatus: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", cursor:"pointer",
                }}
              >
                <option value="pass">Pass</option>
                <option value="conditional">Conditional</option>
                <option value="fail">Fail</option>
              </select>
            </div>

            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Company
              </label>
              <input
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                placeholder="e.g., B&E International"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Contact Person
              </label>
              <input
                value={formData.contactPerson}
                onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Inspector Details */}
      {step === 3 && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, padding:"clamp(16px,4vw,24px)",
        }}>
          <h2 style={{ fontSize:"clamp(16px,3vw,20px)", fontWeight:700, margin:"0 0 20px", color:"#fff" }}>
            Inspector Information & Signature
          </h2>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:"1.5rem", marginBottom:"2rem" }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Inspector Name
              </label>
              <input
                value={formData.inspectorName}
                onChange={e => setFormData({...formData, inspectorName: e.target.value})}
                placeholder="e.g., Moemedi Masupe"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Inspector ID Number
              </label>
              <input
                value={formData.inspectorID}
                onChange={e => setFormData({...formData, inspectorID: e.target.value})}
                placeholder="e.g., 700117910"
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Inspector Email
              </label>
              <input
                type="email"
                value={formData.inspectorEmail}
                onChange={e => setFormData({...formData, inspectorEmail: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase" }}>
                Inspector Phone
              </label>
              <input
                type="tel"
                value={formData.inspectorPhone}
                onChange={e => setFormData({...formData, inspectorPhone: e.target.value})}
                style={{
                  width:"100%", padding:"11px 14px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:10, color:"#e2e8f0", fontSize:13, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>
          </div>

          {/* Signature Pad */}
          <div style={{
            background:"rgba(0,245,196,0.05)", border:"1px solid rgba(0,245,196,0.2)",
            borderRadius:12, padding:"1.5rem", marginBottom:"1.5rem",
          }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:"#fff", margin:"0 0 1rem" }}>Inspector Signature</h3>

            {!showSignaturePad ? (
              <div>
                {formData.inspectorSignature ? (
                  <div>
                    <img src={formData.inspectorSignature} alt="Signature" style={{
                      maxWidth:"200px", height:"auto", borderRadius:8, marginBottom:"1rem"
                    }} />
                    <div style={{ display:"flex", gap:"0.75rem" }}>
                      <button onClick={() => setShowSignaturePad(true)} style={{
                        padding:"10px 16px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                        background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
                        color:C.purple, fontWeight:600, fontSize:12,
                      }}>✏️ Redraw</button>
                      <button onClick={() => setFormData({...formData, inspectorSignature: null})} style={{
                        padding:"10px 16px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                        background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
                        color:C.pink, fontWeight:600, fontSize:12,
                      }}>🗑️ Clear</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={startSignaturePad} style={{
                    width:"100%", padding:"40px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                    background:"rgba(0,245,196,0.1)", border:"2px dashed rgba(0,245,196,0.3)",
                    color:C.green, fontWeight:600, fontSize:14,
                  }}>
                    ✍️ Click to Sign
                  </button>
                )}
              </div>
            ) : (
              <div>
                <canvas ref={canvasRef} style={{
                  width:"100%", height:"200px", border:"1px solid rgba(255,255,255,0.2)",
                  borderRadius:8, background:"rgba(255,255,255,0.02)", cursor:"crosshair",
                  display:"block", marginBottom:"1rem",
                }} />
                <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
                  <button onClick={saveSignature} style={{
                    padding:"10px 20px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                    background:`linear-gradient(135deg,${C.green},${C.blue})`, border:"none",
                    color:"#fff", fontWeight:600, fontSize:12,
                  }}>✓ Save Signature</button>
                  <button onClick={clearSignature} style={{
                    padding:"10px 20px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                    color:"#94a3b8", fontWeight:600, fontSize:12,
                  }}>Clear Canvas</button>
                  <button onClick={() => setShowSignaturePad(false)} style={{
                    padding:"10px 20px", borderRadius:8, cursor:"pointer", fontFamily:"inherit",
                    background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
                    color:C.pink, fontWeight:600, fontSize:12,
                  }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 4 && (
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, padding:"clamp(16px,4vw,24px)",
        }}>
          <h2 style={{ fontSize:"clamp(16px,3vw,20px)", fontWeight:700, margin:"0 0 20px", color:"#fff" }}>
            Preview Certificate
          </h2>

          {/* Certificate Preview */}
          <div style={{
            background:"white", color:"#333", borderRadius:12, padding:"2rem", marginBottom:"2rem",
            overflow:"auto",
          }}>
            <div style={{ textAlign:"center", marginBottom:"2rem", borderBottom:"3px solid #667eea", paddingBottom:"1rem" }}>
              <h1 style={{ color:"#667eea", fontSize:24, margin:"0 0 8px" }}>CERTIFICATE OF COMPLIANCE</h1>
              <p style={{ color:"#666", margin:0, fontSize:12 }}>Monroy QMS Platform</p>
            </div>

            {/* Certificate Details Table */}
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"1.5rem" }}>
              <tbody>
                {[
                  { label:"Certificate Number", value:formData.certificateNumber },
                  { label:"Certificate Type", value:formData.certificateType },
                  { label:"Issue Date", value:formData.issueDate },
                  { label:"Expiry Date", value:formData.expiryDate },
                  { label:"Status", value:formData.status.toUpperCase() },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"10px", background:"#f9f9f9", fontWeight:600, width:"35%", fontSize:12 }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"10px", fontSize:12 }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Equipment Information */}
            <h3 style={{ fontSize:13, fontWeight:600, color:"#667eea", margin:"1.5rem 0 1rem", textTransform:"uppercase" }}>
              Equipment Information
            </h3>
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"1.5rem" }}>
              <tbody>
                {[
                  { label:"Description", value:formData.equipmentDescription },
                  { label:"Location", value:formData.equipmentLocation },
                  { label:"Identification", value:formData.identificationNumber },
                  { label:"SWL", value:formData.swl },
                  { label:"MAWP", value:formData.mawp },
                  { label:"Status", value:formData.equipmentStatus.toUpperCase() },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"10px", background:"#f9f9f9", fontWeight:600, width:"35%", fontSize:12 }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"10px", fontSize:12 }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Company Information */}
            <h3 style={{ fontSize:13, fontWeight:600, color:"#667eea", margin:"1.5rem 0 1rem", textTransform:"uppercase" }}>
              Company Information
            </h3>
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"1.5rem" }}>
              <tbody>
                {[
                  { label:"Company", value:formData.company },
                  { label:"Contact Person", value:formData.contactPerson },
                  { label:"Email", value:formData.contactEmail },
                  { label:"Phone", value:formData.contactPhone },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"10px", background:"#f9f9f9", fontWeight:600, width:"35%", fontSize:12 }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"10px", fontSize:12 }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Inspector Information */}
            <h3 style={{ fontSize:13, fontWeight:600, color:"#667eea", margin:"1.5rem 0 1rem", textTransform:"uppercase" }}>
              Inspector Information
            </h3>
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"1.5rem" }}>
              <tbody>
                {[
                  { label:"Inspector Name", value:formData.inspectorName },
                  { label:"Inspector ID", value:formData.inspectorID },
                  { label:"Email", value:formData.inspectorEmail },
                  { label:"Phone", value:formData.inspectorPhone },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"10px", background:"#f9f9f9", fontWeight:600, width:"35%", fontSize:12 }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"10px", fontSize:12 }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signature */}
            {formData.inspectorSignature && (
              <div style={{ marginTop:"2rem", paddingTop:"1rem", borderTop:"1px solid #eee" }}>
                <p style={{ fontSize:11, color:"#666", margin:"0 0 10px", fontWeight:600 }}>Inspector Signature:</p>
                <img src={formData.inspectorSignature} alt="Inspector Signature" style={{
                  maxWidth:"150px", height:"auto"
                }} />
              </div>
            )}

            {/* Legal Framework */}
            <div style={{ marginTop:"2rem", paddingTop:"1rem", borderTop:"1px solid #eee" }}>
              <p style={{ fontSize:11, color:"#666", margin:"0 0 8px", fontWeight:600 }}>Legal Framework:</p>
              <p style={{ fontSize:11, color:"#555", lineHeight:1.6, margin:0 }}>
                {formData.legalFramework}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap", justifyContent:"space-between", marginTop:"2rem" }}>
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          style={{
            padding:"11px 24px", borderRadius:10, cursor:step === 1 ? "not-allowed" : "pointer",
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8", fontWeight:700, fontSize:13, fontFamily:"inherit", opacity:step === 1 ? 0.5 : 1,
          }}
        >
          ← Previous
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            style={{
              padding:"11px 24px", borderRadius:10, cursor:"pointer",
              background:`linear-gradient(135deg,${C.purple},${C.blue})`, border:"none",
              color:"#fff", fontWeight:700, fontSize:13, fontFamily:"inherit",
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleCreateCertificate}
            style={{
              padding:"11px 24px", borderRadius:10, cursor:"pointer",
              background:`linear-gradient(135deg,${C.green},${C.blue})`, border:"none",
              color:"#fff", fontWeight:700, fontSize:13, fontFamily:"inherit",
            }}
          >
            ✓ Create Certificate
          </button>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          h2 { font-size: 16px !important; }
          input, select { font-size: 12px !important; }
          button { font-size: 12px !important; padding: 9px 14px !important; }
          table { font-size: 11px !important; }
          td { padding: 8px !important; }
        }
      `}</style>
    </AppLayout>
  );
}
