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
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signatureRef = useRef(null);
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const logoInputRef = useRef(null);

  const [formData, setFormData] = useState({
    // Basic Info
    certificateNumber: `CERT-${Date.now().toString().slice(-6)}`,
    certificateType: "Load Test Certificate",
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "issued",

    // Logo
    companyLogo: null,

    // Equipment
    equipmentDescription: "Bottle Jack",
    equipmentLocation: "Khoemacau Mine",
    identificationNumber: "B&E 001",
    swl: "50 TON",
    mawp: "N/A",
    equipmentStatus: "pass",

    // Company/Client
    company: "B&E International",
    contactPerson: "John Smith",
    contactEmail: "contact@be-intl.com",
    contactPhone: "+267 71 450 610",

    // Inspector
    inspectorName: "Moemedi Masupe",
    inspectorID: "700117910",
    inspectorEmail: "moemedi@monroy.com",
    inspectorPhone: "+267 71 450 610",
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

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, companyLogo: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  function removeLogo() {
    setFormData({ ...formData, companyLogo: null });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  }

  function startSignaturePad() {
    setShowSignaturePad(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
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

  function printCertificate() {
    const printWindow = window.open("", "_blank");
    const previewContent = previewRef.current?.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formData.certificateNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; color: #333; line-height: 1.6; }
            .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
            .header { position: relative; text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { position: absolute; top: 0; right: 0; max-width: 100px; max-height: 100px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #667eea; color: white; padding: 10px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .section-title { background: #667eea; color: white; padding: 10px; margin-top: 20px; margin-bottom: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${previewContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  if (loading) return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;

  const equipmentStatusColor = {
    pass: C.green,
    conditional: C.yellow,
    fail: C.pink,
  };

  return (
    <AppLayout>
      <div style={{ marginBottom:"2rem" }}>
        <a href="/certificates" style={{ color:"#64748b", fontSize:13, textDecoration:"none", marginBottom:10, display:"block" }}>← Back to Certificates</a>
        <h1 style={{ fontSize:"clamp(20px,5vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
          Create New Certificate
        </h1>
        <p style={{ color:"#64748b", margin:0, fontSize:13 }}>Fill in the form to generate certificate (preview on right)</p>
      </div>

      <div style={{
        display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(350px, 1fr))", gap:"2rem",
      }}>
        {/* LEFT SIDE: FORM */}
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
          borderRadius:16, padding:"clamp(16px,4vw,24px)", maxHeight:"90vh", overflowY:"auto",
        }}>
          <h2 style={{ fontSize:"clamp(16px,3vw,20px)", fontWeight:700, margin:"0 0 20px", color:"#fff" }}>
            Certificate Details
          </h2>

          {/* Logo Upload Section */}
          <div style={{ marginBottom:"2rem" }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:C.purple, textTransform:"uppercase", marginBottom:12 }}>
              Company Logo
            </h3>
            <div style={{
              background:"rgba(0,245,196,0.05)", border:"2px dashed rgba(0,245,196,0.3)",
              borderRadius:10, padding:"1.5rem", textAlign:"center",
            }}>
              {formData.companyLogo ? (
                <div>
                  <img src={formData.companyLogo} alt="Company Logo" style={{
                    maxWidth:"100px", maxHeight:"100px", marginBottom:"1rem"
                  }} />
                  <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", flexWrap:"wrap" }}>
                    <button onClick={() => logoInputRef.current?.click()} style={{
                      padding:"7px 12px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                      background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
                      color:C.purple, fontWeight:600,
                    }}>Change Logo</button>
                    <button onClick={removeLogo} style={{
                      padding:"7px 12px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                      background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
                      color:C.pink, fontWeight:600,
                    }}>Remove</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:24, marginBottom:"0.5rem" }}>🏢</div>
                  <p style={{ color:"#64748b", fontSize:11, margin:"0 0 1rem" }}>Upload company logo (PNG, JPG, SVG)</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display:"none" }}
                  />
                  <button onClick={() => logoInputRef.current?.click()} style={{
                    padding:"8px 14px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                    background:C.green, border:"none", color:"#000", fontWeight:600,
                  }}>Choose File</button>
                </div>
              )}
            </div>
          </div>

          {/* Basic Info Section */}
          <div style={{ marginBottom:"2rem" }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:C.purple, textTransform:"uppercase", marginBottom:12 }}>
              Basic Information
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase" }}>
                  Certificate Number
                </label>
                <input
                  value={formData.certificateNumber}
                  onChange={e => setFormData({...formData, certificateNumber: e.target.value})}
                  style={{
                    width:"100%", padding:"10px 12px",
                    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                    borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                  }}
                />
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase" }}>
                  Certificate Type
                </label>
                <select
                  value={formData.certificateType}
                  onChange={e => setFormData({...formData, certificateType: e.target.value})}
                  style={{
                    width:"100%", padding:"10px 12px",
                    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                    borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", cursor:"pointer",
                  }}
                >
                  <option>Load Test Certificate</option>
                  <option>Equipment Certification</option>
                  <option>ISO Certification</option>
                  <option>Compliance Certificate</option>
                </select>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase" }}>
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={e => setFormData({...formData, issueDate: e.target.value})}
                    style={{
                      width:"100%", padding:"10px 12px",
                      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                      borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase" }}>
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                    style={{
                      width:"100%", padding:"10px 12px",
                      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                      borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6, textTransform:"uppercase" }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  style={{
                    width:"100%", padding:"10px 12px",
                    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                    borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", cursor:"pointer",
                  }}
                >
                  <option value="issued">Issued</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Equipment Section */}
          <div style={{ marginBottom:"2rem" }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:C.purple, textTransform:"uppercase", marginBottom:12 }}>
              Equipment Details
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <input
                value={formData.equipmentDescription}
                onChange={e => setFormData({...formData, equipmentDescription: e.target.value})}
                placeholder="Equipment Description"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                value={formData.equipmentLocation}
                onChange={e => setFormData({...formData, equipmentLocation: e.target.value})}
                placeholder="Equipment Location"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                value={formData.identificationNumber}
                onChange={e => setFormData({...formData, identificationNumber: e.target.value})}
                placeholder="ID Number"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                value={formData.swl}
                onChange={e => setFormData({...formData, swl: e.target.value})}
                placeholder="SWL (e.g., 50 TON)"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                value={formData.mawp}
                onChange={e => setFormData({...formData, mawp: e.target.value})}
                placeholder="MAWP (e.g., 10 bar)"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <select
                value={formData.equipmentStatus}
                onChange={e => setFormData({...formData, equipmentStatus: e.target.value})}
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", cursor:"pointer",
                }}
              >
                <option value="pass">Pass</option>
                <option value="conditional">Conditional</option>
                <option value="fail">Fail</option>
              </select>
            </div>
          </div>

          {/* Company Section */}
          <div style={{ marginBottom:"2rem" }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:C.purple, textTransform:"uppercase", marginBottom:12 }}>
              Company Information
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <input
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                placeholder="Company Name"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                value={formData.contactPerson}
                onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                placeholder="Contact Person"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                type="email"
                value={formData.contactEmail}
                onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                placeholder="Contact Email"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                placeholder="Contact Phone"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>
          </div>

          {/* Inspector Section */}
          <div style={{ marginBottom:"2rem" }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:C.purple, textTransform:"uppercase", marginBottom:12 }}>
              Inspector Information
            </h3>
            <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <input
                value={formData.inspectorName}
                onChange={e => setFormData({...formData, inspectorName: e.target.value})}
                placeholder="Inspector Name"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                value={formData.inspectorID}
                onChange={e => setFormData({...formData, inspectorID: e.target.value})}
                placeholder="Inspector ID"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                type="email"
                value={formData.inspectorEmail}
                onChange={e => setFormData({...formData, inspectorEmail: e.target.value})}
                placeholder="Inspector Email"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
              <input
                type="tel"
                value={formData.inspectorPhone}
                onChange={e => setFormData({...formData, inspectorPhone: e.target.value})}
                placeholder="Inspector Phone"
                style={{
                  width:"100%", padding:"10px 12px",
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(124,92,252,0.25)",
                  borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
                }}
              />
            </div>
          </div>

          {/* Signature Pad */}
          <div style={{
            background:"rgba(0,245,196,0.05)", border:"1px solid rgba(0,245,196,0.2)",
            borderRadius:12, padding:"1rem", marginBottom:"2rem",
          }}>
            <h3 style={{ fontSize:12, fontWeight:700, color:C.green, margin:"0 0 1rem" }}>Inspector Signature</h3>

            {!showSignaturePad ? (
              <div>
                {formData.inspectorSignature ? (
                  <div>
                    <img src={formData.inspectorSignature} alt="Signature" style={{
                      maxWidth:"150px", height:"auto", borderRadius:8, marginBottom:"0.75rem", border:"1px solid rgba(0,245,196,0.3)"
                    }} />
                    <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                      <button onClick={() => setShowSignaturePad(true)} style={{
                        padding:"7px 12px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                        background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
                        color:C.purple, fontWeight:600,
                      }}>✏️ Redraw</button>
                      <button onClick={() => setFormData({...formData, inspectorSignature: null})} style={{
                        padding:"7px 12px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                        background:"rgba(244,114,182,0.1)", border:"1px solid rgba(244,114,182,0.3)",
                        color:C.pink, fontWeight:600,
                      }}>Clear</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={startSignaturePad} style={{
                    width:"100%", padding:"30px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:12,
                    background:"rgba(0,245,196,0.1)", border:"2px dashed rgba(0,245,196,0.3)",
                    color:C.green, fontWeight:600,
                  }}>
                    ✍️ Click to Sign
                  </button>
                )}
              </div>
            ) : (
              <div>
                <canvas ref={canvasRef} style={{
                  width:"100%", height:"120px", border:"1px solid rgba(255,255,255,0.2)",
                  borderRadius:6, background:"rgba(255,255,255,0.02)", cursor:"crosshair",
                  display:"block", marginBottom:"0.75rem",
                }} />
                <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                  <button onClick={saveSignature} style={{
                    padding:"7px 14px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                    background:C.green, border:"none", color:"#000", fontWeight:600,
                  }}>✓ Save</button>
                  <button onClick={clearSignature} style={{
                    padding:"7px 14px", borderRadius:6, cursor:"pointer", fontFamily:"inherit", fontSize:11,
                    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                    color:"#94a3b8", fontWeight:600,
                  }}>Clear</button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            <button
              onClick={handleCreateCertificate}
              style={{
                flex:1, minWidth:"120px", padding:"11px", borderRadius:10, cursor:"pointer",
                background:`linear-gradient(135deg,${C.green},${C.blue})`, border:"none",
                color:"#fff", fontWeight:700, fontSize:12, fontFamily:"inherit",
              }}
            >
              ✓ Create Certificate
            </button>
            <button
              onClick={() => router.push("/certificates")}
              style={{
                padding:"11px 16px", borderRadius:10, cursor:"pointer",
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                color:"#94a3b8", fontWeight:700, fontSize:12, fontFamily:"inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* RIGHT SIDE: LIVE PREVIEW */}
        <div style={{
          background:"white", color:"#333", borderRadius:16, padding:"clamp(16px,3vw,24px)",
          height:"fit-content", position:"sticky", top:"20px", maxHeight:"90vh", overflowY:"auto",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <h2 style={{ fontSize:14, fontWeight:700, margin:0 }}>Certificate Preview</h2>
            <button onClick={printCertificate} style={{
              padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:600,
              background:C.blue, color:"#fff", border:"none", cursor:"pointer", fontFamily:"inherit",
            }}>🖨️ Print</button>
          </div>

          <div ref={previewRef} style={{
            position:"relative", paddingBottom:"1.5rem", borderBottom:"3px solid #667eea", marginBottom:"1.5rem",
          }}>
            {/* Logo in Top Right */}
            {formData.companyLogo && (
              <img src={formData.companyLogo} alt="Company Logo" style={{
                position:"absolute", top:0, right:0, maxWidth:"80px", maxHeight:"80px", objectFit:"contain"
              }} />
            )}

            {/* Header */}
            <div style={{ textAlign:"center", paddingRight:formData.companyLogo ? "90px" : "0" }}>
              <h1 style={{ color:"#667eea", fontSize:20, margin:"0 0 4px" }}>CERTIFICATE OF COMPLIANCE</h1>
              <p style={{ color:"#666", margin:0, fontSize:10 }}>Monroy QMS Platform</p>
            </div>
          </div>

          {/* Certificate Information Table */}
          <div style={{ marginBottom:"1.5rem" }}>
            <h3 style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#667eea", padding:"8px", margin:"0 0 10px", textTransform:"uppercase" }}>
              Certificate Information
            </h3>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <tbody>
                {[
                  { label:"Certificate Number", value:formData.certificateNumber },
                  { label:"Certificate Type", value:formData.certificateType },
                  { label:"Issue Date", value:formData.issueDate },
                  { label:"Expiry Date", value:formData.expiryDate },
                  { label:"Status", value:formData.status.toUpperCase() },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"8px", background:"#f5f5f5", fontWeight:600, width:"40%" }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"8px" }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Equipment Information */}
          <div style={{ marginBottom:"1.5rem" }}>
            <h3 style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#667eea", padding:"8px", margin:"0 0 10px", textTransform:"uppercase" }}>
              Equipment Information
            </h3>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <tbody>
                {[
                  { label:"Equipment", value:formData.equipmentDescription },
                  { label:"Location", value:formData.equipmentLocation },
                  { label:"ID Number", value:formData.identificationNumber },
                  { label:"SWL", value:formData.swl },
                  { label:"MAWP", value:formData.mawp },
                  { label:"Status", value:formData.equipmentStatus.toUpperCase() },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"8px", background:"#f5f5f5", fontWeight:600, width:"40%" }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"8px" }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Company Information */}
          <div style={{ marginBottom:"1.5rem" }}>
            <h3 style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#667eea", padding:"8px", margin:"0 0 10px", textTransform:"uppercase" }}>
              Company Information
            </h3>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <tbody>
                {[
                  { label:"Company", value:formData.company },
                  { label:"Contact Person", value:formData.contactPerson },
                  { label:"Email", value:formData.contactEmail },
                  { label:"Phone", value:formData.contactPhone },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"8px", background:"#f5f5f5", fontWeight:600, width:"40%" }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"8px" }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inspector Information */}
          <div style={{ marginBottom:"1.5rem" }}>
            <h3 style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#667eea", padding:"8px", margin:"0 0 10px", textTransform:"uppercase" }}>
              Inspector Information
            </h3>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <tbody>
                {[
                  { label:"Inspector Name", value:formData.inspectorName },
                  { label:"Inspector ID", value:formData.inspectorID },
                  { label:"Email", value:formData.inspectorEmail },
                  { label:"Phone", value:formData.inspectorPhone },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:"1px solid #eee" }}>
                    <td style={{ padding:"8px", background:"#f5f5f5", fontWeight:600, width:"40%" }}>
                      {row.label}
                    </td>
                    <td style={{ padding:"8px" }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signature */}
          {formData.inspectorSignature && (
            <div style={{ marginBottom:"1.5rem", paddingTop:"1rem", borderTop:"1px solid #eee" }}>
              <p style={{ fontSize:10, color:"#666", margin:"0 0 8px", fontWeight:600 }}>Inspector Signature:</p>
              <img src={formData.inspectorSignature} alt="Inspector Signature" style={{
                maxWidth:"120px", height:"auto"
              }} />
            </div>
          )}

          {/* Legal Framework */}
          <div style={{ marginTop:"1.5rem", paddingTop:"1rem", borderTop:"1px solid #eee" }}>
            <p style={{ fontSize:10, color:"#666", margin:"0 0 8px", fontWeight:600 }}>Legal Framework:</p>
            <p style={{ fontSize:9, color:"#555", lineHeight:1.5, margin:0 }}>
              {formData.legalFramework}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
            max-height: none !important;
          }
        }
      `}</style>
    </AppLayout>
  );
}
