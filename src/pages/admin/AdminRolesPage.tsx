import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type Permission = { id: string; key: string; description?: string | null };
type Role = {
  id: string;
  name: string;
  description?: string | null;
  permissionIds: string[];
};

export default function AdminRolesPage() {
  const { session } = useAuth();
  const token = session?.access_token;

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);

  const fetchRoles = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/roles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to load roles');
      }
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoles();
    }
  }, [token]);

  useEffect(() => {
    if (createOpen) {
      setRoleForm({ name: '', description: '' });
      setSelectedPermIds([]);
    }
  }, [createOpen]);

  useEffect(() => {
    if (!editRole) {
      setSelectedPermIds([]);
    }
  }, [editRole]);

  const handleCreateRole = async () => {
    if (!token) return;
    try {
      const permissionKeys = permissions
        .filter((perm) => selectedPermIds.includes(perm.id))
        .map((perm) => perm.key);

      const resp = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description,
          permissionKeys,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to create role');
      }
      toast.success('Role created');
      setCreateOpen(false);
      setRoleForm({ name: '', description: '' });
      setSelectedPermIds([]);
      fetchRoles();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create role');
    }
  };

  const handleOpenEdit = (role: Role) => {
    setEditRole(role);
    setSelectedPermIds(role.permissionIds);
  };

  const handleSavePermissions = async () => {
    if (!token || !editRole) return;
    try {
      const permissionKeys = permissions
        .filter((perm) => selectedPermIds.includes(perm.id))
        .map((perm) => perm.key);

      const resp = await fetch(`/api/admin/roles/${editRole.id}/permissions`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionKeys }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to update permissions');
      }
      toast.success('Permissions updated');
      setEditRole(null);
      setSelectedPermIds([]);
      fetchRoles();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update permissions');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Roles & Permissions</h1>
            <p className="text-muted-foreground">Control access across the dashboard</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No roles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{role.permissionIds.length} permissions</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(role)}>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Edit
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role_name">Role Name</Label>
              <Input
                id="role_name"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role_desc">Description</Label>
              <Input
                id="role_desc"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 max-h-56 overflow-y-auto border border-border rounded-lg p-3">
                {permissions.map((perm) => {
                  const checked = selectedPermIds.includes(perm.id);
                  return (
                    <label key={perm.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermIds((prev) => [...prev, perm.id]);
                          } else {
                            setSelectedPermIds((prev) => prev.filter((id) => id !== perm.id));
                          }
                        }}
                      />
                      <span>{perm.key}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <Button onClick={handleCreateRole} className="w-full">
              Create Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRole} onOpenChange={(open) => !open && setEditRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Permissions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Role: {editRole?.name}</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg p-3">
              {permissions.map((perm) => {
                const checked = selectedPermIds.includes(perm.id);
                return (
                  <label key={perm.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermIds((prev) => [...prev, perm.id]);
                        } else {
                          setSelectedPermIds((prev) => prev.filter((id) => id !== perm.id));
                        }
                      }}
                    />
                    <span>{perm.key}</span>
                  </label>
                );
              })}
            </div>
            <Button onClick={handleSavePermissions} className="w-full">
              Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
