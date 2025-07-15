import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import EvaluationTemplateBuilder from '@/components/EvaluationTemplateBuilder';
import { 
  Plus, 
  UserCog, 
  Trash2, 
  Edit,
  Award,
  Settings
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  area_id: string;
  client_id: string;
  created_at: string;
  areas?: { name: string };
}

interface Area {
  id: string;
  name: string;
}

interface RoleForm {
  name: string;
  description: string;
  areaId: string;
}

export default function Roles() {
  const { user, profile } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { toast } = useToast();

  const roleForm = useForm<RoleForm>();

  useEffect(() => {
    if (user) {
      fetchRoles();
      fetchAreas();
    }
  }, [user]);

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        areas(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch roles",
        variant: "destructive",
      });
    } else {
      setRoles(data || []);
    }
  };

  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from('areas')
      .select('id, name')
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch areas",
        variant: "destructive",
      });
    } else {
      setAreas(data || []);
    }
  };

  const handleCreateRole = async (data: RoleForm) => {
    // Get current user's client_id
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single();

    if (!userProfile?.client_id) {
      toast({
        title: "Error",
        description: "Unable to determine your organization",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('roles')
      .insert({
        name: data.name,
        description: data.description,
        area_id: data.areaId,
        client_id: userProfile.client_id
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      setIsDialogOpen(false);
      roleForm.reset();
      fetchRoles();
    }
  };

  const handleUpdateRole = async (data: RoleForm) => {
    if (!editingRole) return;

    const { error } = await supabase
      .from('roles')
      .update({
        name: data.name,
        description: data.description,
        area_id: data.areaId
      })
      .eq('id', editingRole.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      setIsDialogOpen(false);
      setEditingRole(null);
      roleForm.reset();
      fetchRoles();
    }
  };

  const handleDeleteRole = async (id: string) => {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      fetchRoles();
    }
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    roleForm.setValue('name', role.name);
    roleForm.setValue('description', role.description || '');
    roleForm.setValue('areaId', role.area_id);
    setIsDialogOpen(true);
  };

  const openNewRoleDialog = () => {
    setEditingRole(null);
    roleForm.reset();
    setIsDialogOpen(true);
  };

  const canManageRoles = profile?.role === 'client_admin' || profile?.role === 'super_admin' || profile?.role === 'area_admin';

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8 text-primary" />
            Roles Management
          </h1>
          <p className="text-muted-foreground">Manage employee roles and evaluation templates</p>
        </div>
        {canManageRoles && (
          <Button onClick={openNewRoleDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        )}
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="templates">Evaluation Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Employee Roles
              </CardTitle>
              <CardDescription>
                Define roles for employees within each area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    {canManageRoles && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.areas?.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        {new Date(role.created_at).toLocaleDateString()}
                      </TableCell>
                      {canManageRoles && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRole(role)}
                            >
                              <Award className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {selectedRole ? (
            <EvaluationTemplateBuilder
              roleId={selectedRole.id}
              roleName={selectedRole.name}
              areaName={selectedRole.areas?.name || 'Unknown Area'}
              onClose={() => setSelectedRole(null)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Evaluation Templates
                </CardTitle>
                <CardDescription>
                  Select a role to manage its evaluation template
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Select a role from the Roles tab to configure its evaluation template.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update role details' : 'Add a new role for employees'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={roleForm.handleSubmit(editingRole ? handleUpdateRole : handleCreateRole)} className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                {...roleForm.register('name', { required: true })}
                placeholder="e.g., Supervisor, Analyst, Manager"
              />
            </div>
            <div>
              <Label htmlFor="areaId">Area</Label>
              <Select onValueChange={(value) => roleForm.setValue('areaId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an area" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...roleForm.register('description')}
                placeholder="Describe the role and responsibilities"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRole ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}