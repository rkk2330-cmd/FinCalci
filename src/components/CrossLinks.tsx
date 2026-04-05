// FinCalci — Smart cross-links between calculators
import React from 'react';
import { vib } from '../utils/haptics';

const CROSS_LINKS = {
  emi: [{id:"sip",msg:"Can SIP beat your loan interest?",icon:"📈"},{id:"tax",msg:"Claim home loan tax benefits",icon:"🏛️"},{id:"fd",msg:"Compare with FD returns",icon:"💰"}],
  sip: [{id:"emi",msg:"Planning a home loan too?",icon:"🏠"},{id:"ppf",msg:"Add PPF for tax-free returns",icon:"🪴"},{id:"retire",msg:"Check your FIRE number",icon:"🎯"}],
  gst: [{id:"cash",msg:"Count your cash collection",icon:"🏪"},{id:"expense",msg:"Track business expenses",icon:"📒"}],
  tax: [{id:"salary",msg:"See your CTC breakdown",icon:"💼"},{id:"ppf",msg:"Save tax with PPF",icon:"🪴"},{id:"emi",msg:"Home loan tax benefits",icon:"🏠"}],
  fd: [{id:"sip",msg:"SIP gives higher returns",icon:"📈"},{id:"ppf",msg:"PPF: tax-free + 7.1%",icon:"🪴"},{id:"compound",msg:"Understand compound growth",icon:"📊"}],
  salary: [{id:"tax",msg:"Calculate your tax",icon:"🏛️"},{id:"sip",msg:"Invest the difference",icon:"📈"},{id:"expense",msg:"Budget your take-home",icon:"📒"}],
  ppf: [{id:"fd",msg:"Compare with FD",icon:"💰"},{id:"retire",msg:"Plan your retirement",icon:"🎯"},{id:"tax",msg:"Check tax savings",icon:"🏛️"}],
  retire: [{id:"sip",msg:"Start your SIP today",icon:"📈"},{id:"expense",msg:"Track monthly expenses",icon:"📒"},{id:"ppf",msg:"PPF for safe growth",icon:"🪴"}],
  gold: [{id:"currency",msg:"Check USD to INR rate",icon:"💱"},{id:"fd",msg:"Compare with FD returns",icon:"💰"}],
  compound: [{id:"sip",msg:"Try systematic investing",icon:"📈"},{id:"fd",msg:"Fixed deposit rates",icon:"💰"}],
  currency: [{id:"gold",msg:"Check gold prices",icon:"✨"}],
  age: [{id:"date",msg:"Calculate date differences",icon:"📅"},{id:"percentage",msg:"Quick percentage calc",icon:"➗"}],
  expense: [{id:"salary",msg:"Know your take-home pay",icon:"💼"},{id:"gst",msg:"Calculate GST on purchases",icon:"🧾"}],
  cash: [{id:"gst",msg:"Calculate GST",icon:"🧾"},{id:"expense",msg:"Track daily expenses",icon:"📒"}],
};

function CrossLinksInner({calcId,color,t,onOpen}) {
  const links = CROSS_LINKS[calcId];
  if(!links||!links.length) return null;
  return (<div style={{marginTop:18,padding:"14px 0",borderTop:`1px solid ${t.border}`}}>
    <div style={{fontSize:11,color:t.textDim,marginBottom:8,fontWeight:500}}>💡 Related calculators</div>
    {links.map(l=><button key={l.id} onClick={()=>{vib(8);onOpen(l.id)}}
      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:6,
        borderRadius:12,background:t.cardAlt,border:`1px solid ${t.border}`,cursor:"pointer",textAlign:"left"}}>
      <span style={{fontSize:18}}>{l.icon}</span>
      <span style={{flex:1,fontSize:12,color:t.text,fontWeight:500}}>{l.msg}</span>
      <span style={{fontSize:12,color:t.textDim}}>→</span>
    </button>)}
  </div>);
}
export default React.memo(CrossLinksInner);
