import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type PayrollRow = {
  id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  salary_cents: number;
  status: 'paid' | 'unpaid';
  paid_at: string | null;
  payment_method: 'cash' | 'bank' | 'wallet' | null;
  notes: string | null;
  employee?: {
    id: string;
    full_name: string;
    job_title: string;
  } | null;
};

type PayrollSummary = {
  totalEmployees: number;
  totalPayrollCents: number;
  totalPaidCents: number;
  totalUnpaidCents: number;
  paidCount: number;
  unpaidCount: number;
};

export default function AdminPayrollPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);

  const [markDialog, setMarkDialog] = useState<PayrollRow | null>(null);
  const [markForm, setMarkForm] = useState({
    paid: true,
    paid_at: '',
    payment_method: 'bank',
    notes: '',
  });

  const yearOptions = useMemo(() => [currentYear - 1, currentYear, currentYear + 1], [currentYear]);

  const loadPayroll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (month) params.set('month', String(month));
      if (status) params.set('status', status);
      if (search.trim()) params.set('q', search.trim());

      const resp = await fetch(`/api/admin/payroll?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to load payroll');
      }
      setPayroll(data.payroll || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (month) params.set('month', String(month));
      const resp = await fetch(`/api/admin/payroll/summary?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to load summary');
      }
      setSummary(data.summary || null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load summary');
    }
  };

  useEffect(() => {
    if (token) {
      loadPayroll();
      loadSummary();
    }
  }, [token, year, month, status]);

  const handleGenerate = async () => {
    if (!token) return;
    try {
      const resp = await fetch('/api/admin/payroll/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, month }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to generate payroll');
      }
      toast.success('Payroll generated');
      loadPayroll();
      loadSummary();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate payroll');
    }
  };

  const handleOpenMark = (record: PayrollRow) => {
    setMarkDialog(record);
    setMarkForm({
      paid: record.status === 'paid',
      paid_at: record.paid_at ? record.paid_at.slice(0, 16) : '',
      payment_method: record.payment_method ?? 'bank',
      notes: record.notes ?? '',
    });
  };

  const handleSaveMark = async () => {
    if (!token || !markDialog) return;
    try {
      const resp = await fetch(`/api/admin/payroll/${markDialog.id}/mark-paid`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paid: markForm.paid,
          paid_at: markForm.paid_at ? new Date(markForm.paid_at).toISOString() : undefined,
          payment_method: markForm.paid ? markForm.payment_method : undefined,
          notes: markForm.notes,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to update payroll');
      }
      toast.success('Payroll updated');
      setMarkDialog(null);
      loadPayroll();
      loadSummary();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update payroll');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Payroll</h1>
            <p className="text-muted-foreground">Generate and manage monthly payroll</p>
          </div>
          <Button onClick={handleGenerate}>Generate Payroll</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Payroll</p>
            <p className="text-xl font-semibold">
              {summary ? formatCurrency(summary.totalPayrollCents / 100) : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-xl font-semibold">
              {summary ? formatCurrency(summary.totalPaidCents / 100) : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Unpaid</p>
            <p className="text-xl font-semibold">
              {summary ? formatCurrency(summary.totalUnpaidCents / 100) : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Employees</p>
            <p className="text-xl font-semibold">{summary ? summary.totalEmployees : '--'}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex gap-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((option) => (
                <option key={option} value={option}>
                  {option.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button variant="secondary" onClick={loadPayroll} className="lg:ml-auto">
            Apply Filters
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[90px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : payroll.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No payroll records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payroll.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.employee?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{record.employee?.job_title || '-'}</TableCell>
                      <TableCell>{formatCurrency(record.salary_cents / 100)}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.paid_at ? new Date(record.paid_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>{record.payment_method || '-'}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleOpenMark(record)}>
                          {record.status === 'paid' ? 'Update' : 'Mark Paid'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={!!markDialog} onOpenChange={(open) => !open && setMarkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Update Payroll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="mark_paid"
                type="checkbox"
                checked={markForm.paid}
                onChange={(e) => setMarkForm({ ...markForm, paid: e.target.checked })}
              />
              <Label htmlFor="mark_paid">Mark as paid</Label>
            </div>
            <div>
              <Label htmlFor="mark_paid_at">Paid At</Label>
              <Input
                id="mark_paid_at"
                type="datetime-local"
                value={markForm.paid_at}
                onChange={(e) => setMarkForm({ ...markForm, paid_at: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="mark_method">Payment Method</Label>
              <select
                id="mark_method"
                value={markForm.payment_method}
                onChange={(e) => setMarkForm({ ...markForm, payment_method: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={!markForm.paid}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
            <div>
              <Label htmlFor="mark_notes">Notes</Label>
              <Input
                id="mark_notes"
                value={markForm.notes}
                onChange={(e) => setMarkForm({ ...markForm, notes: e.target.value })}
              />
            </div>
            <Button onClick={handleSaveMark} className="w-full">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
