// @ts-nocheck — TODO: add strict types
// FinCalci — Onboarding flow v3 (Bold Fintech)
import React from 'react';
import { vib } from '../utils/haptics';
import { tokens, CATEGORY_COLORS } from '../design/tokens';

const { useState } = React;

function OnboardingInner({accent,onDone}) {
  const [step,setStep]=useState(0);
  const steps=[
    {icon:"🧮",title:"Welcome to FinCalci",desc:"18 calculators, 50+ tools in your pocket. EMI, SIP, GST, Tax, Gold, Currency, Khata Book, Expense Tracker & more!",color:'#F43F5E'},
    {icon:"⭐",title:"Favorites & History",desc:"Star your go-to calculators for instant access. Save results and revisit anytime.",color:CATEGORY_COLORS.business},
    {icon:"🎨",title:"Make it Yours",desc:"Dark/Light mode, 8 accent colors, swipe between calculators. Your app, your way!",color:tokens.color.secondary},
    {icon:"🏆",title:"Earn Achievements",desc:"Complete challenges, build daily streaks, and unlock all badges!",color:CATEGORY_COLORS.finance},
  ];
  const s=steps[step];
  return (<div style={{minHeight:"100vh",background:"#0F0F13",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,textAlign:"center"}}>
    <div style={{fontSize:72,marginBottom:24,animation:"bounce 1s ease infinite"}}>{s.icon}</div>
    <h2 style={{fontSize:24,fontWeight:tokens.fontWeight.medium,color:s.color,fontFamily:tokens.fontFamily.sans,marginBottom:tokens.space.md}}>{s.title}</h2>
    <p style={{fontSize:tokens.fontSize.body,color:"#8B8B9E",maxWidth:300,lineHeight:1.6,marginBottom:40}}>{s.desc}</p>
    <div style={{display:"flex",gap:8,marginBottom:30}}>{steps.map((_,i)=><div key={i} style={{width:i===step?24:8,height:8,borderRadius:4,background:i===step?s.color:"#222230",transition:"all 0.3s"}}/>)}</div>
    <button onClick={()=>{if(step<steps.length-1)setStep(step+1);else onDone();vib(10)}}
      style={{padding:"14px 48px",borderRadius:tokens.radius.lg,background:s.color,border:"none",color:"#0F0F13",fontSize:tokens.fontSize.body,fontWeight:tokens.fontWeight.medium,cursor:"pointer",fontFamily:tokens.fontFamily.sans,transition:"transform 0.15s",boxShadow:`0 4px 16px ${s.color}40`}}>
      {step<steps.length-1?"Next →":"Let's Go! 🚀"}</button>
    {step<steps.length-1&&<button onClick={()=>{onDone();vib()}} style={{background:"none",border:"none",color:"#55556B",cursor:"pointer",marginTop:16,fontSize:tokens.fontSize.caption}}>Skip</button>}
    <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
  </div>);
}
export default React.memo(OnboardingInner);
