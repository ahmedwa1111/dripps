import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Plus, UserPlus, ShieldCheck, ToggleLeft, ToggleRight, Trash2, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type Role = { id: string; name: string };
type EmployeeRow = {
  id: string;
  full_name: string;
  job_title: string;
  base_salary_cents: number;
  is_active: boolean;
  account: {
    id: string;
    email: string;
    status: 'active' | 'disabled';
    last_login_at: string | null;
    roles: Role[];
  } | null;
};

export default function AdminEmployeesPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null);
  const [accountEmployee, setAccountEmployee] = useState<EmployeeRow | null>(null);
  const [rolesEmployee, setRolesEmployee] = useState<EmployeeRow | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<EmployeeRow | null>(null);

  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    job_title: '',
    base_salary: '',
    is_active: true,
  });

  const [accountForm, setAccountForm] = useState({
    email: '',
    password: '',
  });

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const term = search.trim().toLowerCase();
    return employees.filter((employee) =>
      employee.full_name.toLowerCase().includes(term) ||
      employee.job_title.toLowerCase().includes(term) ||
      (employee.account?.email?.toLowerCase().includes(term) ?? false)
    );
  }, [employees, search]);

  const parseApiResponse = async (resp: Response) => {
    const text = await resp.text();
    if (!text) return { data: {}, errorMessage: '' };
    try {
      const data = JSON.parse(text);
      return { data, errorMessage: data?.error || '' };
    } catch {
      return { data: {}, errorMessage: text };
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/employees', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to load employees');
      }
      setEmployees(data.employees || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    if (!token) return;
    try {
      const resp = await fetch('/api/admin/roles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to load roles');
      }
      setRoles(data.roles || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load roles');
    }
  };

  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchRoles();
    }
  }, [token]);

  useEffect(() => {
    if (rolesEmployee?.account?.roles) {
      setSelectedRoleIds(rolesEmployee.account.roles.map((role) => role.id));
    }
    if (!rolesEmployee) {
      setSelectedRoleIds([]);
    }
  }, [rolesEmployee]);

  useEffect(() => {
    if (!accountEmployee) {
      setAccountForm({ email: '', password: '' });
    }
  }, [accountEmployee]);

  const resetEmployeeForm = () => {
    setEmployeeForm({
      full_name: '',
      job_title: '',
      base_salary: '',
      is_active: true,
    });
  };

  const handleCreateEmployee = async () => {
    if (!token) return;
    const salaryCents = Math.round(Number(employeeForm.base_salary) * 100);
    if (!Number.isFinite(salaryCents)) {
      toast.error('Enter a valid salary');
      return;
    }
    try {
      const resp = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: employeeForm.full_name,
          job_title: employeeForm.job_title,
          base_salary_cents: salaryCents,
          is_active: employeeForm.is_active,
        }),
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to create employee');
      }
      toast.success('Employee created');
      setCreateDialogOpen(false);
      resetEmployeeForm();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create employee');
    }
  };

  const handleEditEmployee = (employee: EmployeeRow) => {
    setEditEmployee(employee);
    setEmployeeForm({
      full_name: employee.full_name,
      job_title: employee.job_title,
      base_salary: (employee.base_salary_cents / 100).toFixed(2),
      is_active: employee.is_active,
    });
  };

  const handleUpdateEmployee = async () => {
    if (!token || !editEmployee) return;
    const salaryCents = Math.round(Number(employeeForm.base_salary) * 100);
    if (!Number.isFinite(salaryCents)) {
      toast.error('Enter a valid salary');
      return;
    }
    try {
      const resp = await fetch(`/api/admin/employees/${editEmployee.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: employeeForm.full_name,
          job_title: employeeForm.job_title,
          base_salary_cents: salaryCents,
          is_active: employeeForm.is_active,
        }),
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to update employee');
      }
      toast.success('Employee updated');
      setEditEmployee(null);
      resetEmployeeForm();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update employee');
    }
  };

  const handleToggleActive = async (employee: EmployeeRow) => {
    if (!token) return;
    try {
      const resp = await fetch(`/api/admin/employees/${employee.id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !employee.is_active }),
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to update employee');
      }
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update employee');
    }
  };

  const handleCreateAccount = async () => {
    if (!token || !accountEmployee) return;
    try {
      const resp = await fetch(`/api/admin/employees/${accountEmployee.id}/account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountForm),
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to create account');
      }
      toast.success('Account created');
      setAccountEmployee(null);
      setAccountForm({ email: '', password: '' });
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create account');
    }
  };

  const handleToggleAccount = async (employee: EmployeeRow) => {
    if (!token || !employee.account) return;
    try {
      const resp = await fetch(`/api/admin/accounts/${employee.account.id}/disable`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ disabled: employee.account.status === 'active' }),
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to update account');
      }
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update account');
    }
  };

  const handleDeleteAccount = async () => {
    if (!token || !deleteAccount?.account) return;
    try {
      const resp = await fetch(`/api/admin/accounts/${deleteAccount.account.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to delete account');
      }
      toast.success('Account deleted');
      setDeleteAccount(null);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete account');
    }
  };

  const handleAssignRoles = async () => {
    if (!token || !rolesEmployee?.account) return;
    try {
      const resp = await fetch(`/api/admin/accounts/${rolesEmployee.account.id}/roles`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleIds: selectedRoleIds }),
      });
      const { data, errorMessage } = await parseApiResponse(resp);
      if (!resp.ok) {
        throw new Error(errorMessage || 'Failed to assign roles');
      }
      toast.success('Roles updated');
      setRolesEmployee(null);
      setSelectedRoleIds([]);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to assign roles');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground">Manage employee records and accounts</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search employees or accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <p className="font-medium">{employee.full_name}</p>
                      </TableCell>
                      <TableCell>{employee.job_title}</TableCell>
                      <TableCell>{formatCurrency(employee.base_salary_cents / 100)}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.account ? (
                          <div className="space-y-1">
                            <p className="text-sm">{employee.account.email}</p>
                            <Badge variant={employee.account.status === 'active' ? 'default' : 'secondary'}>
                              {employee.account.status}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary">No account</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.account?.roles?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {employee.account.roles.map((role) => (
                              <Badge key={role.id} variant="outline">
                                {role.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(employee)}>
                              {employee.is_active ? (
                                <>
                                  <ToggleLeft className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!employee.account ? (
                              <DropdownMenuItem onClick={() => setAccountEmployee(employee)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Create Account
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => setRolesEmployee(employee)}>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Assign Roles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleAccount(employee)}>
                                  {employee.account.status === 'active' ? 'Disable Account' : 'Enable Account'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteAccount(employee)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Account
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Create Employee Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={employeeForm.full_name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={employeeForm.job_title}
                onChange={(e) => setEmployeeForm({ ...employeeForm, job_title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="base_salary">Base Salary (L.E.)</Label>
              <Input
                id="base_salary"
                type="number"
                step="0.01"
                value={employeeForm.base_salary}
                onChange={(e) => setEmployeeForm({ ...employeeForm, base_salary: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="employee_active"
                type="checkbox"
                checked={employeeForm.is_active}
                onChange={(e) => setEmployeeForm({ ...employeeForm, is_active: e.target.checked })}
              />
              <Label htmlFor="employee_active">Active employee</Label>
            </div>
            <Button onClick={handleCreateEmployee} className="w-full">
              Create Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(open) => !open && setEditEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={employeeForm.full_name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_job_title">Job Title</Label>
              <Input
                id="edit_job_title"
                value={employeeForm.job_title}
                onChange={(e) => setEmployeeForm({ ...employeeForm, job_title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_base_salary">Base Salary (L.E.)</Label>
              <Input
                id="edit_base_salary"
                type="number"
                step="0.01"
                value={employeeForm.base_salary}
                onChange={(e) => setEmployeeForm({ ...employeeForm, base_salary: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit_employee_active"
                type="checkbox"
                checked={employeeForm.is_active}
                onChange={(e) => setEmployeeForm({ ...employeeForm, is_active: e.target.checked })}
              />
              <Label htmlFor="edit_employee_active">Active employee</Label>
            </div>
            <Button onClick={handleUpdateEmployee} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={!!accountEmployee} onOpenChange={(open) => !open && setAccountEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="account_email">Email</Label>
              <Input
                id="account_email"
                type="email"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="account_password">Temporary Password</Label>
              <Input
                id="account_password"
                type="password"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              />
            </div>
            <Button onClick={handleCreateAccount} className="w-full">
              Create Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Roles Dialog */}
      <Dialog open={!!rolesEmployee} onOpenChange={(open) => !open && setRolesEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Assign Roles</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roles available.</p>
            ) : (
              <div className="space-y-2">
                {roles.map((role) => {
                  const checked = selectedRoleIds.includes(role.id);
                  return (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoleIds((prev) => [...prev, role.id]);
                          } else {
                            setSelectedRoleIds((prev) => prev.filter((id) => id !== role.id));
                          }
                        }}
                      />
                      <span>{role.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <Button onClick={handleAssignRoles} className="w-full">
              Save Roles
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={!!deleteAccount} onOpenChange={(open) => !open && setDeleteAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for {deleteAccount?.full_name}. The employee
              record will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
