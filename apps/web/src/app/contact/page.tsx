'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MapPin, Phone, Mail, Clock, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const contactSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  inquiryType: z.enum(['student', 'instructor', 'institution', 'technical']),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      inquiryType: 'student',
    },
  });

  const onSubmit = async (_data: ContactFormData) => {
    setIsSubmitting(true);
    // Simulate API dispatch
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setSubmitted(true);
    reset();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 space-y-12 pb-24">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-emerald">
          Get in Touch
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-navy">
          Contact Our Addis Ababa Support Team
        </h1>
        <p className="text-sm text-brand-slate">
          Have questions about our course tracks, university partnerships, or Telebirr billing? We’re here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-5xl mx-auto">
        {/* Contact Info Column */}
        <div className="space-y-6">
          <div className="rounded-xl border border-brand-border bg-white p-6 space-y-6">
            <h3 className="font-bold text-brand-navy text-lg">Headquarters</h3>

            <div className="space-y-4 text-xs text-brand-slate">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
                <div>
                  <strong className="text-brand-navy block text-sm">Addis Ababa Office</strong>
                  <span>Cape Verde St., Bole Sub-City, Addis Ababa, Ethiopia</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
                <div>
                  <strong className="text-brand-navy block text-sm">Phone Line</strong>
                  <span>+251 97 956 7153</span>
                  <br />
                  <span>0979567153</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
                <div>
                  <strong className="text-brand-navy block text-sm">Email Inquiries</strong>
                  <span>abdellaj636@gmail.com</span>
                  <br />
                  <span>support@eduverse.et</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-brand-emerald shrink-0 mt-0.5" />
                <div>
                  <strong className="text-brand-navy block text-sm">Office Hours</strong>
                  <span>Monday – Friday: 8:30 AM – 5:30 PM EAT</span>
                  <br />
                  <span>Saturday: 9:00 AM – 1:00 PM EAT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form Column */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-brand-border bg-white p-6 sm:p-8 space-y-6 shadow-sm">
            {submitted && (
              <Alert variant="success" className="animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Message Transmitted Successfully</AlertTitle>
                <AlertDescription>
                  Thank you for reaching out. Our support team in Addis Ababa will review your inquiry and follow up within one business day.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName" required>Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Dawit Tadesse"
                    {...register('fullName')}
                    error={errors.fullName?.message}
                  />
                </div>
                <div>
                  <Label htmlFor="email" required>Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="dawit@gmail.com"
                    {...register('email')}
                    error={errors.email?.message}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inquiryType" required>Inquiry Category</Label>
                  <select
                    id="inquiryType"
                    className="flex h-10 w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-emerald"
                    {...register('inquiryType')}
                  >
                    <option value="student">Student & Enrollment Question</option>
                    <option value="instructor">Instructor Application</option>
                    <option value="institution">University / Institutional Partnership</option>
                    <option value="technical">Technical Support & Bug Report</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="subject" required>Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your question"
                    {...register('subject')}
                    error={errors.subject?.message}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message" required>Message</Label>
                <Textarea
                  id="message"
                  rows={5}
                  placeholder="Tell us how we can assist you..."
                  {...register('message')}
                  error={errors.message?.message}
                />
              </div>

              <Button
                type="submit"
                variant="emerald"
                size="lg"
                isLoading={isSubmitting}
                className="w-full sm:w-auto gap-2"
              >
                <Send className="h-4 w-4" />
                <span>Transmit Inquiry</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
