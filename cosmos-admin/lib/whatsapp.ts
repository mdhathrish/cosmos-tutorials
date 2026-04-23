// lib/whatsapp.ts
// WhatsApp notification client — supports both Meta Cloud API (direct) and Interakt (recommended for startups)
// 
// RECOMMENDED SETUP (Simple path — no Meta Business verification hassle):
// 1. Sign up at https://www.interakt.shop (free trial available)
// 2. Connect your WhatsApp number in their dashboard  
// 3. Create message templates in Interakt dashboard
// 4. Get your API key from Settings → Developer → API Keys
// 5. Set WHATSAPP_PROVIDER=interakt and INTERAKT_API_KEY in your .env
//
// ALTERNATIVE (Direct Meta — more control, more setup):
// 1. Create Meta Business account at business.facebook.com
// 2. Set up WhatsApp Business Platform app
// 3. Set WHATSAPP_PROVIDER=meta, WHATSAPP_PHONE_ID, WHATSAPP_TOKEN

interface SendTemplateOptions {
  phone: string
  templateName: string
  languageCode?: string
  bodyParams?: string[]
}

interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Format phone number for WhatsApp (international format without +)
 * Handles Indian numbers: 9876543210 → 919876543210
 */
function formatPhone(phone: string): string {
  let clean = phone.replace(/[\s\-\(\)\+]/g, '')
  if (clean.startsWith('0')) clean = clean.slice(1)
  if (clean.length === 10 && /^[6-9]/.test(clean)) {
    clean = '91' + clean
  }
  return clean
}

/**
 * Send via Interakt API (recommended for startups — simpler setup)
 */
async function sendViaInterakt(options: SendTemplateOptions): Promise<WhatsAppResult> {
  const apiKey = process.env.INTERAKT_API_KEY
  if (!apiKey) {
    return { success: false, error: 'INTERAKT_API_KEY not configured' }
  }

  const formattedPhone = formatPhone(options.phone)
  const auth = Buffer.from(`${apiKey}:`).toString('base64')

  const payload: any = {
    countryCode: formattedPhone.startsWith('91') ? '+91' : '+' + formattedPhone.slice(0, 2),
    phoneNumber: formattedPhone.startsWith('91') ? formattedPhone.slice(2) : formattedPhone,
    type: 'Template',
    template: {
      name: options.templateName,
      languageCode: options.languageCode || 'en',
      bodyValues: options.bodyParams || []
    }
  }

  try {
    const res = await fetch('https://api.interakt.ai/v1/public/message/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.message || data.error || JSON.stringify(data) }
    }

    return { success: true, messageId: data.id || data.messageId }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' }
  }
}

/**
 * Send via Meta Cloud API (direct — requires Meta Business setup)
 */
async function sendViaMeta(options: SendTemplateOptions): Promise<WhatsAppResult> {
  const phoneId = process.env.WHATSAPP_PHONE_ID
  const token = process.env.WHATSAPP_TOKEN

  if (!phoneId || !token) {
    return { success: false, error: 'WHATSAPP_PHONE_ID / WHATSAPP_TOKEN not configured' }
  }

  const formattedPhone = formatPhone(options.phone)

  const components: any[] = []
  if (options.bodyParams && options.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: options.bodyParams.map(text => ({ type: 'text', text }))
    })
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: options.templateName,
      language: { code: options.languageCode || 'en' },
      ...(components.length > 0 ? { components } : {})
    }
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error?.message || JSON.stringify(data) }
    }

    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' }
  }
}

/**
 * Send a WhatsApp template message — auto-detects provider from env
 */
export async function sendWhatsAppTemplate(options: SendTemplateOptions): Promise<WhatsAppResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || 'interakt').toLowerCase()

  if (provider === 'meta') {
    return sendViaMeta(options)
  }

  // Default: Interakt (simpler, recommended for startups)
  return sendViaInterakt(options)
}

/**
 * Check if WhatsApp notifications are configured
 */
export function isWhatsAppConfigured(): boolean {
  const provider = (process.env.WHATSAPP_PROVIDER || 'interakt').toLowerCase()
  if (provider === 'meta') {
    return !!(process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TOKEN)
  }
  return !!process.env.INTERAKT_API_KEY
}
