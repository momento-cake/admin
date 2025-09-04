export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export function createInvitationEmailTemplate({
  name,
  inviteUrl,
  invitedBy,
  companyName = 'MomentoCake Admin',
  role
}: {
  name: string
  inviteUrl: string
  invitedBy: string
  companyName?: string
  role: string
}): EmailTemplate {
  const roleText = role === 'admin' ? 'Administrador' : 'Visualizador'
  
  const subject = `Convite para ${companyName} - Acesso como ${roleText}`
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .invite-button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
          text-align: center;
        }
        .invite-button:hover {
          background-color: #1d4ed8;
        }
        .details {
          background-color: #f8fafc;
          border-left: 4px solid #2563eb;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${companyName}</div>
          <h1>Você foi convidado!</h1>
        </div>
        
        <p>Olá <strong>${name}</strong>,</p>
        
        <p>Você foi convidado por <strong>${invitedBy}</strong> para acessar o sistema ${companyName} como <strong>${roleText}</strong>.</p>
        
        <div class="details">
          <h3>Detalhes do Convite:</h3>
          <ul>
            <li><strong>Nome:</strong> ${name}</li>
            <li><strong>Função:</strong> ${roleText}</li>
            <li><strong>Convidado por:</strong> ${invitedBy}</li>
          </ul>
        </div>
        
        <p>Para completar seu registro e acessar a plataforma, clique no botão abaixo:</p>
        
        <div style="text-align: center;">
          <a href="${inviteUrl}" class="invite-button">Completar Registro</a>
        </div>
        
        <p>Ou copie e cole o seguinte link no seu navegador:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 14px;">
          ${inviteUrl}
        </p>
        
        <div class="warning">
          <strong>⚠️ Importante:</strong> Este convite expira em 7 dias. Se você não completar o registro dentro deste prazo, será necessário solicitar um novo convite.
        </div>
        
        <p>Se você não esperava receber este convite ou acredita que foi enviado por engano, pode ignorar este email.</p>
        
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
          <p>&copy; 2024 ${companyName}. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
    ${companyName} - Convite de Acesso
    
    Olá ${name},
    
    Você foi convidado por ${invitedBy} para acessar o sistema ${companyName} como ${roleText}.
    
    Detalhes do Convite:
    - Nome: ${name}
    - Função: ${roleText}
    - Convidado por: ${invitedBy}
    
    Para completar seu registro, acesse o link abaixo:
    ${inviteUrl}
    
    IMPORTANTE: Este convite expira em 7 dias.
    
    Se você não esperava receber este convite, pode ignorar este email.
    
    ---
    Este é um email automático, por favor não responda.
    © 2024 ${companyName}. Todos os direitos reservados.
  `
  
  return { subject, html, text }
}

export function createWelcomeEmailTemplate({
  name,
  loginUrl,
  companyName = 'MomentoCake Admin'
}: {
  name: string
  loginUrl: string
  companyName?: string
}): EmailTemplate {
  const subject = `Bem-vindo ao ${companyName}!`
  
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #16a34a;
          margin-bottom: 10px;
        }
        .login-button {
          display: inline-block;
          background-color: #16a34a;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
          text-align: center;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${companyName}</div>
          <h1>🎉 Bem-vindo!</h1>
        </div>
        
        <p>Olá <strong>${name}</strong>,</p>
        
        <p>Sua conta foi criada com sucesso! Agora você tem acesso ao sistema ${companyName}.</p>
        
        <p>Para começar a usar a plataforma, faça login com suas credenciais:</p>
        
        <div style="text-align: center;">
          <a href="${loginUrl}" class="login-button">Acessar Plataforma</a>
        </div>
        
        <p>Se você tiver alguma dúvida ou precisar de ajuda, não hesite em entrar em contato conosco.</p>
        
        <div class="footer">
          <p>Este é um email automático, por favor não responda.</p>
          <p>&copy; 2024 ${companyName}. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
    ${companyName} - Bem-vindo!
    
    Olá ${name},
    
    Sua conta foi criada com sucesso! Agora você tem acesso ao sistema ${companyName}.
    
    Para começar a usar a plataforma, acesse: ${loginUrl}
    
    Se você tiver alguma dúvida ou precisar de ajuda, não hesite em entrar em contato conosco.
    
    ---
    Este é um email automático, por favor não responda.
    © 2024 ${companyName}. Todos os direitos reservados.
  `
  
  return { subject, html, text }
}