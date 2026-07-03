'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';

export type IndustryTemplateKey = 'education' | 'property' | 'healthcare' | 'logistics' | 'custom';

export interface IndustryTemplate {
  key: IndustryTemplateKey;
  name: string;
  industry: string;
  customerLabel: string;
  invoiceLabel: string;
  description: string;
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    key: 'education',
    name: 'School',
    industry: 'Education',
    customerLabel: 'Students',
    invoiceLabel: 'Invoices',
    description: 'Per-student billing — e.g. term fees, levies, uniforms',
  },
  {
    key: 'property',
    name: 'Property',
    industry: 'Real Estate',
    customerLabel: 'Tenants',
    invoiceLabel: 'Invoices',
    description: 'Per-tenant billing — e.g. rent, caution fee, service charge',
  },
  {
    key: 'healthcare',
    name: 'Healthcare',
    industry: 'Healthcare',
    customerLabel: 'Patients',
    invoiceLabel: 'Invoices',
    description: 'Per-patient billing — e.g. consultation, lab tests',
  },
  {
    key: 'logistics',
    name: 'Logistics',
    industry: 'Logistics',
    customerLabel: 'Clients',
    invoiceLabel: 'Invoices',
    description: 'Client shipments and deliveries',
  },
  {
    key: 'custom',
    name: 'Custom',
    industry: 'Other',
    customerLabel: 'Customers',
    invoiceLabel: 'Invoices',
    description: 'Set your own labels',
  },
];

const DEFAULTS = {
  customerLabel: 'Customers',
  invoiceLabel: 'Invoices',
};

/** Plural nav label → singular for buttons ("Add Student") */
export function singularLabel(plural: string): string {
  if (plural.endsWith('ies')) return `${plural.slice(0, -3)}y`;
  if (plural.endsWith('s') && plural.length > 1) return plural.slice(0, -1);
  return plural;
}

export interface MerchantLabels {
  customers: string;
  customer: string;
  invoices: string;
  invoice: string;
  industryTemplate?: string;
}

export function labelsFromOrg(org: {
  customerLabel?: string | null;
  invoiceLabel?: string | null;
  industryTemplate?: string | null;
} | null | undefined): MerchantLabels {
  const customers = org?.customerLabel?.trim() || DEFAULTS.customerLabel;
  const invoices = org?.invoiceLabel?.trim() || DEFAULTS.invoiceLabel;
  return {
    customers,
    customer: singularLabel(customers),
    invoices,
    invoice: singularLabel(invoices),
    industryTemplate: org?.industryTemplate ?? undefined,
  };
}

export function useMerchantLabels(): MerchantLabels {
  const org = useAuthStore((s) => s.org);
  return useMemo(() => labelsFromOrg(org), [org]);
}
