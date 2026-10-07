import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SponsorAreas from './SponsorAreas';
import Exchange from './Exchange';
import { formatTRY } from './MoneyInput';

const PAYMENT_KEY='@gelir_giderim_payments_v1';
const C={bg:'#0B1020',card:'#141B2D',card2:'#101726',border:'#263149',text:'#F5F7FB',muted:'#95A2B8',income:'#2DD4A7',expense:'#FF6B6B',accent:'#6EA8FE',warning:'#FBBF24'};
const MONTHS=['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
const pad=(n)=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const monthKey=(d)=>String(d||'').slice(0,7);
const CARD_W=Math.min(Dimensions.get('window').width-52,360);

function Stat({label,value,color}){return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={[s.statValue,{color}]} numberOfLines={1}>{value}</Text></View>;}

export default function Home({items,content,onNavigate,onOpenBlog}){
  const now=new Date(),month=monthKey(today()),monthLabel=MONTHS[now.getMonth()]||'BU AY';
  const [payments,setPayments]=useState([]);
  useEffect(()=>{AsyncStorage.getItem(PAYMENT_KEY).then((x)=>setPayments(x?JSON.parse(x):[])).catch(()=>{});},[]);

  const monthItems=useMemo(()=>items.filter((x)=>monthKey(x.date)===month),[items,month]);
  const totals=useMemo(()=>{const income=monthItems.filter((x)=>x.type==='income').reduce((a,x)=>a+Number(x.amount||0),0);const expense=monthItems.filter((x)=>x.type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);return{income,expense,net:income-expense};},[monthItems]);

  const billWaiting=useMemo(()=>payments.filter((p)=>p.kind==='bill'&&!p.paidPeriods?.[month]).reduce((sum,p)=>sum+Number(p.monthlyAmounts?.[month]??p.amount??0),0),[payments,month]);
  const otherWaiting=useMemo(()=>payments.filter((p)=>p.kind!=='bill').reduce((sum,p)=>{const amount=Number(p.amount||0);if(p.kind==='fixed'||p.kind==='loan')return p.paidPeriods?.[month]?sum:sum+amount;if(monthKey(p.dueDate)===month&&!p.paidAt)return sum+amount;return sum;},0),[payments,month]);
  const billsSoon=useMemo(()=>payments.filter((p)=>p.kind==='bill'&&!p.paidPeriods?.[month]).sort((a,b)=>Number(a.dueDay||31)-Number(b.dueDay||31)).slice(0,3),[payments,month]);
  const blogs=useMemo(()=>(content?.blogs||[]).filter((b)=>b?.active!==false&&b?.coverImageUrl).sort((a,b)=>String(b.publishedAt||'').localeCompare(String(a.publishedAt||''))),[content]);

  return <View style={s.wrap}>
    <SponsorAreas areas={content?.sponsorAreas||[]} placement="home_top"/>
    <View style={s.hero}><Text style={s.kicker}>{monthLabel} FİNANS ÖZETİ</Text><Text style={s.heroLabel}>Bu ay net durum</Text><Text style={[s.heroValue,{color:totals.net<0?C.expense:C.text}]}>{formatTRY(totals.net)}</Text><View style={s.statRow}><Stat label="Gelir" value={formatTRY(totals.income)} color={C.income}/><Stat label="Gider" value={formatTRY(totals.expense)} color={C.expense}/><Stat label="Bekleyen" value={formatTRY(billWaiting+otherWaiting)} color={C.warning}/></View></View>

    <View style={s.quickRow}><Pressable onPress={()=>onNavigate('transactions','income')} style={s.quick}><Text style={[s.quickSign,{color:C.income}]}>＋</Text><Text style={s.quickText}>Gelir</Text></Pressable><Pressable onPress={()=>onNavigate('transactions','expense')} style={s.quick}><Text style={[s.quickSign,{color:C.expense}]}>−</Text><Text style={s.quickText}>Gider</Text></Pressable><Pressable onPress={()=>onNavigate('bills')} style={s.quick}><Text style={[s.quickSign,{color:C.warning}]}>▤</Text><Text style={s.quickText}>Fatura</Text></Pressable><Pressable onPress={()=>onNavigate('payments')} style={s.quick}><Text style={[s.quickSign,{color:C.accent}]}>◷</Text><Text style={s.quickText}>Borç</Text></Pressable></View>

    <View style={s.card}><View style={s.head}><Text style={s.cardTitle}>Yaklaşan faturalar</Text><Pressable onPress={()=>onNavigate('bills')}><Text style={s.link}>Tümünü gör ›</Text></Pressable></View>{!billsSoon.length?<Text style={s.muted}>Bekleyen fatura yok.</Text>:billsSoon.map((b)=><View key={b.id} style={s.billRow}><View style={{flex:1}}><Text style={s.billTitle}>{b.billType||'Fatura'} · {b.title||b.name||''}</Text><Text style={s.muted}>Her ay {b.dueDay}. gün{b.owner?` · ${b.owner}`:''}</Text></View><Text style={s.billAmount}>{Number(b.monthlyAmounts?.[month]??b.amount??0)>0?formatTRY(b.monthlyAmounts?.[month]??b.amount):'Tutar gir'}</Text></View>)}</View>

    <Exchange compact/>

    <View style={s.sectionHead}><Text style={s.sectionTitle}>Blogdan</Text><Pressable onPress={()=>onNavigate('blog')}><Text style={s.link}>Tüm yazılar ›</Text></Pressable></View>
    {blogs.length?<ScrollView horizontal pagingEnabled snapToInterval={CARD_W+12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={s.blogRow}>{blogs.map((blog)=><Pressable key={blog.id} onPress={()=>onOpenBlog(blog.id)} style={[s.blogCard,{width:CARD_W}]}><Image source={{uri:blog.coverImageUrl}} style={s.blogImage} resizeMode="cover"/></Pressable>)}</ScrollView>:<View style={s.empty}><Text style={s.muted}>Henüz blog görseli yok.</Text></View>}
    <SponsorAreas areas={content?.sponsorAreas||[]} placement="home_after_blog"/>
    <SponsorAreas areas={content?.sponsorAreas||[]} placement="home_bottom"/>
  </View>;
}

const s=StyleSheet.create({wrap:{gap:16},hero:{backgroundColor:C.card2,borderWidth:1,borderColor:C.border,borderRadius:26,padding:20},kicker:{color:C.accent,fontSize:10,fontWeight:'900',letterSpacing:1.4},heroLabel:{color:C.muted,fontSize:12,marginTop:14},heroValue:{fontSize:36,fontWeight:'900',marginTop:3},statRow:{flexDirection:'row',gap:8,marginTop:18},stat:{flex:1,backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:14,padding:10},statLabel:{color:C.muted,fontSize:9,fontWeight:'800'},statValue:{fontSize:13,fontWeight:'900',marginTop:5},quickRow:{flexDirection:'row',gap:7},quick:{flex:1,backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:16,paddingVertical:11,alignItems:'center'},quickSign:{fontSize:20,fontWeight:'900'},quickText:{color:C.text,fontSize:9,fontWeight:'800',marginTop:2},card:{backgroundColor:C.card,borderWidth:1,borderColor:C.border,borderRadius:20,padding:15,gap:10},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},cardTitle:{color:C.text,fontSize:17,fontWeight:'900'},link:{color:C.accent,fontSize:10,fontWeight:'900'},muted:{color:C.muted,fontSize:10,marginTop:2},billRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderTopWidth:1,borderTopColor:C.border},billTitle:{color:C.text,fontSize:12,fontWeight:'900'},billAmount:{color:C.warning,fontSize:12,fontWeight:'900'},sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},sectionTitle:{color:C.text,fontSize:18,fontWeight:'900'},blogRow:{gap:12,paddingRight:12},blogCard:{height:190,borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:C.border,backgroundColor:C.card},blogImage:{width:'100%',height:'100%'},empty:{height:120,borderRadius:18,borderWidth:1,borderStyle:'dashed',borderColor:C.border,alignItems:'center',justifyContent:'center'}});
