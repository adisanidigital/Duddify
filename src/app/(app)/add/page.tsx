import { TransactionForm } from "@/components/transaction-form";
import { PageHeader } from "@/components/page-header";

export default function AddPage() {
  return (
    <div className="container max-w-2xl py-4 md:py-8">
      <PageHeader title="Add transaction" description="Quickly log an expense, income or investment." />
      <TransactionForm />
    </div>
  );
}
