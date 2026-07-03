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

export function resolveIndustryLabels(input: {
  industryTemplate?: string;
  customerLabel?: string;
  invoiceLabel?: string;
  industry?: string;
}): {
  industryTemplate: string;
  industry: string;
  customerLabel: string;
  invoiceLabel: string;
} {
  const key = (input.industryTemplate || 'custom') as IndustryTemplateKey;
  const preset = INDUSTRY_TEMPLATES.find((t) => t.key === key) ?? INDUSTRY_TEMPLATES.find((t) => t.key === 'custom')!;

  if (key === 'custom') {
    return {
      industryTemplate: 'custom',
      industry: input.industry?.trim() || preset.industry,
      customerLabel: input.customerLabel?.trim() || preset.customerLabel,
      invoiceLabel: input.invoiceLabel?.trim() || preset.invoiceLabel,
    };
  }

  return {
    industryTemplate: preset.key,
    industry: preset.industry,
    customerLabel: preset.customerLabel,
    invoiceLabel: preset.invoiceLabel,
  };
}
