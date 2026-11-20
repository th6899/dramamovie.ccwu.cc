import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const origin=Deno.env.get("APP_ORIGIN")??"";
const cors={"Access-Control-Allow-Origin":origin||"null","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 const authorization=req.headers.get("Authorization");if(!authorization?.startsWith("Bearer "))return json({error:"AUTH_REQUIRED"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),stripeKey=Deno.env.get("STRIPE_SECRET_KEY");
 if(!url||!anon||!service)return json({error:"SUPABASE_SERVER_CONFIGURATION_MISSING"},503);
 if(!origin)return json({error:"TEST_APP_ORIGIN_NOT_CONFIGURED"},503);
 let appOrigin="";try{const parsed=new URL(origin);if(["dramamovie.ccwu.cc","hub.ccwu.cc","ccwu.cc"].includes(parsed.hostname))return json({error:"PRODUCTION_ORIGIN_BLOCKED"},503);appOrigin=origin.replace(/\/$/,"");}catch{return json({error:"INVALID_APP_ORIGIN"},503);}
 if(!stripeKey||!stripeKey.startsWith("sk_test_"))return json({error:"STRIPE_TEST_SECRET_NOT_CONFIGURED"},503);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json({error:"INVALID_SESSION"},401);
 let body:any;try{body=await req.json();}catch{return json({error:"INVALID_JSON"},400);}
 if(!["membership","vpn"].includes(body?.itemType)||typeof body?.itemId!=="string"||!["USD","CNY"].includes(body?.currency)||!["international","mainland_cn"].includes(body?.region)||typeof body?.requestKey!=="string"||!/^[0-9a-f-]{36}$/i.test(body.requestKey))return json({error:"INVALID_CHECKOUT_REQUEST"},400);
 if(body.currency==="CNY"||body.region==="mainland_cn")return json({error:"STRIPE_NOT_AVAILABLE_FOR_MAINLAND_CNY"},409);
 const {data:order,error:orderError}=await userClient.rpc("create_stripe_subscription_order_idempotent",{p_item_type:body.itemType,p_item_id:body.itemId,p_currency:body.currency,p_request_key:body.requestKey});if(orderError){console.error("stripe_order_creation_failed",orderError.message);return json({error:"ORDER_CREATION_FAILED"},409);}
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const priceResponse=await fetch("https://api.stripe.com/v1/prices/"+encodeURIComponent(order.stripe_price_id),{headers:{"Authorization":"Bearer "+stripeKey}});
 const stripePrice=await priceResponse.json().catch(()=>({}));const expectedMinor=Math.round(Number(order.amount)*100);
 if(!priceResponse.ok||stripePrice.active!==true||stripePrice.currency!=="usd"||stripePrice.unit_amount!==expectedMinor||stripePrice.recurring?.interval!==order.billing_interval){await admin.rpc("mark_stripe_checkout_failed",{p_order_id:order.order_id});return json({error:"STRIPE_PRICE_CONFIGURATION_MISMATCH"},409);}
 const params=new URLSearchParams();params.set("mode","subscription");params.set("line_items[0][price]",order.stripe_price_id);params.set("line_items[0][quantity]","1");
 const resultUrl=appOrigin+"/payment-result.html?order_id="+encodeURIComponent(order.order_id);
 params.set("success_url",resultUrl+"&session_id={CHECKOUT_SESSION_ID}");params.set("cancel_url",resultUrl+"&status=cancelled");params.set("client_reference_id",order.order_id);if(user.email)params.set("customer_email",user.email);
 for(const [k,v] of Object.entries({order_id:order.order_id,user_id:user.id,item_type:order.item_type,item_id:order.item_id})){params.set("metadata["+k+"]",v);params.set("subscription_data[metadata]["+k+"]",v);}
 let stripeResponse:Response;try{stripeResponse=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{"Authorization":"Bearer "+stripeKey,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":"ccwu-checkout-"+order.order_id},body:params});}catch{await admin.rpc("mark_stripe_checkout_failed",{p_order_id:order.order_id});return json({error:"STRIPE_API_UNAVAILABLE"},502);}
 const stripe=await stripeResponse.json().catch(()=>({}));if(!stripeResponse.ok||typeof stripe.url!=="string"||typeof stripe.id!=="string"){await admin.rpc("mark_stripe_checkout_failed",{p_order_id:order.order_id});return json({error:"STRIPE_CHECKOUT_CREATE_FAILED"},502);}
 const {data:marked,error:markError}=await admin.rpc("mark_stripe_checkout_created",{p_order_id:order.order_id,p_session_id:stripe.id});
 if(markError||marked!==true){try{await fetch("https://api.stripe.com/v1/checkout/sessions/"+stripe.id+"/expire",{method:"POST",headers:{"Authorization":"Bearer "+stripeKey}});}catch{}await admin.rpc("mark_stripe_checkout_failed",{p_order_id:order.order_id});return json({error:"CHECKOUT_ORDER_LINK_FAILED"},500);}
 return json({checkout_url:stripe.url,order_no:order.order_no,order_id:order.order_id,mode:"subscription"});
});