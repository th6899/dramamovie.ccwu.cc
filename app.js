import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatPrice=(amount,currency)=>{const c=String(currency||"USD").toUpperCase();const symbol=c==="CNY"?"¥":c==="USD"?"$":c+" ";return `${symbol}${Number(amount).toFixed(2)} ${c}`};
const safeUrl=u=>{try{const x=new URL(u);return ["https:","http:"].includes(x.protocol)?x.href:"#"}catch{return "#"}};
const posterUrl=value=>{const raw=String(value||"").trim();if(!raw||raw.startsWith("/")||raw.split("/").some(part=>part==="."||part===".."))return "#";if(/^https?:\/\//i.test(raw))return safeUrl(raw);const {data}=db.storage.from("ccwu-cinema-posters").getPublicUrl(raw);return safeUrl(data?.publicUrl||"")};
async function loadList(table,fields,filters={}){let q=db.from(table).select(fields);for(const [k,v] of Object.entries(filters))q=q.eq(k,v);const {data,error}=await q; if(error)throw error;return data||[]}
function renderCinema(dramas){
 const root=$("dramaGrid");
 if(!dramas.length){
  root.innerHTML="<section class=\"cinema-hero cinema-hero-empty\"><div class=\"cinema-hero-copy\"><span class=\"cinema-eyebrow\">CCWU CINEMA · VIDEO DISCOVERY</span><h1>精彩影视，即将呈现</h1><p>剧集上线后，精选海报、剧集介绍与播放入口将在这里自动展示。</p><span class=\"cinema-empty-note\">目前暂无已发布影视作品</span></div><div class=\"cinema-hero-art\"><span>CCWU</span><i>▶</i></div></section><nav class=\"cinema-category-strip\"><a href=\"#cinema-featured\">精选推荐</a><a href=\"#cinema-featured\">全部影视</a><a href=\"#cinema-featured\">短剧</a><a href=\"#cinema-featured\">电影</a><a href=\"#cinema-featured\">纪录片</a></nav><section class=\"cinema-shelf\" id=\"cinema-featured\"><div class=\"cinema-shelf-head\"><h2>精选推荐</h2><span>等待作品发布</span></div><div class=\"cinema-empty-panel\"><div class=\"cinema-empty-icon\">▶</div><b>影视内容正在筹备中</b><p>管理员发布影视作品后，海报和播放入口会自动出现在这里。</p></div></section>";
  const search=$("cinemaSearch");if(search){search.value="";search.disabled=true;search.placeholder="暂无可搜索影视内容";search.oninput=null;}
  return;
 }
 const featured=dramas[0],heroImage=featured.poster_path?posterUrl(featured.poster_path):"";
 const cats=[...new Set(dramas.map(d=>String(d.category||d.genre||d.content_type||d.type||"").trim()).filter(Boolean))];
 const names=cats.length?cats:["全部影视"];
 const card=function(d){const src=d.poster_path?posterUrl(d.poster_path):"";return "<a class=\"cinema-card\" href=\"player.html?drama="+encodeURIComponent(d.id)+"\"><div class=\"cinema-poster\">"+(src&&src!=="#"?("<img loading=\"lazy\" src=\""+esc(src)+"\" alt=\""+esc(d.title)+"海报\">"):"<div class=\"poster-placeholder\">CCWU</div>")+"<span class=\"poster-tag\">精选</span></div><div class=\"cinema-card-title\">"+esc(d.title)+"</div><div class=\"cinema-card-meta\">"+esc(d.release_year||"影视剧场")+"</div></a>";};
 const shelves=cats.length?cats.map(name=>({name:name,items:dramas.filter(d=>String(d.category||d.genre||d.content_type||d.type||"").trim()===name)})):[{name:"全部影视",items:dramas}];
 const style=heroImage&&heroImage!=="#"?("--hero-image:url(\""+esc(heroImage)+"\");"):"";
 root.innerHTML="<section class=\"cinema-hero\" style=\""+style+"\"><div class=\"cinema-hero-copy\"><span class=\"cinema-eyebrow\">CCWU CINEMA · 精选推荐</span><h1>"+esc(featured.title)+"</h1><p>"+esc(featured.synopsis||"发现更多精彩影视内容。").slice(0,150)+"</p><a class=\"cinema-play\" href=\"player.html?drama="+encodeURIComponent(featured.id)+"\">▶ 立即播放</a></div></section><nav class=\"cinema-category-strip\">"+names.map((n,i)=>"<a href=\"#cinema-shelf-"+i+"\">"+esc(n)+"</a>").join("")+"</nav>"+shelves.map((s,i)=>"<section class=\"cinema-shelf\" id=\"cinema-shelf-"+i+"\"><div class=\"cinema-shelf-head\"><h2>"+esc(s.name)+"</h2><span>"+s.items.length+" 部作品</span></div><div class=\"cinema-row\">"+s.items.map(card).join("")+"</div></section>").join("");
 const search=$("cinemaSearch");if(search){search.disabled=false;search.placeholder="搜索影视、剧名";search.oninput=function(){const q=search.value.trim().toLowerCase();root.querySelectorAll(".cinema-card").forEach(el=>{el.hidden=!el.textContent.toLowerCase().includes(q);});};}
 const side=$("cinemaSidebar");if(side)side.innerHTML="<div class=\"sidebar-brand\">CCWU CINEMA</div><a class=\"active\" href=\"#dramas\">⌂　影视首页</a>"+names.map((n,i)=>"<a href=\"#cinema-shelf-"+i+"\">▣　"+esc(n)+"</a>").join("")+"<a href=\"#services\">◈　数字服务</a><a href=\"#membership\">♢　会员专区</a><a href=\"#vpn\">⌁　VPN 服务</a><a href=\"#tutorials\">▤　教程中心</a>";
}
async function render(){
 try{const dramas=await loadList("dramas","*",{status:"published"});renderCinema(dramas)}catch(e){console.error("[CCWU Portal] cinema load failed",e);$("dramaGrid").innerHTML='<div class="loading">影视内容暂时无法加载，请稍后重试。</div>'}
 try{const rows=await loadList("service_catalog","id,title,slug,description,category",{is_published:true});$("serviceGrid").innerHTML=rows.length?rows.map((x,i)=>`<article class="service-card"><div class="service-icon">${["◈","⌘","✧","◎"][i%4]}</div><h3>${esc(x.title)}</h3><p>${esc(x.description||"探索这项数字服务。")}</p><span class="pill">${esc(x.category)}</span></article>`).join(""):`<div class="loading">服务目录正在整理中。</div>`}catch{$("serviceGrid").innerHTML='<div class="loading">暂时无法读取服务目录。</div>'}
 try{const rows=await loadList("membership_plans","id,name,description,price_amount,currency,duration_days",{is_active:true});$("membershipGrid").innerHTML=rows.length?rows.map(x=>`<article class="plan-card"><span class="pill">MEMBERSHIP</span><h3>${esc(x.name)}</h3><div class="price">${esc(formatPrice(x.price_amount,x.currency))} <small>/ ${x.duration_days} 天</small></div><p>${esc(x.description||"会员专属内容与权益")}</p><ul><li>${x.duration_days} 天会员有效期</li><li>会员内容访问权益</li></ul><button class="btn btn-primary" ${ `data-checkout-type="membership" data-plan-id="${esc(x.id)}"`}>立即购买</button></article>`).join(""):`<div class="loading">会员套餐即将开放。</div>`}catch{$("membershipGrid").innerHTML='<div class="loading">暂时无法读取会员套餐。</div>'}
 try{const rows=await loadList("vpn_plans","id,name,description,price_amount,currency,duration_days,device_limit",{is_active:true});$("vpnGrid").innerHTML=rows.length?rows.map(x=>`<article class="plan-card"><span class="pill">VPN PLAN</span><h3>${esc(x.name)}</h3><div class="price">${esc(formatPrice(x.price_amount,x.currency))} <small>/ ${x.duration_days} 天</small></div><p>${esc(x.description||"稳定连接服务")}</p><ul><li>${x.duration_days} 天使用期</li><li>最多 ${x.device_limit} 台设备</li></ul><button class="btn btn-primary" data-checkout-type="vpn" data-plan-id="${esc(x.id)}">立即购买</button></article>`).join(""):`<div class="loading">VPN 套餐即将开放。</div>`}catch{$("vpnGrid").innerHTML='<div class="loading">暂时无法读取 VPN 套餐。</div>'}
 try{const rows=await loadList("tutorials","id,title,slug,summary,category",{status:"published"});$("tutorialGrid").innerHTML=rows.length?rows.map((x,i)=>`<article class="tutorial-card"><div class="number">GUIDE / ${String(i+1).padStart(2,"0")}</div><h3>${esc(x.title)}</h3><p>${esc(x.summary||"实用教程与操作指南。")}</p><span class="pill">${esc(x.category)}</span></article>`).join(""):`<div class="loading">教程内容正在准备中。</div>`}catch{$("tutorialGrid").innerHTML='<div class="loading">暂时无法读取教程。</div>'}
}
let mode="login";
function setMode(v){mode=v;$("authTitle").textContent=v==="login"?"登录账户":"创建账户";$("authSubmit").textContent=v==="login"?"登录":"注册";$("nameField").classList.toggle("hidden",v!=="signup");document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===v));$("authMessage").textContent=""}
function showAuth(){ $("authModal").classList.remove("hidden");}
$("authButton").onclick=showAuth;$("ctaAuth").onclick=showAuth;$("closeAuth").onclick=()=>$("authModal").classList.add("hidden");document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$("authForm").onsubmit=async e=>{
 e.preventDefault();
 const submit=$("authSubmit");
 submit.disabled=true;
 $("authMessage").textContent="正在处理…";
 try{
  const email=$("authEmail").value.trim(),password=$("authPassword").value;
  const result=mode==="login"
   ? await db.auth.signInWithPassword({email,password})
   : await db.auth.signUp({email,password,options:{data:{name:$("displayName").value.trim()}}});
  if(result.error)throw result.error;
  $("authMessage").textContent=mode==="signup"?"注册请求已提交，请按邮件提示完成验证。":"登录成功。";
  if(mode==="login"){
   $("authModal").classList.add("hidden");
   if(new URLSearchParams(location.search).get("return")==="account"){
    location.href="./account.html";
    return;
   }
   await refreshUser();
  }
 }catch(error){
  console.error("[CCWU Portal] Authentication failed",error);
  $("authMessage").textContent=error?.message||"认证请求失败，请检查网络后重试。";
 }finally{
  submit.disabled=false;
 }
};
function updateUserUI(user){$("userLabel").textContent=user?user.email:"访客";$("authButton").textContent=user?"账户中心":"登录 / 注册";$("authButton").onclick=()=>{if(user){location.href="./account.html";}else showAuth();};}
async function refreshUser(){const {data:{user},error}=await db.auth.getUser();if(error)throw error;updateUserUI(user);}
let activeManualOrder = null;
let manualPaymentSettings = null;
let nativePaymentMethods = [];
let pendingCheckout = null;
let activeNativeOrder = null;
let nativePaymentPoll = null;
let nativePollingInFlight = false;
let nativeQrObjectUrl = null;
const manualModal = $("manualPayModal");
const checkoutModal = $("checkoutModal");
const nativeModal = $("nativePayModal");
$("closeManualPay").addEventListener("click",()=>manualModal.classList.add("hidden"));
$("closeCheckout").addEventListener("click",()=>checkoutModal.classList.add("hidden"));
function stopNativePaymentPolling(){if(nativePaymentPoll){clearInterval(nativePaymentPoll);nativePaymentPoll=null;}nativePollingInFlight=false;}
$("closeNativePay").addEventListener("click",()=>{stopNativePaymentPolling();activeNativeOrder=null;if(nativeQrObjectUrl){URL.revokeObjectURL(nativeQrObjectUrl);nativeQrObjectUrl=null;}nativeModal.classList.add("hidden");});
async function pollNativePayment(){
 if(!activeNativeOrder||nativePollingInFlight)return;
 nativePollingInFlight=true;
 try{
  const {data,error}=await db.rpc("get_my_cn_payment_order",{p_order_no:activeNativeOrder.order_no});
  if(error||!data)return;
  const status=String(data.status||"pending").toLowerCase();
  const expired=data.payment_expires_at&&Date.now()>=new Date(data.payment_expires_at).getTime();
  if(status==="paid"){
   stopNativePaymentPolling();
   $("nativePayStatus").textContent="支付已确认，服务权益正在刷新…";
   await refreshUser();await render();
   $("nativePayStatus").textContent="支付成功！您的订单已确认。";
  }else if(["failed","cancelled","canceled","expired"].includes(status)||expired){
   stopNativePaymentPolling();
   $("nativePayStatus").textContent="订单已失效，请关闭窗口后重新创建订单。";
  }else{
   $("nativePayStatus").textContent="等待支付确认…请勿重复付款。";
  }
 }catch(error){console.warn("[CCWU Portal] payment status poll failed",error);}
 finally{nativePollingInFlight=false;}
}
async function startNativePayment(methodButton){
 const method=methodButton.dataset.paymentMethod;
 const provider=method==="alipay"?"alipay":"wechat_pay";
 const {data,error}=await db.functions.invoke("cn-payment",{body:{
  provider,item_type:pendingCheckout.itemType,item_id:pendingCheckout.itemId,request_key:crypto.randomUUID()
 }});
 if(error)throw new Error("自动扫码支付暂不可用，请检查测试商户配置后重试。");
 if(!data||!data.ok||!data.qr_code)throw new Error(data?.error||"支付通道未返回有效二维码。");
 activeNativeOrder={order_no:data.order_no,provider};
 $("nativePayTitle").textContent=provider==="alipay"?"支付宝扫码支付":"微信支付";
 $("nativePayDetails").textContent="订单 "+data.order_no+"｜应付 "+formatPrice(data.amount,data.currency);
 $("nativePayQr").innerHTML="";
 if(nativeQrObjectUrl){URL.revokeObjectURL(nativeQrObjectUrl);nativeQrObjectUrl=null;}
 if(typeof data.qr_svg==="string"){
  nativeQrObjectUrl=URL.createObjectURL(new Blob([data.qr_svg],{type:"image/svg+xml"}));
  const image=document.createElement("img");image.src=nativeQrObjectUrl;image.alt="支付二维码";image.style.width="240px";image.style.maxWidth="80%";image.style.height="auto";$("nativePayQr").append(image);
 }else{
  const link=document.createElement("a");link.href=data.qr_code;link.textContent="打开支付二维码链接";link.target="_blank";link.rel="noopener noreferrer";$("nativePayQr").append(link);
 }
 $("nativePayStatus").textContent="请使用对应支付 App 扫码，系统将自动确认到账。";
 checkoutModal.classList.add("hidden");nativeModal.classList.remove("hidden");
 stopNativePaymentPolling();nativePaymentPoll=setInterval(()=>{void pollNativePayment();},3000);await pollNativePayment();
}
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
 manualPaymentSettings=settingsError?{alipay_qr_path:null,wechat_qr_path:null,alipay_enabled:false,wechat_enabled:false,instructions:""}:settings;
 const {data:methods,error:methodsError}=await db.from("payment_methods").select("provider,asset,environment,is_enabled").eq("asset","CNY").eq("is_enabled",true);
 nativePaymentMethods=methodsError?[]:(methods||[]);
 pendingCheckout={itemType,itemId,plan,requestKey:crypto.randomUUID()};
 $("checkoutSummary").textContent=plan.name+"｜"+plan.duration_days+" 天｜应付 "+formatPrice(plan.price_amount,plan.currency);
 const isCny=String(plan.currency).toUpperCase()==="CNY";
 document.querySelectorAll('[data-payment-method="alipay"],[data-payment-method="wechat"]').forEach(b=>{
  const m=b.dataset.paymentMethod,provider=m==="alipay"?"alipay":"wechat_pay";
  const native=nativePaymentMethods.find(x=>x.provider===provider&&x.asset==="CNY"&&x.is_enabled);
  const nativeAllowed=!!native&&!(provider==="wechat_pay"&&native.environment==="test");
  const manual=m==="alipay"?!!(manualPaymentSettings.alipay_enabled&&manualPaymentSettings.alipay_qr_path):!!(manualPaymentSettings.wechat_enabled&&manualPaymentSettings.wechat_qr_path);
  b.dataset.paymentMode=nativeAllowed?"native":manual?"manual":"disabled";
  b.disabled=!(isCny&&(nativeAllowed||manual));
  const state=m==="alipay"?$("alipayState"):$("wechatState");
  state.textContent=nativeAllowed?(native.environment==="test"?"自动扫码（沙箱）":"自动扫码支付"):manual?"人工扫码，提交付款凭证":(provider==="wechat_pay"&&native?.environment==="test"?"API v3 无独立沙箱，暂不开放":"待商户配置");
 });
 const stripeButton=$("stripeCheckoutButton");
 if(stripeButton){stripeButton.disabled=String(plan.currency).toUpperCase()!=="USD";$("stripeState").textContent=String(plan.currency).toUpperCase()==="USD"?"可使用 Stripe 测试结账":"此套餐为人民币计价；Stripe 仅支持美元套餐";}
 $("checkoutMessage").textContent="";checkoutModal.classList.remove("hidden");
}
document.addEventListener("click",async e=>{
 const methodButton=e.target.closest("[data-payment-method]");
 if(methodButton&&!methodButton.disabled){
  if(!pendingCheckout)return;
  if(methodButton.dataset.paymentMethod==="stripe"){
   methodButton.setAttribute("aria-busy","true");$("checkoutMessage").textContent="正在连接 Stripe 测试收银台…";
   try{
    const {data:{user},error:userError}=await db.auth.getUser();if(userError||!user)throw new Error("请先登录后再购买。");
    if(String(pendingCheckout.plan.currency).toUpperCase()!=="USD")throw new Error("Stripe 仅支持美元套餐。");
    const {data,error}=await db.functions.invoke("create-checkout",{body:{itemType:pendingCheckout.itemType,itemId:pendingCheckout.itemId,currency:"USD",region:"international",requestKey:pendingCheckout.requestKey}});
    if(error)throw new Error("Stripe 测试结账暂不可用，请检查测试密钥、USD 价格 ID 和预览站点配置。");
    if(!data||typeof data.checkout_url!=="string"||!data.checkout_url.startsWith("https://checkout.stripe.com/"))throw new Error("Stripe 未返回有效的安全收银台地址。");
    window.location.assign(data.checkout_url);
   }catch(err){$("checkoutMessage").textContent=err.message||"Stripe 测试结账失败，请稍后重试。";}finally{methodButton.removeAttribute("aria-busy");}
   return;
  }
  methodButton.setAttribute("aria-busy","true");$("checkoutMessage").textContent="正在创建订单…";
  try{
   if(methodButton.dataset.paymentMode==="native"){await startNativePayment(methodButton);return;}
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
$("menuBtn").onclick=()=>{const n=document.querySelector(".topbar nav");n.style.display=n.style.display==="flex"?"none":"flex";n.style.position="absolute";n.style.top=window.matchMedia("(max-width:540px)").matches?"60px":"76px";n.style.left="0";n.style.right="0";n.style.padding="20px";n.style.background="white";n.style.flexDirection="column"};
db.auth.onAuthStateChange((_event,session)=>{updateUserUI(session?.user??null);});
if(new URLSearchParams(location.search).get("auth")==="login")showAuth();
await render();await refreshUser();
