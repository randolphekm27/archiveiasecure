import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, fullName, organizationName, invitationUrl, role }: InvitationRequest = await req.json();

    const roleTranslation = {
      admin: 'Administrateur',
      editor: 'Éditeur',
      reader: 'Lecteur',
    }[role] || role;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invitation à rejoindre ${organizationName}</h1>
            </div>
            <div class="content">
              <p>Bonjour ${fullName},</p>
              <p>Vous êtes invité(e) à rejoindre <strong>${organizationName}</strong> sur ArchivIA Pro en tant que <strong>${roleTranslation}</strong>.</p>
              <p>Pour accepter cette invitation et créer votre compte, cliquez sur le bouton ci-dessous:</p>
              <div style="text-align: center;">
                <a href="${invitationUrl}" class="button">Accepter l'invitation</a>
              </div>
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur:<br>
                <a href="${invitationUrl}">${invitationUrl}</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                Cette invitation expire dans 7 jours.
              </p>
            </div>
            <div class="footer">
              <p>ArchivIA Pro - Gestion intelligente d'archives</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`Invitation email prepared for ${to}`);
    console.log(`Invitation URL: ${invitationUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email prepared',
        invitationUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error in send-invitation function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
