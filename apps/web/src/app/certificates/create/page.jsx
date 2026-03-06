"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/authContext";
import { 
  sanitizeInput, 
  validateFile, 
  validateEmail,
  validatePhone,
  validateMeasurement 
} from "@/lib/security";
import AppLayout from "@/components/AppLayout";

const C = { green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24" };

export default function CreateCertificatePage() {
  const router = useRouter();
  const { user, hasPermission, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const canvasRef = useRef(null);
  const logoInputRef = useRef(null);

  const [formData, setFormData] = useState({
    certificateNumber: `CERT-${Date.now().toString().slice(-6)}`,
    certificateType: "Load Test Certificate",
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "issued",
    companyLogo: null,
    equipmentDescription: "",
    equipmentLocation: "",
    identificationNumber: "",
    swl: "",
    mawp: "",
    equipmentStatus: "pass",
    company: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    inspectorName: "",
    inspectorID: "",
    inspectorEmail: "",
    inspectorPhone: "",
    inspectorSignature: null,
    legalFramework: "Mines and Quarries Act CAP 4.4:02, Factories Act 44.01, Machinery and Related Industries Safety and Health Regulations",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    // ✅ Server-side permission check
    if (!hasPermission('certificates:create')) {
      router.push("/dashboard");
      return;
    }
    setLoading(false);
  }

  // ✅ SECURE FILE UPLOAD WITH VALIDATION
  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file
      validateFile(file, {
        maxSize: 2 * 1024 * 1024, // 2MB for images
        allowedTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
      });

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, companyLogo: event.target.result });
        setErrors({ ...errors, companyLogo: null });
      };
      reader.onerror = () => {
        setErrors({ ...errors, companyLogo: "Failed to read file" });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setErrors({ ...errors, companyLogo: error.message });
    }
  }

  // ✅ INPUT VALIDATION
  function validateForm() {
    const newErrors = {};

    // Validate required fields
    if (!formData.company.trim()) newErrors.company = "Company is required";
    if (!formData.equipmentDescription.trim()) newErrors.equipmentDescription = "Equipment description is required";
    
    // Validate email
    if (!validateEmail(formData.contactEmail)) {
      newErrors.contactEmail = "Invalid email format";
    }
    if (!validateEmail(formData.inspectorEmail)) {
      newErrors.inspectorEmail = "Invalid inspector email format";
    }

    // Validate phone
    if (formData.contactPhone && !validatePhone(formData.contactPhone)) {
      newErrors.contactPhone = "Invalid phone format";
    }
    if (formData.inspectorPhone && !validatePhone(formData.inspectorPhone)) {
      newErrors.inspectorPhone = "Invalid phone format";
    }

    // Validate measurements
    if (formData.swl && !validateMeasurement(formData.swl)) {
      newErrors.swl = "Invalid SWL format (e.g., 50 TON)";
    }
    if (formData.mawp && !validateMeasurement(formData.mawp)) {
      newErrors.mawp = "Invalid MAWP format (e.g., 10 bar)";
    }

    // Validate dates
    const issueDate = new Date(formData.issueDate);
    const expiryDate = new Date(formData.expiryDate);
    
    if (expiryDate <= issueDate) {
      newErrors.expiryDate = "Expiry date must be after issue date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ✅ SECURE DATABASE SUBMISSION
  async function handleCreateCertificate() {
    // Validate form
    if (!validateForm()) {
      alert("❌ Please fix the errors above");
      return;
    }

    try {
      // ✅ SANITIZE ALL USER INPUT BEFORE SENDING TO DATABASE
      const sanitizedData = {
        certificate_number: sanitizeInput(formData.certificateNumber),
        certificate_type: sanitizeInput(formData.certificateType),
        company: sanitizeInput(formData.company),
        equipment_description: sanitizeInput(formData.equipmentDescription),
        equipment_location: sanitizeInput(formData.equipmentLocation),
        contact_person: sanitizeInput(formData.contactPerson),
        contact_email: formData.contactEmail.toLowerCase().trim(),
        contact_phone: sanitizeInput(formData.contactPhone),
        inspector_name: sanitizeInput(formData.inspectorName),
        inspector_id: sanitizeInput(formData.inspectorID),
        inspector_email: formData.inspectorEmail.toLowerCase().trim(),
        issued_at: new Date(formData.issueDate).toISOString(),
        valid_to: formData.expiryDate,
        status: sanitizeInput(formData.status),
        legal_framework: sanitizeInput(formData.legalFramework),
        created_by: user.id, // ✅ Track who created it
      };

      // ✅ INSERT WITH ERROR HANDLING
      const { data, error } = await supabase
        .from('certificates')
        .insert([sanitizedData])
        .select();

      if (error) {
        if (error.code === '23505') { // Unique constraint
          throw new Error("Certificate number already exists");
        }
        throw error;
      }

      // ✅ LOG ACTION FOR AUDIT TRAIL
      await supabase.from('audit_log').insert([{
        actor_id: user.id,
        action: 'CREATE',
        entity_type: 'certificate',
        entity_id: data[0].id,
        changes: sanitizedData,
      }]);

      alert("✅ Certificate created successfully!");
      router.push("/certificates");
    } catch (error) {
      console.error("Error:", error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  if (loading) return <AppLayout><div style={{ padding:"40px", color:"#fff" }}>Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div style={{ marginBottom:"2rem" }}>
        <h1 style={{ fontSize:"clamp(20px,5vw,32px)", fontWeight:900, margin:"0 0 8px", color:"#fff" }}>
          Create New Certificate
        </h1>
      </div>

      {/* Form fields with error display */}
      <div style={{
        background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,92,252,0.2)",
        borderRadius:16, padding:"clamp(16px,4vw,24px)",
      }}>
        {/* Company */}
        <div style={{ marginBottom:"1.5rem" }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 }}>
            COMPANY *
          </label>
          <input
            value={formData.company}
            onChange={e => setFormData({...formData, company: e.target.value})}
            style={{
              width:"100%", padding:"10px 12px",
              background:"rgba(255,255,255,0.04)", 
              border: errors.company ? "1px solid #f472b6" : "1px solid rgba(124,92,252,0.25)",
              borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
            }}
          />
          {errors.company && (
            <span style={{ color: C.pink, fontSize:10, marginTop:4, display:"block" }}>
              ❌ {errors.company}
            </span>
          )}
        </div>

        {/* Email with validation */}
        <div style={{ marginBottom:"1.5rem" }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 }}>
            CONTACT EMAIL *
          </label>
          <input
            type="email"
            value={formData.contactEmail}
            onChange={e => setFormData({...formData, contactEmail: e.target.value})}
            style={{
              width:"100%", padding:"10px 12px",
              background:"rgba(255,255,255,0.04)", 
              border: errors.contactEmail ? "1px solid #f472b6" : "1px solid rgba(124,92,252,0.25)",
              borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
            }}
          />
          {errors.contactEmail && (
            <span style={{ color: C.pink, fontSize:10, marginTop:4, display:"block" }}>
              ❌ {errors.contactEmail}
            </span>
          )}
        </div>

        {/* Phone with validation */}
        <div style={{ marginBottom:"1.5rem" }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 }}>
            CONTACT PHONE
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={e => setFormData({...formData, contactPhone: e.target.value})}
            style={{
              width:"100%", padding:"10px 12px",
              background:"rgba(255,255,255,0.04)", 
              border: errors.contactPhone ? "1px solid #f472b6" : "1px solid rgba(124,92,252,0.25)",
              borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
            }}
          />
          {errors.contactPhone && (
            <span style={{ color: C.pink, fontSize:10, marginTop:4, display:"block" }}>
              ❌ {errors.contactPhone}
            </span>
          )}
        </div>

        {/* SWL with validation */}
        <div style={{ marginBottom:"1.5rem" }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 }}>
            SWL (e.g., 50 TON)
          </label>
          <input
            value={formData.swl}
            onChange={e => setFormData({...formData, swl: e.target.value})}
            placeholder="50 TON"
            style={{
              width:"100%", padding:"10px 12px",
              background:"rgba(255,255,255,0.04)", 
              border: errors.swl ? "1px solid #f472b6" : "1px solid rgba(124,92,252,0.25)",
              borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit", outline:"none",
            }}
          />
          {errors.swl && (
            <span style={{ color: C.pink, fontSize:10, marginTop:4, display:"block" }}>
              ❌ {errors.swl}
            </span>
          )}
        </div>

        {/* Dates with validation */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1.5rem" }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 }}>
              ISSUE DATE *
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
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 }}>
              EXPIRY DATE *
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={e => setFormData({...formData, expiryDate: e.target.value})}
              style={{
                width:"100%", padding:"10px 12px",
                background:"rgba(255,255,255,0.04)", 
                border: errors.expiryDate ? "1px solid #f472b6" : "1px solid rgba(124,92,252,0.25)",
                borderRadius:8, color:"#e2e8f0", fontSize:12, fontFamily:"inherit",
              }}
            />
            {errors.expiryDate && (
              <span style={{ color: C.pink, fontSize:10, marginTop:4, display:"block" }}>
                ❌ {errors.expiryDate}
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleCreateCertificate}
          style={{
            width:"100%", padding:"11px", borderRadius:10, cursor:"pointer",
            background:`linear-gradient(135deg,${C.green},${C.blue})`, border:"none",
            color:"#fff", fontWeight:700, fontSize:12, fontFamily:"inherit",
          }}
        >
          ✓ Create Certificate
        </button>
      </div>
    </AppLayout>
  );
}
