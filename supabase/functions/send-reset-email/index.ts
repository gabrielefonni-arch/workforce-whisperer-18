import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email richiesta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Generate recovery link using admin API
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError || !data) {
      // Don't reveal if user exists or not
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the redirect URL with the token hash
    const redirectUrl = `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/reset-password`;
    const confirmUrl = `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify?token=${data.properties.hashed_token}&type=recovery&redirect_to=${encodeURIComponent(redirectUrl)}`;

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Reimposta la tua password - Edilristrutturazioni",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Reimposta la tua password</h2>
            <p style="color: #555; line-height: 1.6;">Hai richiesto di reimpostare la password del tuo account Edilristrutturazioni.</p>
            <p style="color: #555; line-height: 1.6;">Clicca il pulsante qui sotto per impostare una nuova password:</p>
            <a href="${confirmUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
              Reimposta Password
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 24px;">Se non hai richiesto tu questa operazione, ignora questa email.</p>
            <p style="color: #999; font-size: 13px;">Il link scade tra 24 ore.</p>
          </div>
        `,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Errore nell'invio dell'email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
