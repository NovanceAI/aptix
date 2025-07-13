import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, Building, UserPlus, Copy, Link } from 'lucide-react';
import { InvitationManager } from '@/components/InvitationManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'user' | 'client_admin' | 'super_admin' | 'area_admin';
  area_id: string | null;
  created_at: string;
  area?: {
    name: string;
  };
}

interface Area {
  id: string;
  name: string;
  description: string;
  client_id: string;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'client_admin' | 'area_admin';
  areaId: string;
  password?: string;
  clientId?: string;
}

export default function UserManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    areaId: 'none',
    password: '',
    clientId: ''
  });
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);

  // Allow client admins, area admins, and super admins
  if (profile?.role !== 'client_admin' && profile?.role !== 'area_admin' && profile?.role !== 'super_admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground">Access Denied</h1>
        <p className="text-muted-foreground">Only client administrators, area administrators, and super administrators can access this page.</p>
      </div>
    );
  }

  useEffect(() => {
    fetchUsers();
    fetchAreas();
    if (profile?.role === 'super_admin') {
      fetchClients();
    }
  }, [profile?.client_id, profile?.role]);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          role, 
          area_id, 
          client_id,
          created_at,
          area:areas(name)
        `);

      // Super admin sees all users
      if (profile?.role === 'super_admin') {
        // No client filter for super admin
      } else if (profile?.role === 'area_admin') {
        // Area admin sees only users in their area
        query = query.eq('client_id', profile.client_id).eq('area_id', profile.area_id);
      } else {
        // Client admin sees all users in their client
        query = query.eq('client_id', profile.client_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      let query = supabase
        .from('areas')
        .select('*');

      // Super admin gets all areas, others get only their client's areas
      if (profile?.role !== 'super_admin') {
        query = query.eq('client_id', profile.client_id);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast({
        title: "Error",
        description: "Failed to fetch areas",
        variant: "destructive",
      });
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      areaId: profile?.role === 'area_admin' ? profile.area_id || 'none' : 'none',
      password: '',
      clientId: profile?.role === 'super_admin' ? '' : profile?.client_id || ''
    });
    setEditingUser(null);
  };

  const handleAddUser = async () => {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password!,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile entry
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
            area_id: formData.role === 'client_admin' ? null : 
                    (formData.role === 'area_admin' ? (formData.areaId === 'none' ? null : formData.areaId) : 
                    (formData.areaId === 'none' ? null : formData.areaId)),
            client_id: profile?.role === 'super_admin' ? formData.clientId : profile?.client_id
          });

        if (profileError) throw profileError;

        toast({
          title: "Success",
          description: "User created successfully",
        });

        setIsAddDialogOpen(false);
        resetForm();
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role,
          area_id: formData.role === 'client_admin' ? null : 
                  (formData.role === 'area_admin' ? (formData.areaId === 'none' ? null : formData.areaId) : 
                  (formData.areaId === 'none' ? null : formData.areaId))
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setIsEditDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteUserId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      role: user.role === 'super_admin' ? 'client_admin' : (user.role as 'user' | 'client_admin' | 'area_admin'),
      areaId: user.area_id || 'none'
    });
    setIsEditDialogOpen(true);
  };

  const createAndCopyInvitationLink = async () => {
    try {
      setInviteLoading(true);
      
      // Generate token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc("generate_invitation_token");

      if (tokenError) throw tokenError;

      // Get current user's client_id
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", profile?.id)
        .single();

      if (profileError) throw profileError;

      // Create invitation
      const invitationType = profile?.role === 'client_admin' ? 'area_admin' : 'employee';
      const invitationData = {
        email: 'placeholder@example.com', // Will be replaced when the recipient uses the link
        invitation_type: invitationType,
        token: tokenData,
        area_id: profile?.role === 'area_admin' ? profile.area_id : null,
        client_id: userProfile.client_id,
        invited_by: profile?.id,
      };

      const { error } = await supabase
        .from('invitations')
        .insert(invitationData);

      if (error) throw error;

      // Copy the invitation link
      const invitationLink = `${window.location.origin}/auth?invite=${tokenData}`;
      await navigator.clipboard.writeText(invitationLink);

      toast({
        title: "Invitation Link Copied",
        description: `${invitationType === 'area_admin' ? 'Area Admin' : 'Employee'} invitation link copied to clipboard. Paste it in your email.`,
      });

    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invitation link",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage users and invitations in your organization</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Current Users</TabsTrigger>
          <TabsTrigger value="invitations">Send Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          {/* Create User Form - For Super Admins, Client Admins, and Area Admins */}
          {(profile?.role === 'super_admin' || profile?.role === 'client_admin' || profile?.role === 'area_admin') && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-green-600" />
                  Create User Directly
                </CardTitle>
                <CardDescription>
                  {profile?.role === 'super_admin' 
                    ? 'As a Super Admin, you can create users directly for any client'
                    : profile?.role === 'client_admin'
                    ? 'As a Client Admin, you can create users directly for your organization'
                    : 'As an Area Admin, you can create users for your specific area'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Temporary password"
                    />
                  </div>
                  
                  {/* Client selection - only for Super Admins */}
                  {profile?.role === 'super_admin' && (
                    <div>
                      <Label htmlFor="client">Client</Label>
                      <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as 'user' | 'client_admin' | 'area_admin' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        {(profile?.role === 'super_admin' || profile?.role === 'client_admin') && (
                          <>
                            <SelectItem value="area_admin">Area Admin</SelectItem>
                            <SelectItem value="client_admin">Client Admin</SelectItem>
                          </>
                        )}
                        {profile?.role === 'area_admin' && (
                          <SelectItem value="user">User</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.role !== 'client_admin' && (
                    <div>
                      <Label htmlFor="area">Area</Label>
                      <Select value={formData.areaId} onValueChange={(value) => setFormData({ ...formData, areaId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Area</SelectItem>
                           {areas.filter(area => 
                             profile?.role === 'super_admin' 
                               ? (formData.clientId ? area.client_id === formData.clientId : true)
                               : profile?.role === 'area_admin'
                               ? area.id === profile?.area_id
                               : area.client_id === profile?.client_id
                           ).map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleAddUser}
                  disabled={
                    !formData.email || 
                    !formData.firstName || 
                    !formData.lastName || 
                    !formData.password || 
                    (profile?.role === 'super_admin' && !formData.clientId)
                  }
                  className="w-full md:w-auto"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Invitation URL Card - Only show for non-super-admins */}
          {profile?.role !== 'super_admin' && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-blue-600" />
                  Invite {profile?.role === 'client_admin' ? 'Area Admins' : 'Employees'}
                </CardTitle>
                <CardDescription>
                  {profile?.role === 'client_admin' 
                    ? 'Send invitation links to new Area Admins for your organization'
                    : 'Send invitation links to new employees for your area'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Quick Invitation Link
                    </p>
                    <p className="text-sm text-gray-600">
                      Generate and copy an invitation link to paste directly into your email
                    </p>
                  </div>
                  <Button 
                    onClick={createAndCopyInvitationLink}
                    className="ml-4"
                    size="sm"
                    disabled={inviteLoading}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {inviteLoading ? 'Creating...' : 'Copy Link'}
                  </Button>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 mb-1">How it works:</p>
                  <p className="text-sm text-blue-800">
                    Click "Copy Link" → Paste into email → Send to {profile?.role === 'client_admin' ? 'Area Admin' : 'employee'} → They complete signup with the link
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users ({users.length})
                </CardTitle>
                <CardDescription>
                  {profile?.role === 'area_admin' 
                    ? 'Users in your area' 
                    : 'All users in your organization'
                  }
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={
                          user.role === 'client_admin' ? 'default' : 
                          user.role === 'area_admin' ? 'outline' : 
                          'secondary'
                        }>
                          {user.role === 'client_admin' ? 'Client Admin' : 
                           user.role === 'area_admin' ? 'Area Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'client_admin' ? (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Building className="h-3 w-3" />
                            All Areas
                          </Badge>
                        ) : user.role === 'area_admin' ? (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Building className="h-3 w-3" />
                            Area Admin Access
                          </Badge>
                        ) : user.area ? (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Building className="h-3 w-3" />
                            {user.area.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.id !== profile?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteUserId(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationManager />
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="editRole">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'user' | 'client_admin' | 'area_admin') => 
                  setFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  {profile?.role === 'client_admin' && (
                    <>
                      <SelectItem value="area_admin">Area Admin</SelectItem>
                      <SelectItem value="client_admin">Client Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {(formData.role === 'user' || formData.role === 'area_admin') && (
              <div>
                <Label htmlFor="editAreaId">{formData.role === 'area_admin' ? 'Primary Area' : 'Area'}</Label>
                <Select 
                  value={formData.areaId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, areaId: value }))}
                  disabled={profile?.role === 'area_admin'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    {profile?.role === 'client_admin' && <SelectItem value="none">No specific area</SelectItem>}
                    {areas
                      .filter(area => profile?.role === 'client_admin' || area.id === profile?.area_id)
                      .map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}