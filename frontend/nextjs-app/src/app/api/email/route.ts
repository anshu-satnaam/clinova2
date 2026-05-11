import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_CaTAtzrR_5rEKW7RTMKDrzrpV6FyNX96b');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientName, patientEmail, doctorName, date, time, status } = body;

    if (!patientEmail) {
      return NextResponse.json({ error: 'Patient email required' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Clinova Appointments <onboarding@resend.dev>',
      to: patientEmail,
      subject: `Clinova - Your Appointment is ${status}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0ea5e9;">Clinova Healthcare Platform</h2>
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>Your appointment has been successfully <strong>${status.toLowerCase()}</strong>.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${time}</p>
          </div>
          <p style="color: #64748b; font-size: 12px;">Thank you for choosing Clinova.</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully via Resend', data });
  } catch (error) {
    console.error('Email sending failed:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
