import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: any;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvitationRequest {
  to: string;
  fullName: string;
  organizationName: string;
  invitationUrl: string;
  role: string;
  inviterName?: string;
  inviterEmail?: string;
  personalMessage?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      to,
      fullName,
      organizationName,
      invitationUrl,
      role,
      inviterName,
      inviterEmail,
      personalMessage,
    }: InvitationRequest = await req.json();

    const roleTranslation: Record<string, string> = {
      admin: "Administrateur",
      editor: "Editeur",
      reader: "Lecteur",
    };
    const roleFr = roleTranslation[role] || role;

    const personalMessageHtml = personalMessage
      ? `<div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
           <p style="margin: 0; font-style: italic; color: #1E40AF;">"${personalMessage}"</p>
           <p style="margin: 8px 0 0 0; font-size: 13px; color: #6B7280;">- ${inviterName || "L'administrateur"}</p>
         </div>`
      : "";

    const contactLine =
      inviterName && inviterEmail
        ? `<p style="font-size: 14px; color: #666;">Si vous avez des questions, contactez directement ${inviterName} a ${inviterEmail}.</p>`
        : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F2937; margin: 0; padding: 0; background-color: #F3F4F6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">ArchivIA Pro</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 14px;">Gestion Intelligente d'Archives</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <p style="font-size: 18px; margin: 0 0 8px 0;">Bonjour <strong>${fullName}</strong>,</p>
              <p>${inviterName || "Un administrateur"} vous a invite(e) a rejoindre l'espace <strong>${organizationName}</strong> sur ArchivIA Pro.</p>
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 12px 16px; border-radius: 8px; margin: 16px 0; display: inline-block;">
                <span style="color: #166534; font-weight: 600;">Role attribue : ${roleFr}</span>
              </div>
              ${personalMessageHtml}
              <p>Pour finaliser votre inscription et acceder a vos documents, cliquez sur le lien securise ci-dessous :</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${invitationUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37,99,235,0.3);">Accepter l'invitation</a>
              </div>
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p style="font-size: 13px; color: #9CA3AF;">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
                <p style="font-size: 13px; word-break: break-all;"><a href="${invitationUrl}" style="color: #2563EB;">${invitationUrl}</a></p>
              </div>
              ${contactLine}
              <p style="margin-top: 20px; font-size: 12px; color: #D97706; background: #FFFBEB; padding: 8px 12px; border-radius: 6px;">
                Ce lien expirera dans 7 jours pour des raisons de securite.
              </p>
            </div>
            <div style="text-align: center; margin-top: 24px; color: #9CA3AF; font-size: 12px;">
              <p>ArchivIA Pro - Gestion intelligente d'archives</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (RESEND_API_KEY) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "ArchivIA Pro <onboarding@resend.dev>",
          to: [to],
          subject: `[${organizationName}] Vous avez ete invite(e) a rejoindre ArchivIA Pro`,
          html: emailHtml,
        }),
      });

      const resendData = await resendRes.json();

      if (!resendRes.ok) {
        let errorMessage = resendData.message || "Email sending failed";
        let isTestingModeError = false;

        // Add specific warning for Resend testing mode limitation
        if (resendRes.status === 403 && resendData.name === "validation_error") {
          errorMessage = "Le domaine d'envoi n'est pas vérifié sur Resend. Les emails ne peuvent être envoyés qu'à votre adresse personnelle vérifiée. " + errorMessage;
          isTestingModeError = true;
        }

        console.error("Resend error:", resendData, "Is Testing Mode Restriction?", isTestingModeError);
        return new Response(
          JSON.stringify({
            success: false,
            emailSent: false,
            error: errorMessage,
            isTestingModeError,
            invitationUrl,
          }),
          {
            status: 200, // Important: keep 200 to allow frontend to show the URL to the user anyway
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          emailSent: true,
          message: "Invitation envoyee avec succes",
          invitationUrl,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`No RESEND_API_KEY configured. Invitation URL: ${invitationUrl}`);
    return new Response(
      JSON.stringify({
        success: true,
        emailSent: false,
        message: "Email non envoye (RESEND_API_KEY non configure). Partagez le lien manuellement.",
        invitationUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
