// @ts-nocheck — TODO: add strict types
// FinCalci — Onboarding flow
import React from 'react';
import { vib } from '../utils/haptics';
import { tokens } from '../design/tokens';

const { useState } = React;

function OnboardingInner({accent,onDone}) {
  const [step,setStep]=useState(0);
  const steps=[
    {icon:"🧮",title:"Welcome to FinCalci",desc:"20 calculators, 60+ tools in your pocket. EMI, SIP, GST, Tax, Gold, Currency, Khata Book, Expense Tracker & more!",color:tokens.color.danger},
    {icon:"⭐",title:"Favorites & History",desc:"Star your go-to calculators for instant access. Save results and revisit anytime.",color:"#F59E0B"},
    {icon:"🎨",title:"Make it Yours",desc:"Dark/Light mode, 8 accent colors, swipe between calculators. Your app, your way!",color:tokens.color.secondary},
    {icon:"🏆",title:"Earn Achievements",desc:"Complete challenges, build daily streaks, and unlock all badges!",color:tokens.color.primary},
  ];
  const s=steps[step];
  return (<div style={{minHeight:"100vh",background:"#0B0F1A",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,textAlign:"center"}}>
    <div style={{fontSize:80,marginBottom:24,animation:"bounce 1s ease infinite"}}>{s.icon}</div>
    <h2 style={{fontSize:26,fontWeight:tokens.fontWeight.medium,color:s.color,fontFamily:tokens.fontFamily.sans,marginBottom:tokens.space.md}}>{s.title}</h2>
    <p style={{fontSize:tokens.fontSize.small,color:"#94A3B8",maxWidth:300,lineHeight:1.6,marginBottom:40}}>{s.desc}</p>
    <div style={{display:"flex",gap:8,marginBottom:30}}>{steps.map((_,i)=><div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?s.color:"#1A2332",transition:"all 0.3s"}}/>)}</div>
    <button onClick={()=>{if(step<steps.length-1)setStep(step+1);else onDone();vib(10)}}
      style={{padding:"14px 48px",borderRadius:tokens.radius.lg,background:s.color,border:"none",color:"#0B0F1A",fontSize:tokens.fontSize.body,fontWeight:tokens.fontWeight.medium,cursor:"pointer",fontFamily:tokens.fontFamily.sans}}>
      {step<steps.length-1?"Next →":"Let's Go! 🚀"}</button>
    {step<steps.length-1&&<button onClick={()=>{onDone();vib()}} style={{background:"none",border:"none",color:"#64748B",cursor:"pointer",marginTop:16,fontSize:tokens.fontSize.caption}}>Skip</button>}
    
  </div>);
}
export default React.memo(OnboardingInner);
