import { TransactionForm } from "@/components/transaction-form";
import { PageHeader } from "@/components/page-header";
import { PageMotion } from "@/components/motion";

export default function AddPage() {
  return (
    <PageMotion className="container max-w-2xl py-4 md:py-8">
      <PageHeader title="Add transaction" description="Quickly log an expense, income or investment." />
      <TransactionForm />
    </PageMotion>
  );
}
