-- Seed non-enabled CNY QR channels for test UI and future sandbox configuration.
-- These rows contain no merchant credentials and cannot accept payments while disabled.
insert into public.payment_methods(code,provider,display_name,asset,checkout_type,is_enabled,environment,sort_order,public_config)
values
 ('alipay','alipay','支付宝','CNY','qr',false,'test',10,'{}'::jsonb),
 ('wechat_pay','wechat_pay','微信支付','CNY','qr',false,'test',20,'{}'::jsonb)
on conflict(code) do nothing;
