interface GoogleSheetsConfig {
  webhookUrl?: string;
}

interface EventPayload {
  name: string;
}

interface JobPayload {
  payload: Record<string, unknown>;
}

export const googleSheetsProvider = {
  process: async (job: JobPayload, event: EventPayload, config: GoogleSheetsConfig) => {
    if (!config || !config.webhookUrl) {
      throw new Error('Google Sheets webhook URL is missing.');
    }

    const { registrationNumber, attendee } = job.payload as {
      registrationNumber: string;
      attendee: { firstName: string; lastName?: string; email?: string; phone?: string };
    };
    const payload = {
      event_name: event.name,
      registration_number: registrationNumber,
      first_name: attendee.firstName,
      last_name: attendee.lastName,
      email: attendee.email,
      phone: attendee.phone,
      registered_at: new Date().toISOString()
    };

    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Webhook returned status ${res.status}: ${res.statusText}`);
    }

    return { success: true };
  }
};
