"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const C = {
  green:"#00f5c4", purple:"#7c5cfc", blue:"#4fc3f7", pink:"#f472b6", yellow:"#fbbf24",
};
const rgbaMap = {
  [C.green]:"0,245,196", [C.blue]:"79,195,247",
  [C.purple]:"124,92,252", [C.pink]:"244,114,182", [C.yellow]:"251,191,36",
};

const inspectionTrends = [
  { month:"Aug", inspections:28, ncrs:4 },
  { month:"Sep", inspections:34, ncrs:6 },
  { month:"Oct", inspections:29, ncrs:3 },
  { month:"Nov", inspections:41, ncrs:7 },
  { month:"Dec", inspections:36, ncrs:5 },
  { month:"Jan", inspections:38, ncrs:3 },
];
const equipmentDist = [
  { name:"Pressure Vessels", value:52, color:C.green  },
  { name:"Boilers",          value:31, color:C.purple },
  { name:"Lifting Equip",    value:44, color:C.blue   },
  { name:"Air Receivers",    value:28, color:C.pink   },
  { name:"Storage Tanks",    value:31, color:C.yellow },
];
const monthlyPerf = [
  { week:"W1", pass:12, fail:2 },
  { week:"W2", pass:18, fail:3 },
  { week:"W3", pass:15, fail:1 },
  { week:"W4", pass:21, fail:4 },
];
const recentActivity = [
  { action:"Inspection completed", detail:"Pressure vessel PV-0041 · Acme Corp",    time:"2m ago",  color:C.green,  icon:"✅" },
  { action:"NCR raised",           detail:"Boiler BL-0012 · SteelWorks Ltd · Major", time:"18m ago", color:C.pink,   icon:"⚠️" },
  { action:"Certificate issued",   detail:"ISO cert #C-0889 · TechPlant Inc",        time:"1h ago",  color:C.blue,   icon:"📜" },
  { action:"Equipment registered", detail:"Air receiver AR-0067 · MineOps Ltd",      time:"2h ago",  color:C.purple, icon:"⚙️" },
  { action:"Inspection scheduled", detail:"Lifting equip LE-0034 · Cargo Hub",       time:"4h ago",  color:C.yellow, icon:"📅" },
];

function AnimatedNumber({ target }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
      n += step;
      if (n >= target) { setVal(target); clearInterval(t); }
      else setVal(n);
    }, 30);
    return () => clearInterval(t);
  }, [target]);
  return <span>{val}</span>;
}

function ChartHeader({ accent, accentB, title, sub }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:4, height:18, borderRadius:2, background:`linear-gradient(${accent},${accentB||accent})` }}/>
        <span style={{ fontWeight:700, fontSize:14 }}>{title}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

const kpiCards = [
  { label:"TOTAL CLIENTS",   value:24,  change:"+2 this month",  changeColor:C.green,   accent:C.green,  icon:"🏢" },
  { label:"TOTAL EQUIPMENT", value:186, change:"+12 new",         changeColor:C.green,   accent:C.blue,   icon:"⚙️" },
  { label:"INSPECTIONS",     value:38,  change:"+5 completed",    changeColor:C.green,   accent:C.purple, icon:"🔍" },
  { label:"PENDING TASKS",   value:7,   change:"-1 overdue",      changeColor:"#f87171", accent:C.pink,   icon:"⏳" },
  { label:"OPEN NCRs",       value:3,   change:"→ No change",     changeColor:"#94a3b8", accent:C.yellow, icon:"⚠️" },
  { label:"CERTIFICATES",    value:156, change:"+4 issued",       changeColor:C.green,   accent:C.green,  icon:"📜" },
];

export default function DashboardPage() {
  return (
    <AppLayout>
      <div style={{ marginBottom:28, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{
            fontSize:"clamp(22px,4vw,32px)", fontWeight:900, margin:0,
            background:`linear-gradient(90deg,#fff 30%,${C.green})`,
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:"-0.02em",
          }}>Dashboard</h1>
          <p style={{ color:"#64748b", fontSize:13, margin:"4px 0 0" }}>
            Real-time overview of enterprise inspection operations
          </p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <div style={{
            padding:"8px 16px", borderRadius:20,
            background:"rgba(0,245,196,0.08)", border:"1px solid rgba(0,245,196,0.2)",
            fontSize:12, color:C.green, fontWeight:600,
          }}>📅 March 2026</div>
          <a href="/reports/export" style={{
            padding:"8px 16px", borderRadius:20,
            background:"rgba(124,92,252,0.15)", border:"1px solid rgba(124,92,252,0.3)",
            fontSize:12, color:C.purple, fontWeight:600, cursor:"pointer", textDecoration:"none",
          }}>⬇ Export PDF</a>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:22 }}>
        {kpiCards.map(card => (
          <div key={card.label} style={{
            background:"linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
            border:`1px solid rgba(${rgbaMap[card.accent]},0.25)`,
            borderRadius:16, padding:"20px 22px",
            boxShadow:`0 0 28px rgba(${rgbaMap[card.accent]},0.15)`,
            position:"relative", overflow:"hidden",
          }}>
            <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80,
              borderRadius:"50%", background:card.accent, opacity:0.08, filter:"blur(20px)" }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", color:"#64748b", textTransform:"uppercase" }}>
                {card.label}
              </span>
              <span style={{
                fontSize:16, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center",
                borderRadius:8, background:`rgba(${rgbaMap[card.accent]},0.12)`,
              }}>{card.icon}</span>
            </div>
            <div style={{ fontSize:36, fontWeight:900, lineHeight:1, color:"#fff",
              textShadow:`0 0 20px ${card.accent}66`, marginBottom:5 }}>
              <AnimatedNumber target={card.value} />
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:card.changeColor }}>{card.change}</div>
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3,
              background:`linear-gradient(90deg,${card.accent},transparent)`, opacity:0.7 }}/>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16, marginBottom:22 }}>
        <div style={{
          background:"linear-gradient(135deg,rgba(124,92,252,0.08),rgba(0,245,196,0.04))",
          border:"1px solid rgba(124,92,252,0.2)", borderRadius:16, padding:"22px 18px",
        }}>
          <ChartHeader accent={C.purple} accentB={C.green} title="Inspection Trends" sub="Last 6 months"/>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={inspectionTrends}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.purple} stopOpacity={0.5}/>
                  <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.green} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="month" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:"#1a1a35", border:"1px solid rgba(124,92,252,0.3)", borderRadius:8, color:"#fff", fontSize:12 }}/>
              <Area type="monotone" dataKey="inspections" stroke={C.purple} strokeWidth={2.5} fill="url(#g1)" name="Inspections"/>
              <Area type="monotone" dataKey="ncrs" stroke={C.green} strokeWidth={2.5} fill="url(#g2)" name="NCRs"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(0,245,196,0.06),rgba(79,195,247,0.04))",
          border:"1px solid rgba(0,245,196,0.18)", borderRadius:16, padding:"22px 18px",
        }}>
          <ChartHeader accent={C.green} accentB={C.blue} title="Equipment Distribution" sub="By type"/>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={equipmentDist} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" stroke="none">
                {equipmentDist.map((e,i)=><Cell key={i} fill={e.color} opacity={0.9}/>)}
              </Pie>
              <Tooltip contentStyle={{ background:"#1a1a35", border:"1px solid rgba(0,245,196,0.3)", borderRadius:8, color:"#fff", fontSize:12 }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:4 }}>
            {equipmentDist.map(d=>(
              <div key={d.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:"#94a3b8" }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:d.color }}/>
                  {d.name}
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:d.color }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(244,114,182,0.06),rgba(124,92,252,0.04))",
          border:"1px solid rgba(244,114,182,0.18)", borderRadius:16, padding:"22px 18px",
        }}>
          <ChartHeader accent={C.pink} accentB={C.purple} title="Monthly Performance" sub="Week by week"/>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyPerf} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="week" tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#64748b", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:"#1a1a35", border:"1px solid rgba(244,114,182,0.3)", borderRadius:8, color:"#fff", fontSize:12 }}/>
              <Bar dataKey="pass" fill={C.green} radius={[5,5,0,0]} name="Pass"/>
              <Bar dataKey="fail" fill={C.pink}  radius={[5,5,0,0]} name="Fail"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:16, marginBottom:22 }}>
        <div style={{
          background:"linear-gradient(135deg,rgba(251,191,36,0.06),rgba(124,92,252,0.04))",
          border:"1px solid rgba(251,191,36,0.2)", borderRadius:16, padding:"22px 22px",
        }}>
          <ChartHeader accent={C.yellow} accentB={C.pink} title="License Compliance" sub="Overall compliance status"/>
          {[
            { label:"Valid Licenses", value:141, color:C.green,  pct:90 },
            { label:"Expiring Soon",  value:11,  color:C.yellow, pct:7  },
            { label:"Expired",        value:4,   color:C.pink,   pct:3  },
          ].map(item=>(
            <div key={item.label} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:12, color:"#94a3b8" }}>{item.label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:item.color }}>{item.value}</span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:10, overflow:"hidden" }}>
                <div style={{
                  height:"100%", width:`${item.pct}%`,
                  background:`linear-gradient(90deg,${item.color},${item.color}aa)`,
                  borderRadius:10, boxShadow:`0 0 8px ${item.color}66`,
                }}/>
              </div>
            </div>
          ))}
          <div style={{
            marginTop:14, padding:"12px 16px",
            background:"rgba(0,245,196,0.07)", border:"1px solid rgba(0,245,196,0.15)",
            borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <span style={{ fontSize:12, color:"#94a3b8" }}>Overall Compliance Rate</span>
            <span style={{ fontSize:22, fontWeight:900, color:C.green }}>90.4%</span>
          </div>
        </div>

        <div style={{
          background:"linear-gradient(135deg,rgba(79,195,247,0.05),rgba(124,92,252,0.03))",
          border:"1px solid rgba(79,195,247,0.18)", borderRadius:16, padding:"22px 22px",
        }}>
          <ChartHeader accent={C.blue} accentB={C.purple} title="Recent Activity" sub="Latest system events"/>
          {recentActivity.map((item,i)=>(
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0",
              borderBottom: i < recentActivity.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{
                width:30, height:30, borderRadius:8, flexShrink:0,
                background:`rgba(${rgbaMap[item.color]},0.12)`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
              }}>{item.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0", marginBottom:2 }}>{item.action}</div>
                <div style={{ fontSize:11, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.detail}</div>
              </div>
              <div style={{ fontSize:10, color:"#475569", flexShrink:0, paddingTop:2 }}>{item.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
        {[
          { label:"📝 Create Inspection",  href:"/inspections/create", accent:C.purple },
          { label:"🏷️ Generate QR Code",   href:"/qr-codes",           accent:C.green  },
          { label:"➕ Register Equipment",  href:"/equipment/register", accent:C.blue   },
          { label:"📄 Export Report",       href:"/reports/export",     accent:C.pink   },
        ].map(btn=>(
          <a key={btn.label} href={btn.href} style={{
            padding:"11px 20px", borderRadius:12, cursor:"pointer",
            background:`rgba(${rgbaMap[btn.accent]},0.12)`,
            border:`1px solid rgba(${rgbaMap[btn.accent]},0.3)`,
            color:"#e2e8f0", fontWeight:700, fontSize:13, fontFamily:"inherit",
            textDecoration:"none", display:"inline-flex", alignItems:"center",
          }}>{btn.label}</a>
        ))}
      </div>
    </AppLayout>
  );
}
```

---

### 3. `apps/web/src/app/inspections/create/page.jsx` — new file

Paste the full content from the `create-inspection-page.jsx` file I gave you earlier (download it above).

---

### 4. `apps/web/src/app/equipment/register/page.jsx` — new file

Paste the full content from the `register-equipment-page.jsx` file I gave you earlier (download it above).

---

After all 4 commits the build should show:
```
✓ /
✓ /dashboard
✓ /inspections/create
✓ /equipment/register
