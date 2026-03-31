// @ts-nocheck — TODO: add strict types
// FinCalci — SliderInput component
// Slider has a practical visual range. Tap number to type any value (even beyond slider max).
// Long-press [−][+] to accelerate. No native spinners.
import React from 'react';
const { useState, useRef, useEffect, useCallback } = React;
import { vib } from '../utils/haptics';

function SliderInputInner({label,value,onChange,unit,min=0,max=100,step=1,color,t}) {
  const clamp = (v,mn,mx,fb=mn) => { const n=Number(v); if(isNaN(n)||!isFinite(n))return fb; return Math.min(Math.max(n,mn),mx); };
  const safeVal = clamp(value, min, max, min);
  const pct = max>min ? Math.min(((safeVal-min)/(max-min))*100, 100) : 0;
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(value));
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const valRef = useRef(value);

  useEffect(() => { valRef.current = value; }, [value]);
  useEffect(() => () => { if(timerRef.current) clearTimeout(timerRef.current); }, []);

  // Slider capped to visual range
  const handleSlider = (raw) => { const n = Number(raw); onChange(isNaN(n) ? min : clamp(n, min, max, min)); };

  // Typed input: allow beyond slider range but enforce hard ceiling
  // Hard ceiling = 100x slider max (prevents garbage like 999999999999)
  const HARD_MAX = max * 100;
  const handleTyped = (raw) => {
    const n = Number(raw);
    if (isNaN(n) || !isFinite(n)) { onChange(min); return; }
    onChange(clamp(n, min, HARD_MAX, min));
  };

  const startEdit = () => {
    setEditVal(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };
  const endEdit = () => { handleTyped(editVal); setEditing(false); vib(5); };

  // Long-press with acceleration
  const startHold = useCallback((dir) => {
    let speed = 300;
    const doNudge = () => {
      const cur = valRef.current;
      const next = Math.max(cur + dir * step, min);
      if (next !== cur) { onChange(next); vib(3); }
    };
    doNudge();
    const repeat = () => { doNudge(); speed = Math.max(50, speed * 0.82); timerRef.current = setTimeout(repeat, speed); };
    timerRef.current = setTimeout(repeat, 400);
  }, [step, min, onChange]);

  const stopHold = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const btnStyle = {width:32,height:32,borderRadius:8,background:t.inputBg,border:`1px solid ${t.border}`,
    color:t.textMuted,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
    fontWeight:500,userSelect:"none",WebkitUserSelect:"none",touchAction:"manipulation"};

  // Show overflow indicator if value exceeds slider max
  const overMax = value > max;

  return (<div style={{marginBottom:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
      <label style={{fontSize:13,color:t.textMuted,fontFamily:"'Inter',system-ui,sans-serif"}}>{label}</label>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <button onPointerDown={()=>startHold(-1)} onPointerUp={stopHold} onPointerLeave={stopHold}
          onContextMenu={e=>e.preventDefault()} aria-label={`Decrease ${label}`} style={btnStyle}>−</button>
        <div onClick={startEdit}
          style={{display:"flex",alignItems:"center",background:t.inputBg,borderRadius:8,padding:"4px 10px",
            border:`1px solid ${editing?color:overMax?color+"80":t.border}`,cursor:"text",minWidth:110,transition:"border-color 0.2s"}}>
          {editing ? (
            <input ref={inputRef} type="number" value={editVal} step={step}
              onChange={e=>setEditVal(e.target.value)} onBlur={endEdit}
              onKeyDown={e=>{if(e.key==="Enter")endEdit()}} autoFocus
              style={{width:100,background:"transparent",border:"none",outline:"none",color,
                fontSize:15,fontFamily:"'JetBrains Mono',monospace",textAlign:"right",
                MozAppearance:"textfield",WebkitAppearance:"none",appearance:"none"}}/>
          ) : (
            <span style={{fontSize:15,fontFamily:"'JetBrains Mono',monospace",color:overMax?color:t.text,textAlign:"right",
              width:100,display:"inline-block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {Number(value).toLocaleString("en-IN")}
            </span>
          )}
          {unit&&<span style={{color:t.textDim,fontSize:12,marginLeft:6,flexShrink:0}}>{unit}</span>}
        </div>
        <button onPointerDown={()=>startHold(1)} onPointerUp={stopHold} onPointerLeave={stopHold}
          onContextMenu={e=>e.preventDefault()} aria-label={`Increase ${label}`} style={btnStyle}>+</button>
      </div>
    </div>
    <input type="range" min={min} max={max} step={step} value={safeVal}
      onChange={e=>{handleSlider(e.target.value);vib(3);}} aria-label={`${label} slider`}
      style={{width:"100%",height:6,borderRadius:3,outline:"none",cursor:"pointer",appearance:"none",WebkitAppearance:"none",
        background:`linear-gradient(to right,${color} ${pct}%,${t.border} ${pct}%)`}}/>
  </div>);
}

// Memo: skip re-render when value/min/max/step/label/color unchanged.
// onChange is stable from useSchemaInputs (ref-based). t is theme object — changes on theme toggle only.
export default React.memo(SliderInputInner, (prev, next) =>
  prev.value === next.value &&
  prev.min === next.min &&
  prev.max === next.max &&
  prev.step === next.step &&
  prev.label === next.label &&
  prev.color === next.color &&
  prev.unit === next.unit &&
  prev.onChange === next.onChange &&
  prev.t === next.t
);
