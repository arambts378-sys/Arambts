export const googleSheetsProvider = {
  process: async (job: any, event: any, config: any) => {
    if (!config || !config.webhookUrl) {
      throw new Error('Google Sheets webhook URL is missing.');
    }

    const { registrationNumber, attendee } = job.payload;
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
