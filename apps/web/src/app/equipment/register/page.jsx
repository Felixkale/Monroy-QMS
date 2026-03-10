"use client";
import { useState } from "react";
// ... rest of the file unchanged
import { useState } from "react";

const C = { green: "#00f5c4", purple: "#7c5cfc", blue: "#4fc3f7", pink: "#f472b6", yellow: "#fbbf24" };

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "clients", label: "Clients", icon: "🏢" },
  { id: "register-client", label: "Register Client", icon: "➕" },
  { id: "equipment", label: "Equipment", icon: "⚙️" },
  { id: "register-equip", label: "Register Equipment", icon: "🔧" },
  { id: "inspections", label: "Inspections", icon: "🔍" },
  { id: "ncr", label: "NCR", icon: "⚠️" },
  { id: "certificates", label: "Certificates", icon: "📜" },
  { id: "reports", label: "Reports", icon: "📈" },
  { id: "admin", label: "Admin", icon: "⚡" },
];

const EQUIPMENT_TYPES = ["Pressure Vessel","Boiler","Air Receiver","Lifting Equipment","Compressor","Storage Tank","Heat Exchanger","Autoclave","Fired Heater","Separator","Column / Tower","Gas Cylinder","Hydraulic System","Other"];
const STANDARDS = ["ASME Section VIII Div 1","ASME Section VIII Div 2","BS PD 5500","EN 13445","AD 2000 (Germany)","AS 1210 (Australia)","SANS 347 (South Africa)","Local / In-house","Other"];
const MATERIALS = ["Carbon Steel","Stainless Steel 304","Stainless Steel 316","Duplex Stainless","Low Alloy Steel","Hastelloy","Inconel","Aluminium","Copper","Fibreglass (GRP)","Other"];
const FLUID_TYPES = ["Air / Compressed Air","Steam","Water","Hot Oil","Natural Gas","LPG / Propane","Hydrogen","Nitrogen","Oxygen","Ammonia","Hydrocarbons","Chemicals / Corrosive","Other"];
const CERT_TYPES = ["Inspection Certificate","Pressure Test Certificate","NDT Certificate","Calibration Certificate","Fitness-for-Service Certificate","Lifting Equipment Certificate"];
const INSPECTION_FREQS = ["6 Months","12 Months","18 Months","24 Months","36 Months","60 Months"];
const BOTSWANA_LOCATIONS = ["Gaborone","Francistown","Maun","Lobatse","Selebi-Phikwe","Jwaneng","Orapa","Sowa Town","Kasane","Ghanzi","Serowe","Molepolole","Kanye","Mahalapye","Palapye","Mochudi","Ramotswa","Mogoditshane","Tlokweng","Letlhakane","Bobonong","Tonota","Gaborone Industrial","Francistown Industrial","Lobatse Industrial","Morupule Power Station","Morupule Colliery","Jwaneng Mine Complex","Other"];

const emptyForm = {
  tag:"", serial:"", equipment_type:"Pressure Vessel", manufacturer:"", model:"", year_built: new Date().getFullYear(),
  client:"", location:"", department:"",
  cert_type:"Inspection Certificate", design_standard:"ASME Section VIII Div 1", inspection_freq:"12 Months",
  shell_material:"Carbon Steel", fluid_type:"Air / Compressed Air",
  design_pressure:"", working_pressure:"", test_pressure:"", design_temperature:"", capacity_volume:"", safe_working_load:"",
  national_reg_no:"", notified_body:"", installation_date:"", last_inspection_date:"", next_inspection_date:"",
  notes:"",
};

const inputBase = {
  width:"100%", padding:"11px 14px",
  background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(102,126,234,0.25)",
  borderRadius:8, color:"#e2e8f0",
  fontSize:13, fontFamily:"inherit", outline:"none",
  boxSizing:"border-box",
};
const labelBase = {
  fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)",
  textTransform:"uppercase", letterSpacing:"0.08em",
  marginBottom:6, display:"block",
};
const secHead = {
  fontSize:11, fontWeight:800, color:"#667eea",
  textTransform:"uppercase", letterSpacing:"0.12em",
  borderBottom:"1px solid rgba(102,126,234,0.2)",
  paddingBottom:8, marginBottom:16,
  display:"flex", alignItems:"center", gap:8,
};

function genCertNo() {
  return `BW-CERT-${new Date().getFullYear()}-${Math.floor(Math.random()*90000)+10000}`;
}

function CertModal({ data, certNo, onClose }) {
  const isLifting = data.equipment_type === "Lifting Equipment";
  const today = new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"});
  const Row = ({k,v}) => !v?null:(
    <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.05)",padding:"7px 0"}}>
      <span style={{width:"45%",fontSize:11,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{k}</span>
      <span style={{width:"55%",fontSize:12,color:"#e2e8f0",fontWeight:600}}>{v}</span>
    </div>
  );
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div style={{background:"linear-gradient(160deg,#1a1f2e,#0f1419)",border:"1px solid rgba(102,126,234,0.35)",borderRadius:20,width:"100%",maxWidth:660,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 0 60px rgba(102,126,234,0.25)"}}>
        <div style={{background:"linear-gradient(135deg,rgba(102,126,234,0.18),rgba(118,75,162,0.12))",borderBottom:"1px solid rgba(102,126,234,0.2)",padding:"24px 28px 20px",borderRadius:"20px 20px 0 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:9,fontWeight:800,color:"#667eea",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:5}}>Republic of Botswana · Pressure Equipment Directorate</div>
              <h2 style={{margin:0,fontSize:20,fontWeight:900,color:"#fff"}}>{data.cert_type}</h2>
              <div style={{marginTop:4,fontSize:11,color:"rgba(255,255,255,0.45)"}}>Issued under <span style={{color:C.blue}}>{data.design_standard}</span></div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Certificate No.</div>
              <div style={{fontSize:13,fontWeight:900,color:C.green,fontFamily:"monospace"}}>{certNo}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:3}}>Issued: {today}</div>
            </div>
          </div>
        </div>
        <div style={{padding:"22px 28px"}}>
          <div style={{background:"rgba(0,245,196,0.07)",border:"1px solid rgba(0,245,196,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>✅</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.green}}>Certificate Valid — Equipment Successfully Registered</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:1}}>{data.tag} · {data.equipment_type} · {data.location}</div>
            </div>
          </div>
          <div style={{...secHead,marginTop:0}}>⚙️ Equipment Identity</div>
          <Row k="Equipment Tag" v={data.tag}/><Row k="Serial Number" v={data.serial}/>
          <Row k="Equipment Type" v={data.equipment_type}/><Row k="Manufacturer" v={data.manufacturer}/>
          <Row k="Model / Drawing No." v={data.model}/><Row k="Year of Manufacture" v={String(data.year_built)}/>
          <div style={{...secHead,marginTop:18}}>🏢 Owner & Installation</div>
          <Row k="Client / Owner" v={data.client}/><Row k="Location" v={data.location}/>
          <Row k="Department / Plant" v={data.department}/><Row k="Installation Date" v={data.installation_date}/>
          <div style={{...secHead,marginTop:18}}>📐 Design & Technical</div>
          <Row k="Design Standard" v={data.design_standard}/><Row k="Shell Material" v={data.shell_material}/>
          <Row k="Fluid / Contents" v={data.fluid_type}/>
          {!isLifting&&<><Row k="Design Pressure" v={data.design_pressure?data.design_pressure+" bar":null}/>
            <Row k="Working Pressure" v={data.working_pressure?data.working_pressure+" kPa":null}/>
            <Row k="Test Pressure" v={data.test_pressure?data.test_pressure+" kPa":null}/>
            <Row k="Design Temperature" v={data.design_temperature?data.design_temperature+" °C":null}/>
            <Row k="Volume / Capacity" v={data.capacity_volume?data.capacity_volume+" L":null}/></>}
          {isLifting&&<Row k="Safe Working Load" v={data.safe_working_load?data.safe_working_load+" kg":null}/>}
          <div style={{...secHead,marginTop:18}}>📜 Registration & Compliance</div>
          <Row k="National Reg. Number" v={data.national_reg_no}/><Row k="Notified Body" v={data.notified_body}/>
          <Row k="Inspection Frequency" v={data.inspection_freq}/><Row k="Last Inspection" v={data.last_inspection_date}/>
          <Row k="Next Inspection Due" v={data.next_inspection_date}/>
          {data.notes&&<><div style={{...secHead,marginTop:18}}>📝 Remarks</div>
            <div style={{fontSize:12,color:"#e2e8f0",lineHeight:1.7,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 14px"}}>{data.notes}</div></>}
          <div style={{marginTop:28,borderTop:"1px solid rgba(102,126,234,0.12)",paddingTop:18,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {["Registered By","Approved By","Inspecting Authority"].map(r=>(
              <div key={r} style={{textAlign:"center"}}>
                <div style={{borderTop:"1px solid rgba(255,255,255,0.12)",paddingTop:8,marginTop:36,fontSize:9,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em"}}>{r}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:16,textAlign:"center",fontSize:10,color:"rgba(100,116,139,0.4)",lineHeight:1.6,borderTop:"1px dashed rgba(102,126,234,0.1)",paddingTop:12}}>
            Computer-generated certificate · {certNo} · {today}<br/>Verify at the Botswana Pressure Equipment Directorate portal.
          </div>
        </div>
        <div style={{position:"sticky",bottom:0,background:"#1a1f2e",borderTop:"1px solid rgba(102,126,234,0.15)",padding:"12px 22px",display:"flex",gap:10,justifyContent:"flex-end",borderRadius:"0 0 20px 20px"}}>
          <button onClick={onClose} style={{padding:"9px 20px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,background:"rgba(102,126,234,0.1)",border:"1px solid rgba(102,126,234,0.25)",color:"#667eea"}}>Close</button>
          <button onClick={()=>alert("PDF print triggered!")} style={{padding:"9px 22px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:"linear-gradient(135deg,#667eea,#764ba2)",border:"none",color:"#fff"}}>🖨 Preview & Save PDF</button>
        </div>
      </div>
    </div>
  );
}

export default function RegisterEquipmentPage() {
  const [activePage, setActivePage] = useState("register-equip");
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [certData, setCertData] = useState(null);
  const [saved, setSaved] = useState(false);
  const [manualLocation, setManualLocation] = useState(false);

  const isLifting = formData.equipment_type === "Lifting Equipment";

  const handleChange = (e) => {
    const {name,value} = e.target;
    setFormData(p=>({...p,[name]:value}));
    if(errors[name]) setErrors(p=>({...p,[name]:null}));
  };

  const validate = () => {
    const e={};
    if(!formData.tag.trim()) e.tag="Required";
    if(!formData.serial.trim()) e.serial="Required";
    if(!formData.manufacturer.trim()) e.manufacturer="Required";
    if(!formData.client.trim()) e.client="Required";
    if(!formData.location.trim()) e.location="Required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if(Object.keys(errs).length){setErrors(errs);return;}
    setLoading(true);
    await new Promise(r=>setTimeout(r,800));
    const certNo = genCertNo();
    setCertData({...formData, certNo});
    setSaved(true);
    setFormData(emptyForm);
    setLoading(false);
    setTimeout(()=>setSaved(false),4000);
  };

  const inp = (name,label,{type="text",placeholder="",required=false,opts=null}={}) => (
    <div>
      <label style={labelBase}>{label}{required&&<span style={{color:"#f87171"}}> *</span>}</label>
      {opts ? (
        <select name={name} value={formData[name]} onChange={handleChange}
          style={{...inputBase,cursor:"pointer",borderColor:errors[name]?"rgba(248,113,113,0.6)":"rgba(102,126,234,0.25)"}}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ):(
        <input type={type} name={name} value={formData[name]} onChange={handleChange}
          placeholder={placeholder}
          style={{...inputBase,borderColor:errors[name]?"rgba(248,113,113,0.6)":"rgba(102,126,234,0.25)"}}
          onFocus={e=>e.target.style.borderColor="#667eea"}
          onBlur={e=>e.target.style.borderColor=errors[name]?"rgba(248,113,113,0.6)":"rgba(102,126,234,0.25)"}
        />
      )}
      {errors[name]&&<div style={{fontSize:11,color:"#f87171",marginTop:4}}>⚠ {errors[name]}</div>}
    </div>
  );

  const g3 = {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:22};
  const g2 = {display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16,marginBottom:22};

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#0f1419",color:"#e2e8f0",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:rgba(102,126,234,0.3);border-radius:10px}
        select option{background:#1a1f2e;color:#e2e8f0}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.6);cursor:pointer}
        input::placeholder{color:rgba(255,255,255,0.18)}
        textarea::placeholder{color:rgba(255,255,255,0.18)}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{width:280,flexShrink:0,background:"linear-gradient(180deg,#1a1f2e,#16192b)",display:"flex",flexDirection:"column",borderRight:"1px solid rgba(102,126,234,0.15)",position:"sticky",top:0,height:"100vh",overflowY:"auto"}}>
        <div style={{padding:"20px 24px 24px",borderBottom:"1px solid rgba(102,126,234,0.1)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:46,height:46,borderRadius:10,background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:20,color:"#fff",flexShrink:0}}>M</div>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:"#fff",letterSpacing:"-0.5px"}}>Monroy</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:1}}>QMS Platform</div>
          </div>
        </div>

        <nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:2}}>
          {navItems.map(item=>{
            const active = activePage===item.id;
            return (
              <button key={item.id} onClick={()=>setActivePage(item.id)} style={{
                background:active?"rgba(102,126,234,0.16)":"transparent",
                border:active?"1px solid rgba(102,126,234,0.28)":"1px solid transparent",
                color:active?"#fff":"rgba(255,255,255,0.55)",
                padding:"10px 14px",fontSize:13,fontWeight:active?700:400,
                borderRadius:8,cursor:"pointer",textAlign:"left",
                display:"flex",alignItems:"center",gap:11,
                fontFamily:"inherit",width:"100%",transition:"all .15s",
              }}
              onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(102,126,234,0.1)";e.currentTarget.style.color="#fff";}}}
              onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.55)";}}}
              >
                <span style={{fontSize:15,width:20,textAlign:"center"}}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{padding:"14px 10px",borderTop:"1px solid rgba(102,126,234,0.1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 4px",marginBottom:10}}>
            <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,color:"#fff",flexShrink:0}}>A</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>admin</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>admin@monroy.co.bw</div>
            </div>
          </div>
          <button style={{width:"100%",background:"rgba(102,126,234,0.12)",border:"1px solid rgba(102,126,234,0.28)",color:"#667eea",padding:"8px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Logout</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <main style={{flex:1,padding:"28px 32px",overflowY:"auto"}}>

          {/* Page header */}
          <div style={{marginBottom:24}}>
            <h1 style={{margin:0,fontSize:28,fontWeight:900,color:"#fff",letterSpacing:"-0.5px"}}>Register Equipment</h1>
            <div style={{marginTop:8,width:72,height:4,borderRadius:999,background:`linear-gradient(90deg,${C.green},${C.purple},${C.blue})`}}/>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:13,margin:"6px 0 0"}}>Add new equipment to the asset register · Certificate auto-generated on submission</p>
          </div>

          {saved&&(
            <div style={{marginBottom:20,padding:"12px 16px",borderRadius:10,background:"rgba(0,245,196,0.08)",border:"1px solid rgba(0,245,196,0.25)",color:C.green,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
              ✅ Equipment registered and certificate generated successfully!
            </div>
          )}

          {/* Form card */}
          <form onSubmit={handleSubmit} noValidate style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(102,126,234,0.18)",borderRadius:16,padding:"26px 28px",maxWidth:960}}>

            {/* 1. Equipment Identity */}
            <div style={secHead}>⚙️ Equipment Identity</div>
            <div style={g3}>
              {inp("tag","Equipment Tag",{placeholder:"e.g. PV-0042",required:true})}
              {inp("serial","Serial Number",{placeholder:"e.g. S-10042",required:true})}
              {inp("equipment_type","Equipment Type",{opts:EQUIPMENT_TYPES})}
            </div>
            <div style={g3}>
              {inp("manufacturer","Manufacturer",{placeholder:"e.g. ASME Corp",required:true})}
              {inp("model","Model / Drawing No.",{placeholder:"Drawing reference"})}
              {inp("year_built","Year Built",{type:"number",placeholder:"2024"})}
            </div>

            {/* 2. Ownership & Site */}
            <div style={secHead}>🏢 Ownership & Site</div>
            <div style={g3}>
              {inp("client","Client / Owner",{placeholder:"Company name",required:true})}
              <div>
                <label style={labelBase}>Location / Town <span style={{color:"#f87171"}}>*</span></label>
                <select name="location" value={manualLocation?"__other__":formData.location} onChange={e=>{
                  if(e.target.value==="__other__"){setManualLocation(true);setFormData(p=>({...p,location:""}));}
                  else{setManualLocation(false);handleChange(e);}
                }} style={{...inputBase,cursor:"pointer",marginBottom:manualLocation?6:0,borderColor:errors.location?"rgba(248,113,113,0.6)":"rgba(102,126,234,0.25)"}}>
                  <option value="">— Select location —</option>
                  {BOTSWANA_LOCATIONS.map(l=><option key={l} value={l}>{l}</option>)}
                  <option value="__other__">✏️ Type manually…</option>
                </select>
                {manualLocation&&(
                  <input name="location" value={formData.location} onChange={handleChange} placeholder="Enter location / site name"
                    style={{...inputBase,borderColor:"rgba(0,245,196,0.4)"}}/>
                )}
                {errors.location&&<div style={{fontSize:11,color:"#f87171",marginTop:4}}>⚠ {errors.location}</div>}
              </div>
              {inp("department","Department / Plant",{placeholder:"e.g. Plant A – Bay 3"})}
            </div>

            {/* 3. Certificate Info */}
            <div style={secHead}>📜 Certificate Information</div>
            <div style={{background:"rgba(102,126,234,0.06)",border:"1px solid rgba(102,126,234,0.15)",borderRadius:8,padding:"9px 13px",marginBottom:16,fontSize:12,color:"rgba(102,126,234,0.8)"}}>
              ℹ️ These fields populate directly into the auto-generated certificate upon registration.
            </div>
            <div style={g3}>
              {inp("cert_type","Certificate Type",{opts:CERT_TYPES})}
              {inp("design_standard","Design Standard",{opts:STANDARDS})}
              {inp("inspection_freq","Inspection Frequency",{opts:INSPECTION_FREQS})}
            </div>

            {/* 4. Design & Technical */}
            <div style={secHead}>📐 Design & Technical Parameters</div>
            <div style={g3}>
              {inp("shell_material","Shell / Body Material",{opts:MATERIALS})}
              {inp("fluid_type","Fluid / Contents",{opts:FLUID_TYPES})}
              {!isLifting&&inp("design_pressure","Design Pressure (bar)",{type:"number",placeholder:"e.g. 15.0"})}
              {isLifting&&inp("safe_working_load","Safe Working Load (kg)",{type:"number",placeholder:"e.g. 5000"})}
            </div>
            {!isLifting&&(
              <div style={g3}>
                {inp("working_pressure","Working Pressure (kPa)",{type:"number",placeholder:"e.g. 1000"})}
                {inp("test_pressure","Test Pressure (kPa)",{type:"number",placeholder:"e.g. 1500"})}
                {inp("design_temperature","Design Temperature (°C)",{type:"number",placeholder:"e.g. 250"})}
              </div>
            )}
            {!isLifting&&(
              <div style={g2}>
                {inp("capacity_volume","Volume / Capacity (L)",{type:"number",placeholder:"e.g. 5000"})}
              </div>
            )}

            {/* 5. Registration & Compliance */}
            <div style={secHead}>🔍 Registration & Compliance</div>
            <div style={g3}>
              {inp("national_reg_no","National Reg. Number",{placeholder:"e.g. BW-PV-2024-00123"})}
              {inp("notified_body","Notified Body / Inspector",{placeholder:"Inspecting authority"})}
              {inp("installation_date","Installation Date",{type:"date"})}
            </div>
            <div style={g2}>
              {inp("last_inspection_date","Last Inspection Date",{type:"date"})}
              {inp("next_inspection_date","Next Inspection Due",{type:"date"})}
            </div>

            {/* 6. Notes */}
            <div style={secHead}>📝 Notes / Remarks</div>
            <div style={{marginBottom:24}}>
              <textarea name="notes" value={formData.notes} onChange={handleChange}
                placeholder="Any additional remarks, modifications, or special conditions…"
                style={{...inputBase,minHeight:90,resize:"vertical"}}
                onFocus={e=>e.target.style.borderColor="#667eea"}
                onBlur={e=>e.target.style.borderColor="rgba(102,126,234,0.25)"}
              />
            </div>

            {/* Actions */}
            <div style={{display:"flex",gap:12,justifyContent:"flex-end",paddingTop:16,borderTop:"1px solid rgba(102,126,234,0.12)"}}>
              <button type="button" onClick={()=>{setFormData(emptyForm);setErrors({});setManualLocation(false);}} style={{padding:"11px 24px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:"rgba(102,126,234,0.1)",border:"1px solid rgba(102,126,234,0.25)",color:"#667eea"}}>
                Clear Form
              </button>
              <button type="submit" disabled={loading} style={{padding:"11px 28px",borderRadius:8,cursor:loading?"wait":"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,background:"linear-gradient(135deg,#667eea,#764ba2)",border:"none",color:"#fff",boxShadow:"0 0 20px rgba(102,126,234,0.35)",opacity:loading?0.7:1}}>
                {loading?"⏳ Saving…":"📜 Register & Generate Certificate"}
              </button>
            </div>
          </form>
        </main>
      </div>

      {certData&&<CertModal data={certData} certNo={certData.certNo} onClose={()=>setCertData(null)}/>}
    </div>
  );
}
