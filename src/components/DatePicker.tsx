// @ts-nocheck — TODO: add strict types
// FinCalci — DatePicker component
import React from 'react';
import { vib } from '../utils/haptics';
import { MONTH_NAMES } from '../utils/constants';

const { useState, useRef } = React;
function DatePickerInner({value,onChange,label,color,t,minYear=1920,maxYear}) {
  const mxY=maxYear||new Date().getFullYear();
  const parts=value?value.split("-").map(Number):[2000,1,1];
  const [yr,setYr]=useState(parts[0]||2000);
  const [mo,setMo]=useState(parts[1]||1);
  const [dy,setDy]=useState(parts[2]||1);
  const [manual,setManual]=useState(false);
  const [manualDD,setManualDD]=useState(String(parts[2]||1));
  const [manualMM,setManualMM]=useState(String(parts[1]||1));
  const [manualYY,setManualYY]=useState(String(parts[0]||2000));
  const [manualErr,setManualErr]=useState("");
  const mmRef=useRef(null);const yyRef=useRef(null);

  const daysInMonth=(y,m)=>new Date(y,m,0).getDate();
  const maxD=daysInMonth(yr,mo);

  const update=(y,m,d)=>{
    const safeD=Math.min(d,daysInMonth(y,m));
    setYr(y);setMo(m);setDy(safeD);
    setManualDD(String(safeD));setManualMM(String(m));setManualYY(String(y));
    const str=`${y}-${String(m).padStart(2,"0")}-${String(safeD).padStart(2,"0")}`;
    onChange(str);
  };

  const applyManual=(dd,mm,yy,silent)=>{
    const d=parseInt(dd||manualDD),m=parseInt(mm||manualMM),y=parseInt(yy||manualYY);
    if(!d||!m||!y||isNaN(d)||isNaN(m)||isNaN(y)){if(!silent)setManualErr("Enter valid numbers");return false}
    if(y<minYear||y>mxY){if(!silent)setManualErr(`Year: ${minYear}–${mxY}`);return false}
    if(m<1||m>12){if(!silent)setManualErr("Month: 1–12");return false}
    const maxDay=daysInMonth(y,m);
    if(d<1||d>maxDay){if(!silent)setManualErr(`Day: 1–${maxDay} for this month`);return false}
    setManualErr("");update(y,m,d);vib(8);return true;
  };
  // Auto-apply silently when all fields look complete
  useEffect(()=>{if(manual&&manualYY.length===4&&manualMM.length>=1&&manualDD.length>=1){applyManual(manualDD,manualMM,manualYY,true)}},[manualDD,manualMM,manualYY]);

  useEffect(()=>{if(value){const p=value.split("-").map(Number);if(p[0])setYr(p[0]);if(p[1])setMo(p[1]);if(p[2])setDy(p[2]);
    setManualDD(String(p[2]||1));setManualMM(String(p[1]||1));setManualYY(String(p[0]||2000))}},[value]);

  const selStyle={padding:"10px 4px",borderRadius:10,background:t.inputBg,border:`1px solid ${t.border}`,color:t.text,
    fontSize:15,fontFamily:"'JetBrains Mono',monospace",outline:"none",cursor:"pointer",textAlign:"center",WebkitAppearance:"none",appearance:"none"};
  const manInputStyle={width:"100%",padding:"10px 6px",borderRadius:10,background:t.inputBg,border:`1px solid ${t.border}`,color:t.text,
    fontSize:16,fontFamily:"'JetBrains Mono',monospace",outline:"none",textAlign:"center",boxSizing:"border-box"};

  return (<div style={{marginBottom:16}}>
    {label&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <label style={{fontSize:13,color:t.textMuted,fontFamily:"'Inter',system-ui,sans-serif"}}>{label}</label>
      <button onClick={()=>{setManual(!manual);setManualErr("");vib(5)}}
        style={{background:manual?`${color}20`:"transparent",border:`1px solid ${manual?color+50:t.border}`,borderRadius:8,
          padding:"4px 10px",fontSize:11,color:manual?color:t.textDim,cursor:"pointer",fontWeight:500,fontFamily:"'Inter',system-ui,sans-serif"}}>
        {manual?"▼ Dropdown":"✏️ Type"}
      </button>
    </div>}

    {!manual?(<div>
      {/* Dropdown mode */}
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:t.textDim,textAlign:"center",marginBottom:4}}>Day</div>
          <select value={dy} onChange={e=>{update(yr,mo,Number(e.target.value));vib(3)}} style={{...selStyle,width:"100%"}}>
            {Array.from({length:maxD},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{flex:1.5}}>
          <div style={{fontSize:10,color:t.textDim,textAlign:"center",marginBottom:4}}>Month</div>
          <select value={mo} onChange={e=>{update(yr,Number(e.target.value),dy);vib(3)}} style={{...selStyle,width:"100%"}}>
            {MONTH_NAMES.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div style={{flex:1.2}}>
          <div style={{fontSize:10,color:t.textDim,textAlign:"center",marginBottom:4}}>Year</div>
          <select value={yr} onChange={e=>{update(Number(e.target.value),mo,dy);vib(3)}} style={{...selStyle,width:"100%"}}>
            {Array.from({length:mxY-minYear+1},(_,i)=>mxY-i).map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </div>):(<div>
      {/* Manual typing mode — auto-tabs between fields */}
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:t.textDim,textAlign:"center",marginBottom:4}}>DD</div>
          <input type="number" value={manualDD} placeholder="DD" maxLength={2}
            onChange={e=>{const v=e.target.value.slice(0,2);setManualDD(v);setManualErr("");if(v.length===2&&mmRef.current){mmRef.current.focus();mmRef.current.select()}}}
            onKeyDown={e=>e.key==="Enter"&&applyManual()} style={manInputStyle}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:t.textDim,textAlign:"center",marginBottom:4}}>MM</div>
          <input ref={mmRef} type="number" value={manualMM} placeholder="MM" maxLength={2}
            onChange={e=>{const v=e.target.value.slice(0,2);setManualMM(v);setManualErr("");if(v.length===2&&yyRef.current){yyRef.current.focus();yyRef.current.select()}}}
            onKeyDown={e=>e.key==="Enter"&&applyManual()} style={manInputStyle}/>
        </div>
        <div style={{flex:1.3}}>
          <div style={{fontSize:10,color:t.textDim,textAlign:"center",marginBottom:4}}>YYYY</div>
          <input ref={yyRef} type="number" value={manualYY} placeholder="YYYY" maxLength={4}
            onChange={e=>{const v=e.target.value.slice(0,4);setManualYY(v);setManualErr("")}}
            onKeyDown={e=>e.key==="Enter"&&applyManual()} style={manInputStyle}/>
        </div>
      </div>
      <button onClick={applyManual} style={{width:"100%",padding:10,borderRadius:10,background:`${color}20`,border:`1px solid ${color}40`,
        color,fontWeight:500,fontSize:13,cursor:"pointer",fontFamily:"'Inter',system-ui,sans-serif"}}>Apply Date</button>
      {manualErr&&<div style={{textAlign:"center",marginTop:6,fontSize:12,color:"#EF4444"}}>{manualErr}</div>}
    </div>)}

    {/* Display selected date */}
    <div style={{textAlign:"center",marginTop:8,fontSize:13,color,fontWeight:500}}>
      {dy} {MONTH_FULL[mo-1]} {yr}
    </div>
  </div>);
}
export default React.memo(DatePickerInner);
