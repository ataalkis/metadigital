import React,{useMemo,useState}from'react';
import{Pressable,ScrollView,StyleSheet,Text,View}from'react-native';
import{formatTRY}from'./MoneyInput';

const C={card:'#141B2D',card2:'#101726',border:'#263149',text:'#F5F7FB',muted:'#95A2B8',accent:'#6EA8FE',income:'#2DD4A7',expense:'#FF6B6B'};
const monthKey=d=>String(d||'').slice(0,7);
const nowMonth=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};

function Chip({label,active,onPress}){return<Pressable onPress={onPress} style={[s.chip,active&&s.chipActive]}><Text style={[s.chipText,active&&{color:C.accent}]}>{label}</Text></Pressable>}

export default function Reports({items=[]}){
 const months=useMemo(()=>[...new Set([nowMonth(),...items.map(x=>monthKey(x.date))])].filter(Boolean).sort().reverse(),[items]);
 const[month,setMonth]=useState(months[0]||nowMonth());
 const data=useMemo(()=>items.filter(x=>monthKey(x.date)===month),[items,month]);
 const income=useMemo(()=>data.filter(x=>x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0),[data]);
 const expense=useMemo(()=>data.filter(x=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0),[data]);
 const byType=(type)=>Object.entries(data.filter(x=>x.type===type).reduce((acc,x)=>{const k=x.category||'Diğer';acc[k]=(acc[k]||0)+Number(x.amount||0);return acc},{})).sort((a,b)=>b[1]-a[1]);
 const expenseRows=useMemo(()=>byType('expense'),[data]);
 const incomeRows=useMemo(()=>byType('income'),[data]);
 return<View style={s.wrap}><View><Text style={s.title}>Raporlar</Text><Text style={s.sub}>Market, benzin, faturalar, abonelikler, kira ve diğer harcamaları tek ekranda gör.</Text></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{months.map(m=><Chip key={m} label={m} active={month===m} onPress={()=>setMonth(m)}/>)}</ScrollView>
  <View style={s.summary}><View style={s.box}><Text style={s.small}>GELİR</Text><Text style={[s.value,{color:C.income}]}>{formatTRY(income)}</Text></View><View style={s.box}><Text style={s.small}>GİDER</Text><Text style={[s.value,{color:C.expense}]}>{formatTRY(expense)}</Text></View></View>
  <View style={s.card}><Text style={s.cardTitle}>Gider dağılımı</Text>{!expenseRows.length?<Text style={s.empty}>Bu ay gider yok.</Text>:expenseRows.map(([name,total])=><View key={name} style={s.line}><Text style={s.name}>{name}</Text><Text style={[s.total,{color:C.expense}]}>{formatTRY(total)}</Text></View>)}</View>
  <View style={s.card}><Text style={s.cardTitle}>Gelir dağılımı</Text>{!incomeRows.length?<Text style={s.empty}>Bu ay gelir yok.</Text>:incomeRows.map(([name,total])=><View key={name} style={s.line}><Text style={s.name}>{name}</Text><Text style={[s.total,{color:C.income}]}>{formatTRY(total)}</Text></View>)}</View>
 </View>
}
const s=StyleSheet.create({wrap:{gap:14},title:{color:C.text,fontSize:25,fontWeight:'900'},sub:{color:C.muted,fontSize:12,lineHeight:18,marginTop:4},row:{gap:7},chip:{backgroundColor:C.card2,borderWidth:1,borderColor:C.border,borderRadius:999,paddingHorizontal:13,paddingVertical:8},chipActive:{borderColor:C.accent,backgroundColor:'rgba(110,168,254,.13)'},chipText:{color:C.muted,fontWeight:'800'},summary:{flexDirection:'row',gap:10},box:{flex:1,backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:18,padding:14},small:{color:C.muted,fontSize:9,fontWeight:'900'},value:{fontSize:18,fontWeight:'900',marginTop:7},card:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:20,padding:15,gap:9},cardTitle:{color:C.text,fontSize:17,fontWeight:'900'},line:{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:9,borderTopWidth:1,borderTopColor:C.border},name:{color:C.text,fontSize:12,fontWeight:'800'},total:{fontSize:12,fontWeight:'900'},empty:{color:C.muted,fontSize:11}});
