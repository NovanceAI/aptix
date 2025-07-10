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
    if (criteria.area_id && userAreaPermissions.includes(criteria.area_id)) return true;
    return false;
  };

  // Check if user can create criteria
  const canCreateCriteria = () => {
    if (!profile) return false;
    return profile.role === 'client_admin' || userAreaPermissions.length > 0;
  };

  useEffect(() => {
    if (user && profile) {
      fetchCriteria();
      fetchAreas();
      fetchUserAreaPermissions();
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
    let query = supabase
      .from('areas')
      .select('*')
      .order('name', { ascending: true });

    // If user is not client admin, filter areas based on their permissions
    if (profile?.role !== 'client_admin') {
      const { data: permissions } = await supabase
        .from('area_permissions')
        .select('area_id')
        .eq('user_id', user?.id);
      
      if (permissions && permissions.length > 0) {
        const areaIds = permissions.map(p => p.area_id);
        query = query.in('id', areaIds);
      } else {
        // No permissions, return empty array
        setAreas([]);
        return;
      }
    }

    const { data, error } = await query;

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

  const fetchUserAreaPermissions = async () => {
    if (!user || profile?.role === 'client_admin') {
      // Client admins have access to all areas
      return;
    }

    const { data, error } = await supabase
      .from('area_permissions')
      .select('area_id')
      .eq('user_id', user.id)
      .eq('permission_level', 'admin');

    if (!error && data) {
      setUserAreaPermissions(data.map(p => p.area_id));
    }
  };

  const handleCreate = async (data: CriteriaForm) => {
    const { error } = await supabase
      .from('evaluation_criteria')
      .insert({
        name: data.name,
        description: data.description,
        area_id: data.areaId === "none" ? null : data.areaId
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

  // Filter criteria based on selected area and user permissions
  const getFilteredCriteria = () => {
    let filtered = criteria;

    // Apply area filter
    if (selectedArea === "all") {
      filtered = criteria;
    } else if (selectedArea === "unassigned") {
      filtered = criteria.filter(c => !c.area_id);
    } else {
      filtered = criteria.filter(c => c.area_id === selectedArea);
    }

    // For non-client admins, only show criteria they can access
    if (profile?.role !== 'client_admin') {
      filtered = filtered.filter(c => 
        !c.area_id || userAreaPermissions.includes(c.area_id)
      );
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
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {areas.map((area) => (
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