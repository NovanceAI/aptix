import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Building, 
  Users, 
  Trash2, 
  Edit,
  Shield,
  Settings,
  UserPlus
} from 'lucide-react';

interface Area {
  id: string;
  name: string;
  description: string;
  client_id: string;
  created_at: string;
}

interface AreaPermission {
  id: string;
  area_id: string;
  user_id: string;
  permission_level: 'admin' | 'viewer';
  granted_by: string;
  created_at: string;
  area?: { name: string };
  profile?: { first_name: string; last_name: string; email: string };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AreaForm {
  name: string;
  description: string;
}

interface PermissionForm {
  areaId: string;
  userId: string;
  permissionLevel: 'admin' | 'viewer';
}

export default function Areas() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [permissions, setPermissions] = useState<AreaPermission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const { toast } = useToast();

  const areaForm = useForm<AreaForm>();
  const permissionForm = useForm<PermissionForm>();

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchAreas();
      fetchPermissions();
      fetchProfiles();
    }
  }, [user]);

  const fetchUserRole = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    
    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('created_at', { ascending: false });

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

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('area_permissions')
      .select(`
        *,
        areas(name),
        profiles(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch permissions",
        variant: "destructive",
      });
    } else {
      // Type assertion to handle Supabase response structure
      const formattedPermissions = (data || []).map((permission: any) => ({
        ...permission,
        permission_level: permission.permission_level as 'admin' | 'viewer'
      }));
      setPermissions(formattedPermissions);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .neq('id', user?.id); // Exclude current user

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive",
      });
    } else {
      setProfiles(data || []);
    }
  };

  const handleCreateArea = async (data: AreaForm) => {
    // Get current user's client_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single();

    if (!profile?.client_id) {
      toast({
        title: "Error",
        description: "Unable to determine your organization",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('areas')
      .insert({
        name: data.name,
        description: data.description,
        client_id: profile.client_id
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
        description: "Area created successfully",
      });
      setIsAreaDialogOpen(false);
      areaForm.reset();
      fetchAreas();
    }
  };

  const handleUpdateArea = async (data: AreaForm) => {
    if (!editingArea) return;

    const { error } = await supabase
      .from('areas')
      .update({
        name: data.name,
        description: data.description
      })
      .eq('id', editingArea.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Area updated successfully",
      });
      setIsAreaDialogOpen(false);
      setEditingArea(null);
      areaForm.reset();
      fetchAreas();
    }
  };

  const handleDeleteArea = async (id: string) => {
    const { error } = await supabase
      .from('areas')
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
        description: "Area deleted successfully",
      });
      fetchAreas();
    }
  };

  const handleGrantPermission = async (data: PermissionForm) => {
    const { error } = await supabase
      .from('area_permissions')
      .insert({
        area_id: data.areaId,
        user_id: data.userId,
        permission_level: data.permissionLevel,
        granted_by: user?.id
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
        description: "Permission granted successfully",
      });
      setIsPermissionDialogOpen(false);
      permissionForm.reset();
      fetchPermissions();
    }
  };

  const handleRevokePermission = async (id: string) => {
    const { error } = await supabase
      .from('area_permissions')
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
        description: "Permission revoked successfully",
      });
      fetchPermissions();
    }
  };

  const openEditDialog = (area: Area) => {
    setEditingArea(area);
    areaForm.setValue('name', area.name);
    areaForm.setValue('description', area.description);
    setIsAreaDialogOpen(true);
  };

  const openNewAreaDialog = () => {
    setEditingArea(null);
    areaForm.reset();
    setIsAreaDialogOpen(true);
  };

  const getPermissionColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'viewer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageAreas = userRole === 'client_admin' || userRole === 'super_admin';

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            Areas Management
          </h1>
          <p className="text-muted-foreground">Manage company areas and permissions</p>
        </div>
        {canManageAreas && (
          <Button onClick={openNewAreaDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Area
          </Button>
        )}
      </div>

      <Tabs defaultValue="areas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="areas">Areas</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Areas
              </CardTitle>
              <CardDescription>
                Areas within your organization for managing evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    {canManageAreas && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell>{area.description}</TableCell>
                      <TableCell>
                        {new Date(area.created_at).toLocaleDateString()}
                      </TableCell>
                      {canManageAreas && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(area)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteArea(area.id)}
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

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Area Permissions
                  </CardTitle>
                  <CardDescription>
                    Manage who can access and administer each area
                  </CardDescription>
                </div>
                {canManageAreas && (
                  <Button onClick={() => setIsPermissionDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Grant Permission
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead>Granted</TableHead>
                    {canManageAreas && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {permission.profile?.first_name} {permission.profile?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {permission.profile?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{permission.area?.name}</TableCell>
                      <TableCell>
                        <Badge className={getPermissionColor(permission.permission_level)}>
                          {permission.permission_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(permission.created_at).toLocaleDateString()}
                      </TableCell>
                      {canManageAreas && (
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokePermission(permission.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Area Dialog */}
      <Dialog open={isAreaDialogOpen} onOpenChange={setIsAreaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingArea ? 'Edit Area' : 'Create New Area'}
            </DialogTitle>
            <DialogDescription>
              {editingArea ? 'Update area details' : 'Add a new area to your organization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={areaForm.handleSubmit(editingArea ? handleUpdateArea : handleCreateArea)} className="space-y-4">
            <div>
              <Label htmlFor="name">Area Name</Label>
              <Input
                id="name"
                {...areaForm.register('name', { required: 'Area name is required' })}
                placeholder="e.g., Sales Department, Engineering, HR"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...areaForm.register('description')}
                placeholder="Brief description of this area..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAreaDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingArea ? 'Update' : 'Create'} Area
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Area Permission</DialogTitle>
            <DialogDescription>
              Give a user access to manage or view an area
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={permissionForm.handleSubmit(handleGrantPermission)} className="space-y-4">
            <div>
              <Label htmlFor="areaId">Area</Label>
              <Select {...permissionForm.register('areaId', { required: true })}>
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
              <Label htmlFor="userId">User</Label>
              <Select {...permissionForm.register('userId', { required: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="permissionLevel">Permission Level</Label>
              <Select {...permissionForm.register('permissionLevel', { required: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Can manage area and permissions</SelectItem>
                  <SelectItem value="viewer">Viewer - Can view area content</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Grant Permission
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}