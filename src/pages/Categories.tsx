import { useState, useEffect } from "react";
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target,
  Building,
  Shield
} from "lucide-react";

interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  client_id: string;
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
}

interface CriteriaForm {
  name: string;
  description: string;
  areaId: string;
}

export default function Categories() {
  const { user, profile } = useAuth();
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCriteria, setEditingCriteria] = useState<EvaluationCriteria | null>(null);
  const [userAreaPermissions, setUserAreaPermissions] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<CriteriaForm>();

  // Check if user can edit criteria (client admin or area admin for specific area)
  const canEditCriteria = (criteria: EvaluationCriteria) => {
    if (!profile) return false;
    if (profile.role === 'client_admin') return true;
    if (profile.role === 'area_admin' && criteria.area_id && userAreaPermissions.includes(criteria.area_id)) return true;
    return false;
  };

  // Check if user can create criteria
  const canCreateCriteria = () => {
    if (!profile) return false;
    return profile.role === 'client_admin' || profile.role === 'super_admin' || userAreaPermissions.length > 0;
  };

  useEffect(() => {
    if (user && profile) {
      fetchCriteria();
      fetchAreas();
      fetchUserAreaPermissions();
      
      // Set initial filter based on user role and permissions
      if (profile.role === 'user' && profile.area_id) {
        setSelectedArea(profile.area_id);
      } else if (profile.role === 'area_admin') {
        // Will be set after area permissions are fetched
      }
    }
  }, [user, profile]);

  const fetchCriteria = async () => {
    const { data, error } = await supabase
      .from('evaluation_criteria')
      .select(`
        *,
        areas(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch criteria",
        variant: "destructive",
      });
    } else {
      setCriteria(data || []);
    }
  };

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching areas:', error);
        toast({
          title: "Error",
          description: "Failed to fetch areas",
          variant: "destructive",
        });
        setAreas([]);
      } else {
        setAreas(data || []);
      }
    } catch (error) {
      console.error('Error in fetchAreas:', error);
      setAreas([]);
    }
  };

  const fetchUserAreaPermissions = async () => {
    if (!user || profile?.role === 'client_admin') {
      // Client admins have access to all areas
      setUserAreaPermissions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('area_permissions')
        .select('area_id')
        .eq('user_id', user.id)
        .eq('permission_level', 'admin');

      if (!error && data) {
        const areaIds = data.map(p => p.area_id);
        setUserAreaPermissions(areaIds);
        
        // Set filter to first area for area admins
        if (profile?.role === 'area_admin' && areaIds.length > 0) {
          setSelectedArea(areaIds[0]);
        }
      } else {
        console.error('Error fetching user area permissions:', error);
        setUserAreaPermissions([]);
      }
    } catch (error) {
      console.error('Error in fetchUserAreaPermissions:', error);
      setUserAreaPermissions([]);
    }
  };

  const handleCreate = async (data: CriteriaForm) => {
    // Get client_id for the request
    let clientId = null;
    
    if (profile?.role === 'super_admin') {
      // For super admin, we need to get a client_id from the selected area
      if (data.areaId && data.areaId !== "none") {
        const area = areas.find(a => a.id === data.areaId);
        if (area) {
          // Get client_id from the area
          const { data: areaData } = await supabase
            .from('areas')
            .select('client_id')
            .eq('id', data.areaId)
            .single();
          clientId = areaData?.client_id;
        }
      }
      
      // If no area selected or no client found, we'll let the RLS policy handle it
      // Super admins can create global criteria
    } else {
      // For other roles, get their client_id from profile
      clientId = profile?.client_id;
    }

    const insertData: any = {
      name: data.name,
      description: data.description,
      area_id: data.areaId === "none" ? null : data.areaId
    };

    // Only add client_id if we have one (for super admin, it's optional for global criteria)
    if (clientId) {
      insertData.client_id = clientId;
    }

    const { error } = await supabase
      .from('evaluation_criteria')
      .insert(insertData);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Criteria created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      fetchCriteria();
    }
  };

  const handleUpdate = async (data: CriteriaForm) => {
    if (!editingCriteria) return;

    const { error } = await supabase
      .from('evaluation_criteria')
      .update({
        name: data.name,
        description: data.description,
        area_id: data.areaId === "none" ? null : data.areaId
      })
      .eq('id', editingCriteria.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Criteria updated successfully",
      });
      setIsDialogOpen(false);
      setEditingCriteria(null);
      form.reset();
      fetchCriteria();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('evaluation_criteria')
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
        description: "Criteria deleted successfully",
      });
      fetchCriteria();
    }
  };

  const openEditDialog = (criteria: EvaluationCriteria) => {
    setEditingCriteria(criteria);
    form.setValue('name', criteria.name);
    form.setValue('description', criteria.description);
    form.setValue('areaId', criteria.area_id || "none");
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingCriteria(null);
    form.reset();
    form.setValue('areaId', "none");
    setIsDialogOpen(true);
  };

  // Filter criteria based on user role and permissions
  const getFilteredCriteria = () => {
    let filtered = criteria;

    // For regular users, only show criteria from their assigned area or areas they have permissions for
    if (profile?.role === 'user') {
      // Users can only see criteria from their assigned area or unassigned criteria
      filtered = criteria.filter(c => 
        !c.area_id || c.area_id === profile.area_id
      );
     } else if (profile?.role === 'area_admin') {
      // Area admins can see criteria from areas they have admin permissions for, plus unassigned
      if (selectedArea === "all") {
        filtered = criteria.filter(c => 
          !c.area_id || userAreaPermissions.includes(c.area_id)
        );
      } else {
        filtered = criteria.filter(c => c.area_id === selectedArea);
      }
    } else if (profile?.role === 'client_admin') {
      // Client admins can see all criteria, apply area filter if selected
      if (selectedArea === "all") {
        filtered = criteria;
      } else if (selectedArea === "unassigned") {
        filtered = criteria.filter(c => !c.area_id);
      } else {
        filtered = criteria.filter(c => c.area_id === selectedArea);
      }
    }

    return filtered;
  };

  const filteredCriteria = getFilteredCriteria();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Evaluation Criteria
          </h1>
          <p className="text-muted-foreground">
            Manage criteria used for performance evaluations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Show area filter for client admins and area admins */}
          <Select 
            value={selectedArea} 
            onValueChange={profile?.role === 'client_admin' || profile?.role === 'area_admin' ? setSelectedArea : undefined}
            disabled={profile?.role === 'user'}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by area" />
            </SelectTrigger>
            <SelectContent>
              {profile?.role === 'client_admin' && (
                <>
                  <SelectItem value="all">All Areas</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </>
              )}
              {areas
                .filter(area => {
                  // For client admins, show all areas
                  if (profile?.role === 'client_admin') return true;
                  // For area admins, only show areas they have admin permissions for
                  if (profile?.role === 'area_admin') return userAreaPermissions.includes(area.id);
                  // For users, show their assigned area only
                  return profile?.area_id === area.id;
                })
                .map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {canCreateCriteria() && (
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Criteria
            </Button>
          )}
        </div>
      </div>

      {/* Criteria Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Criteria</CardTitle>
          <CardDescription>
            Criteria used to evaluate performance across different areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCriteria.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCriteria.map((criterion) => (
                  <TableRow key={criterion.id}>
                    <TableCell className="font-medium">{criterion.name}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="truncate">{criterion.description}</p>
                    </TableCell>
                    <TableCell>
                      {criterion.area ? (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {criterion.area.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(criterion.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {canEditCriteria(criterion) ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(criterion)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(criterion.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Read-only
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No criteria found</p>
              <p className="text-sm">Create your first evaluation criteria to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criteria Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCriteria ? 'Edit Criteria' : 'Create New Criteria'}
            </DialogTitle>
            <DialogDescription>
              {editingCriteria 
                ? 'Update the criteria details' 
                : 'Add a new criteria for performance evaluation'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(editingCriteria ? handleUpdate : handleCreate)} className="space-y-4">
            <div>
              <Label htmlFor="name">Criteria Name</Label>
              <Input
                id="name"
                {...form.register('name', { required: 'Criteria name is required' })}
                placeholder="e.g., Communication Skills, Technical Proficiency"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Describe what this criteria evaluates..."
              />
            </div>
            <div>
              <Label htmlFor="areaId">Area</Label>
              <Select 
                value={form.watch('areaId')} 
                onValueChange={(value) => form.setValue('areaId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an area" />
                </SelectTrigger>
                <SelectContent>
                  {profile?.role === 'client_admin' && (
                    <SelectItem value="none">No specific area</SelectItem>
                  )}
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCriteria ? 'Update' : 'Create'} Criteria
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}