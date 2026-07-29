import type { Metadata } from 'next';

import { CustomerAccountShell } from '@/components/public/customer-account-shell';
import { CustomerInquiriesList } from '@/components/public/customer-inquiries-list';

export const metadata: Metadata = {
  title: 'Taleplerim',
  robots: { index: false, follow: false },
};

export default function MyInquiriesPage() {
  return (
    <CustomerAccountShell
      title="Taleplerim"
      description="Mağazamıza gönderdiğiniz talepler ve güncel durumları."
    >
      <CustomerInquiriesList />
    </CustomerAccountShell>
  );
}
