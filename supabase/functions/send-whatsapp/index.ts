import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERISKOPE_API_URL = "https://api.periskope.app/v1";
const ORG_PHONE = "85267610707";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERISKOPE_API_KEY = Deno.env.get('PERISKOPE_API_KEY');
    if (!PERISKOPE_API_KEY) {
      throw new Error('PERISKOPE_API_KEY is not configured');
    }

    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: phone, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format chat_id: ensure it ends with @c.us for 1-1 chats
    const chatId = phone.includes('@') ? phone : `${phone}@c.us`;

    console.log(`Sending WhatsApp message to ${chatId}`);

    const response = await fetch(`${PERISKOPE_API_URL}/message/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERISKOPE_API_KEY}`,
        'Content-Type': 'application/json',
        'x-phone': ORG_PHONE,
      },
      body: JSON.stringify({
        chat_id: chatId,
        message: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Periskope API error [${response.status}]:`, JSON.stringify(data));
      throw new Error(`Periskope API call failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    console.log('Message queued successfully:', JSON.stringify(data));

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending WhatsApp message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
