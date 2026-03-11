import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: any;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeletionNotificationRequest {
    documentTitle: string;
    requesterName: string;
    reason: string;
    organizationName: string;
    adminsEmails: string[];
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
            documentTitle,
            requesterName,
            reason,
            organizationName,
            adminsEmails,
        }: DeletionNotificationRequest = await req.json();

        if (!adminsEmails || adminsEmails.length === 0) {
            throw new Error("Aucun email d'administrateur fourni.");
        }

        const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F2937; margin: 0; padding: 0; background-color: #F3F4F6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">ArchivIA Pro | Alerte Securite</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 14px;">Organisation: ${organizationName}</p>
            </div>
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <p style="font-size: 18px; margin: 0 0 8px 0;">Bonjour Administrateur,</p>
              <p>Une demande de suppression a ete soumise par <strong>${requesterName}</strong>.</p>
              
              <div style="background: #FEF2F2; border: 1px solid #FECACA; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #7F1D1D;"><strong>Document :</strong> ${documentTitle}</p>
                <div style="margin-top: 12px; background: white; padding: 12px; border-radius: 6px; border-left: 4px solid #DC2626;">
                  <p style="margin: 0; font-style: italic; color: #4B5563;">" ${reason} "</p>
                </div>
              </div>

              <p>Votre vote est requis pour approuver ou rejeter cette suppression. Connectez-vous a l'application et rendez-vous dans la section <strong>"Demandes de suppression"</strong>.</p>
              
            </div>
            <div style="text-align: center; margin-top: 24px; color: #9CA3AF; font-size: 12px;">
              <p>ArchivIA Pro - Ce message est automatique, merci de ne pas y repondre.</p>
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
                    to: adminsEmails,
                    subject: `[ALERTE] Demande de suppression : ${documentTitle}`,
                    html: emailHtml,
                }),
            });

            const resendData = await resendRes.json();

            if (!resendRes.ok) {
                console.error("Resend error:", resendData);
                return new Response(
                    JSON.stringify({
                        success: false,
                        emailSent: false,
                        error: resendData.message || "Email sending failed"
                    }),
                    {
                        status: 200,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    emailSent: true,
                    message: "Notification envoyee avec succes",
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        console.log(`No RESEND_API_KEY configured. Payload was targeting: ${adminsEmails.join(', ')}`);
        return new Response(
            JSON.stringify({
                success: true,
                emailSent: false,
                message: "Email non envoye (RESEND_API_KEY non configure).",
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Error in send-deletion-notification function:", error);
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
