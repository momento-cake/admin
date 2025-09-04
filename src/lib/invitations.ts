import { randomBytes, createHash } from 'crypto'

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function sendInvitationEmail({
  email,
  name,
  token,
  invitedBy,
  role
}: {
  email: string
  name: string
  token: string
  invitedBy: string
  role?: string
}) {
  const { createInvitationEmailTemplate } = await import('./email-templates')
  
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register?token=${token}`
  
  const emailTemplate = createInvitationEmailTemplate({
    name,
    inviteUrl,
    invitedBy,
    companyName: 'MomentoCake Admin',
    role: role || 'viewer'
  })
  
  // For development: log the invitation details and email content
  console.log('=== INVITATION EMAIL ===')
  console.log('To:', email)
  console.log('Subject:', emailTemplate.subject)
  console.log('Invitation URL:', inviteUrl)
  console.log('Name:', name)
  console.log('Invited by:', invitedBy)
  console.log('Role:', role)
  console.log('\n--- EMAIL HTML CONTENT ---')
  console.log(emailTemplate.html)
  console.log('\n--- EMAIL TEXT CONTENT ---')
  console.log(emailTemplate.text)
  console.log('========================\n')
  
  // TODO: Implement actual email sending
  // Example integrations:
  
  /* 
  // SendGrid Example:
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  const msg = {
    to: email,
    from: process.env.FROM_EMAIL,
    subject: emailTemplate.subject,
    text: emailTemplate.text,
    html: emailTemplate.html,
  }
  
  await sgMail.send(msg)
  */
  
  /*
  // AWS SES Example:
  const AWS = require('aws-sdk')
  const ses = new AWS.SES({ region: 'us-east-1' })
  
  const params = {
    Source: process.env.FROM_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: emailTemplate.subject },
      Body: {
        Html: { Data: emailTemplate.html },
        Text: { Data: emailTemplate.text }
      }
    }
  }
  
  await ses.sendEmail(params).promise()
  */
  
  /*
  // Mailgun Example:
  const mailgun = require('mailgun-js')({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN
  })
  
  const data = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: emailTemplate.subject,
    text: emailTemplate.text,
    html: emailTemplate.html
  }
  
  await mailgun.messages().send(data)
  */
  
  /*
  // Firebase Email Extension Example:
  import { getFirestore } from 'firebase-admin/firestore'
  const db = getFirestore()
  
  await db.collection('mail').add({
    to: [email],
    message: {
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    }
  })
  */
  
  return { 
    success: true, 
    template: emailTemplate,
    previewUrl: `data:text/html;charset=utf-8,${encodeURIComponent(emailTemplate.html)}`
  }
}

export function validateRegistrationData(data: {
  firstName: string
  lastName: string
  email: string
  password: string
  acceptsTerms: boolean
}) {
  const errors: string[] = []
  
  if (!data.firstName?.trim()) {
    errors.push('First name is required')
  }
  
  if (!data.lastName?.trim()) {
    errors.push('Last name is required')
  }
  
  if (!data.email?.trim()) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format')
  }
  
  if (!data.password) {
    errors.push('Password is required')
  } else if (data.password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  
  if (!data.acceptsTerms) {
    errors.push('You must accept the terms and conditions')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export function isInvitationExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

export function getInvitationStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'yellow'
    case 'accepted':
      return 'green'
    case 'expired':
      return 'red'
    case 'cancelled':
      return 'gray'
    default:
      return 'gray'
  }
}