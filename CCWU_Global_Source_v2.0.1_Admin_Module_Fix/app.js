import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatPrice=(amount,currency)=>{const c=String(currency||"USD").toUpperCase();const symbol=c==="CNY"?"¥":c==="USD"?"$":c+" ";return `${symbol}${Number(amount).toFixed(2)} ${c}`};
const safeUrl=u=>{try{const x=new URL(u);return ["https:","http:"].includes(x.protocol)?x.href:"#"}catch{return "#"}};
async function loadList(table,fields,filters={}){let q=db.from(table).select(fields);for(const [k,v] of Object.entries(filters))q=q.eq(k,v);const {data,error}=await q; if(error)throw error;return data||[]}
async function render(){
 try{const dramas=await loadList("dramas","id,title,slug,synopsis,poster_path,release_year,status",{status:"published"});$("dramaGrid").innerHTML=dramas.length?dramas.map(d=>`<article class="media-card"><div class="poster">${d.poster_path?`<img src="${esc(safeUrl(d.poster_path))}" alt="">`:"✦"}</div><div class="media-body"><span class="pill">${d.release_year||"CCWU ORIGINAL"}</span><h3>${esc(d.title)}</h3><p>${esc(d.synopsis||"精彩内容即将呈现。").slice(0,95)}</p><a class="card-action" href="player.html?drama=${encodeURIComponent(d.id)}">查看剧集 →</a></div></article>`).join(""):`<div class="loading">影视内容正在筹备中，敬请期待。</div>`}catch(e){$("dramaGrid").innerHTML='<div class="loading">暂时无法读取影视内容，请稍后再试。</div>'}
 try{const rows=await loadList("service_catalog","id,title,slug,description,category",{is_published:true});$("serviceGrid").innerHTML=rows.length?rows.map((x,i)=>`<article class="service-card"><div class="service-icon">${["◈","⌘","✧","◎"][i%4]}</div><h3>${esc(x.title)}</h3><p>${esc(x.description||"探索这项数字服务。")}</p><span class="pill">${esc(x.category)}</span></article>`).join(""):`<div class="loading">服务目录正在整理中。</div>`}catch{$("serviceGrid").innerHTML='<div class="loading">暂时无法读取服务目录。</div>'}
 try{const rows=await loadList("membership_plans","id,name,description,price_amount,currency,duration_days",{is_active:true});$("membershipGrid").innerHTML=rows.length?rows.map(x=>`<article class="plan-card"><span class="pill">MEMBERSHIP</span><h3>${esc(x.name)}</h3><div class="price">${esc(formatPrice(x.price_amount,x.currency))} <small>/ ${x.duration_days} 天</small></div><p>${esc(x.description||"会员专属内容与权益")}</p><ul><li>${x.duration_days} 天会员有效期</li><li>会员内容访问权益</li></ul><button class="btn btn-primary" ${ `data-checkout-type="membership" data-plan-id="${esc(x.id)}"`}>立即购买</button></article>`).join(""):`<div class="loading">会员套餐即将开放。</div>`}catch{$("membershipGrid").innerHTML='<div class="loading">暂时无法读取会员套餐。</div>'}
 try{const rows=await loadList("vpn_plans","id,name,description,price_amount,currency,duration_days,device_limit",{is_active:true});$("vpnGrid").innerHTML=rows.length?rows.map(x=>`<article class="plan-card"><span class="pill">VPN PLAN</span><h3>${esc(x.name)}</h3><div class="price">${esc(formatPrice(x.price_amount,x.currency))} <small>/ ${x.duration_days} 天</small></div><p>${esc(x.description||"稳定连接服务")}</p><ul><li>${x.duration_days} 天使用期</li><li>最多 ${x.device_limit} 台设备</li></ul><button class="btn btn-primary" data-checkout-type="vpn" data-plan-id="${esc(x.id)}">立即购买</button></article>`).join(""):`<div class="loading">VPN 套餐即将开放。</div>`}catch{$("vpnGrid").innerHTML='<div class="loading">暂时无法读取 VPN 套餐。</div>'}
 try{const rows=await loadList("tutorials","id,title,slug,summary,category",{status:"published"});$("tutorialGrid").innerHTML=rows.length?rows.map((x,i)=>`<article class="tutorial-card"><div class="number">GUIDE / ${String(i+1).padStart(2,"0")}</div><h3>${esc(x.title)}</h3><p>${esc(x.summary||"实用教程与操作指南。")}</p><span class="pill">${esc(x.category)}</span></article>`).join(""):`<div class="loading">教程内容正在准备中。</div>`}catch{$("tutorialGrid").innerHTML='<div class="loading">暂时无法读取教程。</div>'}
}
let mode="login";
function setMode(v){mode=v;$("authTitle").textContent=v==="login"?"登录账户":"创建账户";$("authSubmit").textContent=v==="login"?"登录":"注册";$("nameField").classList.toggle("hidden",v!=="signup");document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===v));$("authMessage").textContent=""}
function showAuth(){ $("authModal").classList.remove("hidden");}
$("authButton").onclick=showAuth;$("ctaAuth").onclick=showAuth;$("closeAuth").onclick=()=>$("authModal").classList.add("hidden");document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$("authForm").onsubmit=async e=>{e.preventDefault();$("authSubmit").disabled=true;$("authMessage").textContent="正在处理…";const email=$("authEmail").value.trim(),password=$("authPassword").value;let result;if(mode==="login")result=await db.auth.signInWithPassword({email,password});else result=await db.auth.signUp({email,password,options:{data:{name:$("displayName").value.trim()}}});$("authSubmit").disabled=false;$("authMessage").textContent=result.error?result.error.message:(mode==="signup"?"注册请求已提交，请按邮件提示完成验证。":"登录成功。");if(!result.error&&mode==="login"){$("authModal").classList.add("hidden");await refreshUser()}};
async function refreshUser(){const {data:{user}}=await db.auth.getUser();$("userLabel").textContent=user?user.email:"访客";$("authButton").textContent=user?"账户 / 退出":"登录 / 注册";$("authButton").onclick=async()=>{if(user){await db.auth.signOut();await refreshUser()}else showAuth()}}
let activeManualOrder = null;
let manualPaymentSettings = null;
let pendingCheckout = null;
const manualModal = $("manualPayModal");
const checkoutModal = $("checkoutModal");
$("closeManualPay").addEventListener("click",()=>manualModal.classList.add("hidden"));
$("closeCheckout").addEventListener("click",()=>checkoutModal.classList.add("hidden"));
$("manualPayMethod").addEventListener("change",renderManualQr);
function renderManualQr(){
 const method=$("manualPayMethod").value; const enabled=method==="alipay"?manualPaymentSettings?.alipay_enabled:manualPaymentSettings?.wechat_enabled;
 const path=method==="alipay"?manualPaymentSettings?.alipay_qr_path:manualPaymentSettings?.wechat_qr_path;
 const box=$("manualPayQr");
 if(!enabled||!path){box.innerHTML='<p class="notice">该支付方式暂未开放，请选择其他方式或稍后再试。</p>';$("manualPaySubmit").disabled=true;return;}
 const {data}=db.storage.from("ccwu-payment-qr").getPublicUrl(path);
 box.innerHTML=`<img src="${esc(data.publicUrl)}" alt="${method==="alipay"?"支付宝":"微信支付"}收款二维码" style="width:min(260px,80%);height:auto;object-fit:contain;border:1px solid #e4ece9;border-radius:10px;padding:8px;background:white">`;
 $("manualPaySubmit").disabled=false;
}
async function openCheckout(itemType,itemId,button){
 const {data:{user}}=await db.auth.getUser(); if(!user){showAuth();$("authMessage").textContent="请先登录，再继续购买。";return;}
 const table=itemType==="membership"?"membership_plans":"vpn_plans";
 const fields=itemType==="membership"?"id,name,price_amount,currency,duration_days":"id,name,price_amount,currency,duration_days,device_limit";
 const {data:plan,error:planError}=await db.from(table).select(fields).eq("id",itemId).eq("is_active",true).single();if(planError)throw planError;
 const {data:settings,error:settingsError}=await db.from("manual_payment_settings").select("alipay_qr_path,wechat_qr_path,alipay_enabled,wechat_enabled,instructions").eq("id",true).single();
 if(settingsError)throw new Error("支付配置暂不可读取，请管理员检查数据库迁移和权限。");
 manualPaymentSettings=settings;pendingCheckout={itemType,itemId,plan};
 $("checkoutSummary").textContent=`${plan.name}｜${plan.duration_days} 天｜应付 ${formatPrice(plan.price_amount,plan.currency)}`;
 $("alipayState").textContent=settings.alipay_enabled&&settings.alipay_qr_path?"二维码已配置，可选择":"待上传二维码";
 $("wechatState").textContent=settings.wechat_enabled&&settings.wechat_qr_path?"二维码已配置，可选择":"待上传二维码";
 document.querySelectorAll('[data-payment-method="alipay"],[data-payment-method="wechat"]').forEach(b=>{const m=b.dataset.paymentMethod;const ok=m==="alipay"?settings.alipay_enabled&&settings.alipay_qr_path:settings.wechat_enabled&&settings.wechat_qr_path;b.disabled=!ok;});
 $("checkoutMessage").textContent="";checkoutModal.classList.remove("hidden");
}
document.addEventListener("click",async e=>{
 const methodButton=e.target.closest("[data-payment-method]");
 if(methodButton&&!methodButton.disabled){
  if(!pendingCheckout)return;methodButton.setAttribute("aria-busy","true");$("checkoutMessage").textContent="正在创建订单…";
  try{
   const {data:order,error}=await db.rpc("create_manual_payment_order",{p_item_type:pendingCheckout.itemType,p_item_id:pendingCheckout.itemId});if(error)throw error;activeManualOrder=order;
   const method=methodButton.dataset.paymentMethod;$("manualPayMethod").innerHTML=`<option value="${method}">${method==="alipay"?"支付宝":"微信支付"}</option>`;
   $("manualPayDetails").textContent=`订单 ${order.order_no}｜${order.title}｜应付 ${formatPrice(order.amount,order.currency)}`;$("manualPayInstructions").textContent=manualPaymentSettings.instructions||"请扫码付款，并提交付款单号。";
   $("manualPayReference").value="";$("manualPayProof").value="";$("manualPayMessage").textContent="";renderManualQr();checkoutModal.classList.add("hidden");manualModal.classList.remove("hidden");
  }catch(err){$("checkoutMessage").textContent=err.message||"订单创建失败，请稍后重试。";}finally{methodButton.removeAttribute("aria-busy");}
  return;
 }
 const button=e.target.closest("[data-checkout-type]");if(!button)return;const original=button.textContent;button.disabled=true;button.textContent="请稍候…";
 try{await openCheckout(button.dataset.checkoutType,button.dataset.planId,button);}catch(err){window.alert(err.message||"暂时无法进入收银台。");}finally{button.disabled=false;button.textContent=original;}
});
$("manualPayForm").addEventListener("submit",async e=>{
 e.preventDefault(); if(!activeManualOrder)return;
 const submit=$("manualPaySubmit");submit.disabled=true;$("manualPayMessage").textContent="正在提交…";
 try{
  let proofPath=null;const file=$("manualPayProof").files[0];
  if(file){if(file.size>8*1024*1024)throw new Error("付款凭证不能超过 8MB。");const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");proofPath=`${(await db.auth.getUser()).data.user.id}/${activeManualOrder.order_id}/${crypto.randomUUID()}.${ext}`;const up=await db.storage.from("ccwu-payment-proofs").upload(proofPath,file,{upsert:false,contentType:file.type});if(up.error)throw up.error;}
  const {data:{user}}=await db.auth.getUser();
  const {error}=await db.from("manual_payment_submissions").insert({order_id:activeManualOrder.order_id,user_id:user.id,method:$("manualPayMethod").value,payer_reference:$("manualPayReference").value.trim(),proof_path:proofPath,status:"submitted"});if(error)throw error;
  $("manualPayMessage").textContent="付款信息已提交，订单进入人工审核。核实到账后将开通服务。";$("manualPayForm").reset();activeManualOrder=null;
 }catch(err){$("manualPayMessage").textContent=err.message||"提交失败，请重试。";}finally{submit.disabled=!activeManualOrder;}
});
$("menuBtn").onclick=()=>{const n=document.querySelector(".topbar nav");n.style.display=n.style.display==="flex"?"none":"flex";n.style.position="absolute";n.style.top="76px";n.style.left="0";n.style.right="0";n.style.padding="20px";n.style.background="white";n.style.flexDirection="column"};
await render();await refreshUser();db.auth.onAuthStateChange(()=>refreshUser());
